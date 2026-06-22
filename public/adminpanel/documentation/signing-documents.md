# Signing Documents - SOW & NDA E-Signature Guide

## Overview

The Signing Documents feature provides a comprehensive solution for creating, managing, and tracking SOW (Statement of Work) and NDA (Non-Disclosure Agreement) documents with built-in e-signature capabilities powered by PandaDoc.

### Key Capabilities

- **Document Creation** - Create SOW and NDA documents from PandaDoc templates
- **Multi-Recipient Signing** - Add multiple signers with sequential signing order
- **E-Signature Integration** - Embedded signing experience via PandaDoc
- **Real-Time Tracking** - Monitor document status, views, and signatures
- **Activity Audit Trail** - Complete history of all document actions
- **Document Watchers** - Assign team members to receive notifications
- **PDF Downloads** - Download signed documents and certificates

---

## Accessing Signing Documents

### Navigation Path

1. Navigate to **Business Development** > **Signing Documents**
2. Or directly access via URL: `/bd/signing-documents`

### Page Overview

The main page displays:
- **Statistics Cards** - Total documents, pending signatures, completed, completion rate
- **Filter Tabs** - All, Draft, Sent, Viewed, Completed, Declined, Expired, Voided
- **Document Grid** - Cards showing all signing documents with search capability
- **Create Buttons** - Quick access to create new SOW or NDA

---

## Creating a Signing Document

### Step 1: Start Creation

1. Click **New SOW** or **New NDA** button in the top right
2. The creation wizard dialog opens with 3 steps

### Step 2: Template Selection (Step 1 of 3)

1. **Document Type** - Toggle between SOW or NDA (pre-selected if you clicked a specific button)
2. **Associated Deal (Optional)** - Select a deal to link the document
   - When selected, client info auto-fills
   - Document title auto-generates based on client name
3. **Template** - Choose from available PandaDoc templates
   - Templates are filtered by document type
   - Templates must include "SOW", "Statement of Work", "NDA", or "Non-Disclosure" in the name
4. **Document Title** - Enter a descriptive title (auto-generated from deal)

### Step 3: Add Recipients (Step 2 of 3)

1. **Add Recipient** - Click button to add a new recipient row
2. **Quick Add** - Click client names to quickly add existing clients as signers
3. For each recipient, enter:
   - **First Name** - Recipient's first name
   - **Last Name** - Recipient's last name
   - **Email** - Recipient's email address (required for sending)
   - **Role** - Select from:
     - **Signer** - Must sign the document (required, at least 1)
     - **Approver** - Reviews and approves (optional)
     - **CC (View Only)** - Receives copy but doesn't sign

4. **Reorder Signers** - Drag signers using the grip handle to change signing order
   - Signers must sign in sequence (1, 2, 3, etc.)
   - Previous signer must complete before next can sign

### Step 4: Review & Send (Step 3 of 3)

1. **Review Summary** - Verify document details, template, and recipients
2. **Send Immediately** - Toggle option:
   - **Enabled** - Document is created AND sent immediately
   - **Disabled** - Document is saved as draft for later sending

3. Click **Create & Send** or **Create Draft**

---

## Document Status Workflow

Documents follow this status flow:

```
Draft (gray) → Sent (blue) → Viewed (yellow) → Completed (green)
                                             → Declined (red)
                                             → Expired (orange)

Any status → Voided (gray) [when manually voided]
```

### Status Definitions

| Status | Description | Available Actions |
|--------|-------------|-------------------|
| **Draft** | Created but not sent | Send, Edit Recipients, Void, Duplicate |
| **Sent** | Sent to recipients, awaiting action | Resend Reminder, Void, Duplicate |
| **Viewed** | At least one recipient has opened | Resend Reminder, Void, Duplicate, Sign (embedded) |
| **Completed** | All signers have signed | Download PDF, Download Certificate, Duplicate |
| **Declined** | A recipient declined to sign | Duplicate (create new version) |
| **Expired** | Passed expiration date without completion | Duplicate |
| **Voided** | Manually cancelled | Duplicate |

---

## Document Detail Page

Access by clicking any document card or via URL: `/bd/signing-documents/:id`

### Header Section

- **Back Button** - Return to documents list
- **Document Type Badge** - Shows SOW or NDA
- **Status Badge** - Current document status with color coding
- **Document Title** - Main heading
- **Creation Date** - When the document was created

### Action Buttons (based on status)

- **Send for Signature** - Available for drafts
- **Resend Reminder** - Available for sent/viewed documents
- **Download PDF** - Available for completed documents
- **Download Certificate** - Signing certificate (if available)
- **Duplicate** - Create a copy as draft
- **Void** - Cancel the document (with confirmation dialog)

### Document Details Card

Displays key information:
- Document type (Statement of Work / NDA)
- Creation date
- Associated client name
- Linked deal title
- Sent date (if sent)
- Completion date (if completed)
- Expiration date

### Recipients Section

