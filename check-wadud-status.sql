-- ============================================
-- Quick Status Check for wadud.shuvro@sjinnovation.com
-- Run these queries in Supabase SQL Editor
-- ============================================

-- Query 1: Check if contact exists
-- ============================================
SELECT 
  'Contact Status' as check_type,
  id,
  contact_name,
  contact_email,
  status,
  created_at,
  campaign_id
FROM campaign_contacts
WHERE contact_email = 'wadud.shuvro@sjinnovation.com';

-- Expected: Should return at least 1 row
-- If EMPTY: Contact was never added to a campaign


-- Query 2: Check if enrolled in any sequence
-- ============================================
SELECT 
  'Enrollment Status' as check_type,
  cse.id,
  cse.status,
  cse.scheduling_mode,
  cse.total_sent,
  cse.total_to_send,
  cse.enrolled_at,
  cse.last_step_executed_at,
  cs.name as sequence_name,
  cs.status as sequence_status,
  cc.contact_name
FROM contact_sequence_enrollments cse
JOIN campaign_contacts cc ON cc.id = cse.contact_id
JOIN campaign_sequences cs ON cs.id = cse.sequence_id
WHERE cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY cse.enrolled_at DESC;

-- Expected: Should return rows if enrolled
-- If EMPTY: Contact was never enrolled in a sequence
-- Check: 
--   - cse.status should be 'active'
--   - cs.status should be 'active' 
--   - total_sent should increment after emails sent


-- Query 3: Check pending batches
-- ============================================
SELECT 
  'Batch Queue Status' as check_type,
  sbq.id,
  sbq.batch_number,
  sbq.status,
  sbq.scheduled_for,
  sbq.sent_at,
  sbq.emails_sent,
  sbq.emails_failed,
  NOW() as current_time,
  CASE 
    WHEN sbq.scheduled_for > NOW() THEN '⏰ Scheduled for future'
    WHEN sbq.status = 'pending' AND sbq.scheduled_for <= NOW() THEN '⚡ READY TO SEND NOW'
    WHEN sbq.status = 'completed' THEN '✅ Already sent'
    WHEN sbq.status = 'failed' THEN '❌ Failed'
    ELSE '❓ Unknown'
  END as batch_status
FROM sequence_batch_queue sbq
JOIN contact_sequence_enrollments cse ON cse.id = sbq.enrollment_id
JOIN campaign_contacts cc ON cc.id = cse.contact_id
WHERE cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sbq.scheduled_for DESC;

-- Expected: Should return batch records
-- If EMPTY: No batches created (enrollment might not have happened correctly)
-- Check batch_status:
--   - '⚡ READY TO SEND NOW' → Should send on next cron run (every 5 min)
--   - '⏰ Scheduled for future' → Will send at scheduled_for time
--   - '✅ Already sent' → Email was already sent


-- Query 4: Check if any emails were sent
-- ============================================
SELECT 
  'Sent Emails' as check_type,
  ce.id,
  ce.to_email,
  ce.subject,
  ce.status,
  ce.sent_at,
  ce.sendgrid_message_id,
  ce.created_at
FROM campaign_emails ce
WHERE ce.to_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY ce.sent_at DESC
LIMIT 10;

-- Expected: Should return rows if emails were sent
-- If EMPTY: No emails have been sent yet
-- Check:
--   - status should be 'sent'
--   - sendgrid_message_id should have a value
--   - If rows exist but no email received → Check spam folder


-- Query 5: Check execution logs for errors
-- ============================================
SELECT 
  'Execution Logs' as check_type,
  sel.id,
  sel.status,
  sel.error_message,
  sel.executed_at,
  cc.contact_name
FROM sequence_execution_log sel
JOIN contact_sequence_enrollments cse ON cse.id = sel.enrollment_id
JOIN campaign_contacts cc ON cc.id = cse.contact_id
WHERE cc.contact_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sel.executed_at DESC
LIMIT 10;

-- Expected: Shows execution attempts
-- If EMPTY: No execution attempts made
-- Check:
--   - status 'success' → Email was sent
--   - status 'failed' → Check error_message for details


-- Query 6: Check current time and day
-- ============================================
SELECT 
  'Time Check' as check_type,
  NOW() as current_time,
  TO_CHAR(NOW(), 'Day') as current_day_name,
  EXTRACT(DOW FROM NOW()) as day_of_week,
  TO_CHAR(NOW(), 'HH24:MI') as current_time_formatted,
  CASE 
    WHEN EXTRACT(DOW FROM NOW()) BETWEEN 1 AND 5 THEN '✅ Weekday (Mon-Fri)'
    ELSE '❌ Weekend (Sat-Sun)'
  END as day_check,
  CASE 
    WHEN TO_CHAR(NOW(), 'HH24:MI') BETWEEN '09:00' AND '17:00' THEN '✅ Within time window (9am-5pm)'
    ELSE '❌ Outside time window (9am-5pm)'
  END as time_check;

-- This shows if current time/day is within default sending constraints
-- Emails only send Mon-Fri, 9am-5pm by default


-- ============================================
-- INTERPRETATION GUIDE
-- ============================================
--
-- Scenario 1: All queries return EMPTY
-- → Contact was never added or enrolled
-- → Action: Go to dashboard and enroll contact
--
-- Scenario 2: Query 1 has data, Query 2 is EMPTY
-- → Contact exists but not enrolled in sequence
-- → Action: Go to Sequences → Enroll Contacts
--
-- Scenario 3: Query 2 has data, Query 3 is EMPTY
-- → Enrolled but no batches created
-- → Action: Check if sequence is 'active' not 'draft'
--
-- Scenario 4: Query 3 shows 'READY TO SEND NOW'
-- → Batch is waiting for cron job
-- → Action: Wait 5 minutes for next cron run
--
-- Scenario 5: Query 3 shows 'Outside time window'
-- → Email will send during business hours (Mon-Fri 9am-5pm)
-- → Action: Wait until valid time, or change time window
--
-- Scenario 6: Query 4 has data (emails sent)
-- → System sent the email
-- → Action: Check spam folder, verify sender in SendGrid
--
-- Scenario 7: Query 5 shows errors
-- → Execution failed with errors
-- → Action: Check error_message for details
--
-- ============================================





