# Zerobounce Integration - Local Testing Guide

This guide walks you through testing the Zerobounce integration fix on your local development environment.

---

## Prerequisites

Before testing locally, ensure you have:

- [ ] Supabase CLI installed (`npx supabase --version`)
- [ ] Local Supabase instance running
- [ ] Database migrations applied locally
- [ ] Valid Zerobounce API key for testing
- [ ] Local dev server running (`npm run dev`)

---

## Step 1: Start Local Supabase (5 minutes)

### Check if Supabase is Running

```bash
cd sj-bd-dashboard
npx supabase status
```

### If Not Running, Start It

```bash
npx supabase start
```

**Expected output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: your-jwt-secret
        anon key: your-anon-key
service_role key: your-service-role-key
```

**Important:** Save these values, you'll need them!

---

## Step 2: Apply Database Migrations (2 minutes)

Apply Zerobounce migrations to your local database:

```bash
# Reset and apply all migrations (recommended for clean slate)
npx supabase db reset

# Or just apply new migrations
npx supabase db push
```

### Verify Tables Were Created

```bash
# Connect to local database
npx supabase db shell
```

Then run:
```sql
-- Check if Zerobounce tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zerobounce_config', 'zerobounce_validations');

-- Should show 2 rows
\q
```

---

## Step 3: Create Local Test User with Super Admin Role (3 minutes)

### Option A: Using Supabase Studio (Easiest)

1. Open Studio: http://localhost:54323
2. Go to **Authentication** → **Users**
3. Click **Add user**
4. Fill in:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Auto Confirm: ✅ Yes
5. Click **Create user**
6. Note the user ID (you'll need it next)

### Option B: Using SQL

```bash
npx supabase db shell
```

```sql
-- Create test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;
-- Save the returned ID!

\q
```

### Grant Super Admin Role

```bash
npx supabase db shell
```

```sql
-- Replace USER_ID with the ID from above
INSERT INTO user_roles (user_id, role)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'super_admin'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was granted
SELECT 
  u.email,
  ur.role
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'test@example.com';

-- Should show: test@example.com | super_admin

\q
```

---

## Step 4: Deploy Edge Function Locally (2 minutes)

### Start Local Edge Functions

```bash
# In a new terminal window/tab
cd sj-bd-dashboard
npx supabase functions serve zerobounce-manage
```

**Expected output:**
```
Serving functions on http://localhost:54321/functions/v1/zerobounce-manage
```

**Leave this terminal running!**

---

## Step 5: Start Frontend Dev Server (1 minute)

### If Not Already Running

```bash
# In another terminal window/tab
cd sj-bd-dashboard
npm run dev
```

Should start on: http://localhost:8080

---

## Step 6: Configure Local Environment (2 minutes)

### Update .env or .env.local

Make sure your app points to local Supabase:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key-from-step-1
```

**Restart dev server** after changing env files.

---

## Step 7: Test the Fix (10 minutes)

### Test 7.1: Log In to Local App

1. Open browser: http://localhost:8080
2. Log in with:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Should successfully log in

### Test 7.2: Verify Super Admin Role in Database

```bash
npx supabase db shell
```

```sql
-- Check if logged-in user has super_admin role
SELECT 
  u.email,
  ur.role,
  has_role(u.id, 'super_admin'::app_role) as has_super_admin
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'test@example.com';

-- Expected:
-- test@example.com | super_admin | true

\q
```

### Test 7.3: Test Zerobounce API Key Directly

1. Open: http://localhost:8080/test-zerobounce-api.html
2. Enter your **real Zerobounce API key**
3. Click "Test API Key (Get Credits)"

**Expected Result:**
```
✅ SUCCESS!
Credits Remaining: [YOUR_CREDIT_COUNT]
```

**If this fails:** Your API key is invalid. Get a new one from Zerobounce.

### Test 7.4: Test Edge Function Directly

```bash
# Test using curl (replace with your API key)
curl -X POST http://localhost:54321/functions/v1/zerobounce-manage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -d '{
    "action": "test",
    "apiKey": "YOUR_ZEROBOUNCE_API_KEY"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "credits": 1234
}
```

**If you get 401 Unauthorized:** Add proper auth token (use session token from browser DevTools)

### Test 7.5: Test Integration Manager UI

1. In your local app: http://localhost:8080
2. Navigate to **Admin Panel** → **Integration Manager**
3. Scroll to **Zerobounce** section
4. Enter your Zerobounce API key
5. Click **"Test"** button

**Expected Success:**
```
✅ Connection successful
Zerobounce API is working. Credits remaining: [COUNT]
```

**If you see error:** Check browser console (F12) for details

### Test 7.6: Save Configuration

1. After successful test, click **"Save & Connect"**
2. Should see success message
3. Zerobounce section should show "Connected" status

### Test 7.7: Verify Configuration in Database

```bash
npx supabase db shell
```

```sql
-- Check saved configuration
SELECT 
  id,
  is_active,
  test_status,
  credits_remaining,
  last_tested_at,
  LEFT(api_key, 10) || '...' as api_key_preview
FROM zerobounce_config
WHERE is_active = true;

-- Should show one active configuration

\q
```

### Test 7.8: Test Email Validation

1. Go to any campaign in your local app
2. Click **"Add Contact"**
3. Fill in:
   - First Name: Test
   - Last Name: User
   - Email: Use a real email (e.g., your email)
