# Daily Head Start (DHS) Tracker Setup

## Overview

The Daily Head Start (DHS) Tracker module allows BD team members to submit their daily work plan and track BD health indicators at the start of each day.

## Features

- **Daily Submission Form**: Captures follow-ups, calls, meetings, pipeline updates
- **Dual Scoring System**: Numeric score (1-10) and status dropdown (On Track, At Risk, Blocked)
- **Team Visibility**: All submissions visible to all users
- **Edit Capability**: Users can edit their submission throughout the day
- **Team Dashboard**: Management view with aggregate metrics and alerts
- **Daily Reminders**: Optional in-app notifications at 9 AM

## Database Schema

Table: `dhs_submissions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| date | DATE | Submission date (unique per user per day) |
| follow_ups_done | INTEGER | Number of follow-ups completed |
| calls_made | INTEGER | Number of calls made |
| meetings_booked | INTEGER | Number of meetings booked |
| pipeline_updated | BOOLEAN | Whether pipeline was updated |
| score | NUMERIC | Optional score 1-10 |
| status | TEXT | Optional status (on_track, at_risk, blocked) |
| notes | TEXT | Optional notes/exceptions |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Routes

### User Routes
- `/bd/actions/dhs` - Submit DHS for today
- `/bd/actions/dhs-history` - View personal DHS history

### Admin Routes
- `/adminpanel/dhs-management` - View all team submissions and analytics

## Navigation

### User Navigation (Actions Menu)
- Submit DHS
- My DHS History
- Submit EOD
- My EOD History

### Admin Navigation (System & Operations)
- DHS Management
- EOD Management

## Setting Up Daily Reminders (Optional)

The DHS reminder notification system sends in-app reminders to users who haven't submitted their DHS for the day.

### Edge Function

The edge function is located at: `supabase/functions/send-dhs-reminder/index.ts`

**What it does:**
1. Queries all active users
2. Checks who has submitted DHS for today
3. Creates in-app notifications for users who haven't submitted
4. Sends notifications with link to DHS submission page

### Deploying the Function

```bash
# Deploy the edge function
supabase functions deploy send-dhs-reminder
```

### Setting Up Cron Job

To schedule daily reminders at 9 AM:

1. Go to Supabase Dashboard
2. Navigate to Database > Cron Jobs (or use pg_cron extension)
3. Create a new cron job:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to run at 9 AM daily
SELECT cron.schedule(
  'send-dhs-reminder-daily',
  '0 9 * * *',  -- Every day at 9:00 AM
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

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

**Alternative: Using Supabase Edge Function Cron**

If your Supabase plan supports it, you can configure cron directly in the function metadata:

```typescript
// In supabase/functions/send-dhs-reminder/index.ts
// Add at the top:
Deno.cron("send-dhs-reminder", "0 9 * * *", async () => {
  // Function logic here
});
```

### Testing the Reminder Function

To manually test the function:

```bash
# Using curl
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-dhs-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Usage

### For Team Members

1. **Morning Submission**:
   - Navigate to Actions > Submit DHS
   - Enter your planned BD activities
   - Optionally set a daily score and status
   - Submit the form

2. **Throughout the Day**:
   - Return to the form to update your metrics
   - Edit button appears if you've already submitted today
   - Update your progress as the day goes on

3. **View History**:
   - Navigate to Actions > My DHS History
   - Filter by date range
   - Review past submissions and trends

### For Managers/Admins

1. **View Team Dashboard**:
   - Navigate to Admin Panel > DHS Management
   - See submission rate and team summary
   - View average scores and status breakdown
   - Get alerts for low submission rates or blocked team members

2. **Filter and Search**:
   - Filter by date (today, week, month, all)
   - Filter by status (on track, at risk, blocked)
   - Search by team member name or email

3. **Monitor Trends**:
   - Track daily submission rates
   - Identify team members needing support
   - Review aggregate BD metrics

## Key Design Decisions

1. **All-Visible**: All submissions are visible to all authenticated users for transparency
2. **Editable Today Only**: Users can edit their submission throughout the current day but not past submissions
3. **Dual Scoring**: Both numeric and status fields for flexibility in tracking
4. **BD Focus**: Metrics specifically chosen for BD health indicators
5. **Consistent Pattern**: Follows the same pattern as EOD module for maintainability

## Future Enhancements

- Export functionality (CSV/Excel)
- Email reminders (in addition to in-app)
- Historical trends and charts
- Team comparison analytics
- Integration with task management system
- Customizable reminder times per user

