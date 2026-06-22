# Email Automation Flow: Complete Process

## 📧 How Users Receive Emails from the Automation System

---

## 🔄 Complete End-to-End Process

### **Overview Flow Diagram**

```
Campaign Contact → Enrolled in Sequence → Batch Created → Batch Processed → Email Sent via SendGrid → User Receives Email
     ↓                    ↓                     ↓                ↓                      ↓                    ↓
  Step 1              Step 2               Step 3          Step 4               Step 5              Step 6
```

---

## 📋 Detailed Step-by-Step Process

### **STEP 1: Contact Creation** 
**What:** Add a contact to a campaign

**How:**
1. User goes to Campaign Detail page
2. Clicks "Add Contact" button
3. Fills form with:
   - Name: Wadud Shuvro
   - Email: wadud.shuvro@sjinnovation.com
   - Company, Title, etc.
4. Contact is saved to `campaign_contacts` table

**Database:**
```sql
INSERT INTO campaign_contacts (
  campaign_id,
  contact_name,
  contact_email,
  status
) VALUES (
  'campaign-uuid',
  'Wadud Shuvro',
  'wadud.shuvro@sjinnovation.com',
  'identified'
);
```

✅ **Contact now exists in the system**

---

### **STEP 2: Sequence Enrollment**
**What:** Add contact to an email sequence

**How:**
1. User goes to Sequences page
2. Finds a sequence (must be ACTIVE status)
3. Clicks "Enroll Contacts" button
4. Dialog appears with options:
   - ☑️ Select contact "Wadud Shuvro"
   - 📧 Select email template
   - ⏰ Choose scheduling mode:
     - **Immediate:** Send now
     - **Scheduled:** Send at specific time
     - **Drip (RECOMMENDED):** Send in batches over time
5. Configures drip settings (if drip mode):
   - Messages per batch: 25
   - Interval: 1 day
   - Send days: Mon-Fri
   - Time window: 09:00-17:00
6. Clicks "Enroll Contacts"

**What Happens Behind the Scenes:**
```javascript
// Frontend calls Supabase Edge Function
await supabase.functions.invoke('sequence-enroll-contacts', {
  body: {
    sequenceId: 'sequence-uuid',
    contactIds: ['contact-uuid'],
    config: {
      scheduling_mode: 'drip',
      batch_config: {
        messagesPerBatch: 25,
        interval: 1,
        intervalUnit: 'days'
      },
      send_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      time_window_start: '09:00',
      time_window_end: '17:00',
      start_date_time: '2024-01-15T09:00:00Z',
      email_template_id: 'template-uuid'
    }
  }
});
```

**Database:**
```sql
-- Create enrollment record
INSERT INTO contact_sequence_enrollments (
  contact_id,
  sequence_id,
  status,
  current_step,
  scheduling_mode,
  send_days,
  time_window_start,
  time_window_end,
  email_template_id,
  total_sent,
  total_to_send,
  enrolled_at
) VALUES (
  'contact-uuid',
  'sequence-uuid',
  'active',
  0,
  'drip',
  ARRAY['Mon','Tue','Wed','Thu','Fri'],
  '09:00',
  '17:00',
  'template-uuid',
  0,
  1,
  NOW()
);
```

✅ **Contact is now enrolled** → Shows in "Enrollment Status" table

---

### **STEP 3: Batch Queue Creation**
**What:** System creates email batches based on drip settings

**When:** Immediately after enrollment (if drip mode)

**Process:**
```javascript
// Function: sequence-enroll-contacts
// Creates batches for drip sending

// Calculate batch schedule
const batches = [];
let currentBatchDate = new Date(startDateTime);

// Create first batch
batches.push({
  enrollment_id: 'enrollment-uuid',
  batch_number: 1,
  contacts_in_batch: ['contact-uuid'],
  scheduled_for: currentBatchDate.toISOString(),
  status: 'pending'
});

// If more contacts, create subsequent batches
// (e.g., if 50 contacts and 25 per batch = 2 batches)
```

**Database:**
```sql
INSERT INTO sequence_batch_queue (
  enrollment_id,
  batch_number,
  contacts_in_batch,
  scheduled_for,
  status,
  created_at
) VALUES (
  'enrollment-uuid',
  1,
  ARRAY['contact-uuid'],
  '2024-01-15 09:00:00',
  'pending',
  NOW()
);
```

