-- Deal Detail enhancements migration

-- 1. Extend deals table with Control Tower fields
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS control_tower_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS hubspot_deal_id text,
  ADD COLUMN IF NOT EXISTS hubspot_crm_deal_url text,
  ADD COLUMN IF NOT EXISTS dealtype text,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS expected_closing_date date,
  ADD COLUMN IF NOT EXISTS potential_amount numeric,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS external_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_by uuid REFERENCES public.users (id);

CREATE INDEX IF NOT EXISTS idx_deals_control_tower_id ON public.deals (control_tower_id);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_deal_id ON public.deals (hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity ON public.deals (last_activity_at DESC);

-- 2. Checklist templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users (id)
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'checklist_templates'
      AND policyname = 'Admins can manage checklist templates'
  ) THEN
    CREATE POLICY "Admins can manage checklist templates"
      ON public.checklist_templates
      FOR ALL
      USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'checklist_templates'
      AND policyname = 'Authenticated users can view templates'
  ) THEN
    CREATE POLICY "Authenticated users can view templates"
      ON public.checklist_templates
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- default template insert
INSERT INTO public.checklist_templates (name, stage, items)
SELECT 'General Deal Checklist', NULL, '[
  {"title": "Initial Discovery Call Completed", "order_index": 0},
  {"title": "Requirements Document Created", "order_index": 1},
  {"title": "Proposal/SOW Sent", "order_index": 2},
  {"title": "Contract Signed", "order_index": 3},
  {"title": "Project Kickoff Scheduled", "order_index": 4}
]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_templates WHERE name = 'General Deal Checklist'
);

-- 3. Deal comments enhancements
ALTER TABLE public.deal_comments
  ADD COLUMN IF NOT EXISTS synced_to_control_tower boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS control_tower_comment_id text,
  ADD COLUMN IF NOT EXISTS mentioned_users uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS mentioned_user_emails text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_comments_sync_pending
  ON public.deal_comments (synced_to_control_tower)
  WHERE synced_to_control_tower = false;

-- 3b. Checklist sync tracking
ALTER TABLE public.deal_checklist_items
  ADD COLUMN IF NOT EXISTS control_tower_synced_at timestamptz;

-- 4. Control Tower sync log
CREATE TABLE IF NOT EXISTS public.control_tower_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  control_tower_id text,
  status text NOT NULL,
  payload jsonb,
  error_message text,
  synced_at timestamptz DEFAULT now(),
  synced_by uuid REFERENCES public.users (id)
);

CREATE INDEX IF NOT EXISTS idx_sync_log_status
  ON public.control_tower_sync_log (status, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity
  ON public.control_tower_sync_log (entity_type, entity_id);

ALTER TABLE public.control_tower_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'control_tower_sync_log'
      AND policyname = 'Admins can manage control tower sync logs'
  ) THEN
    CREATE POLICY "Admins can manage control tower sync logs"
      ON public.control_tower_sync_log
      FOR ALL
      USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'control_tower_sync_log'
      AND policyname = 'Authenticated users can view control tower sync logs'
  ) THEN
    CREATE POLICY "Authenticated users can view control tower sync logs"
      ON public.control_tower_sync_log
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 5. Cron scheduling for hourly syncs
INSERT INTO cron.jobs (jobname, schedule, command)
SELECT 'sync-control-tower-deals-hourly', '0 * * * *',
       $$SELECT net.http_post(
           url := 'https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/sync-control-tower-deals',
           headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
           body := '{}'::jsonb
         )$$
WHERE NOT EXISTS (
  SELECT 1 FROM cron.jobs WHERE jobname = 'sync-control-tower-deals-hourly'
);

INSERT INTO cron.jobs (jobname, schedule, command)
SELECT 'push-to-control-tower-hourly', '30 * * * *',
       $$SELECT net.http_post(
           url := 'https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/push-to-control-tower',
           headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
           body := '{"entity_type": "all"}'::jsonb
         )$$
WHERE NOT EXISTS (
  SELECT 1 FROM cron.jobs WHERE jobname = 'push-to-control-tower-hourly'
);
