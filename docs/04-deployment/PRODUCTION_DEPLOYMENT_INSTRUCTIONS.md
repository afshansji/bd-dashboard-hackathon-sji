# 🚀 URGENT: Production Deployment Instructions

## ✅ COMPLETED STEPS:
1. ✅ Code merged to main branch on GitHub
2. ✅ Production build created successfully (`dist/` folder)

---

## ⚠️ CRITICAL: Manual Deployment Required

Your code is ready but requires **TWO separate deployments**:

---

## 🎯 STEP 1: BACKEND DEPLOYMENT (Supabase) - **15 MINUTES**

### A. Database Migration (REQUIRED)

**Action:** Deploy feedback attachments table

**Steps:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `supabase/migrations/20251120000000_feedback_attachments.sql`
6. Copy the ENTIRE contents
7. Paste into SQL Editor
8. Click **RUN** button
9. ✅ Success message should appear

**Verify:** Go to **Table Editor** → You should see new table `feedback_attachments`

---

### B. Edge Functions (REQUIRED for all features to work)

Deploy these **4 functions** by copying code from files:

#### Function 1: `admin-campaigns`
**File:** `supabase/functions/admin-campaigns/index.ts`
**Fixes:** Campaign statistics showing 0s

**Steps:**
1. Go to Supabase Dashboard → **Edge Functions**
2. Find `admin-campaigns` in the list
3. Click on it to open
4. Click **Edit** or code editor
5. Select ALL existing code and DELETE it
6. Copy ALL code from `supabase/functions/admin-campaigns/index.ts`
7. Paste into editor
8. Click **DEPLOY** (or Save & Deploy)
9. Wait for "Deployed successfully" message

---

#### Function 2: `generate-followup-suggestions`
**File:** `supabase/functions/generate-followup-suggestions/index.ts`
**Fixes:** AI suggestions error

**Steps:**
1. Edge Functions → Find `generate-followup-suggestions`
2. Open → Edit → Delete all existing code
3. Copy from `supabase/functions/generate-followup-suggestions/index.ts`
4. Paste → Deploy
5. Verify "Active" status

---

#### Function 3: `submit-feedback`
**File:** `supabase/functions/submit-feedback/index.ts`
**Fixes:** Multiple attachments feature

**Steps:**
1. Edge Functions → Find `submit-feedback`
2. Open → Edit → Delete all existing code
3. Copy from `supabase/functions/submit-feedback/index.ts`
4. Paste → Deploy
5. Verify "Active" status

---

#### Function 4: `manage-feedback`
**File:** `supabase/functions/manage-feedback/index.ts`
**Fixes:** Display multiple attachments

**Steps:**
1. Edge Functions → Find `manage-feedback`
2. Open → Edit → Delete all existing code
3. Copy from `supabase/functions/manage-feedback/index.ts`
4. Paste → Deploy
5. Verify "Active" status

---

## 🎯 STEP 2: FRONTEND DEPLOYMENT - **5 MINUTES**

Your frontend build is complete! Now deploy based on your hosting:

### Option A: Lovable.ai (Most Likely)
If your project is on Lovable.ai:
1. **NO ACTION NEEDED** - Auto-deploys from GitHub main branch
2. Wait 2-3 minutes for automatic deployment
3. Check your live URL

### Option B: Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project
3. Click **"Redeploy"** or go to Deployments tab
4. Click on latest deployment → **"Redeploy"**
5. Wait for build (2-3 minutes)

### Option C: Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Find your site
3. Go to **Deploys** tab
4. Click **"Trigger deploy"** → **"Deploy site"**
5. Wait for build (2-3 minutes)

### Option D: Manual/Custom Hosting
1. Upload the `dist/` folder to your web server
2. Replace existing files
3. Clear any CDN cache if applicable

---

## 🧪 TESTING CHECKLIST (After BOTH Deployments)

Test each feature to verify deployment success:

