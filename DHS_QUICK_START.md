# DHS Tracker - Quick Start Guide

## Deployment Steps

### 1. Run Database Migration

```bash
# Push the migration to your database
supabase db push

# Or apply the specific migration file
supabase migration up
```

This creates the `dhs_submissions` table with all necessary indexes, constraints, and RLS policies.

### 2. Deploy Edge Function (Optional - for notifications)

```bash
# Deploy the DHS reminder function
supabase functions deploy send-dhs-reminder
```

### 3. Set Up Cron Job (Optional - for daily reminders)

In Supabase Dashboard SQL Editor, run:

```sql
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reminder at 9 AM
SELECT cron.schedule(
  'send-dhs-reminder-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-dhs-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR_PROJECT_REF` with your Supabase project reference.

### 4. Test the Implementation

#### As a Team Member:
1. Navigate to **Actions > Submit DHS**
2. Fill in your BD metrics
3. Submit the form
4. Try editing it (Edit button should appear)
5. View history at **Actions > My DHS History**

#### As an Admin:
1. Navigate to **Admin Panel > DHS Management**
2. View team summary dashboard
3. Test filters (date, status, search)
4. Verify all submissions are visible

### 5. Manual Test Reminder Function

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-dhs-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Check the in-app notifications bell to see the reminder.

## User Access

### All Team Members Can:
- ✅ Submit daily DHS
- ✅ Edit today's submission
- ✅ View their DHS history
- ✅ View all team members' submissions
- ✅ Receive daily reminders (if enabled)

### Admins/Managers Can:
- ✅ All of the above, plus:
- ✅ View team summary dashboard
- ✅ Filter and search all submissions
- ✅ Monitor submission rates
- ✅ See alerts for blocked or at-risk team members

## Key Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/bd/actions/dhs` | Submit DHS | All Users |
| `/bd/actions/dhs-history` | View DHS History | All Users |
| `/adminpanel/dhs-management` | Team Management | Admins Only |

## Navigation Paths

### For Users:
1. Main Dashboard → **Actions** (in sidebar)
2. Expand Actions menu
3. Click **Submit DHS** or **My DHS History**

### For Admins:
1. Main Dashboard → **Admin Panel** (in sidebar)
2. Open Admin Panel
3. **System & Operations** section → **DHS Management**

## Troubleshooting

### "Cannot submit DHS"
- Check user is authenticated
- Verify database migration ran successfully
- Check browser console for errors

### "No submissions visible"
- Verify RLS policies are in place
- Check user has proper authentication
- Ensure at least one submission exists for testing

### "Cannot edit past submissions"
- This is by design
- Only today's submission can be edited
- RLS policy enforces this at database level

### "Reminders not working"
- Verify edge function is deployed
- Check cron job is scheduled
- Look at Supabase logs for errors
- Ensure service role key is configured

## Important Notes

⚠️ **Edit Restrictions**: Users can only edit submissions for the current day. This is enforced at the database level via RLS policy.

⚠️ **All-Visible**: All authenticated users can see all DHS submissions. This is intentional for transparency.

⚠️ **Unique Constraint**: One submission per user per day. Attempting to create multiple submissions for the same day will fail.

⚠️ **Score & Status Optional**: Both the numeric score and status dropdown are optional fields.

## Support

For detailed documentation, see:
- `docs/02-modules/dhs/DHS_SETUP.md` - Complete setup guide
- `DHS_IMPLEMENTATION_SUMMARY.md` - Full implementation details

## Quick Verification Checklist

- [ ] Database migration applied successfully
- [ ] Can access DHS submission form at `/bd/actions/dhs`
- [ ] Can submit a DHS entry
- [ ] Can edit today's submission
- [ ] Cannot edit yesterday's submission
- [ ] Can view submission history
- [ ] Admin can access management page
- [ ] Team summary displays correctly
- [ ] Filters work in admin view
- [ ] Navigation links are visible
- [ ] (Optional) Edge function deployed
- [ ] (Optional) Cron job scheduled
- [ ] (Optional) Test reminder received

---

**Status**: ✅ All implementation tasks completed
**Date**: January 20, 2026

