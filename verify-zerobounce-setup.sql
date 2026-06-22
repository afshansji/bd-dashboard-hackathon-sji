-- Complete Zerobounce Setup Verification Script
-- This checks ALL aspects of the Zerobounce integration
-- Run in: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

-- ========================================
-- 1. CHECK USER AUTHENTICATION & ROLE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. USER AUTHENTICATION & ROLE CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    'Current User' as check_name,
    u.id as user_id,
    u.email,
    u.created_at as user_since
FROM auth.users u
WHERE u.id = auth.uid();

SELECT 
    'User Roles' as check_name,
    ur.role,
    ur.created_at as role_granted_at,
    CASE 
        WHEN ur.role = 'super_admin'::app_role THEN '✅ PASS'
        ELSE '❌ FAIL - Need super_admin role'
    END as status
FROM user_roles ur
WHERE ur.user_id = auth.uid();

SELECT 
    'has_role() Function Test' as check_name,
    has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin,
    CASE 
        WHEN has_role(auth.uid(), 'super_admin'::app_role) = true THEN '✅ PASS'
        ELSE '❌ FAIL - Role check returns false'
    END as status;

-- ========================================
-- 2. CHECK DATABASE TABLES
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '2. DATABASE TABLES CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    'zerobounce_config table' as check_name,
    COUNT(*) as column_count,
    '✅ PASS - Table exists' as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zerobounce_config';

SELECT 
    'zerobounce_validations table' as check_name,
    COUNT(*) as column_count,
    '✅ PASS - Table exists' as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zerobounce_validations';

-- ========================================
-- 3. CHECK ROW LEVEL SECURITY
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '3. ROW LEVEL SECURITY CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    tablename as table_name,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS'
        ELSE '❌ FAIL - No RLS policies'
    END as status
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')
GROUP BY tablename;

SELECT 
    'RLS Policies Detail' as info,
    tablename,
    policyname as policy_name,
    cmd as operation,
    qual as condition
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')
ORDER BY tablename, policyname;

-- ========================================
-- 4. CHECK TABLE STRUCTURE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '4. TABLE STRUCTURE CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    'zerobounce_config columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zerobounce_config'
ORDER BY ordinal_position;

SELECT 
    'zerobounce_validations columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zerobounce_validations'
ORDER BY ordinal_position;

-- ========================================
-- 5. CHECK EXISTING CONFIGURATION
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '5. EXISTING CONFIGURATION CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    'Zerobounce Config Count' as info,
    COUNT(*) as total_configs,
    COUNT(CASE WHEN is_active THEN 1 END) as active_configs,
    CASE 
        WHEN COUNT(CASE WHEN is_active THEN 1 END) = 1 THEN '✅ PASS - One active config'
        WHEN COUNT(CASE WHEN is_active THEN 1 END) = 0 THEN '⚠️ WARN - No active config yet'
        ELSE '❌ FAIL - Multiple active configs'
    END as status
FROM zerobounce_config;

SELECT 
    'Active Configuration' as info,
    id,
    is_active,
    test_status,
    credits_remaining,
    last_tested_at,
    created_at,
    LEFT(api_key, 10) || '...' as api_key_preview
FROM zerobounce_config
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- ========================================
-- 6. CHECK VALIDATION HISTORY
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '6. VALIDATION HISTORY CHECK';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    'Validation Stats' as info,
    COUNT(*) as total_validations,
    COUNT(DISTINCT email) as unique_emails,
    MAX(created_at) as last_validation
FROM zerobounce_validations;

SELECT 
    'Validations by Status' as info,
    validation_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM zerobounce_validations
GROUP BY validation_status
ORDER BY COUNT(*) DESC;

-- ========================================
-- 7. SUMMARY & RECOMMENDATIONS
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '7. SUMMARY';
    RAISE NOTICE '========================================';
END $$;

WITH checks AS (
    SELECT 
        1 as priority,
        'Super Admin Role' as check_item,
        CASE 
            WHEN has_role(auth.uid(), 'super_admin'::app_role) THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as status,
        CASE 
            WHEN has_role(auth.uid(), 'super_admin'::app_role) THEN NULL
            ELSE 'Run: fix-super-admin-role.sql'
        END as action_needed
    
    UNION ALL
    
    SELECT 
        2,
        'zerobounce_config table',
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_config') THEN '✅ PASS'
            ELSE '❌ FAIL'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_config') THEN NULL
            ELSE 'Run: npx supabase db push'
        END
    
    UNION ALL
    
    SELECT 
        3,
        'zerobounce_validations table',
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_validations') THEN '✅ PASS'
            ELSE '❌ FAIL'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_validations') THEN NULL
            ELSE 'Run: npx supabase db push'
        END
    
    UNION ALL
    
    SELECT 
        4,
        'RLS Policies',
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')) THEN '✅ PASS'
            ELSE '❌ FAIL'
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('zerobounce_config', 'zerobounce_validations')) THEN NULL
            ELSE 'Run: npx supabase db push'
        END
)
SELECT * FROM checks ORDER BY priority;

-- ========================================
-- FINAL RESULT
-- ========================================
SELECT 
    CASE 
        WHEN has_role(auth.uid(), 'super_admin'::app_role) 
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_config')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zerobounce_validations')
         AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('zerobounce_config', 'zerobounce_validations'))
        THEN '✅ ALL CHECKS PASSED - Zerobounce integration should work!'
        ELSE '❌ SOME CHECKS FAILED - Follow action_needed steps above'
    END as final_status;


