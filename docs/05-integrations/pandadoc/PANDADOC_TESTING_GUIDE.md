# PandaDoc Integration - Complete Testing Guide

## Overview
This guide provides step-by-step instructions to test all features of the PandaDoc integration including webhooks, sync functions, email notifications, and analytics.

---

## Prerequisites

### 1. PandaDoc Account Setup
- Sign up for a PandaDoc account (free trial available)
- Generate an API key from Settings → API & Integrations
- Note your workspace ID

### 2. Backend Configuration
- Ensure SendGrid API key is configured for email notifications
- Verify Lovable Cloud backend is running

### 3. Database Setup
Run the notification preferences migration:
```sql
-- This adds the notification_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
```

### 4. Cron Jobs Setup
Configure the cron jobs to run the sync and expiration check functions:

```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Sync status every 15 minutes
SELECT cron.schedule(
  'pandadoc-sync-status',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
      url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/pandadoc-sync-status',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enZjcW9sZXR1dW1tZHNiYmlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjAyNTYsImV4cCI6MjA3NTYzNjI1Nn0.H3-jXdTzQJEAj-JU3TjCn-oje7JGD6KD7vi8Q97J_p0"}'::jsonb
  ) as request_id;
  $$
);

-- Check expiring proposals daily at 9 AM
SELECT cron.schedule(
  'pandadoc-check-expiring',
  '0 9 * * *',
  $$
  SELECT net.http_post(
      url:='https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/pandadoc-check-expiring',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6enZjcW9sZXR1dW1tZHNiYmlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjAyNTYsImV4cCI6MjA3NTYzNjI1Nn0.H3-jXdTzQJEAj-JU3TjCn-oje7JGD6KD7vi8Q97J_p0"}'::jsonb
  ) as request_id;
  $$
);
```

---

## Phase 1: Integration Setup

### Test 1.1: Connect PandaDoc Integration

1. **Navigate to Integrations**
   - Go to `/adminpanel/integrations`
   - Click "Configure" on PandaDoc card

2. **Add API Key**
   - Enter your PandaDoc API key
   - Click "Connect PandaDoc"

3. **Verify Connection**
   - Status should show "Connected"
   - Green checkmark icon should appear

**Expected Result:**
- ✅ Integration record created in `pandadoc_integrations` table
- ✅ API key encrypted and stored
- ✅ `is_active` = true

---

## Phase 2: Proposal Creation & Management

### Test 2.1: Create a Proposal

1. **Prerequisites**
   - Have at least one deal in any pipeline stage
   - Have at least one client in the system

2. **Create Proposal**
   - Navigate to `/proposals`
   - Click "Create Proposal"
   - Fill in the form:
     - Deal: Select a deal
     - Client: Auto-filled from deal
     - Template: Select a PandaDoc template
     - Title: "Test Proposal Q1 2025"
   - Click "Create"

3. **Verify Creation**
   - Proposal should appear in the list
   - Status should be "draft"
   - View proposal detail page

**Expected Result:**
- ✅ Proposal created in database
- ✅ PandaDoc document created via API
- ✅ `pandadoc_doc_id` populated
- ✅ Status = "draft"

### Test 2.2: Send a Proposal

1. **Send Proposal**
   - From proposal list, click "Send" on the draft proposal
   - Enter recipient email
   - Add optional message
   - Click "Send Proposal"

2. **Check Email**
   - Recipient should receive PandaDoc email
   - Email contains proposal link

3. **Verify Database**
   - Proposal status → "sent"
   - `sent_at` timestamp populated

**Expected Result:**
- ✅ Proposal status updated to "sent"
- ✅ Client receives email from PandaDoc
- ✅ Proposal URL is accessible

---

## Phase 3: Webhook Testing

### Test 3.1: Proposal Viewed Event

1. **View Proposal**
   - Open the PandaDoc proposal link (from email)
   - View the proposal content

2. **Wait for Webhook** (5-10 seconds)
   - PandaDoc sends `document.viewed` webhook

3. **Verify Database**
   ```sql
   SELECT status, viewed_at 
   FROM proposal_documents 
   WHERE pandadoc_doc_id = '[your-doc-id]';
   ```

4. **Check Email Notification**
   - Deal owner should receive "Proposal Viewed" email
   - Email subject: "🔔 [Client] viewed your proposal"

