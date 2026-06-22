-- Enhance bd_campaigns with external integrations and AI tracking
ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS ghl_campaign_id TEXT;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS linkedin_campaign_id TEXT;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS content_template JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS research_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS linkedin_stats JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS ghl_stats JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS linkedin_research_summary JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.bd_campaigns
  ADD COLUMN IF NOT EXISTS contacts_summary JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bd_campaigns_ai_agent_id ON public.bd_campaigns(ai_agent_id);

-- Campaign contacts table stores individual outreach targets
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_linkedin_url TEXT,
  contact_company TEXT,
  contact_title TEXT,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN (
    'identified',
    'researched',
    'contacted_linkedin',
    'connected',
    'messaged',
    'contacted_email',
    'responded',
    'meeting_booked'
  )),
  linkedin_request_sent_at TIMESTAMPTZ,
  linkedin_accepted_at TIMESTAMPTZ,
  linkedin_message_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  research_summary JSONB DEFAULT '{}'::jsonb,
  personalization_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_assigned_to ON public.campaign_contacts(assigned_to);

CREATE TRIGGER update_campaign_contacts_updated_at
  BEFORE UPDATE ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign contacts readable by authenticated users"
  ON public.campaign_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Campaign contacts insert follows campaign ownership"
  ON public.campaign_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_contacts.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign contacts update by owners"
  ON public.campaign_contacts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_contacts.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_contacts.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign contacts delete by owners"
  ON public.campaign_contacts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_contacts.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- Activity log for each outbound touchpoint
CREATE TABLE IF NOT EXISTS public.campaign_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.campaign_contacts(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'linkedin_request',
    'linkedin_message',
    'email_sent',
    'response_received',
    'meeting_booked'
  )),
  activity_data JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_activities_campaign_id ON public.campaign_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_contact_id ON public.campaign_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_type ON public.campaign_activities(activity_type);

CREATE TRIGGER update_campaign_activities_updated_at
  BEFORE UPDATE ON public.campaign_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaign_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign activities readable by authenticated users"
  ON public.campaign_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Campaign activities insert follows campaign ownership"
  ON public.campaign_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = performed_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_activities.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign activities update by performer or owners"
  ON public.campaign_activities FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = performed_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_activities.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    auth.uid() = performed_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_activities.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign activities delete by owners"
  ON public.campaign_activities FOR DELETE
  TO authenticated
  USING (
    auth.uid() = performed_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_activities.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- AI task orchestration per campaign
CREATE TABLE IF NOT EXISTS public.campaign_ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.campaign_contacts(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'research',
    'email_generation',
    'message_generation',
    'personalization'
  )),
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaign_ai_tasks_campaign_id ON public.campaign_ai_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ai_tasks_contact_id ON public.campaign_ai_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ai_tasks_status ON public.campaign_ai_tasks(status);

CREATE TRIGGER update_campaign_ai_tasks_updated_at
  BEFORE UPDATE ON public.campaign_ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.campaign_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign AI tasks readable by authenticated users"
  ON public.campaign_ai_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Campaign AI tasks insert follows campaign ownership"
  ON public.campaign_ai_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_ai_tasks.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign AI tasks update by creators or owners"
  ON public.campaign_ai_tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_ai_tasks.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_ai_tasks.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Campaign AI tasks delete by owners"
  ON public.campaign_ai_tasks FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1
      FROM public.bd_campaigns c
      WHERE c.id = campaign_ai_tasks.campaign_id
        AND (
          auth.uid() = c.created_by OR
          auth.uid() = c.owned_by OR
          has_role(auth.uid(), 'super_admin'::app_role) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );
