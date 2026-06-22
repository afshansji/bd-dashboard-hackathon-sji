# Email Automation Troubleshooting Guide

## 🔧 What Was Fixed

### Critical Bug Fixed ✅
**Location:** `supabase/functions/sequence-process-batches/index.ts`

**Problem:** The batch processor wasn't passing required parameters to the send-campaign-email function.

**Fixed:** Added missing parameters:
- `to`: recipient email address
- `body`: email content (was sending as "message")
- `campaignId`: campaign identifier

This bug was preventing emails from being sent at all.

---

## 📧 Email System Requirements

For emails to work, you need:

### 1. **SendGrid API Key** (REQUIRED)
```bash
# This must be set in your Supabase environment variables
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

**How to get it:**
1. Go to https://sendgrid.com
2. Sign up or login
3. Go to Settings > API Keys
4. Create a new API key with "Mail Send" permissions
5. Add it to Supabase project settings

### 2. **Deployed Supabase Functions**
```bash
# Deploy the email functions
supabase functions deploy send-campaign-email
supabase functions deploy sequence-process-batches
```

### 3. **Email Templates**
- Create at least one email template in the system
- Templates must have:
  - Subject line
  - Body content
  - Active status

### 4. **Cron Job for Batch Processing**
The `sequence-process-batches` function needs to run periodically (e.g., every 5 minutes) to send queued emails.

---

## 🧪 Using the Email Diagnostics Tool

### Access the Tool
1. Navigate to **Sequences** page
2. Click the **"Email Diagnostics"** tab
3. Run diagnostics to check your setup

### What It Checks
✅ User authentication  
✅ Email templates availability  
✅ Batch queue status  
✅ Execution logs  
✅ Sent emails history  
✅ Test email sending (optional)

### How to Use
1. **Enter your email** in the test field (optional)
2. Click **"Run Email Diagnostics"**
3. Review the results:
   - 🟢 Green = Pass
   - 🔴 Red = Fail  
   - 🟡 Yellow = Warning
   - 🔵 Blue = Info

4. If you entered an email, check your inbox for the test message

---

## 🐛 Common Issues & Solutions

### Issue: "SendGrid API key not configured"
**Solution:** Add `SENDGRID_API_KEY` to Supabase environment variables

### Issue: "No email templates found"
**Solution:** Create an email template in the system

### Issue: "Email sent but not received"
**Possible causes:**
1. **Spam folder** - Check spam/junk folder
2. **SendGrid sender verification** - Verify your sender email
3. **SendGrid account** - Check if you're on free tier limits
4. **Email address typo** - Verify the recipient address

### Issue: "Emails stuck in queue"
**Solution:** 
1. Check if `sequence-process-batches` function is running
2. Set up a cron job to call it every 5 minutes
3. Check Supabase function logs for errors

### Issue: "Time window restrictions"
**Check:** 
- Emails only send during configured time windows
- Check `send_days` (Mon-Fri vs weekends)
- Check `time_window_start` and `time_window_end`

---

## 📊 Monitoring Email Delivery

### Check Batch Queue
```sql
SELECT * FROM sequence_batch_queue 
WHERE status = 'pending' 
ORDER BY scheduled_for DESC;
```

### Check Sent Emails
```sql
SELECT * FROM campaign_emails 
ORDER BY sent_at DESC 
LIMIT 10;
```

### Check Execution Logs
```sql
SELECT * FROM sequence_execution_log 
WHERE status = 'failed' 
ORDER BY executed_at DESC;
```

---

## 🚀 Testing Your Setup

### Manual Test Flow
1. Go to **Sequences** page
2. Click **"Email Diagnostics"** tab
3. Enter your email address
4. Click **"Run Email Diagnostics"**
5. Wait 30 seconds
6. Check your email inbox

### Expected Result
You should receive an email with:
- **Subject:** "Test Email from SJ BD Dashboard"
- **From:** bd@sjinnovation.com
- **Content:** Confirmation that the system is working

### If Test Fails
1. Check Supabase function logs
2. Verify SendGrid API key
3. Check SendGrid dashboard for delivery status
4. Verify sender email is authenticated in SendGrid

---

## 📝 SendGrid Configuration Checklist

- [ ] SendGrid account created
- [ ] API key generated with "Mail Send" permissions
- [ ] API key added to Supabase environment variables
- [ ] Sender email verified in SendGrid
- [ ] Domain authentication (optional but recommended)
- [ ] Test email sent successfully

---

## 🔍 Advanced Debugging

### Enable Detailed Logging
Check Supabase function logs:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select `send-campaign-email`
4. View logs for errors

### SendGrid Activity Feed
1. Login to SendGrid
2. Go to Activity Feed
3. Search for your recipient email
4. Check delivery status and errors

### Common SendGrid Errors
- **401 Unauthorized** → Invalid API key
- **403 Forbidden** → API key lacks permissions
- **413 Payload Too Large** → Email content too large
- **550 Relay Denied** → Sender not verified

---

## 📞 Need Help?

If emails still aren't working:
1. Run the diagnostics tool and save the results
2. Check Supabase function logs
3. Check SendGrid activity feed
4. Review this guide's checklist
5. Contact your team administrator

---

## 🎯 Quick Start Checklist

1. [ ] Add SendGrid API key to Supabase
2. [ ] Deploy email functions
3. [ ] Create email template
4. [ ] Run diagnostics tool
5. [ ] Send test email to yourself
6. [ ] Check inbox (including spam)
7. [ ] Set up cron job for batch processing
8. [ ] Test with real campaign

---

**Last Updated:** ${new Date().toISOString()}

