**Expected Result:**
- ✅ Status updated to "viewed"
- ✅ `viewed_at` timestamp set
- ✅ Email notification sent (if enabled in settings)
- ✅ Analytics event logged

### Test 3.2: Proposal Signed Event

1. **Sign Proposal**
   - In PandaDoc, sign the proposal
   - Complete all required fields

2. **Wait for Webhook**
   - PandaDoc sends `document.completed` webhook

3. **Verify Database Updates**
   ```sql
   -- Check proposal
   SELECT status, completed_at, pdf_url 
   FROM proposal_documents 
   WHERE pandadoc_doc_id = '[your-doc-id]';
   
   -- Check deal
   SELECT stage, status, close_date 
   FROM deals 
   WHERE id = '[deal-id]';
   ```

4. **Check PDF Storage**
   - Navigate to backend → Storage → deal-files
   - PDF should be in `proposals/[doc-id].pdf`

5. **Check Email Notification**
   - Deal owner receives "Proposal Signed" email
   - Email subject: "🎉 [Client] signed the proposal!"

**Expected Result:**
- ✅ Proposal status → "signed"
- ✅ `completed_at` timestamp set
- ✅ PDF downloaded to storage
- ✅ Deal stage → "closed_won"
- ✅ Deal status → "won"
- ✅ Email notification sent
- ✅ Analytics event logged

### Test 3.3: Proposal Declined Event

1. **Decline Proposal**
   - In PandaDoc, decline/reject the proposal

2. **Verify Updates**
   - Proposal status → "declined"
   - Email notification sent
   - Analytics logged

**Expected Result:**
- ✅ Status updated correctly
- ✅ Owner notified via email

---

## Phase 4: Cron Sync Testing

### Test 4.1: Manual Sync Invocation

1. **Test Sync Function**
   - In Lovable Cloud backend, navigate to Edge Functions
   - Find `pandadoc-sync-status`
   - Click "Invoke" to manually trigger

2. **Check Logs**
   ```
   [pandadoc-sync-status] Starting cron sync...
   [pandadoc-sync-status] Found X active proposals
   [pandadoc-sync-status] Sync complete: checked X, updated Y
   ```

3. **Verify Database**
   - Proposals should be up-to-date with PandaDoc
   - Check `analytics_data` for sync metrics

**Expected Result:**
- ✅ Function runs without errors
- ✅ Proposals synced successfully
- ✅ Analytics logged

### Test 4.2: Test Status Recovery

1. **Simulate Missed Webhook**
   - Manually update a proposal status in PandaDoc
   - Don't trigger the webhook

2. **Wait for Cron** (15 minutes) or invoke manually

3. **Verify Sync**
   - Status should be updated in database
   - Matches PandaDoc status

**Expected Result:**
- ✅ Cron catches missed status changes
- ✅ Database stays in sync with PandaDoc

---

## Phase 5: Expiring Proposals Notification

### Test 5.1: Create Expiring Proposal

1. **Create Proposal with Expiration**
   - Create a proposal
   - Set expiration date to 3 days from now

2. **Wait for Daily Cron** (or invoke manually)
   ```
   /functions/v1/pandadoc-check-expiring
   ```

3. **Check Email**
   - Deal owner receives expiration warning
   - Email subject: "⏰ Proposal expiring soon"

**Expected Result:**
- ✅ Email sent 3 days before expiration
- ✅ Analytics logged

### Test 5.2: Auto-Expire Old Proposals

1. **Create Old Proposal**
   - Create and send a proposal
   - Manually update `sent_at` to 31 days ago

2. **Run Sync**
   - Invoke `pandadoc-sync-status`

3. **Verify Status**
   - Status should change to "expired"

**Expected Result:**
- ✅ Proposals older than 30 days marked expired

---

## Phase 6: Email Notification Preferences

### Test 6.1: Configure Preferences

1. **Navigate to Settings**
   - Go to `/bd/admin/settings`
   - Find "Proposal Notifications" section

2. **Toggle Notifications**
   - Disable "Proposal Viewed" notification
   - Keep others enabled
   - Click "Save Notification Preferences"

3. **Test Notification**
   - View a proposal
   - Should NOT receive email

4. **Re-enable and Test**
   - Enable "Proposal Viewed"
   - View another proposal
   - Should receive email

**Expected Result:**
- ✅ Preferences saved to `profiles.notification_preferences`
- ✅ Notifications respect user preferences
- ✅ Toast confirms save