### ✅ Test 1: Campaign Statistics
- [ ] Go to **Campaign Management**
- [ ] Check if cards show real numbers (NOT 0s)
- [ ] Click on a campaign
- [ ] Verify Responses, Meetings, Conversion show correct data

### ✅ Test 2: AI Follow-up Suggestions
- [ ] Go to **Meetings and Follow-ups**
- [ ] Click **"Generate Suggestions"** button
- [ ] Should work WITHOUT errors
- [ ] Suggestions should appear in list

### ✅ Test 3: Multiple Attachments
- [ ] Go to **Submit Feedback**
- [ ] Try uploading **2-3 images or files**
- [ ] Submit feedback
- [ ] Go to **Admin → Feedback Manager**
- [ ] Open your feedback
- [ ] Verify ALL attachments are visible and downloadable

### ✅ Test 4: CSV Template Download
- [ ] Go to any campaign
- [ ] Click **"Import Leads"**
- [ ] Click **"Download CSV sample format"**
- [ ] File should download with proper format

### ✅ Test 5: Pipeline Sorting
- [ ] Open any campaign
- [ ] Switch to **Pipeline** view
- [ ] Click the **sort icon (↑↓)** next to stage name
- [ ] Contacts should sort by name A-Z or Z-A

---

## 📊 DEPLOYMENT CHECKLIST

### Backend (Supabase):
- [ ] Database migration executed successfully
- [ ] `admin-campaigns` deployed and showing "Active"
- [ ] `generate-followup-suggestions` deployed and showing "Active"
- [ ] `submit-feedback` deployed and showing "Active"
- [ ] `manage-feedback` deployed and showing "Active"

### Frontend:
- [ ] Deployment triggered (Lovable/Vercel/Netlify/Manual)
- [ ] Build completed successfully
- [ ] Live URL accessible
- [ ] Browser cache cleared (Ctrl+Shift+Delete)

### Verification:
- [ ] All 5 test scenarios passed
- [ ] No console errors in browser
- [ ] All features working as expected

---

## 🆘 TROUBLESHOOTING

### If Campaign Stats Still Show 0:
1. ✅ Verify `admin-campaigns` edge function deployed
2. Check Supabase → Edge Functions → Logs for errors
3. Hard refresh browser (Ctrl+F5)
4. Check Network tab for API responses

### If AI Suggestions Still Error:
1. ✅ Verify `generate-followup-suggestions` deployed
2. Check Edge Function logs
3. Verify Lovable AI API key is set in Supabase secrets
4. Check browser console for detailed error

### If Multiple Attachments Don't Work:
1. ✅ Verify database migration ran (check `feedback_attachments` table exists)
2. ✅ Verify `submit-feedback` and `manage-feedback` deployed
3. Check Supabase → Storage → Verify `feedback-attachments` bucket exists
4. Check browser console and Edge Function logs

### If Frontend Not Updating:
1. Clear browser cache completely
2. Try incognito/private window
3. Check deployment platform logs
4. Verify correct branch deployed (main)
5. Check if build errors occurred

---

## ⏱️ ESTIMATED TIME

- **Backend Deployment:** 15 minutes
- **Frontend Deployment:** 5 minutes (or automatic)
- **Testing:** 10 minutes
- **Total:** ~30 minutes

---

## 🎊 SUCCESS CRITERIA

Your deployment is successful when:
1. ✅ Campaign cards show real numbers (not 0s)
2. ✅ AI suggestions generate without errors
3. ✅ Can upload and view multiple feedback attachments
4. ✅ CSV template downloads properly
5. ✅ Pipeline sorting works A-Z/Z-A

---

## 📞 NEED HELP?

If you encounter issues:
1. Check Supabase Edge Function logs first
2. Check browser console for frontend errors
3. Verify all edge functions show "Active" status
4. Ensure database migration created the table

---

**⚡ START WITH BACKEND DEPLOYMENT FIRST - It's the most critical!**

