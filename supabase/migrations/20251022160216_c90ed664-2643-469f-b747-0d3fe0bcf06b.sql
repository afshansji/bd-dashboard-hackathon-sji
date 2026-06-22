-- Create deal_comments table
CREATE TABLE public.deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_checklist_items table
CREATE TABLE public.deal_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_system_info table
CREATE TABLE public.deal_system_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  external_references JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_system_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deal_comments
CREATE POLICY "Authenticated users can view comments"
  ON public.deal_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments"
  ON public.deal_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.deal_comments FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for deal_checklist_items
CREATE POLICY "Authenticated users can view checklist items"
  ON public.deal_checklist_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage checklist items"
  ON public.deal_checklist_items FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = deal_checklist_items.deal_id 
      AND (deals.owner_id = auth.uid() OR deals.pm_assigned_id = auth.uid())
    )
  );

-- RLS Policies for deal_system_info
CREATE POLICY "Authenticated users can view system info"
  ON public.deal_system_info FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage system info"
  ON public.deal_system_info FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create indexes for performance
CREATE INDEX idx_deal_comments_deal_id ON public.deal_comments(deal_id);
CREATE INDEX idx_deal_comments_created_at ON public.deal_comments(created_at DESC);
CREATE INDEX idx_checklist_items_deal_id ON public.deal_checklist_items(deal_id);
CREATE INDEX idx_checklist_items_order ON public.deal_checklist_items(deal_id, order_index);
CREATE INDEX idx_system_info_deal_id ON public.deal_system_info(deal_id);
CREATE INDEX idx_system_info_slug ON public.deal_system_info(slug);

-- Create trigger for updated_at on deal_comments
CREATE TRIGGER update_deal_comments_updated_at
  BEFORE UPDATE ON public.deal_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on deal_checklist_items
CREATE TRIGGER update_deal_checklist_items_updated_at
  BEFORE UPDATE ON public.deal_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on deal_system_info
CREATE TRIGGER update_deal_system_info_updated_at
  BEFORE UPDATE ON public.deal_system_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();