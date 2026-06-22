-- Run this SQL in your Supabase SQL Query Executor to enable file attachments
-- 
-- Steps:
-- 1. Go to Admin Panel → SQL Query Executor
-- 2. Copy and paste this entire SQL
-- 3. Click "Execute"

-- ============================================
-- 1. Create Storage Bucket (if not exists)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-files',
  'deal-files',
  false, -- private bucket
  5242880, -- 5MB limit
  NULL -- allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Storage Bucket Policies
-- ============================================

-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload deal files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-files'
);

-- Allow users to view files they uploaded or for deals they have access to
CREATE POLICY IF NOT EXISTS "Users can view deal files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files'
);

-- Allow users to delete files they uploaded
CREATE POLICY IF NOT EXISTS "Users can delete their own deal files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. Create deal_detail_attachments Table
-- ============================================
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

-- ============================================
-- 4. RLS Policies for deal_detail_attachments
-- ============================================

-- Allow users to view attachments for deals they have access to
DROP POLICY IF EXISTS "Users can view deal detail attachments" ON deal_detail_attachments;
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
DROP POLICY IF EXISTS "Authenticated users can upload deal detail attachments" ON deal_detail_attachments;
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
DROP POLICY IF EXISTS "Users can delete their own deal detail attachments" ON deal_detail_attachments;
CREATE POLICY "Users can delete their own deal detail attachments"
  ON deal_detail_attachments
  FOR DELETE
  USING (
    auth.uid() = uploaded_by
  );

-- Add comment
COMMENT ON TABLE deal_detail_attachments IS 'File attachments for deal details section';

-- ============================================
-- 5. Verification
-- ============================================
-- Check if table was created
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deal_detail_attachments'
ORDER BY ordinal_position;

