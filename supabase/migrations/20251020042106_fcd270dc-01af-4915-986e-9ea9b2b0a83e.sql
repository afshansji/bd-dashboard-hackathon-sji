-- Create products table for Product Management
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  pricing_model TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  target_industries TEXT[],
  owner_team UUID REFERENCES public.users(id),
  google_drive_link TEXT,
  marketing_variant_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_owner_team ON public.products(owner_team);

-- RLS Policies for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view products"
  ON public.products FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Create followups table
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  contact TEXT NOT NULL,
  topic TEXT NOT NULL,
  next_step TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_user_id ON public.followups(user_id);
CREATE INDEX idx_followups_date ON public.followups(date);

-- RLS Policies for followups
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own followups"
  ON public.followups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own followups"
  ON public.followups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own followups"
  ON public.followups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own followups"
  ON public.followups FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_followups_updated_at
  BEFORE UPDATE ON public.followups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();