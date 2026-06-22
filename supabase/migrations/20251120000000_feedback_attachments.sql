-- Add support for multiple attachments in feedback
-- This migration creates a separate table for attachments while keeping backward compatibility

-- 1. Create feedback_attachments table
create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_reports(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  content_type text,
  created_at timestamptz not null default now()
);

-- Add indexes for performance
create index if not exists idx_feedback_attachments_feedback_id 
  on public.feedback_attachments(feedback_id);

create index if not exists idx_feedback_attachments_created_at 
  on public.feedback_attachments(created_at desc);

-- 2. Enable row level security
alter table public.feedback_attachments enable row level security;

-- 3. Create RLS policies for attachments
create policy if not exists "Users can view own feedback attachments"
  on public.feedback_attachments
  for select
  using (
    exists (
      select 1 from public.feedback_reports fr
      where fr.id = feedback_attachments.feedback_id
      and (fr.created_by = auth.uid() or has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

create policy if not exists "Users can insert feedback attachments"
  on public.feedback_attachments
  for insert
  with check (
    exists (
      select 1 from public.feedback_reports fr
      where fr.id = feedback_attachments.feedback_id
      and fr.created_by = auth.uid()
    )
  );

-- 4. Add comment to table
comment on table public.feedback_attachments is 'Stores multiple attachments for feedback reports';
comment on column public.feedback_attachments.feedback_id is 'Reference to the parent feedback report';
comment on column public.feedback_attachments.file_path is 'Path to the file in storage bucket';
comment on column public.feedback_attachments.file_name is 'Original filename';

