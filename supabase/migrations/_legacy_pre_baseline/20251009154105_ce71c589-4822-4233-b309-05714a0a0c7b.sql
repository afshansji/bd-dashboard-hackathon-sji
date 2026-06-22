-- Create accountability chart table
CREATE TABLE public.user_accountability_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  type_of_work TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, serial_number)
);

-- Enable RLS
ALTER TABLE public.user_accountability_chart ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own accountability chart
CREATE POLICY "Users can view their own accountability chart"
  ON public.user_accountability_chart
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can manage their own accountability chart
CREATE POLICY "Users can manage their own accountability chart"
  ON public.user_accountability_chart
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Managers can view all accountability charts
CREATE POLICY "Managers can view all accountability charts"
  ON public.user_accountability_chart
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'manager')
    )
  );

-- RLS Policy: Managers can manage all accountability charts
CREATE POLICY "Managers can manage all accountability charts"
  ON public.user_accountability_chart
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'manager')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_user_accountability_chart_updated_at
  BEFORE UPDATE ON public.user_accountability_chart
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_user_accountability_chart_user_id 
  ON public.user_accountability_chart(user_id);