✅ **Batch is queued** → Waiting to be processed

---

### **STEP 4: Batch Processing** ⚡
**What:** Cron job processes pending batches and sends emails

**When:** Runs every 5-10 minutes (configured in Supabase)

**Trigger:** Supabase Cron Job or manual trigger
```bash
# Cron job calls this function every 5 minutes
curl -X POST https://your-project.supabase.co/functions/v1/sequence-process-batches
```

**Process Flow:**

```javascript
// Function: sequence-process-batches

1. Find pending batches that are due:
   - status = 'pending'
   - scheduled_for <= NOW()

2. For each batch:
   a. Check time/day constraints:
      - Is today in send_days? (Mon-Fri)
      - Is current time in time_window? (09:00-17:00)
   
   b. If constraints pass:
      - Get contacts in batch
      - Get email template
      - For each contact:
        * Replace variables in template
        * Call send-campaign-email function
   
   c. Update batch status:
      - status = 'completed' or 'failed'
      - emails_sent = count
      - emails_failed = count
   
   d. Update enrollment:
      - total_sent += emails_sent
      - last_step_executed_at = NOW()
```

**Time/Day Checking:**
```javascript
// Check if it's an allowed day
const daysMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const currentDay = new Date().getDay();
const isAllowedDay = sendDays.includes(currentDay); // Mon-Fri only

// Check if it's within time window
const currentTime = new Date().toTimeString().slice(0, 5); // "14:30"
const isWithinWindow = currentTime >= "09:00" && currentTime <= "17:00";

if (!isAllowedDay || !isWithinWindow) {
  // Skip this batch, try again later
  return;
}
```

**Variable Replacement:**
```javascript
// Get contact details
const contact = { 
  contact_name: 'Wadud Shuvro',
  contact_company: 'SJ Innovation',
  contact_title: 'Developer'
};

// Get template
const template = {
  subject: 'Hello {Contact Name} from {User Name}',
  body: 'Hi {Contact Name}, I noticed you work at {Company}...'
};

// Replace variables
const subject = 'Hello Wadud Shuvro from John Doe';
const body = 'Hi Wadud Shuvro, I noticed you work at SJ Innovation...';
```

✅ **Batch is being processed**

---

### **STEP 5: Email Sending via SendGrid** 📨
**What:** Individual email is sent through SendGrid API

**Process:**

```javascript
// Function: send-campaign-email

// 1. Validate parameters
if (!to || !subject || !body || !contactId || !campaignId) {
  throw new Error('Missing required fields');
}

// 2. Get SendGrid API key from environment
const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
if (!sendGridApiKey) {
  throw new Error('SendGrid not configured');
}

// 3. Prepare email payload
const emailPayload = {
  personalizations: [{
    to: [{ email: 'wadud.shuvro@sjinnovation.com' }]
  }],
  from: {
    email: 'bd@sjinnovation.com',
    name: 'John Doe via SJ Innovation'
  },
  subject: 'Hello Wadud Shuvro from John Doe',
  content: [{
    type: 'text/html',
    value: '<p>Hi Wadud Shuvro, I noticed you work at SJ Innovation...</p>'
  }]
};

// 4. Send via SendGrid API
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendGridApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailPayload)
});

// 5. Log the email in database
await supabase.from('campaign_emails').insert({
  contact_id: 'contact-uuid',
  campaign_id: 'campaign-uuid',
  sent_by: 'user-uuid',
  to_email: 'wadud.shuvro@sjinnovation.com',
  subject: 'Hello Wadud Shuvro from John Doe',
  body: '<p>Hi Wadud Shuvro...</p>',
  sendgrid_message_id: 'sg-message-id',
  status: 'sent',
  sent_at: NOW()
});

// 6. Update contact status
await supabase.from('campaign_contacts').update({
  status: 'contacted_email',
  last_status_change_at: NOW()
}).eq('id', 'contact-uuid');

// 7. Log execution
await supabase.from('sequence_execution_log').insert({
  enrollment_id: 'enrollment-uuid',
  step_id: 'step-uuid',
  status: 'success',
  executed_at: NOW()
});
```

