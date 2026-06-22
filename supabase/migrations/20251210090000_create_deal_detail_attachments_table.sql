-- Create deal_detail_attachments table for file attachments in deal details
CREATE TABLE IF NOT EXISTS deal_detail_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_deal_detail_attachments_deal_id ON deal_detail_attachments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_detail_attachments_uploaded_by ON deal_detail_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE deal_detail_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view attachments for deals they have access to
CREATE POLICY "Users can view deal detail attachments"
  ON deal_detail_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_detail_attachments.deal_id
    )
  );

-- Allow authenticated users to insert attachments
CREATE POLICY "Authenticated users can upload deal detail attachments"
  ON deal_detail_attachments
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_detail_attachments.deal_id
    )
  );

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own deal detail attachments"
  ON deal_detail_attachments
  FOR DELETE
  USING (
    auth.uid() = uploaded_by
  );

-- Add comment
COMMENT ON TABLE deal_detail_attachments IS 'File attachments for deal details section';

