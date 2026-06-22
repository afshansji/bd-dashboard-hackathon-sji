# 🚀 Zerobounce Fix - Deployment Checklist

## Pull Request Created ✅

**Branch:** `fix/zerobounce-integration-errors`  
**PR URL:** https://github.com/sjinnovation/sj-bd-dashboard/pull/new/fix/zerobounce-integration-errors

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

### 1. Review Changes
- [ ] Review the PR on GitHub
- [ ] Check that all files are included
- [ ] Verify commit message is clear
- [ ] Read `PULL_REQUEST.md` for full details

### 2. Test Locally
- [ ] Grant super_admin role locally
- [ ] Test "Save and Connect" in Integration Manager
- [ ] Verify API key works (3524 credits)
- [ ] Test email validation
- [ ] Check browser console for errors

### 3. Code Review
- [ ] Request review from team members
- [ ] Address any feedback
- [ ] Ensure tests pass (if applicable)

---

## 🚀 Deployment Steps

### Step 1: Merge Pull Request

1. Go to: https://github.com/sjinnovation/sj-bd-dashboard/pull/new/fix/zerobounce-integration-errors
2. Create the Pull Request
3. Add reviewers if needed
4. Once approved, click **"Merge Pull Request"**
5. Choose: **"Squash and Merge"** or **"Merge Commit"**
6. Confirm merge

### Step 2: Deploy Database Migration

**Option A: Using Supabase CLI**
```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
git checkout main
git pull origin main
npx supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor
2. Copy contents of `supabase/migrations/20251201000000_fix_zerobounce_types.sql`
3. Paste in SQL Editor
4. Click **"Run"**
5. Verify success (should say "Success. No rows returned")

### Step 3: Deploy Edge Function

**Option A: Using Supabase CLI**
```bash
cd "c:\Lovable Projects\New folder\sj-bd-dashboard"
npx supabase login
npx supabase functions deploy zerobounce-manage
```

**Option B: Using Deployment Script**
```bash
# Windows
.\deploy-zerobounce-function.ps1

# Linux/Mac
chmod +x deploy-zerobounce-function.sh
./deploy-zerobounce-function.sh
```

**Option C: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions
2. Click on `zerobounce-manage`
3. Copy contents of `supabase/functions/zerobounce-manage/index.ts`
4. Paste in function editor
5. Click **"Deploy"**
6. Wait for deployment (30-60 seconds)

### Step 4: Grant Super Admin Role (Production)

1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor
2. Run this SQL (replace with actual admin email):

```sql
-- Check current users
SELECT id, email FROM auth.users;

-- Grant super_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'ADMIN_EMAIL@example.com'  -- Replace with actual email
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ADMIN_EMAIL@example.com';  -- Replace with actual email
```

### Step 5: Verify Deployment

1. **Check Edge Function Logs**
   - Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
   - Look for recent deployment logs
   - No errors should appear

2. **Test in Browser**
   - Open `test-zerobounce-direct.html`
   - Enter API key: `3e4f6c721add4fa2a781195120472499`
   - Click "Test Get Credits"
   - Should show: **3524 credits** ✅

3. **Test in Application**
   - Go to your production app
   - Login as admin (with super_admin role)
   - Navigate to **Admin → Integration Manager**
   - Enter API key: `3e4f6c721add4fa2a781195120472499`
   - Click **"Test Connection"**
   - Should show: **"Connection successful, Credits: 3524"** ✅

4. **Test Email Validation**
   - Try adding a contact with email validation
   - Should validate without errors
   - Check database for validation records:

```sql
-- Check if validations are being stored
SELECT 
  email,
  validation_status,
  domain_age_days,  -- Should be INTEGER
  mx_found,         -- Should be BOOLEAN
  created_at
FROM zerobounce_validations
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Post-Deployment Verification

### Production Checks
- [ ] Edge function deployed (check Supabase dashboard)
- [ ] Database migration applied (tables have correct types)
- [ ] Super admin role granted
- [ ] API key test successful in browser
- [ ] API key test successful in application
- [ ] Email validation works
- [ ] No errors in edge function logs
- [ ] No errors in browser console

### Rollback Plan (If Needed)

If something goes wrong:

1. **Revert Edge Function**
   ```bash
   git checkout main
   npx supabase functions deploy zerobounce-manage
   ```

2. **Revert Database (if necessary)**
   - Drop the new columns if they cause issues
   - Restore from backup if needed
   - Contact Supabase support for help

3. **Notify Team**
   - Document what went wrong
   - Create new issue for investigation
   - Plan next deployment attempt

---

## 📊 Success Criteria

Deployment is successful when:

✅ PR merged to main branch  
✅ Database migration applied without errors  
✅ Edge function deployed successfully  
✅ Admin users have super_admin role  
✅ Browser test shows 3524 credits  
✅ Application test shows "Connection successful"  
✅ Email validation stores data correctly  
✅ No errors in logs or console  

---

## 🆘 Troubleshooting

### Issue: Migration fails
**Solution:** Check SQL syntax, run in Supabase SQL Editor instead

### Issue: Edge function fails to deploy
**Solution:** Use Supabase Dashboard method (Option C above)

### Issue: Still getting "Super admin access required"
**Solution:** 
1. Verify role was granted (run SELECT query)
2. Logout and login again
3. Clear browser cache/cookies

### Issue: API key test fails
**Solution:**
1. Verify API key is correct
2. Test directly at: https://api.zerobounce.net/v2/getcredits?api_key=YOUR_KEY
3. Contact Zerobounce if API key is invalid

---

## 📞 Need Help?

- **Supabase Support:** https://supabase.com/support
- **Zerobounce Support:** https://www.zerobounce.net/support
- **Documentation:** See `ZEROBOUNCE_TROUBLESHOOTING.md`

---

## 📝 Deployment Log

Record your deployment:

```
Date: _______________
Deployed by: _______________
PR Number: _______________
Commit SHA: _______________
Result: ✅ Success / ❌ Failed
Notes: _______________________________________________
```

---

**Good luck with deployment! 🚀**

All files and documentation are ready. Follow the steps above carefully.