**Database Updates:**
```sql
-- 1. Log in campaign_emails
INSERT INTO campaign_emails (
  contact_id,
  campaign_id,
  sent_by,
  to_email,
  subject,
  body,
  status,
  sent_at
) VALUES (...);

-- 2. Update contact status
UPDATE campaign_contacts 
SET status = 'contacted_email',
    last_status_change_at = NOW()
WHERE id = 'contact-uuid';

-- 3. Log execution
INSERT INTO sequence_execution_log (
  enrollment_id,
  status,
  executed_at
) VALUES ('enrollment-uuid', 'success', NOW());

-- 4. Update enrollment metrics
UPDATE contact_sequence_enrollments
SET total_sent = total_sent + 1,
    last_step_executed_at = NOW()
WHERE id = 'enrollment-uuid';
```

✅ **Email sent to SendGrid** → In transit

---

### **STEP 6: Email Delivery** 📬
**What:** SendGrid delivers email to recipient's inbox

**SendGrid Process:**
1. **Validates email** (spam check, formatting)
2. **Sends to recipient's mail server**
3. **Tracks delivery status**:
   - ✅ Delivered
   - 📭 Opened (if tracking pixel enabled)
   - 🖱️ Clicked (if link tracking enabled)
   - ❌ Bounced (if email invalid)
   - 🚫 Spam (if marked as spam)

**Timeline:**
- **Immediate:** 10-30 seconds
- **Typical:** 1-5 minutes
- **Delayed:** Up to 15 minutes (during high volume)

**Where Email Lands:**
- 📥 **Inbox** (ideal)
- 📧 **Promotions tab** (Gmail)
- 🗑️ **Spam/Junk** (if sender not verified)

✅ **Email arrives** → Wadud Shuvro receives it!

---

## ⏱️ Complete Timeline Example

Let's trace a real example:

**Monday, 9:00 AM - User Enrolls Contact**
```
9:00:00 - User clicks "Enroll Contacts"
9:00:02 - Contact enrolled in sequence
9:00:03 - Batch created (scheduled for 9:00 AM)
9:00:03 - Status shows: "active", "Next Scheduled: in a few seconds"
```

**Monday, 9:05 AM - Cron Job Runs**
```
9:05:00 - Cron triggers sequence-process-batches
9:05:01 - Finds pending batch scheduled for 9:00 AM
9:05:02 - Checks: Is it Monday? ✓ Is it 9am-5pm? ✓
9:05:03 - Processes batch: Gets template, replaces variables
9:05:04 - Calls send-campaign-email for Wadud Shuvro
9:05:05 - SendGrid API called
9:05:06 - Email sent successfully
9:05:07 - Database updated: total_sent = 1
9:05:08 - Status shows: "1 Email Sent" (green checkmark)
```

**Monday, 9:06 AM - Email Delivered**
```
9:06:30 - Email arrives in Wadud Shuvro's inbox
        - Subject: "Hello Wadud Shuvro from John Doe"
        - From: bd@sjinnovation.com
        - Content: Personalized email with his name and company
```

**Total Time: ~6 minutes**

---

## 🔍 Where to Monitor the Process

### **1. Enrollment Status Table**
**Location:** Sequences → Execution Dashboard → Enrollment Status

**Shows:**
- Contact name
- Sequence name
- Current step
- Status (active/completed/failed)
- **"X Email(s) Sent"** - Green badge when emails sent
- Enrolled time
- Last activity
- Next scheduled

### **2. Batch Queue** (Database)
**Check in SQL:**
```sql
SELECT * FROM sequence_batch_queue 
WHERE status = 'pending'
ORDER BY scheduled_for;
```

**Shows:**
- Which batches are waiting
- When they're scheduled
- How many contacts per batch

### **3. Sent Emails Table** (Database)
**Check in SQL:**
```sql
SELECT * FROM campaign_emails 
WHERE to_email = 'wadud.shuvro@sjinnovation.com'
ORDER BY sent_at DESC;
```

**Shows:**
- All emails sent to this contact
- Subject, body, timestamp
- SendGrid message ID
- Delivery status

### **4. Execution Logs** (Database)
**Check in SQL:**
```sql
SELECT * FROM sequence_execution_log 
WHERE status = 'success'
ORDER BY executed_at DESC;
```

**Shows:**
- Every email send attempt
- Success/failure status
- Execution time

### **5. SendGrid Dashboard**
**Location:** https://sendgrid.com → Activity Feed

**Shows:**
- Email delivery status
- Open/click tracking
- Bounce/spam reports
- Detailed delivery logs

---

## 🛠️ System Requirements for Automation to Work

