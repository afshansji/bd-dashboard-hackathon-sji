-- Create campaign_contact_comments table
CREATE TABLE public.campaign_contact_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.campaign_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_contact_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Authenticated users can view comments"
  ON public.campaign_contact_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments"
  ON public.campaign_contact_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.campaign_contact_comments
  FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- RLS Policy for deleting campaign contacts
CREATE POLICY "Admins and campaign collaborators can delete contacts"
  ON public.campaign_contacts
  FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM bd_campaigns
      WHERE bd_campaigns.id = campaign_contacts.campaign_id
      AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
    )
  );

-- Add trigger for updated_at on comments
CREATE TRIGGER update_campaign_contact_comments_updated_at
  BEFORE UPDATE ON public.campaign_contact_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();