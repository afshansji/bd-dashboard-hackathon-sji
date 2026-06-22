# Zerobounce Email Validation Integration

## Overview
This integration adds Zerobounce email validation to the CRM system, ensuring that only valid email addresses are added to campaigns.

## Features Implemented

### 1. Database Schema
- **zerobounce_config** table: Stores API key and configuration
- **zerobounce_validations** table: Stores detailed validation results
- **campaign_contacts** columns: Added email_validation_status, email_validated_at, email_validation_error

Location: `/supabase/migrations/20251128000000_zerobounce_integration.sql`

### 2. Supabase Edge Function
Handles all Zerobounce API operations:
- **Test**: Validate API key and check credits
- **Save**: Store API key securely (Super Admin only)
- **Delete**: Remove API key
- **Validate**: Validate single or batch emails
- **Get Credits**: Check remaining validation credits

Location: `/supabase/functions/zerobounce-manage/index.ts`

### 3. React Hooks
Custom hooks for Zerobounce operations:
- `useZeroBounceConfig()`: Get current configuration
- `useTestZeroBounceApiKey()`: Test API key
- `useSaveZeroBounceApiKey()`: Save API key
- `useDeleteZeroBounceApiKey()`: Delete API key
- `useValidateEmails()`: Validate email(s)
- `useGetZeroBounceCredits()`: Get credit balance
- `useContactValidationHistory()`: Get validation history for a contact

Location: `/src/hooks/useZeroBounce.tsx`

### 4. Admin Integration Manager UI
Super Admins can:
- Add and test Zerobounce API key
- View credit balance
- Enable/disable the integration

Location: `/src/pages/admin/IntegrationManager.tsx`

### 5. Add Contact Form Validation
When adding contacts manually:
- Validates email before adding to campaign
- Blocks invalid emails (invalid, spamtrap, abuse, do_not_mail)
- Allows catch-all/unknown with warning
- Shows validation status to user
- Stores validation result in contact metadata

Location: `/src/components/bd/AddCampaignContactDialog.tsx`

### 6. Validation Summary Component
Reusable component to display validation results:
- Shows valid, invalid, and unknown email counts
- Lists failed validations with reasons
- Provides clear user feedback

Location: `/src/components/bd/EmailValidationSummary.tsx`

## Validation Rules

### Email Statuses:
- **valid**: Email is valid and safe to use → ✅ Allow import
- **invalid**: Email doesn't exist or has syntax errors → ❌ Block import
- **spamtrap**: Known spam trap → ❌ Block import
- **abuse**: Known for abuse complaints → ❌ Block import
- **do_not_mail**: On suppression list → ❌ Block import
- **catch-all**: Domain accepts all emails → ⚠️ Allow with warning
- **unknown**: Could not be determined → ⚠️ Allow with warning

## Setup Instructions

### 1. Run Database Migration
```bash
# The migration will be applied automatically on next deployment
# Or manually apply: supabase db push
```

### 2. Get Zerobounce API Key
1. Sign up at https://www.zerobounce.net/
2. Navigate to Dashboard → API
3. Copy your API key

### 3. Configure in Admin Panel
1. Log in as Super Admin
2. Navigate to Admin Panel → Integration Manager
3. Find "Zerobounce" integration card
4. Enter your API key
5. Click "Test" to verify
6. Click "Save & Connect" to enable

### 4. Test Email Validation
1. Go to any campaign
2. Click "Add Contact"
3. Enter contact details with an email
4. Submit - the email will be validated automatically

## Extending to Import Flows

### Google Sheets Import
To add validation to Google Sheets import:

1. **Modify edge function** (`/supabase/functions/campaign-google-sheet-import/index.ts`):
   ```typescript
   // In the import action handler:

   // 1. Check if Zerobounce is configured
   const { data: zbConfig } = await supabase
     .from('zerobounce_config')
     .select('api_key')
     .eq('is_active', true)
     .maybeSingle();

   if (zbConfig) {
     // 2. Extract all emails from contacts
     const emails = contacts.map(c => c.email).filter(Boolean);

     // 3. Call zerobounce-manage function to validate
     const validationResults = await supabase.functions.invoke('zerobounce-manage', {
       body: {
         action: 'validate',
         emails: emails
       }
     });

     // 4. Filter contacts based on validation
     const validContacts = contacts.filter(contact => {
       const result = validationResults.data.results.find(r => r.email === contact.email);
       const status = result?.status?.toLowerCase();
       // Only allow valid, catch-all, unknown
       return !status || ['valid', 'catch-all', 'unknown'].includes(status);
     });

     // 5. Track failed validations
     const failedContacts = contacts.filter(contact => {
       const result = validationResults.data.results.find(r => r.email === contact.email);
       const status = result?.status?.toLowerCase();
       return status && ['invalid', 'spamtrap', 'abuse', 'do_not_mail'].includes(status);
     });

     // 6. Store failed validations in lead_import_jobs.validation_failed_emails
     // 7. Proceed with importing validContacts only
   }
   ```

