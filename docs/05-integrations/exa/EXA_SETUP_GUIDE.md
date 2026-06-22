# Exa.ai Setup Guide

## Issue
You're seeing this error when importing LinkedIn leads:
```
Import Failed
Error: Exa search failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This means the Exa API is returning an HTML error page instead of JSON data.

## Root Cause
The `EXA_API_KEY` environment variable is **not configured** in your Supabase project secrets.

## Solution

### Step 1: Get Your Exa API Key

1. Go to [https://exa.ai/](https://exa.ai/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section in your dashboard
4. Copy your API key (it should start with something like `exa_...`)

### Step 2: Add the Key to Supabase

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) in the left sidebar
3. Navigate to **Edge Functions** → **Secrets**
4. Click **"Add new secret"**
5. Set:
   - **Name**: `EXA_API_KEY`
   - **Value**: Your Exa API key (paste it here)
6. Click **"Create secret"**
7. **Redeploy** your edge functions (important!)

#### Option B: Via Supabase CLI

If you have the Supabase CLI installed and logged in:

```bash
# Set the secret
supabase secrets set EXA_API_KEY=your_exa_api_key_here

# Redeploy the function
supabase functions deploy campaign-lead-import
```

### Step 3: Verify the Setup

After adding the secret and redeploying:

1. Go back to your application
2. Open a campaign
3. Click **"Add LinkedIn Leads to Campaign"**
4. Fill in the required fields:
   - Job Titles: e.g., "CTO", "VP Engineering"
   - Industry/Niche: e.g., "SaaS" or custom one
   - Country: Select your target country
   - Company Size: Select at least one size
5. Click **"Import 10 Leads"**

The import should now work! 🎉

## Testing Your Exa API Key

You can test if your Exa API key is valid by making a simple API call:

```bash
curl -X POST https://api.exa.ai/search \
  -H "Authorization: Bearer YOUR_EXA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CTO at SaaS companies",
    "type": "neural",
    "numResults": 5
  }'
```

If you get JSON results, your key is valid!

## Common Issues

### Issue: "Access token not provided" when using Supabase CLI
**Solution**: Run `supabase login` first to authenticate with your Supabase account.

### Issue: Still getting the error after adding the key
**Solution**: Make sure you **redeployed** the edge function after adding the secret. Secrets only take effect after redeployment.

### Issue: "Invalid API key" error
**Solution**: 
1. Double-check your API key from Exa dashboard
2. Make sure there are no extra spaces or characters when pasting
3. Regenerate a new API key if needed

### Issue: "Rate limit exceeded"
**Solution**: Exa has rate limits on free tier. Upgrade your Exa plan or wait before trying again.

## Cost Information

- Each lead import costs approximately **$0.10 per lead** via Exa.ai
- The cost is calculated when you click "Import"
- Example: Importing 25 leads = $2.50 in Exa credits
- Make sure you have sufficient Exa credits before importing

## Need Help?

If you're still having issues:
1. Check the Supabase **Edge Functions Logs** for detailed error messages
2. Verify your Exa account has sufficient credits
3. Ensure the edge function `campaign-lead-import` is deployed successfully

## Additional Resources

- [Exa API Documentation](https://docs.exa.ai/)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)














