# PandaDoc Integration Guide

## Overview

The PandaDoc integration automates proposal creation, sending, and tracking with e-signature capabilities. This powerful integration streamlines your sales workflow by connecting deal management with professional proposal delivery.

### Key Features

- **Automated Proposal Creation** - Generate proposals directly from deals
- **E-Signature Workflow** - Send proposals for digital signing
- **Real-time Status Tracking** - Monitor proposal views and signatures
- **Automatic Deal Updates** - Deals move to "Closed Won" upon signature
- **PDF Storage** - Signed proposals automatically saved to deal files
- **Email Notifications** - Get notified when proposals are viewed, signed, or declined
- **Analytics Dashboard** - Track proposal performance metrics

---

## Setup Guide

### Step 1: Create PandaDoc Account

1. Visit [https://www.pandadoc.com](https://www.pandadoc.com)
2. Sign up for a PandaDoc account (free trial available)
3. Complete the onboarding process

### Step 2: Generate API Key

1. Log in to your PandaDoc account
2. Navigate to **Settings** → **API** (or **Integrations**)
3. Click **Create API Key** or **Generate New Key**
4. Copy the API key immediately (you won't see it again)
5. **Important:** Store this key securely

### Step 3: Configure Integration in Admin Panel

1. Go to **Admin Panel** → **Integration Manager**
2. Find the **PandaDoc** integration card (📝 icon)
3. Click **Configure** or **Connect**
4. Enter your PandaDoc API key
5. (Optional) Enter your Workspace ID if you have multiple workspaces
6. Click **Connect PandaDoc**
7. Wait for the success message

### Step 4: Verify Connection

1. The integration status should show **Connected** (green indicator)
2. Click **Test Connection** to verify
3. If successful, your templates will automatically load

---

## Creating Your First Proposal

### Method 1: From Deal Detail Page

1. Navigate to any active **Deal**
2. Scroll to the **Proposals** section
3. Click **Create Proposal** button
4. Fill in the proposal details:
   - **Title:** Enter a descriptive title (e.g., "Q1 2025 Proposal - ACME Corp")
   - **Template:** Select from your PandaDoc templates
   - **Client:** Auto-filled from the deal
   - **Deal:** Auto-filled (current deal)
5. Click **Create Proposal**
6. Wait for the proposal to generate

### Method 2: From Proposal Management Page

1. Go to **Business Development** → **Proposals**
2. Click **Create Proposal** in the top right
3. Select the **Deal** from the dropdown
4. Follow steps 4-6 from Method 1

### Auto-Filled Merge Fields

The system automatically fills these fields from your deal and client data:

- `{{Client.Name}}` - Client or contact person name
- `{{Client.Email}}` - Client email address
- `{{Client.Company}}` - Company name
- `{{Client.Phone}}` - Phone number
- `{{Deal.Title}}` - Deal title
- `{{Deal.Amount}}` - Deal value
- `{{Deal.Stage}}` - Current deal stage

---

## Sending Proposals

### Send via Web Interface

1. Open the proposal you created
2. Click **Send** button
3. Customize the email (optional):
   - **Subject:** Default: "Proposal for your review"
   - **Message:** Add a personal note
4. Click **Send to Client**

### What Happens Next

1. **Email Sent** - Client receives email with "View Proposal" link
2. **Status Update** - Proposal status changes to "Sent" (blue badge)
3. **Email Notification** - You receive confirmation email
4. **Analytics Logged** - Event tracked in analytics dashboard

---

## Tracking Proposal Status

### Status Flow

```
Draft (gray) → Sent (blue) → Viewed (yellow) → Signed (green)
                                              → Declined (red)
                                              → Expired (orange)
```

### Status Meanings

- **Draft** - Proposal created but not sent
- **Sent** - Proposal delivered to client
- **Viewed** - Client opened the proposal
- **Signed** - Client completed e-signature (deal auto-closes)
- **Declined** - Client rejected the proposal
- **Expired** - Proposal passed expiration date

### Real-Time Updates

- **Automatic Sync** - Status updates every 15 minutes via cron job
- **Webhook Updates** - Instant updates when client interacts with proposal
- **Email Alerts** - Notifications for key events (configurable)

---

## Webhook Configuration

### Setup Webhook in PandaDoc

1. Log in to PandaDoc dashboard
2. Go to **Settings** → **Webhooks** (or **API Settings**)
3. Click **Add Webhook** or **Create New Webhook**
4. Enter the webhook URL:
   ```
   https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/pandadoc-manage/webhook
   ```
5. Select these events:
   - `document.state_changed` ✅
   - `document.sent` ✅
   - `document.viewed` ✅
   - `document.completed` ✅
   - `document.declined` ✅
6. (Optional) Set webhook secret for added security
7. Click **Save** or **Create Webhook**

### Webhook Events Handled

| Event | Action Taken |
|-------|-------------|
| `document.sent` | Updates proposal status to "Sent" |
| `document.viewed` | Updates status to "Viewed", sends notification |
| `document.completed` | Updates to "Signed", closes deal, downloads PDF, sends notification |
| `document.declined` | Updates to "Declined", sends notification |

### Testing Webhooks

1. Create and send a test proposal to yourself
2. Open the proposal link
3. Check that status updates to "Viewed"
4. Sign the proposal
5. Verify:
   - Proposal status = "Signed"
   - Deal stage = "Closed Won"
   - PDF saved in Deal Files
   - Notifications received

---

## Working with Templates

### Creating Templates in PandaDoc

1. Log in to PandaDoc
2. Go to **Templates** → **Create Template**
3. Design your proposal template
4. Add merge fields for dynamic content:
   ```
   {{Client.Name}}
   {{Client.Company}}
   {{Deal.Amount}}
   ```
5. Add signature fields
6. Save template

### Recommended Merge Fields

Use these exact field names for auto-population:

- `{{Client.Name}}` - Contact name
- `{{Client.Email}}` - Email address
- `{{Client.Company}}` - Company name
- `{{Client.Phone}}` - Phone number
- `{{Deal.Title}}` - Deal title
- `{{Deal.Amount}}` - Deal value ($)
- `{{Deal.Stage}}` - Current stage

### Template Best Practices

1. **Keep it simple** - Avoid overly complex layouts
2. **Test merge fields** - Verify all fields populate correctly
3. **Clear CTAs** - Make signature areas obvious
4. **Mobile-friendly** - Ensure readability on mobile devices
5. **Brand consistency** - Use company colors and logos

---

## Email Notification Settings

### Configure Notifications

1. Go to **Business Development** → **User Settings**
2. Scroll to **Proposal Notifications**
3. Toggle notifications:
   - ✅ **Proposal Viewed** - Notified when client opens proposal
   - ✅ **Proposal Signed** - Notified when client signs
   - ✅ **Proposal Declined** - Notified when client declines
   - ✅ **Proposal Expiring** - Notified 3 days before expiration
4. Click **Save Notification Preferences**

### Notification Email Format

**Subject:** Proposal Viewed: Q1 2025 Proposal - ACME Corp

```
Hello [Your Name],

Good news! Your proposal has been viewed.

Proposal: Q1 2025 Proposal - ACME Corp
Client: ACME Corporation
Deal: Enterprise Software Implementation
Viewed At: 2025-01-15 at 2:30 PM

Next steps:
- Follow up with the client if needed
- Check proposal status in your dashboard

View Proposal →
```

---

## Analytics Dashboard

### Access Analytics

1. Navigate to **Business Development** → **Proposals**
2. Click **Analytics** button in top right
3. Select time period:
   - Last 7 days
   - Last 30 days
   - Last 90 days

### Key Metrics

- **Total Proposals** - All proposals created
- **Sent This Period** - Proposals sent in selected timeframe
- **Signed This Period** - Successfully signed proposals
- **Conversion Rate** - (Signed / Sent) × 100%
- **Avg Time to Sign** - Average hours from send to signature

### Charts Available

1. **Conversion Funnel** - Sent → Viewed → Signed
2. **Status Breakdown** - Pie chart of proposal statuses
3. **Activity Timeline** - Proposals over time

### Export Analytics

1. Click **Export** button
2. CSV file downloads: `proposal-analytics-[period]-[date].csv`
3. Contains: Proposal ID, Title, Status, Dates, Client, Deal

---

## Automatic Deal Closure

### How It Works

When a proposal is signed:

1. **Webhook Received** - PandaDoc sends signature event
2. **Proposal Updated** - Status → "Signed", completion time recorded
3. **Deal Closed** - Deal stage → "Closed Won", status → "Won"
4. **PDF Downloaded** - Signed PDF retrieved from PandaDoc API
5. **File Stored** - PDF saved to Deal Files (`proposals/{doc_id}.pdf`)
6. **Notification Sent** - Deal owner receives email
7. **Analytics Logged** - Event recorded for reporting

### Customizing Auto-Closure

Currently, all signed proposals automatically close deals. If you need different behavior:

1. Contact your system administrator
2. Discuss workflow requirements
3. Custom rules can be added via edge function modifications

---

## Troubleshooting

### Issue: "Invalid PandaDoc API Key"

**Symptoms:** Cannot connect integration or receive error message

**Solutions:**
1. Verify API key is correct (no extra spaces)
2. Check key hasn't expired in PandaDoc settings
3. Regenerate new API key from PandaDoc
4. Re-enter key in Integration Manager
5. Ensure you have API access enabled in your PandaDoc plan

---

### Issue: Proposals Not Sending

**Symptoms:** Proposal stays in "Draft" status

**Solutions:**
1. Check client has valid email address
2. Verify PandaDoc template exists and is published
3. Look for error messages in the interface
4. Check browser console for errors (F12)
5. Verify deal and client data is complete

---

### Issue: Status Not Updating

**Symptoms:** Proposal status doesn't change when client views/signs

**Solutions:**
1. **Check Webhook Setup:**
   - Verify webhook URL is correct in PandaDoc
   - Ensure webhook events are selected
   - Test webhook delivery in PandaDoc dashboard

2. **Wait for Cron Sync:**
   - Automatic sync runs every 15 minutes
   - Manual refresh: Click status badge to check

3. **Verify Network:**
   - Check firewall isn't blocking webhooks
   - Ensure PandaDoc can reach your webhook URL

---

### Issue: Email Notifications Not Received

**Symptoms:** No emails when proposals are viewed/signed

**Solutions:**
1. Check notification preferences in User Settings
2. Verify email address in your profile
3. Check spam/junk folder
4. Confirm SendGrid is configured (admin task)
5. Look for delivery errors in edge function logs

---

### Issue: PDF Not Saving

**Symptoms:** Signed proposals don't have PDF in Deal Files

**Solutions:**
1. Verify storage bucket `deal-files` exists
2. Check RLS policies allow file uploads
3. Ensure PandaDoc document is fully completed
4. Review edge function logs for download errors
5. Manually download from PandaDoc if needed

---

### Issue: Deal Not Auto-Closing

**Symptoms:** Proposal signed but deal stays in current stage

**Solutions:**
1. Verify proposal is linked to correct deal
2. Check deal isn't already closed
3. Review edge function logs for errors
4. Ensure webhook received signature event
5. Manually update deal if automation failed

---

### Issue: Templates Not Loading

**Symptoms:** Template dropdown is empty when creating proposal

**Solutions:**
1. Verify API key is connected
2. Check you have templates in PandaDoc account
3. Ensure templates are published (not draft)
4. Refresh the page
5. Disconnect and reconnect integration

---

## Advanced Features

### Proposal Expiration

- **Default:** No expiration set
- **Custom Expiration:** Set in PandaDoc template settings
- **Expiring Alert:** Automatic notification 3 days before expiry
- **Cron Job:** Runs daily at 9 AM to check expiring proposals

### Bulk Operations

Currently not supported. Future enhancements:
- Send multiple proposals at once
- Bulk status updates
- Mass template changes

### Integration with Deal Files

All signed proposals are automatically stored in:
```
Deal Files → proposals/{pandadoc_doc_id}.pdf
```

Access via:
1. Open Deal Detail page
2. Navigate to **Files** tab
3. Look for proposal PDFs

---

## Best Practices

### 1. Template Management

- Create templates for different proposal types
- Use consistent naming conventions
- Test templates before using in production
- Keep templates updated with current pricing

### 2. Proposal Workflow

- Always review proposal before sending
- Add personalized message in send email
- Follow up if not viewed within 2-3 days
- Set reminders for expiring proposals

### 3. Client Communication

- Explain e-signature process to clients
- Provide contact info for questions
- Send proposal during business hours
- Follow up after viewing but before signing

### 4. Data Quality

- Ensure client email addresses are valid
- Complete all deal information before creating proposal
- Use accurate deal amounts
- Keep company information up to date

### 5. Security

- Never share PandaDoc API key
- Use webhook signature verification
- Enable two-factor auth on PandaDoc account
- Regularly review connected integrations

---

## FAQ

**Q: How long does it take for status to update?**
A: Webhooks provide instant updates. If webhooks fail, cron sync runs every 15 minutes.

**Q: Can I edit a sent proposal?**
A: No, once sent, proposals cannot be edited. Create a new version instead.

**Q: What happens if client declines?**
A: Status updates to "Declined", you receive notification, deal remains in current stage.

**Q: Can I resend a proposal?**
A: Yes, use the "Send" button again from the proposal detail view.

**Q: How do I delete a proposal?**
A: Currently requires admin access. Contact your administrator.

**Q: Can I use custom branding?**
A: Yes, customize templates in PandaDoc with your logo and colors.

**Q: What file formats are supported?**
A: PandaDoc generates PDF files for all signed proposals.

**Q: Is there a proposal limit?**
A: Depends on your PandaDoc plan. Check your PandaDoc subscription.

**Q: Can multiple people sign?**
A: Yes, configure multi-signature in your PandaDoc template.

**Q: How do I track proposal performance?**
A: Use the Analytics dashboard at Business Development → Proposals → Analytics.

---

## Support & Resources

### Getting Help

- **System Admin:** Contact for technical issues
- **PandaDoc Support:** [https://support.pandadoc.com](https://support.pandadoc.com)
- **Documentation:** This guide and PandaDoc API docs

### Additional Resources

- **PandaDoc Help Center:** [https://support.pandadoc.com/hc/en-us](https://support.pandadoc.com/hc/en-us)
- **API Documentation:** [https://developers.pandadoc.com](https://developers.pandadoc.com)
- **Template Gallery:** Browse PandaDoc template marketplace
- **Video Tutorials:** Available in PandaDoc dashboard

---

## Changelog

**Version 1.0** (January 2025)
- Initial PandaDoc integration release
- Proposal creation from deals
- E-signature workflow
- Real-time webhook updates
- Email notifications
- Analytics dashboard
- Automatic deal closure
- PDF storage

---

*Last Updated: January 2025*