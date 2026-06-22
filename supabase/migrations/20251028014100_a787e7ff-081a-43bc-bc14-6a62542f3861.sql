-- Create campaign_contact_status_history table
CREATE TABLE IF NOT EXISTS public.campaign_contact_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  change_trigger text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_status_history_contact_id ON public.campaign_contact_status_history(contact_id);
CREATE INDEX idx_status_history_changed_at ON public.campaign_contact_status_history(changed_at DESC);

-- Add columns to campaign_contacts
ALTER TABLE public.campaign_contacts 
ADD COLUMN IF NOT EXISTS last_status_change_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS auto_status_enabled boolean DEFAULT true;

-- Enable RLS
ALTER TABLE public.campaign_contact_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view status history"
  ON public.campaign_contact_status_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert status history"
  ON public.campaign_contact_status_history
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.campaign_contact_status_history (
      contact_id,
      old_status,
      new_status,
      changed_by,
      change_trigger
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(current_setting('app.status_change_trigger', true), 'manual')
    );
    
    NEW.last_status_change_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS contact_status_change_trigger ON public.campaign_contacts;
CREATE TRIGGER contact_status_change_trigger
  BEFORE UPDATE ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contact_status_change();