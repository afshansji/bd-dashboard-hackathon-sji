# 🔧 Local Zerobounce Debugging Guide

## The Issue

You're getting: **"Edge Function returned a non-2xx status code"**

This means the edge function IS running but returning an error. Let's debug it step by step.

---

## Step 1: Check What Error Code Is Being Returned

### Open Browser DevTools Console (F12)

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Clear the console (trash icon)
4. Click "Save and Connect" again
5. Look for the detailed error

**What to look for:**

```
FunctionsHttpError: Edge Function returned a non-2xx status code
  status: 403   ← This tells us it's a permission error
  or
  status: 400   ← This tells us it's a bad request
  or
  status: 500   ← This tells us it's a server error
```

### Also Check Network Tab

1. Press **F12** → **Network** tab
2. Click "Save and Connect"
3. Look for request to `zerobounce-manage`
4. Click on it
5. Go to **Response** tab
6. You'll see the actual error message like:
   ```json
   {"error": "Super admin access required"}
   ```

---

## Step 2: Common Local Errors & Solutions

### Error: "Super admin access required" (403)

**Cause**: Your local user doesn't have super_admin role

**Solution**: Grant yourself super_admin role in local database

```sql
-- In Supabase Studio SQL Editor (http://localhost:54323)
-- First, check your user ID
SELECT id, email FROM auth.users;

-- Then grant super_admin role (replace with your user ID)
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR-USER-ID-HERE', 'super_admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;
```

**Important**: After granting role, **logout and login again** in your app!

---

### Error: "Zerobounce not configured" or "API key required" (400)

**Cause**: API key is empty or not being sent

**Solution**: Make sure you entered the API key before clicking the button

---

### Error: "Connection test failed" or "API test failed" (400)

**Cause**: The Zerobounce API itself is failing

**Solution**: Test the API key directly first

```bash
# Test in terminal/command prompt
curl "https://api.zerobounce.net/v2/getcredits?api_key=3e4f6c721add4fa2a781195120472499"
```

Should return: `{"Credits":"3524"}`

---

### Error: Database error or "column does not exist" (500)

**Cause**: Database migration not applied to local database

**Solution**: Apply the migration

```bash
# In your terminal, from sj-bd-dashboard directory
npx supabase db reset

# Or apply just the zerobounce migrations
npx supabase migration up
```

---

## Step 3: Verify Local Setup

### 3.1: Check if Edge Function is Running

```bash
# Should show output like:
# Serving functions on http://localhost:54321/functions/v1/zerobounce-manage

# If NOT running, start it:
npx supabase functions serve zerobounce-manage

# Or serve all functions:
npx supabase functions serve
```

### 3.2: Check Local Database Tables

Open Supabase Studio: http://localhost:54323

Run this SQL:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zerobounce_config', 'zerobounce_validations');

-- Should return 2 rows:
-- zerobounce_config
-- zerobounce_validations
```

If tables don't exist:

```bash
npx supabase db reset
# or
npx supabase migration up
```

### 3.3: Check RLS Policies

```sql
-- Check if policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('zerobounce_config', 'zerobounce_validations');

-- Should return multiple policies
```

---

## Step 4: Test Edge Function Directly

### Test in Terminal

```bash
# Test the edge function directly (make sure it's running first)
curl -X POST http://localhost:54321/functions/v1/zerobounce-manage \
  -H "Authorization: Bearer YOUR_LOCAL_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"test","apiKey":"3e4f6c721add4fa2a781195120472499"}'
```

To get your JWT token:
1. Open Browser DevTools (F12)
2. Go to Application/Storage → Local Storage
3. Find `supabase.auth.token`
4. Copy the `access_token` value

---

## Step 5: Check Edge Function Logs

When you run the edge function locally, logs appear in the terminal where you ran `npx supabase functions serve`.

Look for:
- `[zerobounce-manage] Testing API key` ✅ Good
- `[zerobounce-manage] Test successful` ✅ Good
- `[zerobounce-manage] Error checking super admin` ❌ Permission issue
- `[zerobounce-manage] Test failed` ❌ API issue

---

## Quick Fix Script for Local

Run this in Supabase Studio (http://localhost:54323):

```sql
-- 1. Check your user
SELECT id, email FROM auth.users;

-- 2. Grant super_admin (replace USER-ID)
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com'  -- Replace with your email
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verify
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'YOUR-EMAIL@example.com';  -- Replace with your email

-- Should show super_admin role
```

---

## Step 6: Complete Local Test Procedure

1. **Start Supabase** (if not running):
   ```bash
   npx supabase start
   ```

2. **Apply Migrations**:
   ```bash
   npx supabase db reset
   ```

3. **Start Edge Function**:
   ```bash
   npx supabase functions serve zerobounce-manage
   ```

4. **Start Your App**:
   ```bash
   npm run dev
   ```

5. **Grant Super Admin** (in Supabase Studio SQL Editor):
   ```sql
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'super_admin'::app_role
   FROM auth.users
   WHERE email = 'YOUR-EMAIL@example.com'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

6. **Login to your app**

7. **Test Zerobounce**:
   - Go to Admin → Integration Manager
   - Enter API key: `3e4f6c721add4fa2a781195120472499`
   - Click "Save and Connect"

---

## What To Check in Browser Console

When you click "Save and Connect", you should see:

**Good:**
```
POST http://localhost:54321/functions/v1/zerobounce-manage 200 OK
```

**Bad:**
```
POST http://localhost:54321/functions/v1/zerobounce-manage 403 Forbidden
→ "Super admin access required"
```

```
POST http://localhost:54321/functions/v1/zerobounce-manage 400 Bad Request
→ "API key required" or "Connection test failed"
```

```
POST http://localhost:54321/functions/v1/zerobounce-manage 500 Internal Server Error
→ Database error or code error
```

---

## Still Failing? Get Detailed Logs

### 1. Check Edge Function Terminal Output

Look at the terminal where you ran `npx supabase functions serve`

### 2. Add Console Logs

If you need more debugging, check the browser console for the full error object:

```javascript
// The error object should show:
{
  name: "FunctionsHttpError",
  context: {
    status: 403,  // Or 400, 500, etc.
    statusText: "Forbidden"
  }
}
```

### 3. Check the Response Body

In Network tab → zerobounce-manage request → Response tab:

```json
{
  "error": "Super admin access required"  // ← The actual error
}
```

---

## Most Likely Issue: Super Admin Role

**90% of the time, this is the issue on local.**

Quick fix:

```sql
-- Run in Supabase Studio SQL Editor
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
LIMIT 1  -- This grants it to the first user
ON CONFLICT (user_id, role) DO NOTHING;
```

Then:
1. Logout of your app
2. Login again
3. Try "Save and Connect" again

---

## Summary Checklist

- [ ] Supabase is running (`npx supabase start`)
- [ ] Database has zerobounce tables (check in Studio)
- [ ] Edge function is running (`npx supabase functions serve zerobounce-manage`)
- [ ] You have super_admin role (check in SQL)
- [ ] You've logged out and logged back in after granting role
- [ ] Browser console shows the actual error message
- [ ] API key is correct: `3e4f6c721add4fa2a781195120472499`

---

**Need Help?**

Share these details:
1. The status code from Network tab (403, 400, 500, etc.)
2. The error message from Response tab
3. The console logs from edge function terminal
4. Your super_admin role status

---

**Last Updated**: December 1, 2025

