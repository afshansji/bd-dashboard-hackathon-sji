-- ================================================================
-- Email Automation Diagnostic Queries
-- Use these queries in Supabase SQL Editor to diagnose issues
-- ================================================================

-- Query 1: Check if Wadud Shuvro exists as a contact
-- ================================================================
SELECT 
  id,
  contact_name,
  contact_email,
  status,
  campaign_id,
  created_at,
  last_status_change_at
FROM campaign_contacts
WHERE 
  contact_email = 'wadud.shuvro@sjinnovation.com'
  OR contact_name ILIKE '%wadud%shuvro%'
  OR contact_name ILIKE '%shuvro%';

-- Expected: Should return at least one row with contact details


-- Query 2: Check if Wadud Shuvro is enrolled in any sequence
-- ================================================================
SELECT 
  cse.id as enrollment_id,
  cse.status as enrollment_status,
  cse.current_step,
  cse.total_sent,
  cse.total_to_send,
  cse.scheduling_mode,
  cse.enrolled_at,
  cse.last_step_executed_at,
  cc.contact_name,
  cc.contact_email,
  cs.name as sequence_name,
  cs.status as sequence_status
FROM contact_sequence_enrollments cse
JOIN campaign_contacts cc ON cc.id = cse.contact_id
JOIN campaign_sequences cs ON cs.id = cse.sequence_id
WHERE 
  cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY cse.enrolled_at DESC;

-- Expected: Should return enrollment record(s) if contact was enrolled
-- Check: 
--   - enrollment_status should be 'active'
--   - sequence_status should be 'active'
--   - total_sent should increment after emails are sent


-- Query 3: Check pending email batches for Wadud Shuvro
-- ================================================================
SELECT 
  sbq.id as batch_id,
  sbq.batch_number,
  sbq.status as batch_status,
  sbq.scheduled_for,
  sbq.sent_at,
  sbq.emails_sent,
  sbq.emails_failed,
  sbq.contacts_in_batch,
  cse.scheduling_mode,
  cse.send_days,
  cse.time_window_start,
  cse.time_window_end,
  cc.contact_name,
  cc.contact_email
FROM sequence_batch_queue sbq
JOIN contact_sequence_enrollments cse ON cse.id = sbq.enrollment_id
JOIN campaign_contacts cc ON cc.id = cse.contact_id
WHERE 
  cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sbq.scheduled_for DESC;

-- Expected: Should return batch record(s)
-- Check:
--   - batch_status: 'pending' means not sent yet, 'completed' means sent
--   - scheduled_for: When the batch is scheduled to send
--   - emails_sent: Should be > 0 if batch completed
--   - send_days: Which days emails can be sent (e.g., Mon-Fri)
--   - time_window: Time range (e.g., 09:00-17:00)


-- Query 4: Check if any emails were actually sent to Wadud Shuvro
-- ================================================================
SELECT 
  ce.id as email_id,
  ce.to_email,
  ce.subject,
  ce.status,
  ce.sent_at,
  ce.sendgrid_message_id,
  p.full_name as sent_by_name,
  p.email as sent_by_email,
  cc.contact_name
FROM campaign_emails ce
LEFT JOIN profiles p ON p.id = ce.sent_by
LEFT JOIN campaign_contacts cc ON cc.id = ce.contact_id
WHERE 
  ce.to_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY ce.sent_at DESC
LIMIT 20;

-- Expected: Should return email records if any were sent
-- Check:
--   - status: Should be 'sent' if successful
--   - sendgrid_message_id: Should have a value if sent via SendGrid
--   - sent_at: Timestamp when email was sent


-- Query 5: Check sequence execution logs for Wadud Shuvro
-- ================================================================
SELECT 
  sel.id as log_id,
  sel.status as execution_status,
  sel.executed_at,
  sel.error_message,
  cc.contact_name,
  cc.contact_email,
  cs.name as sequence_name
FROM sequence_execution_log sel
JOIN contact_sequence_enrollments cse ON cse.id = sel.enrollment_id
JOIN campaign_contacts cc ON cc.id = cse.contact_id
JOIN campaign_sequences cs ON cs.id = cse.sequence_id
WHERE 
  cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sel.executed_at DESC
LIMIT 20;

-- Expected: Should return execution logs
-- Check:
--   - execution_status: 'success' means email sent, 'failed' means error
--   - error_message: Will contain error details if failed


-- Query 6: Check all active sequences and their status
-- ================================================================
SELECT 
  cs.id as sequence_id,
  cs.name,
  cs.status,
  cs.campaign_id,
  bc.name as campaign_name,
  COUNT(cse.id) as total_enrollments,
  SUM(CASE WHEN cse.status = 'active' THEN 1 ELSE 0 END) as active_enrollments,
  SUM(cse.total_sent) as total_emails_sent
FROM campaign_sequences cs
LEFT JOIN bd_campaigns bc ON bc.id = cs.campaign_id
LEFT JOIN contact_sequence_enrollments cse ON cse.sequence_id = cs.id
WHERE cs.status = 'active'
GROUP BY cs.id, cs.name, cs.status, cs.campaign_id, bc.name
ORDER BY cs.name;

-- Expected: Shows all active sequences
-- Check: Make sure the sequence you're using is active


-- Query 7: Check email templates
-- ================================================================
SELECT 
  et.id as template_id,
  et.name,
  et.subject,
  LEFT(et.body, 100) as body_preview,
  et.status,
  et.created_at
FROM email_templates et
WHERE et.status = 'active'
ORDER BY et.created_at DESC;

-- Expected: Should have at least one active template
-- Check: Templates must be active to be used