### **1. SendGrid Configuration** ⚠️ REQUIRED
```bash
# Environment variable in Supabase
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
```

Without this, emails CANNOT be sent!

### **2. Deployed Edge Functions** ⚠️ REQUIRED
```bash
# These must be deployed
supabase functions deploy sequence-enroll-contacts
supabase functions deploy sequence-process-batches
supabase functions deploy send-campaign-email
```

### **3. Cron Job** ⚠️ REQUIRED
**Setup in Supabase Dashboard:**
```
Function: sequence-process-batches
Schedule: */5 * * * * (every 5 minutes)
```

Without cron job, batches will never be processed!

### **4. Email Template** ⚠️ REQUIRED
- Must have subject and body
- Can use variables: {Contact Name}, {Company}, etc.

### **5. Active Sequence** ⚠️ REQUIRED
- Sequence status must be "active"
- Draft sequences cannot send emails

---

## ⚙️ Configuration Options

### **Scheduling Modes:**

**1. Immediate Mode**
- Sends email within 5 minutes
- No batching
- No time restrictions

**2. Scheduled Mode**
- Sends at exact date/time specified
- One-time send
- Respects time restrictions

**3. Drip Mode (RECOMMENDED)**
- Sends in batches
- Spreads over time (e.g., daily)
- Only sends Mon-Fri, 9am-5pm
- Prevents spam flags
- Better deliverability

### **Drip Settings:**
```javascript
{
  messagesPerBatch: 25,      // Send 25 emails at once
  interval: 1,               // Wait 1 unit between batches
  intervalUnit: 'days',      // Unit: minutes/hours/days
  sendDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Weekdays only
  timeWindowStart: '09:00',  // Start sending at 9 AM
  timeWindowEnd: '17:00'     // Stop sending at 5 PM
}
```

**Example:**
- 100 contacts
- 25 per batch
- 1 day interval
= 4 batches over 4 days

---

## 🐛 Troubleshooting: Why Email Didn't Send

### **Check 1: Is Contact Enrolled?**
```
Go to: Sequences → Execution Dashboard → Enrollment Status
Look for: Contact name in the table
```

### **Check 2: Is Batch Pending?**
```
Go to: Sequences → Email Diagnostics → Run Diagnostics
Check: "Email Queue" section
```

### **Check 3: Is It The Right Time?**
```
Current time: 8:00 PM (outside 9am-5pm window)
Day: Saturday (not in Mon-Fri list)
Result: Batch will wait until Monday 9 AM
```

### **Check 4: Is SendGrid Configured?**
```
Go to: Sequences → Email Diagnostics → Run Diagnostics
Check: All green checkmarks
```

### **Check 5: Are Functions Deployed?**
```
Go to: Supabase Dashboard → Edge Functions
Check: All three functions show "deployed"
```

### **Check 6: Is Cron Running?**
```
Go to: Supabase Dashboard → Database → Cron Jobs
Check: sequence-process-batches is enabled and running
```

---

## 📊 Expected Behavior

### **After Enrollment:**
- ✅ Contact appears in "Enrollment Status" table
- ✅ Status shows "active"
- ✅ "Next Scheduled" shows date/time
- ✅ "Emails Sent" shows 0

### **After First Cron Run (if time is right):**
- ✅ "Emails Sent" changes to "1 Email Sent" (green)
- ✅ "Last Activity" shows recent time
- ✅ Contact status changes to "contacted_email"

### **In Recipient's Inbox:**
- ✅ Email from: bd@sjinnovation.com
- ✅ Subject: With their name personalized
- ✅ Body: With their details filled in
- ✅ Reply-to: Your email address

---

## 🎯 Summary: The Complete Flow

1. **Add Contact** → Database
2. **Enroll in Sequence** → Creates enrollment record
3. **System Creates Batch** → Queues email for sending
4. **Cron Job Processes Batch** → Every 5 minutes
5. **Check Constraints** → Time window, days
6. **Replace Variables** → Personalize email
7. **Call SendGrid** → Send via API
8. **Log Everything** → Track in database
9. **Update UI** → Show "Email Sent"
10. **Deliver Email** → Recipient receives

**Total Time: 5-15 minutes** (depending on cron schedule and time constraints)

---

**Questions? Issues?**
Run the **Enrollment Troubleshooter** and **Email Diagnostics** tools!

---

**Last Updated:** ${new Date().toISOString()}

