2. **Update UI** (`/src/components/bd/CampaignGoogleSheetImportDialog.tsx`):
   - Import `EmailValidationSummary` component
   - Show validation results before final import
   - Display failed validations with reasons

### CSV/Exa Import
Similar pattern to Google Sheets import:

1. **Modify edge function** (`/supabase/functions/admin-leads-exa-import/index.ts`)
2. **Update UI** (`/src/components/bd/CampaignLeadImportDialog.tsx`)
3. Follow same validation logic

## API Usage

### Validate Single Email
```typescript
import { useValidateEmails } from '@/hooks/useZeroBounce';

const { mutateAsync: validateEmails } = useValidateEmails();

const result = await validateEmails({ emails: 'test@example.com' });
if (result.ok && result.results[0].status === 'valid') {
  // Email is valid
}
```

### Validate Multiple Emails
```typescript
const result = await validateEmails({
  emails: ['email1@example.com', 'email2@example.com']
});

result.results.forEach(r => {
  console.log(`${r.email}: ${r.status}`);
});
```

### Check Configuration
```typescript
import { useZeroBounceConfig } from '@/hooks/useZeroBounce';

const { data: config } = useZeroBounceConfig();
if (config?.configured) {
  // Zerobounce is active
}
```

## Security Notes

- API key is stored securely in the database
- Only Super Admins can manage Zerobounce configuration
- API key is never exposed to the frontend
- All validation requests go through Supabase edge functions

## Cost Considerations

- Zerobounce charges per email validation
- Check credit balance regularly: Admin Panel → Zerobounce → "Check Credits"
- Consider implementing daily validation limits if needed
- Cache validation results to avoid re-validating same emails

## Monitoring

### View Validation History
```sql
-- Get all validations
SELECT * FROM zerobounce_validations ORDER BY created_at DESC;

-- Get validation stats
SELECT
  validation_status,
  COUNT(*) as count
FROM zerobounce_validations
GROUP BY validation_status;

-- Get recent failed validations
SELECT
  email,
  validation_status,
  sub_status,
  created_at
FROM zerobounce_validations
WHERE validation_status IN ('invalid', 'spamtrap', 'abuse', 'do_not_mail')
ORDER BY created_at DESC
LIMIT 100;
```

### Check Credit Usage
```sql
-- View credit history
SELECT
  credits_remaining,
  updated_at
FROM zerobounce_config
WHERE is_active = true;
```

## Troubleshooting

### Issue: "Zerobounce not configured"
**Solution**: Ensure API key is added in Admin Panel → Integration Manager

### Issue: "Connection test failed"
**Solutions**:
- Verify API key is correct
- Check if you have credits remaining
- Ensure internet connectivity from Supabase edge functions

### Issue: Emails not being validated
**Solutions**:
- Check if Zerobounce is enabled (Integration Manager)
- Verify API key is active
- Check edge function logs: `supabase functions logs zerobounce-manage`

### Issue: Too many validation failures
**Solutions**:
- Review email list quality
- Check if using old/purchased email lists
- Consider data source quality

## Future Enhancements

Potential improvements for later:
1. Bulk validation for existing contacts
2. Scheduled re-validation of old contacts
3. Validation webhooks for async processing
4. Custom validation rules per campaign
5. Integration with email sending service
6. Automatic list cleaning
7. Validation analytics dashboard

## Support

For Zerobounce API documentation: https://www.zerobounce.net/docs/
For Zerobounce support: support@zerobounce.net

## Implementation Status

✅ Complete:
- Database schema
- Edge function for API operations
- Admin UI for configuration
- Add Contact form validation
- React hooks
- Validation summary component

⏳ Pending:
- Google Sheets import validation
- CSV/Exa import validation
- Bulk validation for existing contacts
- Validation analytics

---

**Last Updated**: 2025-11-28
**Version**: 1.0
**Author**: Claude AI
