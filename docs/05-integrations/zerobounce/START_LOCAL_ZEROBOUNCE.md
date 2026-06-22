# 🚀 Start Zerobounce Testing Locally - Step by Step

## Current Issue
You're getting: **"Edge Function returned a non-2xx status code"**

This means the function is running but returning an error. Let's fix it!

---

## Quick Fix (Most Common Issue)

### The Problem: Missing super_admin Role

**90% chance this is your issue on local!**

### The Solution (2 minutes):

1. **Open Supabase Studio**: http://localhost:54323

2. **Go to SQL Editor** (left sidebar)

3. **Run this script**: Copy and paste `fix-local-super-admin.sql` or run:

```sql
-- Grant super_admin to all local users
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;
```

4. **IMPORTANT**: Logout and login again in your application

5. **Try again**: Go to Admin → Integration Manager → Save and Connect

---

## Full Setup Guide (If Starting Fresh)

### Step 1: Start Supabase

```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
npx supabase start
```

Wait for it to start. You should see:
```
API URL: http://localhost:54321
Studio URL: http://localhost:54323
```

### Step 2: Reset Database (Apply Migrations)

```bash
npx supabase db reset
```

This will:
- Apply all migrations including Zerobounce tables
- Set up RLS policies
- Create necessary functions

### Step 3: Start Edge Functions

Open a NEW terminal and run:

```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
npx supabase functions serve
```

**Keep this terminal open!** You'll see logs here.

Look for:
```
Serving functions on http://localhost:54321/functions/v1
```

### Step 4: Grant Super Admin Role

1. Open: http://localhost:54323
2. Click "SQL Editor" in sidebar
3. Copy/paste contents of `fix-local-super-admin.sql`
4. Click "Run" (or Ctrl+Enter)
5. Should see "✅ SUCCESS - Has super_admin"

### Step 5: Start Your Application

Open a NEW terminal:

```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
npm run dev
```

### Step 6: Test Zerobounce

1. Open your app: http://localhost:5173 (or whatever port)
2. Login with your local user
3. Go to **Admin** → **Integration Manager**
4. Scroll to **Zerobounce** section
5. Enter API key: `3e4f6c721add4fa2a781195120472499`
6. Click **"Save and Connect"**
7. Should see: **"Zerobounce Connected, Credits: 3524"** ✅

---

## Debugging If Still Failing

### Check #1: Browser Console

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Click "Save and Connect" again
4. Look for error details

**Common errors:**

- `403` → Still need super_admin (logout/login after granting)
- `400` → API key issue or validation error
- `500` → Database or code error

### Check #2: Network Tab

1. F12 → **Network** tab
2. Click "Save and Connect"
3. Find `zerobounce-manage` request
4. Click it → **Response** tab
5. Read the error message

Example responses:

```json
{"error": "Super admin access required"}  ← Need to grant role and re-login
{"error": "API key required"}             ← Empty API key
{"error": "Connection test failed"}       ← Zerobounce API issue
```

### Check #3: Edge Function Logs

Look at the terminal where you ran `npx supabase functions serve`.

**Good logs:**
```
[zerobounce-manage] Testing API key before save
[zerobounce-manage] API key validated, credits: 3524
[zerobounce-manage] Configuration saved successfully
```

**Bad logs:**
```
[zerobounce-manage] Error checking super admin: ...  ← Permission issue
[zerobounce-manage] Save test failed: 400           ← API key issue
[zerobounce-manage] Error saving config: ...        ← Database issue
```

### Check #4: Run Diagnostics

In Supabase Studio SQL Editor, run `diagnose-local-zerobounce.sql`:

This will tell you:
- ✅ or ❌ if you have super_admin
- ✅ or ❌ if tables exist
- ✅ or ❌ if data types are correct
- ✅ or ❌ if you can access zerobounce_config

---

## Common Solutions

### "Super admin access required"

```sql
-- In Supabase Studio
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
```

Then: **Logout and login in your app!**

### "Tables don't exist"

```bash
npx supabase db reset
```

### "Wrong data types" (domain_age_days is text, should be integer)

```bash
npx supabase db reset
```

### "Edge function not found"

Make sure it's running:
```bash
npx supabase functions serve
```

Keep that terminal open!

---

## Verification Checklist

Before testing:

- [ ] Supabase is running (`npx supabase status` shows no errors)
- [ ] Database reset completed (`npx supabase db reset`)
- [ ] Edge function is serving (terminal shows "Serving functions...")
- [ ] Super admin granted (SQL query shows ✅)
- [ ] Logged out and logged back in
- [ ] App is running (`npm run dev`)

---

## Test API Key Directly (Bypass Everything)

If you want to test the API key works at all:

```bash
# In terminal or browser
curl "https://api.zerobounce.net/v2/getcredits?api_key=3e4f6c721add4fa2a781195120472499"
```

Should return: `{"Credits":"3524"}`

Or open: `test-zerobounce-direct.html` in browser

---

## Still Stuck?

### Share These Details:

1. **Status code from Network tab**: 403, 400, or 500?
2. **Error message from Response tab**: The exact JSON error
3. **Edge function terminal logs**: What it printed when you clicked button
4. **Diagnostic results**: Output from `diagnose-local-zerobounce.sql`
5. **Super admin check**:
   ```sql
   SELECT u.email, ur.role 
   FROM auth.users u 
   LEFT JOIN user_roles ur ON u.id = ur.user_id;
   ```

### Files to Help:

- `LOCAL_ZEROBOUNCE_DEBUG.md` - Detailed debugging guide
- `diagnose-local-zerobounce.sql` - Run diagnostics
- `fix-local-super-admin.sql` - Grant super_admin role

---

## Expected Success

When everything works:

1. Browser shows toast: **"Zerobounce Connected, Credits: 3524"**
2. Console shows: `POST .../zerobounce-manage 200 OK`
3. Edge function logs show: `Configuration saved successfully`
4. No errors anywhere!

---

**Last Updated**: December 1, 2025

