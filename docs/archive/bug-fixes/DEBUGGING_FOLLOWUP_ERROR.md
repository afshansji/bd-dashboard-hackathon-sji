# Debugging: Follow-Up Suggestions Error

## The Error
```
Failed to generate suggestions: Edge Function returned a non-2xx status code
```

## Root Cause
The edge function `generate-followup-suggestions` is **not deployed** or has issues. The local code has been updated but needs to be pushed to Supabase.

## Step-by-Step Fix

### Step 1: Deploy the Updated Function

**Option A: Via Supabase Dashboard (EASIEST - No CLI needed)**

1. **Go to your functions dashboard:**
   ```
   https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions
   ```

2. **Find or create the function:**
   - Look for `generate-followup-suggestions`
   - If it doesn't exist, click "New Edge Function" and create it

3. **Update the code:**
   - Click on the function name
   - Delete ALL existing code in the editor
   - Open your local file: `supabase/functions/generate-followup-suggestions/index.ts`
   - Copy ALL the code (from line 1 to the end)
   - Paste it into the Supabase editor
   - Click "Deploy" button

4. **Wait for deployment:**
   - You should see a success message
   - The function should show as "Deployed"

**Option B: Via CLI (if you have Supabase CLI)**

```powershell
# First time only - login
npx supabase login

# Deploy the function
npx supabase functions deploy generate-followup-suggestions --project-ref qzzvcqoletuummdsbbio
```

### Step 2: Verify Deployment

1. **Check function logs:**
   ```
   https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
   ```

2. **Look for:**
   - Deployment success message
   - No deployment errors

### Step 3: Check Prerequisites

#### A. Environment Variables

Go to: `https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/settings/functions`

**Required variables:**
- ✅ `LOVABLE_API_KEY` - Must be set (for AI generation)
- ✅ `SUPABASE_URL` - Should be automatic
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Should be automatic

**To check LOVABLE_API_KEY:**
1. Go to Settings → Edge Functions → Secrets
2. Look for `LOVABLE_API_KEY`
3. If missing, add it

#### B. Database Data

The function needs either:
- **Active Deals** in stages: `discovery`, `qualification`, `proposal`, or `negotiation`
- **Campaign Contacts** with status: `identified`, `researched`, `contacted_linkedin`, or `connected`

**To check deals:**
```sql
SELECT id, title, stage, status, updated_at 
FROM deals 
WHERE stage IN ('discovery', 'qualification', 'proposal', 'negotiation')
ORDER BY updated_at DESC 
LIMIT 5;
```

**To check contacts:**
```sql
SELECT id, contact_name, status, updated_at 
FROM campaign_contacts 
WHERE status IN ('identified', 'researched', 'contacted_linkedin', 'connected')
ORDER BY updated_at DESC 
LIMIT 5;
```

### Step 4: Test the Function

1. **Refresh your app** (Ctrl+F5 or Cmd+Shift+R)
2. **Go to:** Meetings & Follow-Ups page
3. **Open browser console** (F12 → Console tab)
4. **Click:** "Generate Suggestions" button
5. **Watch the console** for logs that start with `[useGenerateFollowUpSuggestions]`

### Step 5: Check Function Logs

If still getting errors:

1. **Go to function logs:**
   ```
   https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
   ```

2. **Filter by:** `generate-followup-suggestions`

3. **Look for error messages** that start with `[generate-followup]`

4. **Common issues:**
   - `LOVABLE_API_KEY not configured` → Add the API key
   - `No active deals or contacts found` → Add some data
   - `AI API error: 401` → Invalid LOVABLE_API_KEY
   - `AI API error: 429` → Rate limit exceeded

## What the Fixed Function Does

1. **When you click "Generate Suggestions":**
   - Fetches up to 5 active deals (if any)
   - Fetches up to 5 recent campaign contacts (if any)
   - Generates 2-3 suggestions for top 2 deals
   - Generates 2-3 suggestions for top 2 contacts
   - Returns 0-12 suggestions total

2. **If no data found:**
   - Returns success with 0 suggestions
   - Shows message: "No active deals or campaign contacts found"

3. **If partial success:**
   - Returns whatever suggestions were generated
   - Logs errors for failed items (but doesn't fail completely)

## Expected Behavior After Fix

✅ **With Data:** 
- "Generated X follow-up suggestions" toast
- Suggestions appear in "AI Suggestions" tab
- Numbers update in the stats cards

✅ **Without Data:**
- "No suggestions generated. Try adding some active deals or campaign contacts" toast
- AI Suggestions count stays at 0

❌ **Still Failing:**
- Check function logs in Supabase dashboard
- Check browser console for detailed error messages
- Verify LOVABLE_API_KEY is set correctly

## Quick Test Checklist

- [ ] Function deployed to Supabase
- [ ] LOVABLE_API_KEY is set in Supabase
- [ ] At least one deal OR one campaign contact exists
- [ ] Browser refreshed after deployment
- [ ] Checked browser console for errors
- [ ] Checked Supabase function logs

## Need More Help?

If still having issues, please provide:
1. Browser console logs (anything starting with `[useGenerateFollowUpSuggestions]`)
2. Supabase function logs (from the dashboard)
3. Screenshot of the error
4. Confirmation that LOVABLE_API_KEY is set

## Updated Files

The following files have been updated with better error handling and logging:
- ✅ `supabase/functions/generate-followup-suggestions/index.ts` - Main function
- ✅ `src/hooks/useFollowUps.tsx` - Frontend hook with logging

