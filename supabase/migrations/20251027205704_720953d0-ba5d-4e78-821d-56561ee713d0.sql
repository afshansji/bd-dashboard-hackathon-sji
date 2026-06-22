-- Fix search_path for sync_deal_status_from_stage function
ALTER FUNCTION public.sync_deal_status_from_stage() SET search_path = public;