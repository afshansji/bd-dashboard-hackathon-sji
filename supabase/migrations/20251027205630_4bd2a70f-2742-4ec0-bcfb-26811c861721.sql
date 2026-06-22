-- Fix search_path for trigger function to address security warning
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;