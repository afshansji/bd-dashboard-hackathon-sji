-- Create CollabAI Integration Tables
CREATE TABLE IF NOT EXISTS public.collabai_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_collabai_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.collabai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.collabai_integrations(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  ai_response TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create GoHighLevel Integration Tables
CREATE TABLE IF NOT EXISTS public.gohighlevel_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  location_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_ghl_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.gohighlevel_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.gohighlevel_integrations(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.collabai_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collabai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gohighlevel_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gohighlevel_contacts ENABLE ROW LEVEL SECURITY;

-- CollabAI policies
CREATE POLICY "collabai_integrations_user_access"
ON public.collabai_integrations
FOR ALL
TO authenticated
USING (user_id::text = auth.uid()::text OR EXISTS (
  SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'super_admin'::app_role
));

CREATE POLICY "collabai_chats_user_access"
ON public.collabai_chats
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.collabai_integrations ci
  WHERE ci.id = collabai_chats.integration_id
  AND (ci.user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'super_admin'::app_role
  ))
));

-- GoHighLevel policies
CREATE POLICY "ghl_integrations_user_access"
ON public.gohighlevel_integrations
FOR ALL
TO authenticated
USING (user_id::text = auth.uid()::text OR EXISTS (
  SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'super_admin'::app_role
));

CREATE POLICY "ghl_contacts_user_access"
ON public.gohighlevel_contacts
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.gohighlevel_integrations gi
  WHERE gi.id = gohighlevel_contacts.integration_id
  AND (gi.user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'super_admin'::app_role
  ))
));