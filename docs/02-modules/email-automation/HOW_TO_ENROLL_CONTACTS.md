# How to Enroll Contacts in Email Sequences

## 📋 Step-by-Step Guide

### Prerequisites (Check These First!)

Before enrolling contacts, you need:

1. ✅ **At least one Campaign** created
2. ✅ **At least one Contact** added to the campaign
3. ✅ **At least one Sequence** created
4. ✅ **At least one Email Template** created
5. ✅ **Sequence must be ACTIVE** (not draft/paused)
6. ✅ **Contact must have an EMAIL** address

---

## 🚀 How to Enroll "Wadud Shuvro" (or any contact)

### Step 1: Add the Contact (If Not Already Added)

1. Go to **Campaigns** page
2. Click on your campaign
3. Click the **"Add Contact"** button (blue button)
4. Fill in the form:
   - **Name:** Wadud Shuvro *(required)*
   - **Email:** wadud.shuvro@sjinnovation.com *(required for email sequences)*
   - Company, Title, etc. (optional)
5. Click **"Add Contact"**

✅ Contact is now in the campaign!

---

### Step 2: Create an Email Template

1. Go to **Settings** or **Email Templates** (if you have this page)
2. Create a new template:
   - **Name:** "First Outreach Email"
   - **Subject:** "Hello {Contact Name} from {User Name}"
   - **Body:** Your email content
3. Save the template

📝 **Variables you can use:**
- `{Contact Name}` - Contact's name
- `{Company}` - Contact's company
- `{User Name}` - Your name
- `{Campaign Name}` - Campaign name
- `{Title}` - Contact's job title

---

### Step 3: Create a Sequence (If Not Already Created)

1. Go to **Sequences** page
2. Click **"Create Sequence"** button
3. Fill in:
   - **Name:** "Email Outreach Sequence"
   - **Description:** Brief description
   - **Campaign:** Select your campaign
4. Add steps (optional for now)
5. Click **"Save"**

---

### Step 4: Activate the Sequence

**IMPORTANT:** Sequences must be active to enroll contacts!

1. Find your sequence in the list
2. Look for the status - it should say "active"
3. If it says "draft" or "paused", click the **Play** button (▶️) to activate it

---

### Step 5: Enroll the Contact

1. Go to **Sequences** page
2. Find your sequence
3. Click the **"Enroll Contacts"** or **"Add to Automation"** button
4. In the dialog that appears:

   **a. Select Contacts:**
   - Check the box next to "Wadud Shuvro"
   - Make sure the email address is visible

   **b. Select Email Template:**
   - Choose the template you created

   **c. Choose Scheduling Mode:**
   - **Immediate:** Send right now
   - **Scheduled:** Send at a specific time
   - **Drip:** Send in batches over time (RECOMMENDED)

   **d. Configure Drip Settings (if using Drip):**
   - **Messages per batch:** 25 (how many emails to send at once)
   - **Interval:** 1 day (wait between batches)
   - **Send days:** Mon-Fri (only send on weekdays)
   - **Time window:** 09:00 - 17:00 (only send during work hours)

5. Click **"Enroll Contacts"** button

✅ Contact is now enrolled!

---

## 🔍 Verify Enrollment

### Check the Enrollment Status Table

1. Go to **Sequences** page
2. Click **"Execution Dashboard"** tab (or similar)
3. Look at the **"Enrollment Status"** table
4. You should see "Wadud Shuvro" listed with:
   - Sequence name
   - Current step
   - Status (active)
   - Enrolled time

### If Contact is NOT showing:

1. Go to **Sequences** → **Email Diagnostics** tab
2. Click **"Check Enrollment Status"** button
3. Review the issues found

---

## 🐛 Common Problems & Solutions

### Problem 1: "Contact not showing in enrollment table"

**Possible causes:**
- ❌ Sequence is not active (status: draft/paused)
- ❌ Contact doesn't have an email address
- ❌ Contact was not selected in the enrollment dialog
- ❌ Enrollment failed (check for error messages)

**Solution:**
1. Activate the sequence (click Play button)
2. Make sure contact has an email address
3. Try enrolling again, carefully select the contact
4. Check browser console for errors (F12)

---

### Problem 2: "Contact enrolled but no email sent"

**Possible causes:**
- ❌ SendGrid API key not configured
- ❌ Batch is scheduled for future (check "Next Scheduled" column)
- ❌ Time window restriction (outside 9am-5pm)
- ❌ Day restriction (weekend when only Mon-Fri allowed)
- ❌ Batch processor not running

**Solution:**
1. Check **Email Diagnostics** tab
2. Run the diagnostics tool
3. Check if SendGrid API key is set
4. Check if batches are in the queue
5. Wait for the scheduled time or change to "Immediate" mode

---

### Problem 3: "Enrollment dialog doesn't show my contact"

**Possible causes:**
- ❌ Contact is in a different campaign
- ❌ Contact doesn't have required fields
- ❌ Contact is already enrolled

**Solution:**
1. Make sure you're in the correct campaign
2. Check if contact has an email address
3. If already enrolled, they won't show again

---

## 📊 Understanding Enrollment Status

After enrolling, the contact goes through these statuses:

1. **Active** - Enrolled and waiting for scheduled send time
2. **Completed** - All emails in sequence sent
3. **Paused** - Temporarily stopped
4. **Failed** - Error occurred
5. **Exited** - Contact was removed from sequence

---

## 🎯 Quick Troubleshooting Checklist

When contacts don't show up or emails don't send:

- [ ] Is the contact added to a campaign?
- [ ] Does the contact have an email address?
- [ ] Is the sequence created?
- [ ] Is the sequence **ACTIVE** (not draft)?
- [ ] Is an email template created and selected?
- [ ] Was the contact actually selected in the enrollment dialog?
- [ ] Did you click "Enroll Contacts" button?
- [ ] Is SendGrid API key configured?
- [ ] Are you checking the correct sequence's enrollments?
- [ ] Is the scheduled time in the future?

---

## 🛠️ Using the Debug Tools

### Enrollment Troubleshooter
1. Go to **Sequences** → **Email Diagnostics** tab
2. Click **"Check Enrollment Status"**
3. Review all issues and warnings
4. Follow the suggested fixes

### Email System Diagnostics
1. On the same tab, scroll down
2. Enter your email address
3. Click **"Run Email Diagnostics"**
4. Check if test email is received
5. Review all system checks

---

## 📧 Expected Timeline

**Immediate Mode:**
- Email sends within 1-5 minutes

**Scheduled Mode:**
- Email sends at the exact time you specified

**Drip Mode:**
- First batch sends at start time
- Subsequent batches send based on interval (e.g., daily)
- Only sends during configured time windows and days

---

## 🆘 Still Having Issues?

If contact still doesn't show or emails don't send:

1. **Check Browser Console:**
   - Press F12
   - Go to Console tab
   - Look for red errors
   - Copy the error message

2. **Check Supabase Logs:**
   - Go to Supabase Dashboard
   - Navigate to Edge Functions
   - Check function logs for errors

3. **Run Both Debug Tools:**
   - Enrollment Troubleshooter
   - Email Diagnostics

4. **Verify Each Step:**
   - Contact exists ✓
   - Contact has email ✓
   - Sequence exists ✓
   - Sequence is active ✓
   - Template exists ✓
   - Contact selected ✓
   - Enrollment clicked ✓

---

**Last Updated:** ${new Date().toISOString()}

















