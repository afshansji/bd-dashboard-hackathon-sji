-- Fix Local Super Admin Role for Zerobounce
-- Run this in Supabase Studio: http://localhost:54323

\echo '===================================='
\echo 'GRANTING SUPER_ADMIN ROLE LOCALLY'
\echo '===================================='
\echo ''

-- STEP 1: Show all users
\echo 'STEP 1: Your current users:'
\echo '---'
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;
\echo ''

-- STEP 2: Grant super_admin to ALL users (for local development)
\echo 'STEP 2: Granting super_admin role to all users...'
\echo '---'
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
\echo 'Done!'
\echo ''

-- STEP 3: Verify
\echo 'STEP 3: Verifying roles granted:'
\echo '---'
SELECT 
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'super_admin' THEN '✅ SUCCESS - Has super_admin'
    ELSE '⚠️  Has ' || COALESCE(ur.role::text, 'NO ROLE')
  END as status,
  ur.created_at as role_granted_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at;
\echo ''

-- STEP 4: Test the has_role function
\echo 'STEP 4: Testing has_role() function:'
\echo '---'
SELECT 
  has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin,
  CASE 
    WHEN has_role(auth.uid(), 'super_admin'::app_role) THEN '✅ SUCCESS - You now have super_admin access!'
    ELSE '❌ FAILED - Still no access (try logout/login)'
  END as message;
\echo ''

\echo '===================================='
\echo 'NEXT STEPS'
\echo '===================================='
\echo ''
\echo '1. ✅ Super admin role granted'
\echo '2. 🔄 LOGOUT and LOGIN again in your app'
\echo '3. 🧪 Try "Save and Connect" in Integration Manager'
\echo '4. ✅ Should work now!'
\echo ''
\echo 'If still failing after logout/login:'
\echo '  - Check browser console (F12) for detailed error'
\echo '  - Check edge function terminal for logs'
\echo '  - See LOCAL_ZEROBOUNCE_DEBUG.md for troubleshooting'
\echo ''

