# Zerobounce Fix - Manual Deployment Instructions

## If Automated Scripts Don't Work

Follow these manual steps to deploy the Zerobounce fixes.

---

## Step 1: Login to Supabase

Open a terminal in the project directory and login:

```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
npx supabase login
```

This will open your browser for authentication. Complete the login process.

---

## Step 2: Apply Database Migration

### Option A: Using Supabase CLI (Recommended)

```bash
npx supabase db push
```

If you get an error about invalid config, you can apply the migration directly to the database.

### Option B: Using Supabase SQL Editor (Alternative)

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

2. Open the file in your editor: `supabase/migrations/20251201000000_fix_zerobounce_types.sql`

3. Copy the ENTIRE contents of the file

4. Paste into the Supabase SQL Editor

5. Click the **"Run"** button (or press Ctrl/Cmd + Enter)

6. Verify success - you should see "Success. No rows returned"

---

## Step 3: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
npx supabase functions deploy zerobounce-manage
```

### Option B: Using Supabase Dashboard (Alternative)

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions

2. Look for `zerobounce-manage` in the functions list

3. Click on it (or create new if it doesn't exist)

4. Open the file in your editor: `supabase/functions/zerobounce-manage/index.ts`

5. Copy the ENTIRE contents of the file

6. Paste into the Supabase function editor

7. Click **"Deploy"**

8. Wait for deployment to complete (usually takes 30-60 seconds)

---

## Step 4: Verify Deployment

### 4.1: Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions/zerobounce-manage

2. Click on the **"Logs"** tab

3. Look for any deployment errors (there should be none)

### 4.2: Test API Key in Browser

1. Open the file: `test-zerobounce-direct.html` in your browser

2. Your API key should be pre-filled: `3e4f6c721add4fa2a781195120472499`

3. Click **"Test Get Credits"**

4. You should see:
   ```
   ✅ SUCCESS!
   
   API Key: Valid
   Credits: 3524
   ```

### 4.3: Test in Application

1. Open your application and login

2. Go to: **Admin Panel** → **Integration Manager**

3. Scroll down to the **Zerobounce** section

4. Enter the API key: `3e4f6c721add4fa2a781195120472499`

5. Click **"Test Connection"**

6. You should see a success message:
   ```
   ✅ Connection successful
   Zerobounce API is working. Credits remaining: 3524
   ```

7. Try the **"Save"** button to save the API key

8. The status should show "Zerobounce Connected" with credit count

---

## Step 5: Test Email Validation (Optional)

1. In your application, go to a campaign

2. Try adding a contact with email validation enabled

3. Or use the direct test:

```bash
# Test validate API endpoint directly
curl "https://api.zerobounce.net/v2/validate?api_key=3e4f6c721add4fa2a781195120472499&email=test@gmail.com"
```

4. Should return validation results without errors

---

## Troubleshooting

### Issue: "Super admin access required" when testing

**Solution**: Grant yourself super_admin role

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

2. Run this SQL (replace with YOUR email):

```sql
-- Check your current email first
SELECT email FROM auth.users WHERE id = auth.uid();

-- Grant super_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'  -- Replace with your email
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT u.email, ur.role
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'YOUR_EMAIL@example.com';  -- Replace with your email
```

3. **Important**: Refresh your browser (Ctrl+F5) or logout and login again

---

### Issue: Cannot login to Supabase CLI

**Solution**: Use access token instead

1. Go to: https://supabase.com/dashboard/account/tokens

2. Generate a new access token

3. Set it as environment variable:

**Windows (PowerShell)**:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "your-token-here"
```

**Linux/Mac (Bash)**:
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
```

4. Now run the deployment commands again

---

### Issue: Config file errors when running commands

**Solution**: Deploy functions individually

Instead of:
```bash
npx supabase db push
```

Try:
```bash
npx supabase db push --linked
```

Or use the Supabase Dashboard method (Option B in each step)

---

### Issue: API key test works in browser but not in app

**Possible causes**:

1. **Edge function not deployed**: Check deployment status in Supabase Dashboard

2. **Old function version cached**: 
   - Wait 2-3 minutes for cache to clear
   - Or restart the edge function from dashboard

3. **Permission issue**: Make sure you have super_admin role (see above)

4. **Session expired**: Logout and login again in your application

---

## Verification Checklist

After completing all steps, verify:

- [ ] Database migration applied (no errors in SQL editor)
- [ ] Edge function deployed (shows in Supabase Dashboard)
- [ ] Browser test shows 3524 credits
- [ ] Application test shows "Connection successful"
- [ ] You have super_admin role assigned
- [ ] Can save API key in Integration Manager

---

## Need Help?

If you're still having issues:

1. Check the Supabase edge function logs:
   https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions

2. Check browser console (F12) for JavaScript errors

3. Verify your API key is still valid at:
   https://www.zerobounce.net/members/api/

4. Review the detailed troubleshooting guide:
   `ZEROBOUNCE_TROUBLESHOOTING.md`

---

## What Changed?

**The fix adds proper type conversion in the edge function:**

- Converts `domain_age_days` from string to integer
- Converts `mx_found` from string to boolean
- Handles null values properly for all optional fields
- Ensures database schema matches expected types

**This prevents database insertion errors that were causing the integration to fail.**

---

**Last Updated**: December 1, 2025
**Status**: Ready for Manual Deployment

