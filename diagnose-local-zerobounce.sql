-- Diagnostic Script for Local Zerobounce Issues
-- Run this in Supabase Studio: http://localhost:54323

\echo '===================================='
\echo 'ZEROBOUNCE LOCAL DIAGNOSTICS'
\echo '===================================='
\echo ''

-- 1. CHECK CURRENT USER
\echo '1. Checking your current user:'
\echo '---'
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE id = auth.uid();
\echo ''

-- 2. CHECK USER ROLES
\echo '2. Checking your roles:'
\echo '---'
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at,
  CASE 
    WHEN ur.role = 'super_admin' THEN '✅ HAS SUPER_ADMIN - Can manage Zerobounce'
    WHEN ur.role IS NULL THEN '❌ NO ROLE ASSIGNED - Cannot manage Zerobounce'
    ELSE '⚠️  HAS ' || ur.role || ' - Needs super_admin for Zerobounce'
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = auth.uid();
\echo ''

-- 3. TEST has_role FUNCTION
\echo '3. Testing has_role() function:'
\echo '---'
SELECT 
  has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin,
  CASE 
    WHEN has_role(auth.uid(), 'super_admin'::app_role) THEN '✅ PASS - You have super_admin access'
    ELSE '❌ FAIL - You need super_admin role'
  END as result;
\echo ''

-- 4. CHECK ZEROBOUNCE TABLES
\echo '4. Checking Zerobounce database tables:'
\echo '---'
SELECT 
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY table_name;
\echo ''

-- 5. CHECK TABLE COLUMNS
\echo '5. Checking zerobounce_validations columns (for type issues):'
\echo '---'
SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'domain_age_days' AND data_type = 'integer' THEN '✅ CORRECT'
    WHEN column_name = 'domain_age_days' AND data_type != 'integer' THEN '❌ WRONG - Should be integer, is ' || data_type
    WHEN column_name = 'mx_found' AND data_type = 'boolean' THEN '✅ CORRECT'
    WHEN column_name = 'mx_found' AND data_type != 'boolean' THEN '❌ WRONG - Should be boolean, is ' || data_type
    ELSE '✅ OK'
  END as type_check
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zerobounce_validations'
  AND column_name IN ('domain_age_days', 'mx_found', 'free_email', 'validation_status')
ORDER BY column_name;
\echo ''

-- 6. CHECK RLS POLICIES
\echo '6. Checking Row Level Security policies:'
\echo '---'
SELECT 
  tablename,
  policyname,
  '✅ EXISTS' as status
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY tablename, policyname;
\echo ''

-- 7. CHECK EXISTING CONFIG
\echo '7. Checking if Zerobounce is already configured:'
\echo '---'
SELECT 
  COUNT(*) as config_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️  Already configured'
    ELSE 'ℹ️  Not configured yet'
  END as status
FROM zerobounce_config
WHERE is_active = true;
\echo ''

-- 8. CHECK IF YOU CAN ACCESS CONFIG TABLE
\echo '8. Testing if you can SELECT from zerobounce_config:'
\echo '---'
DO $$
DECLARE
  can_access boolean;
BEGIN
  BEGIN
    PERFORM 1 FROM zerobounce_config LIMIT 1;
    can_access := true;
  EXCEPTION WHEN insufficient_privilege THEN
    can_access := false;
  END;
  
  IF can_access THEN
    RAISE NOTICE '✅ PASS - You can access zerobounce_config';
  ELSE
    RAISE NOTICE '❌ FAIL - Permission denied on zerobounce_config (need super_admin)';
  END IF;
END $$;
\echo ''

\echo '===================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '===================================='
\echo ''
\echo 'INTERPRETATION:'
\echo ''
\echo 'If diagnostic #2 shows NO ROLE or not super_admin:'
\echo '  → Run fix-local-super-admin.sql'
\echo ''
\echo 'If diagnostic #4 shows missing tables:'
\echo '  → Run: npx supabase db reset'
\echo ''
\echo 'If diagnostic #5 shows wrong data types:'
\echo '  → Run: npx supabase db reset'
\echo ''
\echo 'If diagnostic #8 shows permission denied:'
\echo '  → Run fix-local-super-admin.sql then logout/login'
\echo ''

