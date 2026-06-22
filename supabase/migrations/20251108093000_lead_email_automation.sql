-- Lead Email Automation tables
create table if not exists public.lead_automation_logs (
  id uuid primary key default gen_random_uuid(),
  email_message_id text,
  client_id uuid references public.clients(id),
  hubspot_status text,
  ghl_status text,
  ai_confidence numeric,
  status text default 'processed',
  parsed_data jsonb,
  raw_sender text,
  raw_subject text,
  raw_body text,
  created_at timestamptz default now()
);

create index if not exists lead_automation_logs_created_at_idx
  on public.lead_automation_logs (created_at desc);

create index if not exists lead_automation_logs_status_idx
  on public.lead_automation_logs (status);

create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  thread_id text,
  client_id uuid references public.clients(id),
  summary text,
  last_updated timestamptz default now()
);

create unique index if not exists email_threads_thread_id_idx
  on public.email_threads (thread_id);

create table if not exists public.lead_automation_settings (
  id uuid primary key default gen_random_uuid(),
  enable_cron boolean default false,
  sync_interval_minutes integer default 60,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

comment on table public.lead_automation_logs is 'Stores results of automated lead email processing';
comment on table public.email_threads is 'Optional thread-level summaries for processed lead emails';
comment on table public.lead_automation_settings is 'Configuration overrides for lead automation cron execution';
