-- Add deal_details column to deals table for storing detailed deal notes
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_details text;