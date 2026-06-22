alter table public.users
  add column if not exists title text;

alter table public.users
  add column if not exists department text;

alter table public.users
  add column if not exists is_marketing boolean not null default false;
