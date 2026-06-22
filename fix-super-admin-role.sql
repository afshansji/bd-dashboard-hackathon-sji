-- Zerobounce Integration Fix: Grant Super Admin Role
-- Run this in Supabase SQL Editor ONLY if diagnosis shows missing super_admin role
-- URL: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

-- ================================================
-- STEP 1: Find your user email
-- ================================================
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = auth.uid();

-- ================================================
-- STEP 2: Grant super_admin role to your user
-- ================================================
-- IMPORTANT: Replace 'YOUR_EMAIL@example.com' with your actual email from STEP 1

INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'  -- CHANGE THIS!
ON CONFLICT (user_id, role) DO NOTHING;

-- ================================================
-- STEP 3: Verify the fix worked
-- ================================================
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
-- STEP 4: Test the has_role function
-- ================================================
SELECT 
  has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin_role,
  CASE 
    WHEN has_role(auth.uid(), 'super_admin'::app_role) = true 
    THEN '✅ Role check passes - Zerobounce integration should now work'
    ELSE '❌ Still failing - Contact support'
  END as status;

-- ================================================
-- NEXT STEPS:
-- 1. After running this script successfully
-- 2. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)
-- 3. Log out and log back in to get fresh session
-- 4. Go to Admin Panel → Integration Manager
-- 5. Try testing Zerobounce connection again
-- ================================================


