-- DIAGNOSTIC: Check why feedback attachments are not showing
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if feedback_attachments table exists
SELECT 'Step 1: Checking if feedback_attachments table exists...' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'feedback_attachments'
) as table_exists;

-- 2. Check table structure if it exists
SELECT 'Step 2: Checking table structure...' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'feedback_attachments'
ORDER BY ordinal_position;

-- 3. Check RLS policies on the table
SELECT 'Step 3: Checking RLS policies...' as step;
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'feedback_attachments';

-- 4. Check if there are any attachments in the table
SELECT 'Step 4: Checking existing attachments...' as step;
SELECT COUNT(*) as total_attachments FROM public.feedback_attachments;

-- 5. List recent attachments (if any)
SELECT 'Step 5: Recent attachments (last 10)...' as step;
SELECT id, feedback_id, file_name, file_path, file_size, created_at 
FROM public.feedback_attachments 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Check recent feedback reports with their attachment_url (legacy)
SELECT 'Step 6: Recent feedback reports...' as step;
SELECT id, subject, attachment_url, created_at 
FROM public.feedback_reports 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Check storage buckets
SELECT 'Step 7: Checking storage buckets...' as step;
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE name = 'feedback';

-- 8. Check storage objects in feedback bucket
SELECT 'Step 8: Files in feedback bucket (last 10)...' as step;
SELECT name, bucket_id, created_at, metadata
FROM storage.objects 
WHERE bucket_id = 'feedback'
ORDER BY created_at DESC
LIMIT 10;

-- 9. Check storage policies
SELECT 'Step 9: Storage bucket policies...' as step;
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

