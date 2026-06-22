-- Add client call recording link column to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS client_call_recording_link text;