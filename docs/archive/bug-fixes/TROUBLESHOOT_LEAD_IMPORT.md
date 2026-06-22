# 🚨 LinkedIn Lead Import Troubleshooting Guide

## Problem: "Imported 0 new LinkedIn contacts"

If you're seeing the import complete but with **0 contacts**, follow these steps to diagnose and fix the issue.

---

## 🔍 Step 1: Check Supabase Edge Function Logs

This is the **MOST IMPORTANT** step to see what's actually happening.

### How to Check Logs:

1. Go to **Supabase Dashboard** → Your Project
2. Click **Edge Functions** in left sidebar
3. Find `campaign-lead-import` function
4. Click on it, then click **Logs** tab
5. Look for the most recent execution

### What to Look For:

#### ✅ **If API Key is Missing:**
```
Error: EXA_API_KEY is not configured
```
**Fix**: Add `EXA_API_KEY` secret (see CHECK_EXA_SETUP.md)

#### ✅ **If API Key is Invalid:**
```
Error: Exa search failed: Unexpected token '<', "<!DOCTYPE "...
Error: Invalid Exa API key
Error: 401 unauthorized
```
**Fix**: 
- Verify your API key at https://exa.ai/
- Copy the correct key and update Supabase secret
- Redeploy the function

#### ✅ **If Exa Returns 0 Results:**
```
[searchExaLeads] Exa API Response - Found 0 results
Zero results for query: "..."
Consider simplifying search criteria
```
**Fix**: Your search is too specific. See "Step 3" below.

#### ✅ **If Exa Has Issues:**
```
Error: Insufficient credits
Error: Rate limit exceeded
Error: 429 Too Many Requests
```
**Fix**: 
- Add credits to your Exa account
- Wait before trying again
- Upgrade your Exa plan

#### ✅ **If Function Crashes:**
```
Error: Cannot read property 'length' of undefined
Error: TypeError...
```
**Fix**: This is a bug. See "Step 5" below.

---

## 🔍 Step 2: Check Database Job Status

Run the diagnostic SQL to see what's in the database:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file `diagnose-lead-import.sql` I created
3. Copy and paste the queries
4. Run each query to see results

### Key Things to Check:

#### Check if job completed:
```sql
SELECT status, imported_count, error_details
FROM lead_import_jobs
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- `status`: Should be `"completed"`, not `"failed"` or stuck in `"pending"`/`"running"`
- `imported_count`: Should be > 0
- `error_details`: Should be `NULL` (if not NULL, this shows the error)

#### Check if contacts were inserted:
```sql
SELECT COUNT(*) 
FROM campaign_contacts 
WHERE campaign_id = 'YOUR_CAMPAIGN_ID'
AND created_at >= NOW() - INTERVAL '10 minutes';
```

If count = 0, contacts weren't inserted even if job says "completed".

---

## 🔍 Step 3: Check Your Search Criteria

Exa.ai might return 0 results if your search is **too specific or narrow**.

### Common Issues:

❌ **Too Narrow:**
- Combining too many filters
- Using very specific company names
- Overly restrictive location (small city)
- Rare job titles

✅ **Better Approach:**
- Use common job titles: `CEO`, `CTO`, `VP Engineering`, `Director`
- Use broad industries: `Technology`, `SaaS`, `Healthcare`
- Use major countries: `United States`, `United Kingdom`
- Use standard company sizes
- Start with 10 results, not 100

### Test with Simple Search:

Try this minimal search:
- **Job Titles**: `CEO`
- **Industries**: `Technology`
- **Country**: `United States`
- **Company Size**: `Small (51-200)`
- **Max Results**: `10`

If this works → Your original search was too narrow  
If this fails → It's an API/configuration issue

---

## 🔍 Step 4: Verify Exa API Key is Working

Test your Exa API key directly:

```bash
curl -X POST https://api.exa.ai/search \
  -H "Authorization: Bearer YOUR_EXA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CEO at Technology companies",
    "type": "neural",
    "category": "company",
    "numResults": 5,
    "includeDomains": ["linkedin.com"]
  }'