Shows all recipients with:
- **Signing Order** - Number badge for signers showing their sequence
- **Name & Email** - Recipient identification
- **Status Badge** - Pending, Sent, Viewed, Signed, or Declined
- **Sign Button** - Opens embedded signing frame (for sent/viewed recipients)

### Embedded Signing Frame

When clicking "Sign" for a recipient:
1. A secure iframe loads with PandaDoc signing interface
2. Recipient can review and sign the document
3. On completion, frame shows success message
4. "Open in New Tab" fallback for browsers blocking iframes

### Activity Log

Complete audit trail showing:
- Document creation
- When sent to recipients
- When recipients viewed
- When signatures completed
- Reminder sends
- Voiding actions
- Download events

### Watchers Section

If watchers are assigned, shows:
- Watcher name
- Watcher role (Finance, Legal, Manager, Other)
- Watchers receive email notifications for document events

---

## Working with Documents

### Sending a Draft

1. Open the document detail page
2. Click **Send for Signature**
3. Document status changes to "Sent"
4. Recipients receive email with signing link
5. Activity log records the send event

### Resending Reminders

For documents with pending signatures:
1. Click **Resend Reminder** button
2. All recipients who haven't signed receive a reminder email
3. Activity log records the resend event

### Voiding a Document

To cancel a document:
1. Click **Void** button
2. Confirm in the dialog that appears
3. Document status changes to "Voided"
4. Document can no longer be signed
5. Watchers are notified

### Duplicating a Document

To create a copy:
1. Click **Duplicate** button
2. A new document is created as draft with:
   - Same template
   - Same recipients
   - Same deal/client associations
   - Title appended with "(Copy)"
3. You're redirected to the new document

### Downloading Signed Documents

For completed documents:
1. Click **Download PDF** to get the signed document
2. Click **Certificate** (if available) to get the signing certificate
3. Downloads open in a new tab
4. Activity log records download events

---

## Recipient Roles Explained

### Signers
- Must provide an electronic signature
- Sign in sequential order based on signing_order
- Must wait for previous signers to complete
- At least one signer is required

### Approvers
- Review the document
- Can approve without a full signature
- Typically used for internal approval workflows

### CC (Carbon Copy)
- Receive a view-only copy
- Cannot sign or approve
- Notified when document is complete
- Good for stakeholders who need visibility

---

## Search and Filtering

### Search Documents

The search bar filters documents by:
- Document title
- Client name
- Deal title
- Recipient names
- Recipient email addresses

### Filter by Status

Use tabs to filter:
- **All** - Shows all documents
- **Draft** - Documents not yet sent
- **Sent** - Documents awaiting first view
- **Viewed** - Documents opened by recipients
- **Completed** - Fully signed documents
- **Declined** - Rejected documents
- **Expired** - Past expiration date
- **Voided** - Cancelled documents

---

## PandaDoc Template Requirements

### Template Naming Convention

For templates to appear in the correct category, include these keywords in the template name:

**For SOW (Statement of Work):**
- "SOW"
- "Statement of Work"

**For NDA (Non-Disclosure Agreement):**
- "NDA"
- "Non-Disclosure"

Example names:
- "SOW - Software Development Agreement"
- "Professional Services Statement of Work"
- "Standard NDA Template"
- "Non-Disclosure Agreement - Mutual"

### Merge Fields

Templates can include these auto-populated merge fields:

**Client Fields:**
- `{{Client.Name}}` - Contact name
- `{{Client.Email}}` - Email address
- `{{Client.Company}}` - Company name
- `{{Client.Phone}}` - Phone number
- `{{Client.Address}}` - Address

**Deal Fields:**
- `{{Deal.Title}}` - Deal title
- `{{Deal.Amount}}` - Deal value
- `{{Deal.Stage}}` - Current stage
- `{{Deal.CloseDate}}` - Expected close date

**Date Fields:**
- `{{Date.Today}}` - Current date
- `{{Date.Year}}` - Current year

---

## Document Watchers

### What are Watchers?

Watchers are team members who receive notifications about document events without being signers.

### Watcher Roles

- **Finance** - For finance team tracking
- **Legal** - For legal review oversight
- **Manager** - For management visibility
- **Other** - General watching

### Notification Events

Watchers can be notified on:
- Document sent
- Document viewed
- Document signed (each signature)
- Document declined
- Document completed
- Document voided

---

## API Integration

### Available Endpoints

All endpoints require authentication via Bearer token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List PandaDoc templates |
| POST | `/create` | Create new signing document |
| GET | `/list` | List all documents (with filters) |
| GET | `/:id` | Get single document details |
| POST | `/:id/send` | Send document for signing |
| POST | `/:id/resend` | Resend reminder to pending |
| POST | `/:id/void` | Void/cancel document |
| POST | `/:id/embed-session` | Get embedded signing URL |
| GET | `/:id/download` | Download PDF or certificate |
| GET | `/:id/activity` | Get activity log |
| POST | `/:id/recipients` | Add recipient (drafts only) |
| DELETE | `/:id/recipients/:recipientId` | Remove recipient |
| POST | `/:id/watchers` | Add watcher |
| DELETE | `/:id/watchers/:watcherId` | Remove watcher |
| POST | `/:id/duplicate` | Duplicate document |

