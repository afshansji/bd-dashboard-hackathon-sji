-- Adds a nullable category column to deal_files for manual classification
alter table public.deal_files
  add column if not exists category text;

create index if not exists deal_files_category_idx on public.deal_files (category);
