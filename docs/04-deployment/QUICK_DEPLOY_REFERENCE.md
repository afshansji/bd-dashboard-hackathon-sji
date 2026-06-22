# ⚡ QUICK DEPLOY REFERENCE CARD

**Print this or keep it open while deploying!**

---

## 🎯 YOUR DEPLOYMENT LINKS

### Supabase Dashboard
**https://supabase.com/dashboard**

### Possible Frontend Platforms
- Lovable: https://lovable.dev/projects
- Vercel: https://vercel.com/dashboard
- Netlify: https://app.netlify.com

---

## 📋 DEPLOYMENT ORDER (10 minutes)

### ✅ STEP 1: Database (2 min)
1. Supabase → SQL Editor → New Query
2. Paste migration SQL from `DEPLOY_LIVE_NOW.md`
3. Click RUN
4. ✅ Success message

### ✅ STEP 2: Edge Functions (8 min)
Deploy these 4 functions (2 min each):

1. **admin-campaigns**
   - File: `supabase/functions/admin-campaigns/index.ts`
   - Fixes: Campaign stats showing 0s

2. **generate-followup-suggestions**
   - File: `supabase/functions/generate-followup-suggestions/index.ts`
   - Fixes: AI suggestions error

3. **submit-feedback**
   - File: `supabase/functions/submit-feedback/index.ts`
   - Adds: Multiple file uploads

4. **manage-feedback**
   - File: `supabase/functions/manage-feedback/index.ts`
   - Adds: View multiple attachments

**For each function:**
- Supabase → Edge Functions → Find function → Edit
- Delete all → Copy from local file → Paste → Deploy
- ✅ Wait for "Deployed successfully"

### ✅ STEP 3: Verify (2 min)
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open live site
3. Test campaign stats (should show numbers)
4. Test AI suggestions (should work)
5. Test file uploads (upload 2-3 files)

---

## 🔧 FUNCTION DEPLOYMENT TEMPLATE

**Copy this process for each function:**

```
1. Open: https://supabase.com/dashboard
2. Click: Edge Functions (left sidebar)
3. Find: [function-name]
4. Click: Edit
5. Press: Ctrl+A (select all)
6. Press: Delete
7. Open: supabase/functions/[function-name]/index.ts
8. Press: Ctrl+A (select all)
9. Press: Ctrl+C (copy)
10. Back to Supabase → Ctrl+V (paste)
11. Click: Deploy
12. Wait: "✅ Deployed successfully"
```

Repeat for all 4 functions!

---

## ✅ SUCCESS CHECKLIST

**After deploying, verify:**

- [ ] Database: `feedback_attachments` table exists
- [ ] Function: `admin-campaigns` shows "Active"
- [ ] Function: `generate-followup-suggestions` shows "Active"
- [ ] Function: `submit-feedback` shows "Active"
- [ ] Function: `manage-feedback` shows "Active"
- [ ] Frontend: Live site shows new code
- [ ] Test: Campaign stats show numbers (not 0s)
- [ ] Test: AI suggestions work without errors
- [ ] Test: Can upload multiple files

---

## 🆘 QUICK FIXES

### Edge Function Deploy Fails?
- Check Supabase logs (click function → Logs tab)
- Verify you copied ENTIRE file content
- Try deploying again

### Frontend Not Updating?
- Wait 5 minutes (builds take time)
- Press Ctrl+F5 (hard refresh)
- Clear cache (Ctrl+Shift+Delete)
- Try incognito window
- Manually trigger deploy on hosting platform

### Features Not Working?
- Verify all functions show "Active" status
- Check browser console (F12) for errors
- Verify database migration ran successfully

---

## ⏱️ TIME TRACKER

- [ ] 0-2 min: Database migration
- [ ] 2-4 min: Deploy admin-campaigns
- [ ] 4-6 min: Deploy generate-followup-suggestions
- [ ] 6-8 min: Deploy submit-feedback
- [ ] 8-10 min: Deploy manage-feedback
- [ ] 10-12 min: Verify and test

**Target:** Live in 12 minutes! 🚀

---

## 📞 HELP

**Stuck? Check:**
1. DEPLOY_LIVE_NOW.md (detailed guide)
2. Supabase function logs (for errors)
3. Browser console (F12) for frontend errors

**Questions?** Ask me:
- "How do I find [function-name]?"
- "Edge function failed to deploy"
- "Frontend not updating"
- "Feature X not working"

---

**GO LIVE NOW! 🎯**














