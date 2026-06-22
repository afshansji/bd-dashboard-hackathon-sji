-- Feedback tracking module

-- 1. Feedback reports table
create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('bug', 'feature')),
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  email text,
  attachment_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_feedback_reports_status on public.feedback_reports(status);
create index if not exists idx_feedback_reports_type on public.feedback_reports(type);
create index if not exists idx_feedback_reports_created_at on public.feedback_reports(created_at desc);
create index if not exists idx_feedback_reports_deleted_at on public.feedback_reports(deleted_at);

create trigger update_feedback_reports_updated_at
  before update on public.feedback_reports
  for each row
  execute function public.update_updated_at_column();

-- 2. Feedback comments table
create table if not exists public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_comments_feedback on public.feedback_comments(feedback_id);
create index if not exists idx_feedback_comments_user on public.feedback_comments(user_id);

-- 3. Enable row level security and policies
alter table public.feedback_reports enable row level security;
alter table public.feedback_comments enable row level security;

drop policy if exists "Feedback owners can insert" on public.feedback_reports;
create policy "Feedback owners can insert"
  on public.feedback_reports
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "Feedback owners can view" on public.feedback_reports;
create policy "Feedback owners can view"
  on public.feedback_reports
  for select
  using (
    auth.uid() = created_by
    or has_role(auth.uid(), 'super_admin'::app_role)
  );

drop policy if exists "Feedback owners can view comments" on public.feedback_comments;
create policy "Feedback owners can view comments"
  on public.feedback_comments
  for select
  using (
    auth.uid() = user_id
    or auth.uid() = (
      select fr.created_by from public.feedback_reports fr where fr.id = feedback_comments.feedback_id
    )
    or has_role(auth.uid(), 'super_admin'::app_role)
  );

drop policy if exists "Authenticated users can comment" on public.feedback_comments;
create policy "Authenticated users can comment"
  on public.feedback_comments
  for insert
  with check (auth.uid() = user_id);

-- 4. Storage bucket for attachments
insert into storage.buckets (id, name, public)
select 'feedback', 'feedback', false
where not exists (select 1 from storage.buckets where id = 'feedback');

drop policy if exists "Users can upload feedback attachments" on storage.objects;
create policy "Users can upload feedback attachments"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feedback'
    and owner = auth.uid()
  );

drop policy if exists "Users can view own feedback attachments" on storage.objects;
create policy "Users can view own feedback attachments"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feedback'
    and owner = auth.uid()
  );

-- 5. Feature flag defaults
insert into public.ai_configurations (user_id, configuration_type, configuration_data)
select
  ur.user_id,
  'feature_flags',
  jsonb_build_object(
    'feedback_enabled', true,
    'feedback_auto_email', true,
    'feedback_widget', false
  )
from public.user_roles ur
where ur.role = 'super_admin'
on conflict (user_id, configuration_type) do update
set configuration_data = public.ai_configurations.configuration_data || excluded.configuration_data,
    updated_at = now();