-- Query 8: Check pending batches that need to be processed NOW
-- ================================================================
SELECT 
  sbq.id as batch_id,
  sbq.batch_number,
  sbq.status,
  sbq.scheduled_for,
  NOW() as current_time,
  EXTRACT(DOW FROM NOW()) as current_day_of_week, -- 0=Sunday, 1=Monday, etc.
  TO_CHAR(NOW(), 'HH24:MI') as current_time_formatted,
  cse.send_days,
  cse.time_window_start,
  cse.time_window_end,
  cc.contact_name,
  cc.contact_email,
  cs.name as sequence_name,
  CASE 
    WHEN sbq.scheduled_for <= NOW() 
      AND sbq.status = 'pending' 
    THEN 'READY TO SEND'
    WHEN sbq.scheduled_for > NOW()
    THEN 'SCHEDULED FOR FUTURE'
    ELSE 'NOT READY'
  END as send_status
FROM sequence_batch_queue sbq
JOIN contact_sequence_enrollments cse ON cse.id = sbq.enrollment_id
JOIN campaign_contacts cc ON cc.id = cse.contact_id
JOIN campaign_sequences cs ON cs.id = cse.sequence_id
WHERE 
  sbq.status = 'pending'
  AND cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sbq.scheduled_for;

-- Expected: Shows if batches are ready to send now
-- Check:
--   - send_status = 'READY TO SEND' means it should be processed by cron
--   - Check current_day_of_week is in send_days
--   - Check current_time is between time_window_start and time_window_end


-- Query 9: Find the most recent activity for Wadud Shuvro
-- ================================================================
WITH contact_info AS (
  SELECT id, contact_name, contact_email, status, created_at
  FROM campaign_contacts
  WHERE contact_email = 'wadud.shuvro@sjinnovation.com'
),
enrollment_info AS (
  SELECT 
    'enrollment' as activity_type,
    cse.enrolled_at as activity_time,
    cs.name || ' enrollment' as activity_description,
    cse.status as status
  FROM contact_sequence_enrollments cse
  JOIN campaign_sequences cs ON cs.id = cse.sequence_id
  WHERE cse.contact_id = (SELECT id FROM contact_info LIMIT 1)
),
email_info AS (
  SELECT 
    'email_sent' as activity_type,
    ce.sent_at as activity_time,
    'Email: ' || ce.subject as activity_description,
    ce.status as status
  FROM campaign_emails ce
  WHERE ce.contact_id = (SELECT id FROM contact_info LIMIT 1)
),
batch_info AS (
  SELECT 
    'batch_processed' as activity_type,
    sbq.sent_at as activity_time,
    'Batch #' || sbq.batch_number || ' processed' as activity_description,
    sbq.status as status
  FROM sequence_batch_queue sbq
  JOIN contact_sequence_enrollments cse ON cse.id = sbq.enrollment_id
  WHERE cse.contact_id = (SELECT id FROM contact_info LIMIT 1)
    AND sbq.sent_at IS NOT NULL
)
SELECT * FROM (
  SELECT * FROM enrollment_info
  UNION ALL
  SELECT * FROM email_info
  UNION ALL
  SELECT * FROM batch_info
) combined
ORDER BY activity_time DESC
LIMIT 10;

-- Expected: Shows timeline of all activities for this contact


-- Query 10: Check SendGrid configuration (safe check)
-- ================================================================
SELECT 
  CASE 
    WHEN current_setting('app.settings.sendgrid_api_key', true) IS NOT NULL 
    THEN '✅ SendGrid API key is configured'
    ELSE '❌ SendGrid API key is NOT configured'
  END as sendgrid_status;

-- Note: This is a safe way to check without exposing the actual key


-- ================================================================
-- DIAGNOSTIC SUMMARY
-- ================================================================
-- Run all queries above and check:
-- 
-- 1. Contact exists (Query 1)
-- 2. Contact is enrolled (Query 2)
-- 3. Batch is created and pending or completed (Query 3)
-- 4. Emails were actually sent (Query 4)
-- 5. No errors in execution logs (Query 5)
-- 6. Sequence is active (Query 6)
-- 7. Email templates exist (Query 7)
-- 8. Timing constraints are met (Query 8)
-- 9. Activity timeline (Query 9)
-- 10. SendGrid is configured (Query 10)
--
-- If ANY of these checks fail, that's where the problem is!
-- ================================================================


-- ================================================================
-- QUICK FIX: Manually trigger batch processing (if needed)
-- ================================================================
-- If you find pending batches that should have been sent,
-- you can manually trigger the batch processor by calling:
-- 
-- SELECT * FROM supabase.functions.invoke('sequence-process-batches');
-- 
-- Or from command line:
-- curl -X POST https://your-project.supabase.co/functions/v1/sequence-process-batches
-- ================================================================


-- ================================================================
-- COMMON ISSUES AND SOLUTIONS
-- ================================================================
--
-- Issue 1: Contact not enrolled
-- Solution: Go to Sequences page → Click "Enroll Contacts" → Select contact
--
-- Issue 2: Batch status = 'pending' but not sending
-- Solution: Check time_window and send_days constraints
-- Solution: Make sure cron job is running (Supabase Dashboard → Database → Cron Jobs)
--
-- Issue 3: Sequence is 'draft' not 'active'
-- Solution: Go to Sequences page → Change status to 'active'
--
-- Issue 4: No email template
-- Solution: Create email template with subject and body
--
-- Issue 5: SendGrid not configured
-- Solution: Add SENDGRID_API_KEY to Supabase environment variables
--
-- ================================================================





