-- Create gohighlevel_integrations table
CREATE TABLE IF NOT EXISTS public.gohighlevel_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  location_id TEXT,
  location_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.gohighlevel_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own integrations"
  ON public.gohighlevel_integrations
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own integrations"
  ON public.gohighlevel_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.gohighlevel_integrations
  FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete integrations"
  ON public.gohighlevel_integrations
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Create gohighlevel_contacts table
CREATE TABLE IF NOT EXISTS public.gohighlevel_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.gohighlevel_integrations(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(integration_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.gohighlevel_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts
CREATE POLICY "Users can view contacts from own integrations"
  ON public.gohighlevel_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gohighlevel_integrations
      WHERE gohighlevel_integrations.id = gohighlevel_contacts.integration_id
        AND (gohighlevel_integrations.user_id = auth.uid() OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can manage contacts"
  ON public.gohighlevel_contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public.gohighlevel_integrations IS 'Stores GoHighLevel API integrations per user, supporting multiple locations';
COMMENT ON COLUMN public.gohighlevel_integrations.location_name IS 'Human-readable name for the location (e.g., "Austin Office", "Sales Team A")';
COMMENT ON TABLE public.gohighlevel_contacts IS 'Cached contact data from GoHighLevel syncs';