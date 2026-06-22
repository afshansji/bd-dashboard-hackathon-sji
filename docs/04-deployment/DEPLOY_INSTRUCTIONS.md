# How to Deploy the Follow-Up Suggestions Fix

The edge function has been updated in your local code, but needs to be deployed to Supabase. Choose one of these methods:

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "Edge Functions" in the left sidebar
4. Find "generate-followup-suggestions" function
5. Click on it
6. Click "Deploy new version"
7. Copy and paste the entire content from:
   `supabase/functions/generate-followup-suggestions/index.ts`
8. Click "Deploy"

## Option 2: Login and Deploy via CLI

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```
   This will open a browser window to authenticate.

2. **Deploy the function:**
   ```bash
   npx supabase functions deploy generate-followup-suggestions --project-ref YOUR_PROJECT_REF
   ```
   Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

## Option 3: Use Access Token

1. **Get your access token:**
   - Go to https://supabase.com/dashboard/account/tokens
   - Generate a new access token or copy existing one

2. **Set the environment variable:**
   
   **Windows (PowerShell):**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="your_token_here"
   npx supabase functions deploy generate-followup-suggestions --project-ref YOUR_PROJECT_REF
   ```

   **Windows (Command Prompt):**
   ```cmd
   set SUPABASE_ACCESS_TOKEN=your_token_here
   npx supabase functions deploy generate-followup-suggestions --project-ref YOUR_PROJECT_REF
   ```

   **Linux/Mac:**
   ```bash
   export SUPABASE_ACCESS_TOKEN="your_token_here"
   npx supabase functions deploy generate-followup-suggestions --project-ref YOUR_PROJECT_REF
   ```

## What This Fix Does

Once deployed, the "Generate Suggestions" button will:
- ✅ Automatically find your active deals (in discovery, qualification, proposal, negotiation stages)
- ✅ Automatically find recent campaign contacts (identified, researched, contacted, connected)
- ✅ Generate 2-3 AI-powered suggestions for the top 2 deals
- ✅ Generate 2-3 AI-powered suggestions for the top 2 contacts
- ✅ Display all suggestions in the AI Suggestions tab

## After Deployment

1. Refresh the Meetings & Follow-Ups page
2. Click "Generate Suggestions"
3. Wait 10-30 seconds for AI to generate suggestions
4. Check the "AI Suggestions" tab to see the results

## Need Help?

If you encounter any issues:
1. Check that the LOVABLE_API_KEY is set in your Supabase project settings
2. Verify your deals and contacts exist in the database
3. Check the Supabase function logs for any errors

