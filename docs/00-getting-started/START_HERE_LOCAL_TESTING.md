# 🚀 Start Here - Local Testing Setup

## Current Status

✅ Docker is installed  
❌ Docker Desktop is **NOT running**

---

## Quick Start (5 minutes)

### Step 1: Start Docker Desktop

1. **Open Docker Desktop application**
   - Search for "Docker Desktop" in Windows Start menu
   - Click to open it
   - Wait for it to fully start (the whale icon in system tray should be steady, not animated)

2. **Verify Docker is running:**
   ```powershell
   docker info
   ```
   Should show server information without errors.

---

### Step 2: Run the Automated Setup Script

Once Docker is running:

```powershell
cd sj-bd-dashboard
.\start-local-testing.ps1
```

This script will:
- ✅ Check all prerequisites
- ✅ Start local Supabase
- ✅ Apply database migrations
- ✅ Verify tables exist
- ✅ Check for test user
- ✅ Grant super_admin role if needed

---

### Step 3: Create Test User (If Needed)

If the script says "Test user not found":

1. Open Supabase Studio: http://localhost:54323
2. Go to **Authentication** → **Users**
3. Click **Add user**
4. Fill in:
   - **Email:** `test@example.com`
   - **Password:** `TestPassword123!`
   - **Auto Confirm:** ✅ Yes
5. Click **Create user**

Then grant super_admin role:
```powershell
npx supabase db shell -c "INSERT INTO user_roles (user_id, role) SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'test@example.com' ON CONFLICT DO NOTHING;"
```

---

### Step 4: Configure Environment Variables

Check if `.env.local` exists:
```powershell
Get-Content .env.local
```

If it doesn't exist or needs updating:
```powershell
# Get your local Supabase credentials
npx supabase status
```

Copy the values and create/update `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase-status
```

---

### Step 5: Start Edge Function (Optional but Recommended)

Open a **new PowerShell terminal** and run:
```powershell
cd sj-bd-dashboard
npx supabase functions serve zerobounce-manage
```

Keep this terminal running!

---

### Step 6: Start Dev Server

Open **another new PowerShell terminal** and run:
```powershell
cd sj-bd-dashboard
npm run dev
```

Should start on: http://localhost:8080

---

### Step 7: Test the Integration

1. **Open browser:** http://localhost:8080

2. **Log in:**
   - Email: `test@example.com`
   - Password: `TestPassword123!`

3. **Navigate to:** Admin Panel → Integration Manager

4. **Test Zerobounce:**
   - Enter your real Zerobounce API key
   - Click "Test"
   - Should see: "✅ Connection successful"

5. **Save configuration:**
   - Click "Save & Connect"
   - Should save successfully

6. **Test email validation:**
   - Go to any campaign
   - Click "Add Contact"
   - Enter contact details with a real email
   - Email should be validated automatically

---

## Quick Verification

Run this to verify everything is set up:

```powershell
npx supabase db shell -c "SELECT '1. Tables' as check_name, CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END as result FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('zerobounce_config', 'zerobounce_validations');"

npx supabase db shell -c "SELECT '2. Test User' as check_name, CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result FROM auth.users WHERE email = 'test@example.com';"

npx supabase db shell -c "SELECT '3. Super Admin' as check_name, CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result FROM user_roles ur JOIN auth.users u ON ur.user_id = u.id WHERE u.email = 'test@example.com' AND ur.role = 'super_admin'::app_role;"
```

All should show ✅ PASS

---

## Troubleshooting

### Docker won't start?

**Solution:**
- Restart your computer
- Open Docker Desktop
- Wait 1-2 minutes for it to fully start
- Check system tray icon is steady

### Supabase won't start?

**Solution:**
```powershell
npx supabase stop
npx supabase start
```

### Tables not found?

**Solution:**
```powershell
npx supabase db reset
```

### "Super admin access required" error?

**Solution:**
```powershell
npx supabase db shell -c "INSERT INTO user_roles (user_id, role) SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'test@example.com' ON CONFLICT DO NOTHING;"
```

Then refresh browser and log in again.

---

## Alternative: Test Without Local Supabase

If you can't get local Supabase running, you can test the fix on the **production database**:

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor
2. Run: [`apply-all-fixes.sql`](apply-all-fixes.sql) (remember to change the email!)
3. Test in your production app

**Warning:** Be careful when testing on production!

---

## Need More Help?

📖 **Detailed guides:**
- [`LOCAL_TEST_GUIDE.md`](LOCAL_TEST_GUIDE.md) - Complete local testing guide
- [`QUICK_FIX_README.md`](QUICK_FIX_README.md) - Production fix guide
- [`TEST_INTEGRATION.md`](TEST_INTEGRATION.md) - Testing procedures

🔧 **Quick test scripts:**
- [`start-local-testing.ps1`](start-local-testing.ps1) - Automated setup
- [`test-local-quick.sql`](test-local-quick.sql) - Quick database tests

---

## Current Action Required

**🔴 Docker Desktop is not running!**

**Next Step:** Start Docker Desktop, then run:
```powershell
.\start-local-testing.ps1
```

Once that completes successfully, follow Steps 4-7 above.

---

**Happy Testing!** 🎉