4. Click **"Add Contact"**

**Expected Result:**
- Email is validated automatically
- Contact is added with validation status
- Should see validation badge (✅ Valid, ⚠️ Unknown, or ❌ Invalid)

### Test 7.9: Verify Validation in Database

```bash
npx supabase db shell
```

```sql
-- Check validation was recorded
SELECT 
  email,
  validation_status,
  sub_status,
  created_at
FROM zerobounce_validations
ORDER BY created_at DESC
LIMIT 5;

-- Should show the email(s) you just validated

\q
```

---

## Step 8: Test Error Scenarios (5 minutes)

### Test 8.1: Test Without Super Admin Role

```bash
npx supabase db shell
```

```sql
-- Temporarily remove super_admin role
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
  AND role = 'super_admin'::app_role;

\q
```

**In the app:**
1. Refresh page
2. Try to test Zerobounce connection
3. Should see error: "Super admin access required" or similar

**Restore role:**
```bash
npx supabase db shell
```

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'test@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

\q
```

### Test 8.2: Test with Invalid API Key

1. In Integration Manager
2. Enter invalid API key: `invalid_key_12345`
3. Click "Test"
4. Should see error: "Connection test failed" or similar

### Test 8.3: Test with Empty API Key

1. Clear the API key field
2. Click "Test"
3. Should see error: "API key required"

---

## Step 9: Run Automated Tests (Optional)

If you have automated tests, run them:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

---

## Step 10: Check Logs (Debugging)

### Check Edge Function Logs

The terminal running `supabase functions serve` shows real-time logs.

Look for:
- `[zerobounce-manage] Testing API key` - Test started
- `[zerobounce-manage] Test successful` - Test succeeded
- `[zerobounce-manage] Test failed` - Test failed
- Any error messages

### Check Database Logs

```bash
npx supabase db logs
```

### Check Frontend Console

Open browser DevTools (F12) → Console tab

Look for:
- API requests to `/functions/v1/zerobounce-manage`
- Response data
- Any errors

---

## Cleanup After Testing (Optional)

### Stop Services

```bash
# Stop edge functions (Ctrl+C in that terminal)

# Stop dev server (Ctrl+C in that terminal)

# Stop Supabase
npx supabase stop
```

### Reset Database (if needed)

```bash
# Reset to clean state
npx supabase db reset
```

### Remove Test User

```bash
npx supabase db shell
```

```sql
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

DELETE FROM auth.users 
WHERE email = 'test@example.com';

\q
```

---

## Common Local Testing Issues

### Issue: "Cannot connect to Supabase"

**Fix:**
```bash
npx supabase start
npx supabase status  # Verify it's running
```

### Issue: "Tables not found"

**Fix:**
```bash
npx supabase db reset  # Apply all migrations
```

### Issue: "Edge function not found"

**Fix:**
```bash
# Make sure function is running
npx supabase functions serve zerobounce-manage
```

### Issue: "Unauthorized" errors

**Fix:**
- Check you're logged in to the local app
- Verify env variables point to local Supabase
- Check session token is valid

### Issue: "has_role function does not exist"

**Fix:**
```bash
# Reset database to apply all migrations
npx supabase db reset
```

---

## Success Checklist

Mark each test as complete:

- [ ] Local Supabase is running
- [ ] Database migrations applied
- [ ] Test user created with super_admin role
- [ ] Edge function is running locally
- [ ] Frontend dev server is running
- [ ] Direct API key test succeeds (test-zerobounce-api.html)
- [ ] Edge function curl test succeeds
- [ ] Integration Manager test succeeds
- [ ] Configuration saves successfully
- [ ] Email validation works
- [ ] Validations appear in database
- [ ] Error scenarios tested (no role, invalid key)
- [ ] All tests pass without errors

---

## Next Steps After Successful Local Testing

1. **Commit your changes** (if you made any fixes)
2. **Deploy to staging** for further testing
3. **Apply fix to production:**
   - Run `apply-all-fixes.sql` on production database
   - Deploy edge function if needed
   - Test on production

---

## Quick Test Script

Save this as `test-local-zerobounce.sh`:

```bash
#!/bin/bash
echo "🧪 Testing Zerobounce Integration Locally"
echo ""

echo "1. Checking Supabase status..."
npx supabase status || { echo "❌ Supabase not running. Run: npx supabase start"; exit 1; }
echo "✅ Supabase is running"
echo ""

echo "2. Checking tables..."
npx supabase db shell -c "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name IN ('zerobounce_config', 'zerobounce_validations');" || exit 1
echo "✅ Tables exist"
echo ""

echo "3. Checking test user..."
npx supabase db shell -c "SELECT email, (SELECT role FROM user_roles WHERE user_id = auth.users.id LIMIT 1) as role FROM auth.users WHERE email = 'test@example.com';" || exit 1
echo ""

echo "4. Checking edge function..."
curl -s http://localhost:54321/functions/v1/zerobounce-manage > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Edge function is accessible"
else
    echo "⚠️  Edge function may not be running. Start with: npx supabase functions serve zerobounce-manage"
fi
echo ""

echo "✅ Local environment checks complete!"
echo ""
echo "Next: Open http://localhost:8080 and test the Integration Manager"
```

Make executable and run:
```bash
chmod +x test-local-zerobounce.sh
./test-local-zerobounce.sh
```

---

**Happy Local Testing!** 🚀





