# Zerobounce Integration Troubleshooting Guide

## Current Error: "FunctionsHttpError: Edge Function returned a non-2xx status code"

This error means the edge function is deployed but returning an error response. Here's how to diagnose and fix it.

---

## Quick Diagnosis Steps

### Step 1: Test Your API Key Directly

Open the test file in your browser:
```bash
# Open this file in your browser:
sj-bd-dashboard/test-zerobounce-api.html
```

This will test your Zerobounce API key **directly** (bypassing Supabase) to confirm if your API key is valid.

**Expected Results:**
- ✅ **Success**: Shows credit balance → Your API key is valid, issue is with edge function
- ❌ **Failed**: API error → Your API key is invalid or expired

---

### Step 2: Check Your User Role

The edge function requires `super_admin` role. Run this in your Supabase SQL Editor:

```sql
-- Check if you have super_admin role
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.id = auth.uid();
```

**Expected Result:**
- Should show `super_admin` role for your user
- If no rows or different role → **THIS IS YOUR PROBLEM**

**To Fix: Grant Super Admin Role**
```sql
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

### Step 3: Check Edge Function Deployment

Run in terminal:
```bash
cd sj-bd-dashboard
npx supabase functions list --project-ref qzzvcqoletuummdsbbio
```

**Expected Result:**
- `zerobounce-manage` should be in the list
- If NOT listed → Function not deployed

**To Fix: Deploy the Function**
```bash
npx supabase functions deploy zerobounce-manage --project-ref qzzvcqoletuummdsbbio
```

---

### Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try the test again
4. Look for detailed error message

Common errors you might see:
- `"Super admin access required"` → Missing super_admin role (see Step 2)
- `"API key required"` → Empty API key submitted
- `"Connection test failed"` → Invalid API key (test with Step 1)
- `401 Unauthorized` → Not logged in or session expired

---

## Common Issues and Solutions

### Issue 1: "Super admin access required"

**Cause:** Your user doesn't have the `super_admin` role.

**Solution:**
```sql
-- Grant yourself super_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Then refresh your browser and try again.

---

### Issue 2: Invalid API Key

**Cause:** The Zerobounce API key is wrong or expired.

**Solution:**
1. Go to https://www.zerobounce.net/members/api/
2. Copy your API key
3. Test it using `test-zerobounce-api.html` file
4. If it works there but not in the app, contact your admin

---

### Issue 3: Edge Function Not Deployed

**Cause:** The `zerobounce-manage` edge function isn't deployed to Supabase.

**Solution:**
```bash
cd sj-bd-dashboard
npx supabase login
npx supabase functions deploy zerobounce-manage --project-ref qzzvcqoletuummdsbbio
```

---

### Issue 4: CORS or Network Issues

**Cause:** Browser blocking request or network connectivity.

**Solution:**
1. Check browser console for CORS errors
2. Ensure you're logged into Supabase
3. Try in incognito mode
4. Check if Supabase is accessible

---

### Issue 5: Database Tables Missing

**Cause:** Migration wasn't applied.

**Check:**
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zerobounce_config', 'zerobounce_validations');
```

**Solution if missing:**
```bash
npx supabase db push --project-ref qzzvcqoletuummdsbbio
```

---

## How to Get Detailed Error Logs

### Method 1: Browser Console (Easiest)

1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Click "Test" button in Integration Manager
5. Look for red error messages

### Method 2: Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio
2. Click "Edge Functions" in sidebar
3. Click on `zerobounce-manage`
4. View "Logs" tab
5. Look for recent error entries

### Method 3: Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Test" button
4. Find the request to `zerobounce-manage`
5. Click on it and view Response tab

---

## API Endpoints Reference

### Zerobounce API (Direct)

**Get Credits:**
```
GET https://api.zerobounce.net/v2/getcredits?api_key=YOUR_API_KEY
```

**Validate Email:**
```
GET https://api.zerobounce.net/v2/validate?api_key=YOUR_API_KEY&email=test@example.com
```

### Your Edge Function

**Test API Key:**
```javascript
await supabase.functions.invoke("zerobounce-manage", {
  body: {
    action: "test",
    apiKey: "YOUR_API_KEY"
  }
});
```

**Save API Key:**
```javascript
await supabase.functions.invoke("zerobounce-manage", {
  body: {
    action: "save",
    apiKey: "YOUR_API_KEY"
  }
});
```

**Validate Emails:**
```javascript
await supabase.functions.invoke("zerobounce-manage", {
  body: {
    action: "validate",
    emails: ["test@example.com"]
  }
});
```

**Get Credits:**
```javascript
await supabase.functions.invoke("zerobounce-manage", {
  body: {
    action: "get-credits"
  }
});
```

---

## Testing Checklist

Run through this checklist:

- [ ] Your Zerobounce API key is valid (test with `test-zerobounce-api.html`)
- [ ] You have `super_admin` role in the database
- [ ] You're logged into the application
- [ ] The `zerobounce-manage` edge function is deployed
- [ ] Database tables exist (`zerobounce_config`, `zerobounce_validations`)
- [ ] You're using a valid Supabase session (not expired)
- [ ] Browser console shows the actual error message

---

## Still Not Working?

If you've gone through all the steps above and it's still not working:

1. **Check the exact error in browser console** - Share the full error message
2. **Check Supabase edge function logs** - Look for the actual error
3. **Verify the edge function code** - Ensure it matches the expected implementation
4. **Check your Supabase project settings** - Ensure edge functions are enabled

### Get Help

When asking for help, provide:
1. Full error message from browser console
2. Your user role (from Step 2 query)
3. Whether the API key works in the test HTML file
4. Any errors from Supabase edge function logs

---

## Quick Fix Script

If you have database access, run this to set everything up:

```sql
-- 1. Grant super_admin role to yourself
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Verify tables exist
SELECT 
  'zerobounce_config' as table_name,
  COUNT(*) as row_count
FROM zerobounce_config
UNION ALL
SELECT 
  'zerobounce_validations',
  COUNT(*)
FROM zerobounce_validations;

-- 3. Check if any config exists
SELECT 
  id,
  is_active,
  last_tested_at,
  test_status,
  credits_remaining
FROM zerobounce_config;
```

Then:
```bash
# Deploy the edge function
npx supabase functions deploy zerobounce-manage --project-ref qzzvcqoletuummdsbbio
```

---

**Last Updated:** 2025-11-28