---

## Phase 7: Analytics Dashboard

### Test 7.1: View Analytics

1. **Navigate to Analytics**
   - Go to `/proposals/analytics`

2. **Select Time Period**
   - Use dropdown to select "Last 7 days", "Last 30 days", or "Last 90 days"

3. **Verify Charts**
   - **Key Metrics Cards:**
     - Total Proposals
     - Conversion Rate
     - Avg Time to Sign
     - Signed This Period
   
   - **Conversion Funnel Chart:**
     - Shows Sent → Viewed → Signed

   - **Status Breakdown Chart:**
     - Bar chart of proposal statuses

   - **Time Series Chart:**
     - Line chart showing activity over time

**Expected Result:**
- ✅ All charts render correctly
- ✅ Data matches database
- ✅ Charts update when period changes

### Test 7.2: Export Analytics

1. **Click Export Button**
   - Currently logs to console (TODO: Implement CSV export)

**Expected Result:**
- ✅ Export triggered (implementation pending)

---

## Phase 8: Edge Cases & Error Handling

### Test 8.1: Invalid API Key

1. **Update Integration**
   - Change API key to invalid value
   - Try to create/send proposal

2. **Verify Error Handling**
   - Should show error message
   - Should not create broken proposal

**Expected Result:**
- ✅ Graceful error handling
- ✅ User-friendly error message

### Test 8.2: Network Issues

1. **Simulate Timeout**
   - Temporarily block PandaDoc API
   - Try operations

2. **Verify Recovery**
   - Errors logged
   - Cron sync catches up later

**Expected Result:**
- ✅ No data corruption
- ✅ Automatic recovery via cron

### Test 8.3: Duplicate Prevention

1. **Test Webhook Idempotency**
   - Send same webhook twice
   - Should not duplicate actions

**Expected Result:**
- ✅ No duplicate emails
- ✅ No duplicate database updates

---

## Success Criteria Summary

| Feature | Test | Status |
|---------|------|--------|
| Integration Setup | API key connection | ⬜ |
| Proposal Creation | Create draft proposal | ⬜ |
| Proposal Sending | Send to client | ⬜ |
| Webhook - Viewed | Status update + email | ⬜ |
| Webhook - Signed | Status + deal + PDF + email | ⬜ |
| Webhook - Declined | Status + email | ⬜ |
| Cron Sync | Auto-sync every 15min | ⬜ |
| Expiring Alerts | 3-day warning email | ⬜ |
| Email Preferences | User controls notifications | ⬜ |
| Analytics Dashboard | Charts and metrics | ⬜ |
| Error Handling | Graceful failures | ⬜ |

---

## Troubleshooting

### Emails Not Sending
- Verify SendGrid API key is configured
- Check `notification_preferences` in profiles table
- Review edge function logs for errors

### Webhooks Not Received
- Verify webhook URL is configured in PandaDoc
- Check webhook secret matches
- Review `pandadoc-manage` function logs

### Cron Not Running
- Verify cron jobs are scheduled in database
- Check `pg_cron` extension is enabled
- Review cron execution logs

### PDF Not Downloading
- Check user has valid PandaDoc integration
- Verify `deal-files` storage bucket exists
- Review storage permissions

---

## Monitoring

### Key Metrics to Track
1. **Proposal Volume**
   - Proposals created per day
   - Conversion rate over time

2. **System Health**
   - Webhook success rate
   - Cron sync success rate
   - Email delivery rate

3. **User Engagement**
   - Time to first view
   - Time to sign
   - Decline rate

### Analytics Queries
```sql
-- Conversion rate last 30 days
SELECT 
  COUNT(*) FILTER (WHERE status = 'signed') * 100.0 / 
  COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'signed')) as conversion_rate
FROM proposal_documents
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Average time to sign
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - sent_at)) / 86400) as avg_days_to_sign
FROM proposal_documents
WHERE status = 'signed' AND sent_at IS NOT NULL;
```

---

## Next Steps After Testing

1. **Production Deployment**
   - Review all logs for errors
   - Monitor email delivery rates
   - Set up alerting for failures

2. **User Training**
   - Document workflow for team
   - Create video tutorials
   - Set up notification preferences

3. **Future Enhancements**
   - Template management UI
   - Bulk proposal operations
   - Proposal versioning
   - Client portal integration

---

**Last Updated:** 2025-01-13
**Version:** 1.0.0
