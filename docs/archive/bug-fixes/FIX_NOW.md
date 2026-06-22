# 🔧 FIX IT NOW - Follow These Steps

## The Problem
You're getting: **"Failed to generate suggestions: Edge Function returned a non-2xx status code"**

## The Solution (3 Steps)

### ✅ STEP 1: Deploy the Function (Choose ONE method)

#### 🌐 Method A: Supabase Dashboard (EASIEST)

1. Click this link: **https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions**

2. Look for `generate-followup-suggestions` function
   - If it exists, click on it
   - If not, click "New Edge Function" and name it `generate-followup-suggestions`

3. Click the code editor area

4. Delete everything in the editor

5. Open your local file:
   ```
   supabase/functions/generate-followup-suggestions/index.ts
   ```

6. Copy ALL the code (Ctrl+A, then Ctrl+C)

7. Paste into Supabase editor (Ctrl+V)

8. Click **"Deploy"** button

9. Wait for "Deployed successfully" message

#### 💻 Method B: Using Terminal

```powershell
npx supabase login
npx supabase functions deploy generate-followup-suggestions --project-ref qzzvcqoletuummdsbbio
```

---

### ✅ STEP 2: Check API Key

1. Go to: **https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/settings/functions**

2. Click **"Secrets"** or **"Environment Variables"**

3. Look for: `LOVABLE_API_KEY`
   - ✅ If it exists → You're good
   - ❌ If missing → Ask your team for the key and add it

---

### ✅ STEP 3: Test It

1. **Close and reopen your app** (or press Ctrl+Shift+R to hard refresh)

2. **Go to:** Meetings & Follow-Ups page

3. **Open browser console** (Press F12, click "Console" tab)

4. **Click:** "Generate Suggestions" button

5. **Wait 10-30 seconds**

6. **Check:**
   - ✅ Success? You'll see "Generated X suggestions" message
   - ❌ Still error? Continue to troubleshooting below

---

## 🔍 Troubleshooting

### Issue: "No active deals or contacts found"
**Solution:** You need to add:
- Deals in stages: discovery, qualification, proposal, or negotiation
- OR Campaign contacts in status: identified, researched, contacted_linkedin, or connected

### Issue: "AI API error: 401"
**Solution:** The `LOVABLE_API_KEY` is missing or invalid
- Go to Supabase → Settings → Edge Functions → Secrets
- Add or update the `LOVABLE_API_KEY`

### Issue: Still getting "non-2xx status code"
**Check function logs:**
1. Go to: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
2. Filter by: `generate-followup-suggestions`
3. Look for red error messages
4. Copy the error and share it for help

---

## ✨ What You Should See After Fix

### With Data:
- ✅ Toast message: "Generated 8 follow-up suggestions" (or similar)
- ✅ "AI Suggestions" tab shows number > 0
- ✅ Click the tab to see suggestion cards

### Without Data:
- ℹ️ Toast message: "No suggestions generated. Try adding some active deals or campaign contacts"
- ℹ️ "AI Suggestions" stays at 0

---

## 🆘 Still Need Help?

If it's still not working after following all steps:

1. **Take screenshot** of the error
2. **Copy browser console logs** (everything in the Console tab)
3. **Copy Supabase function logs** (from the link above)
4. **Share all three** for assistance

---

## 📋 Quick Checklist

Before asking for help, verify:

- [ ] Function deployed (Step 1 completed)
- [ ] LOVABLE_API_KEY exists in Supabase (Step 2 completed)  
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Waited full 30 seconds after clicking button
- [ ] Checked browser console (F12)
- [ ] Checked Supabase function logs
- [ ] Have at least one deal OR one campaign contact in database

---

**Good luck! 🚀**

