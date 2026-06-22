-- Zerobounce Integration Diagnostic Query
-- Run this in Supabase SQL Editor to diagnose the issue
-- URL: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

-- ================================================
-- DIAGNOSTIC 1: Check Current User and Role
-- ================================================
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'super_admin'::app_role THEN '✅ HAS SUPER_ADMIN - Integration should work'
    WHEN ur.role IS NULL THEN '❌ NO ROLE ASSIGNED - THIS IS THE PROBLEM'
    ELSE '⚠️ DIFFERENT ROLE: ' || ur.role::text || ' - Need super_admin role'
  END as diagnosis
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = auth.uid();

-- ================================================
-- DIAGNOSTIC 2: Check if has_role function works
-- ================================================
SELECT 
  has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin,
  CASE 
    WHEN has_role(auth.uid(), 'super_admin'::app_role) = true THEN '✅ Role check passes'
    ELSE '❌ Role check fails - Need to grant super_admin role'
  END as status;

-- ================================================
-- DIAGNOSTIC 3: Verify Zerobounce tables exist
-- ================================================
SELECT 
  table_name,
  '✅ Table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY table_name;

-- ================================================
-- DIAGNOSTIC 4: Check RLS policies
-- ================================================
SELECT 
  tablename,
  policyname,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY tablename, policyname;

-- ================================================
-- RESULTS INTERPRETATION:
-- ================================================
-- If DIAGNOSTIC 1 shows "NO ROLE ASSIGNED" or "DIFFERENT ROLE":
--   → Run the FIX script below
--
-- If DIAGNOSTIC 3 shows less than 2 tables:
--   → Run: npx supabase db push --project-ref qzzvcqoletuummdsbbio
--
-- If DIAGNOSTIC 2 returns FALSE:
--   → Run the FIX script below
-- ================================================