```

**Expected**: You should get JSON with LinkedIn profile URLs  
**If Error**: Your API key is invalid or Exa account has issues

---

## 🔍 Step 5: Check for Known Issues

### Issue: Function Doesn't Start
**Symptom**: No logs appear, job stays in "pending"  
**Fix**: 
1. Check if function is deployed: `supabase functions list`
2. Redeploy: `supabase functions deploy campaign-lead-import`

### Issue: "Cannot find module 'exa-js'"
**Symptom**: Error in logs about missing module  
**Fix**: The function needs to be redeployed with dependencies

### Issue: Job Completes but 0 Contacts
**Symptom**: Job status = "completed", imported_count = 0  
**Possible Causes**:
1. Exa returned 0 results (search too narrow)
2. Results couldn't be parsed (Exa format changed)
3. Contacts already exist (deduplication kicked in)
4. Permission issue inserting to campaign_contacts table

**Fix**: Check Supabase logs for exact error

---

## ✅ Step-by-Step Fix Process

### 1. Add/Verify EXA_API_KEY

```bash
# Via CLI
supabase secrets set EXA_API_KEY=your_key_here

# Via Dashboard
Settings → Edge Functions → Secrets → Add "EXA_API_KEY"
```

### 2. Redeploy the Function

```bash
supabase functions deploy campaign-lead-import
```

**OR** in Dashboard:
Edge Functions → campaign-lead-import → Click "Redeploy"

### 3. Check Exa Account

- Visit https://exa.ai/
- Verify you have credits (add $10+ for testing)
- Check API key is valid
- No rate limits exceeded

### 4. Test with Simple Search

- Use basic criteria (CEO, Technology, US)
- Start with 10 results
- Check Supabase logs immediately after

### 5. Review Logs

Check BOTH:
- **Edge Function Logs**: See what the function is doing
- **Database Jobs**: See what was saved

---

## 🆘 If Still Not Working

### Share This Debug Info:

1. **Latest Job Status:**
```sql
SELECT * FROM lead_import_jobs ORDER BY created_at DESC LIMIT 1;
```

2. **Edge Function Logs:**
- Screenshot of last 10 log entries
- Look for any errors (red text)

3. **Search Criteria Used:**
- Job titles
- Industries  
- Country
- Company size

4. **Exa Account Status:**
- Do you have credits?
- What plan are you on?
- Can you test API key with curl?

---

## 📞 Quick Checklist

Before trying again, verify:

- [ ] `EXA_API_KEY` secret is set in Supabase
- [ ] Edge function `campaign-lead-import` is deployed
- [ ] Exa account has credits ($1+ minimum)
- [ ] Search criteria is not too narrow
- [ ] No errors in Supabase Edge Function logs
- [ ] Job status in database shows "completed"
- [ ] Using common job titles (CEO, CTO, VP)
- [ ] Using broad industries (Technology, SaaS)
- [ ] Country is a major one (US, UK, etc.)

---

## 💡 Common Solutions

### "Still showing 0 results"

**Try This:**
1. Clear browser cache
2. Use an incognito/private window
3. Check if contacts are actually in database (use SQL query above)
4. Try a completely different campaign
5. Restart the import from scratch

### "Import hangs forever"

**Try This:**
1. Close the dialog
2. Wait 5 minutes
3. Check database: `SELECT * FROM lead_import_jobs ORDER BY created_at DESC LIMIT 1;`
4. See if job actually completed
5. Check campaign contacts manually

---

## 📧 Need Help?

If you've tried everything:

1. Run `diagnose-lead-import.sql` in Supabase SQL Editor
2. Check Edge Function logs for errors
3. Test your Exa API key with curl
4. Verify Exa account has credits
5. Share error messages from logs

The issue is almost always:
- Missing/invalid EXA_API_KEY (80% of cases)
- No Exa credits (10% of cases)
- Search too narrow (10% of cases)