### Filtering Documents

Query parameters for `/list`:
- `dealId` - Filter by deal
- `clientId` - Filter by client
- `status` - Filter by status (draft, sent, etc.)
- `documentType` - Filter by type (sow, nda)
- `limit` - Number of results (default 50)
- `offset` - Pagination offset

---

## Troubleshooting

### Issue: Templates Not Loading

**Symptoms:** Template dropdown is empty

**Solutions:**
1. Verify PandaDoc integration is connected in Integration Manager
2. Check that templates exist in your PandaDoc account
3. Ensure templates are published (not draft)
4. Verify template names include "SOW", "NDA", or related keywords
5. Refresh the page and try again

### Issue: Document Not Sending

**Symptoms:** Click "Send" but document stays in draft

**Solutions:**
1. Verify all recipients have valid email addresses
2. Check that at least one signer is added
3. Verify PandaDoc API key is valid
4. Check browser console for error messages
5. Try voiding and creating a new document

### Issue: Embedded Signing Frame Not Loading

**Symptoms:** Signing frame shows error or stays loading

**Solutions:**
1. Ensure document is in "sent" or "viewed" status
2. Check that the recipient exists on the document
3. Verify previous signers have completed (for sequential signing)
4. Try "Open in New Tab" fallback link
5. Check browser isn't blocking iframes

### Issue: Recipient Can't Sign

**Symptoms:** "Sign" button not appearing or disabled

**Solutions:**
1. Document must be in "sent" or "viewed" status
2. For sequential signing, previous signers must complete first
3. CC recipients cannot sign (view only)
4. Verify recipient email matches exactly

### Issue: PDF Download Not Available

**Symptoms:** Download PDF button missing or error on click

**Solutions:**
1. Document must be in "completed" status
2. Allow time for PDF to generate after last signature
3. Check storage bucket permissions
4. Try again in a few minutes

### Issue: Status Not Updating

**Symptoms:** Document status doesn't change after viewing/signing

**Solutions:**
1. Ensure PandaDoc webhooks are configured correctly
2. Wait for automatic sync (every 15 minutes)
3. Refresh the page to check latest status
4. Verify webhook URL in PandaDoc settings

---

## Best Practices

### Document Creation

1. **Use descriptive titles** - Include client name and document purpose
2. **Link to deals** - Associate documents with deals for tracking
3. **Add all signers upfront** - Easier than adding later
4. **Set appropriate signing order** - Decision makers first

### Recipient Management

1. **Verify email addresses** - Double-check before sending
2. **Use CC wisely** - Add stakeholders who need visibility
3. **Consider signing order** - Who needs to approve first?
4. **Use quick-add** - Leverage existing client data

### Tracking & Follow-up

1. **Add watchers** - Keep stakeholders informed
2. **Monitor "viewed" status** - Follow up if viewed but not signed
3. **Use reminders** - Resend if no action after a few days
4. **Check activity log** - Understand where delays occur

### Template Management

1. **Name templates clearly** - Include SOW/NDA in name
2. **Use merge fields** - Auto-populate client and deal data
3. **Keep templates updated** - Review periodically
4. **Test before production** - Send test documents to yourself

---

## Security & Compliance

### Access Control

- Documents are only visible to:
  - Document creator
  - Assigned watchers
  - Users with admin roles
- Row Level Security (RLS) enforces database-level restrictions

### Audit Trail

- All actions are logged with:
  - Timestamp
  - Actor (user, recipient, or system)
  - Action type
  - Description
  - IP address (when available)

### Data Encryption

- PandaDoc API keys are encrypted at rest
- All API communications use HTTPS
- Session URLs expire after 1 hour

### E-Signature Compliance

PandaDoc provides legally binding e-signatures compliant with:
- ESIGN Act (USA)
- UETA (USA)
- eIDAS (EU)
- Other regional e-signature laws

---

## Integration with Other Features

### Deals

- Link documents to deals for context
- Auto-populate merge fields from deal data
- Track documents alongside deal progress

### Clients

- Auto-fill client information as recipients
- Quick-add clients from existing database
- Link documents to client records

### Proposals (PandaDoc)

This signing documents feature complements the existing proposal system:
- **Proposals** - For sales quotes with pricing
- **Signing Documents** - For legal agreements (SOW, NDA)

Both use PandaDoc but serve different purposes in the sales cycle.

---

## Changelog

**January 2025 - Initial Release**
- SOW and NDA document creation
- PandaDoc template integration
- Multi-recipient signing workflow
- Sequential signing order support
- Embedded signing frame
- Activity log and audit trail
- Document watchers with notifications
- PDF and certificate downloads
- Document duplication
- Void/cancel functionality
- Search and filtering
- Statistics dashboard

---

*Last Updated: January 2025*
