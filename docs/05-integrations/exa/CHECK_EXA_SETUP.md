# ⚠️ LinkedIn Lead Import Not Working - Quick Fix

## The Problem
**Imported 0 new LinkedIn contacts** - This means the Exa.ai API key is missing or invalid.

## Quick Diagnosis

### Check 1: Is EXA_API_KEY configured?
The edge function needs an `EXA_API_KEY` environment variable in Supabase.

### Check 2: View Supabase Logs
1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** > **campaign-lead-import**
3. Click on **Logs** tab
4. Look for errors like:
   - `"EXA_API_KEY is not configured"`
   - `"Unexpected token '<', "<!DOCTYPE "... is not valid JSON"`
   - `"Invalid Exa API key"`

## ✅ Solution: Configure Exa API Key

### Step 1: Get Your Exa API Key

1. **Visit**: https://exa.ai/
2. **Sign up** or log in
3. Go to **API Keys** section
4. **Copy** your API key (starts with `exa_...`)
5. **Note**: You may need to add billing/credits to your Exa account

### Step 2: Add Key to Supabase

#### Via Supabase Dashboard (Easiest):

1. Open **Supabase Dashboard** → Your Project
2. Click **Settings** (⚙️) in left sidebar
3. Go to **Edge Functions**
4. Click **Secrets** tab
5. Click **"Add new secret"** button
6. Enter:
   - **Name**: `EXA_API_KEY`
   - **Value**: [Paste your Exa API key]
7. Click **"Create secret"**
8. **IMPORTANT**: Redeploy the function:
   - Go to **Edge Functions** 
   - Find `campaign-lead-import`
   - Click **"Redeploy"** button

#### Via CLI (If you have Supabase CLI):

```bash
# Set the secret
supabase secrets set EXA_API_KEY=your_actual_exa_api_key_here

# Redeploy function
supabase functions deploy campaign-lead-import
```

### Step 3: Test the Import

1. Refresh your application
2. Go to a campaign
3. Click **"Add LinkedIn Leads to Campaign"**
4. Fill in:
   - **Job Titles**: CTO, VP Engineering
   - **Industries**: Technology, SaaS
   - **Country**: United States
   - **Company Size**: Select at least one
5. Click **"Import 10 Leads"**
6. Wait 2-5 minutes
7. Check if contacts appear! ✅

## 🧪 Test Your API Key

Before configuring Supabase, test if your key works:

```bash
curl -X POST https://api.exa.ai/search \
  -H "Authorization: Bearer YOUR_EXA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CTO at SaaS companies",
    "type": "neural",
    "category": "company",
    "numResults": 5,
    "includeDomains": ["linkedin.com"]
  }'
```

If you get JSON results → Key is valid ✅  
If you get HTML or error → Key is invalid ❌

## 💰 Cost Information

- **$0.10 per lead** via Exa.ai
- Importing 10 leads = **$1.00**
- Importing 25 leads = **$2.50**
- Make sure your Exa account has sufficient credits

## 🔍 Common Issues

### Issue 1: "Still getting 0 results after adding key"
**Fix**: Did you **redeploy** the function? Secrets only work after redeployment.

### Issue 2: "Invalid API key" error in logs
**Fix**: 
- Copy key again from Exa dashboard (no spaces)
- Regenerate a new key if needed
- Verify key with curl test above

### Issue 3: "Rate limit exceeded"
**Fix**: Exa free tier has limits. Upgrade plan or wait.

### Issue 4: "Insufficient credits"
**Fix**: Add credits/billing to your Exa account at https://exa.ai/

## 📊 How to View Detailed Logs

To see what's happening:

1. **Supabase Dashboard** → Your Project
2. **Edge Functions** → `campaign-lead-import`
3. **Logs** tab
4. Look for:
   - `[searchExaLeads] Exa API Response - Found X results`
   - `[processLeadImportJob] Inserted X new contacts`
   - Any error messages

## ✅ Success Indicators

You'll know it's working when you see:
- Import dialog shows "Import Complete!"
- "Imported X new LinkedIn contacts" (X > 0)
- Email notification received
- Contacts appear in campaign pipeline

## 🆘 Still Not Working?

1. **Check Exa Account**:
   - Has valid API key
   - Has sufficient credits ($1+ for testing)
   - No rate limits

2. **Check Supabase**:
   - Secret `EXA_API_KEY` is set
   - Function `campaign-lead-import` is deployed
   - No errors in function logs

3. **Check Search Criteria**:
   - Too narrow? Try broader terms
   - Use common job titles (CEO, CTO, VP)
   - Use standard industries (SaaS, Technology)

---

**Need the setup guide?** See `EXA_SETUP_GUIDE.md` for detailed instructions.

