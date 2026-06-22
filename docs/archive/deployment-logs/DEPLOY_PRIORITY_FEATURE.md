# Deploy Priority Feature for Feedback Manager

## Your Project Details
- **Project ID**: `qzzvcqoletuummdsbbio`
- **Feature**: Priority dropdown (Low, Medium, High) for feedback/feature requests

## What Needs to be Deployed

1. **Database Migration** - Adds `priority` column to `feedback_reports` table
2. **Edge Function** - Updates `manage-feedback` function to handle priority updates

---

## Step 1: Apply Database Migration

### Option A: Using Supabase Dashboard (Easiest)

1. **Go to SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/sql/new
   
2. **Run this SQL:**
   ```sql
   -- Add priority column to feedback_reports table
   ALTER TABLE public.feedback_reports
   ADD COLUMN IF NOT EXISTS priority TEXT NULL CHECK (priority IN ('low', 'medium', 'high'));

   -- Create index for priority filtering
   CREATE INDEX IF NOT EXISTS idx_feedback_reports_priority ON public.feedback_reports(priority);

   COMMENT ON COLUMN public.feedback_reports.priority IS 'Priority level for feedback: low, medium, high. Optional field for prioritization.';
   ```

3. **Click "Run"** - You should see "Success. No rows returned"

### Option B: Using Supabase CLI

```powershell
cd sj-bd-dashboard
npx supabase db push --project-ref qzzvcqoletuummdsbbio
```

---

## Step 2: Deploy Edge Function

### Option A: Using Supabase Dashboard (Easiest)

1. **Go to Edge Functions:**
   - Visit: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions

2. **Find the `manage-feedback` function**
   - Click on `manage-feedback` in the list

3. **Update the code:**
   - Click "Edit function"
   - **Delete all existing code**
   - **Copy the ENTIRE content** from: `supabase/functions/manage-feedback/index.ts`
   - **Paste it** into the editor
   - Click "Deploy"

### Option B: Using Supabase CLI

```powershell
cd sj-bd-dashboard
npx supabase functions deploy manage-feedback --project-ref qzzvcqoletuummdsbbio
```

---

## Step 3: Verify Deployment

1. ✅ Go to your app (refresh the browser)
2. ✅ Navigate to: `/adminpanel/feedback`
3. ✅ Login as **Super Admin** (only super_admin can edit priority)
4. ✅ Look for the new **Priority column** in the table
5. ✅ Click on a feedback item
6. ✅ Find the **Priority dropdown** in the details panel (below Status)
7. ✅ Try setting a priority: Low, Medium, or High
8. ✅ Check that the priority badge appears in the table

---

## Expected Results

### UI Changes:
- ✅ New **Priority column** in feedback table (after Status, before Submitted by)
- ✅ Priority badges with colors:
  - **Low**: Gray
  - **Medium**: Yellow
  - **High**: Red
- ✅ Priority dropdown in detail panel
- ✅ **Super Admin**: Can edit priority
- ✅ **Admin**: Can view priority (dropdown disabled, marked "View only")

### Permissions:
- ✅ `super_admin` role → Full edit access
- ✅ `admin` role → Read-only view
- ✅ Other roles → No access (already view-only)

---

## Troubleshooting

### Still getting 404 error?
- ✅ Make sure the edge function was deployed (Step 2)
- ✅ Check function logs: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
- ✅ Look for `[manage-feedback]` logs showing "Method: PUT RouteSegments: [id, priority]"

### Still getting "Unable to update priority"?
- ✅ Make sure the database migration ran (Step 1)
- ✅ Verify in SQL Editor: `SELECT priority FROM feedback_reports LIMIT 1;`
- ✅ Check you're logged in as `super_admin` (admin role cannot edit priority)

### Can't see Priority column?
- ✅ Hard refresh the browser (Ctrl + Shift + R)
- ✅ Clear browser cache
- ✅ Make sure you're on `/adminpanel/feedback` page

---

## Quick Links

- **SQL Editor**: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/sql/new
- **Edge Functions**: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions
- **Function Logs**: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/logs/edge-functions
- **Table Editor** (to verify priority column): https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/editor

---

## Files Changed

### Created:
1. `supabase/migrations/20251126152551_add_priority_to_feedback.sql` - Database migration

### Modified:
1. `supabase/functions/manage-feedback/index.ts` - Edge function with priority routes
2. `src/features/feedback/api.ts` - API types and functions
3. `src/pages/admin/FeedbackManager.tsx` - UI with priority column and dropdown

---

## Summary for Lovable

**Tell Lovable:**

> "I need to deploy the Priority feature for Feedback Manager. This involves:
> 
> 1. **Run this SQL in Supabase** (https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/sql/new):
> ```sql
> ALTER TABLE public.feedback_reports
> ADD COLUMN IF NOT EXISTS priority TEXT NULL CHECK (priority IN ('low', 'medium', 'high'));
> CREATE INDEX IF NOT EXISTS idx_feedback_reports_priority ON public.feedback_reports(priority);
> ```
> 
> 2. **Deploy the updated `manage-feedback` edge function** by copying the full content from `supabase/functions/manage-feedback/index.ts` to the Supabase dashboard at: https://supabase.com/dashboard/project/qzzvcqoletuummdsbbio/functions
>
> This adds a Priority dropdown (Low/Medium/High) to the feedback manager that only super_admin users can edit."

