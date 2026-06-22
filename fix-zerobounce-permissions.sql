-- ================================================
-- Zerobounce Integration - Permission Fix Script
-- ================================================
-- Run this in your Supabase SQL Editor to diagnose and fix permission issues
-- URL: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

-- ================================================
-- STEP 1: Check your current user and role
-- ================================================
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'super_admin'::app_role THEN '✅ HAS SUPER_ADMIN'
    WHEN ur.role IS NULL THEN '❌ NO ROLE ASSIGNED'
    ELSE '⚠️ DIFFERENT ROLE: ' || ur.role::text
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = auth.uid();

-- If the above query shows NO ROLE or DIFFERENT ROLE, run the fix below:

-- ================================================
-- STEP 2: Grant super_admin role to yourself
-- ================================================
-- ⚠️ IMPORTANT: Replace 'your-email@example.com' with YOUR actual email address

-- Uncomment and modify the line below:
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'super_admin'::app_role
-- FROM auth.users
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;


-- ================================================
-- STEP 3: Verify the fix worked
-- ================================================
-- Run this after granting the role:
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_granted_at,
  '✅ SUCCESS - You now have super_admin role' as status
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = auth.uid()
  AND ur.role = 'super_admin'::app_role;


-- ================================================
-- STEP 4: Verify Zerobounce tables exist
-- ================================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('zerobounce_config', 'zerobounce_validations');


-- ================================================
-- STEP 5: Check if RLS policies are set up correctly
-- ================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY tablename, policyname;


-- ================================================
-- STEP 6: Check if has_role function exists
-- ================================================
SELECT 
  routine_name,
  routine_type,
  '✅ Function exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'has_role';


-- ================================================
-- STEP 7: Test the has_role function directly
-- ================================================
-- This should return TRUE if you have super_admin role:
SELECT has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin_role;


-- ================================================
-- STEP 8: View existing Zerobounce configurations
-- ================================================
-- This will only show results if you have super_admin role
SELECT 
  id,
  is_active,
  last_tested_at,
  test_status,
  credits_remaining,
  created_at,
  LEFT(api_key, 10) || '...' as api_key_preview  -- Only show first 10 chars for security
FROM zerobounce_config
ORDER BY created_at DESC
LIMIT 5;


-- ================================================
-- TROUBLESHOOTING SUMMARY
-- ================================================
-- If you get errors:
-- 
-- 1. "permission denied for table zerobounce_config"
--    → You don't have super_admin role. Run STEP 2 above.
--
-- 2. "relation 'zerobounce_config' does not exist"
--    → Database migration not applied. Run: npx supabase db push
--
-- 3. "function has_role does not exist"
--    → Missing function. Check your migrations are applied.
--
-- 4. STEP 7 returns FALSE
--    → You don't have super_admin role. Run STEP 2 above.
--
-- 5. STEP 1 shows no results
--    → You're not logged in or session expired. Log in again.
-- ================================================



