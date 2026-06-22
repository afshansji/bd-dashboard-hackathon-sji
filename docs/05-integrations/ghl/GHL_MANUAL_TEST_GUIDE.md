# GoHighLevel Integration - Manual Testing Guide

**Version:** 1.0
**Date:** December 2, 2025
**Branch:** `claude/test-ghl-integration-012y17YbWDondtaTbe44uQwd`

---

## 🎯 Prerequisites

Before testing, ensure you have:

1. ✅ Access to Supabase project dashboard
2. ✅ GoHighLevel account with API access
3. ✅ GoHighLevel API key (private or OAuth)
4. ✅ GoHighLevel location ID
5. ✅ Environment variables configured in Supabase

---

## 🔧 Environment Setup

### Step 1: Configure Supabase Environment Variables

Navigate to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Add the following secrets:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
INTEGRATION_SECRET_KEY=your_32_character_encryption_key_here

# Optional (for OAuth token refresh)
GOHIGHLEVEL_CLIENT_ID=your_oauth_client_id
GOHIGHLEVEL_CLIENT_SECRET=your_oauth_client_secret

# Recommended (for webhook security)
GHL_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 2: Deploy Edge Function

```bash
# If using Supabase CLI locally
supabase functions deploy gohighlevel-manage

# Or deploy via Supabase Dashboard
# Navigate to: Edge Functions → Deploy from GitHub
```

---

## 📋 Test Checklist

### Phase 1: Basic Connectivity ✅

#### Test 1.1: Environment Variable Validation
**Objective:** Verify environment variables are properly configured

**Steps:**
1. Open Supabase Dashboard → Edge Functions → Logs
2. Call any GHL endpoint (e.g., `/gohighlevel-manage/integration`)
3. Check logs for startup messages

**Expected Results:**
- ✅ No "Missing required environment variables" error
- ⚠️ Warning if OAuth credentials missing (acceptable)
- ✅ Function starts successfully

**Error Scenarios:**
```
❌ "Missing required environment variables: INTEGRATION_SECRET_KEY"
   → Fix: Add INTEGRATION_SECRET_KEY to Supabase secrets

⚠️ "OAuth credentials not configured. Token refresh will not work"
   → Info: Optional warning, OAuth refresh won't work
```

---

#### Test 1.2: Test Connection Endpoint
**Objective:** Verify API key validation works

**Steps:**
1. Navigate to Admin Panel → Integration Manager → GoHighLevel
2. Enter API Key: `invalid-key`
3. Enter Location ID: `test-location`
4. Click "Test Connection"

**Expected Results:**
- ❌ Error message: "Invalid API key or insufficient permissions"
- ✅ Error displayed in red border
- ✅ No integration created

**Then test with valid credentials:**
1. Enter valid GoHighLevel API Key
2. Enter valid Location ID
3. Click "Test Connection"

**Expected Results:**
- ✅ Success message: "Successfully connected to location: {name}"
- ✅ Location name auto-populated if empty
- ✅ Success displayed in green border

---

### Phase 2: Integration Management ✅

#### Test 2.1: Create Integration (Private API Key)
**Objective:** Test creating integration with private API key

**Steps:**
1. Use valid API key from Test 1.2
2. Fill in Location ID and optional Location Name
3. Click "Add Location"

**Expected Results:**
- ✅ Success toast: "GoHighLevel connected"
- ✅ Form clears
- ✅ New location appears in "Connected Locations" list
- ✅ Database record created in `gohighlevel_integrations`
- ✅ `token_type` = "private_api_key"
- ✅ API key encrypted in database

**Verification Queries:**
```sql
-- Check integration created
SELECT id, location_id, location_name, token_type, is_active
FROM gohighlevel_integrations
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Verify API key is encrypted (should be JSON with iv and ciphertext)
SELECT
  id,
  location_name,
  CASE
    WHEN api_key_encrypted LIKE '{%' THEN 'Encrypted ✅'
    ELSE 'Not Encrypted ❌'
  END as encryption_status
FROM gohighlevel_integrations
WHERE is_active = true;
```

---

#### Test 2.2: Create Integration (OAuth Token)
**Objective:** Test OAuth token detection and storage

**Steps:**
1. Get OAuth token from GoHighLevel (JWT format)
2. Enter JWT token (format: `xxx.yyy.zzz`)
3. Enter Location ID and Name
4. Click "Add Location"

**Expected Results:**
- ✅ Success toast: "GoHighLevel connected"
- ⚠️ Console warning: "OAuth token detected but no refresh token provided"
- ✅ `token_type` = "oauth" in database
- ✅ `refresh_token_encrypted` = NULL (no refresh provided)
- ✅ `token_expires_at` = NULL

**Advanced: With Refresh Token**
_(Requires API modification to accept refresh token from UI)_
```sql
-- After providing refresh token via API
SELECT
  token_type,
  refresh_token_encrypted IS NOT NULL as has_refresh_token,
  token_expires_at
FROM gohighlevel_integrations
WHERE token_type = 'oauth';
```

---

#### Test 2.3: Duplicate Location Detection
**Objective:** Prevent duplicate location connections

**Steps:**
1. Try to add the same location ID again
2. Use same API key and location ID

**Expected Results:**
- ❌ Error toast: "Location {name} is already connected"
- ✅ No duplicate created in database
- ✅ Existing integration unchanged

---

#### Test 2.4: Delete Integration
**Objective:** Test integration deletion

**Steps:**
1. Click "Delete" button on a connected location
2. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Success toast: "{location} has been removed"
- ✅ Location removed from list
- ✅ `is_active` set to false in database
- ✅ Cached contacts deleted from `gohighlevel_contacts`

**Verification:**
```sql
-- Check integration is soft-deleted
SELECT id, location_name, is_active
FROM gohighlevel_integrations
WHERE location_id = 'your-location-id';
-- Should show is_active = false

-- Check contacts are deleted
SELECT COUNT(*) as contact_count
FROM gohighlevel_contacts
WHERE integration_id = 'deleted-integration-id';
-- Should be 0
```

---

### Phase 3: Contact Sync ✅

#### Test 3.1: Manual Contact Sync
**Objective:** Test syncing contacts from GHL to database

**Steps:**
1. Click "Sync" button next to a connected location
2. Wait for sync to complete

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Success toast: "Sync complete" or "GoHighLevel sync complete"
- ✅ Contacts imported to `gohighlevel_contacts` table
- ✅ Contacts mapped to `clients` table
- ✅ Deals imported to `deals` table (if opportunities exist)
- ✅ `gohighlevel_integrations.updated_at` timestamp updated

**Verification:**
```sql
-- Check synced contacts
SELECT
  gc.name,
  gc.email,
  gc.phone,
  gc.status,
  gc.created_at
FROM gohighlevel_contacts gc
JOIN gohighlevel_integrations gi ON gc.integration_id = gi.id
WHERE gi.location_id = 'your-location-id'
ORDER BY gc.created_at DESC;

-- Check clients created/updated
SELECT
  c.name,
  c.email,
  c.source,
  c.created_at
FROM clients c
WHERE c.source = 'gohighlevel'
ORDER BY c.created_at DESC;

-- Check deals synced
SELECT
  d.name,
  d.amount,
  d.stage,
  d.deal_type,
  c.name as client_name
FROM deals d
LEFT JOIN clients c ON d.client_id = c.id
WHERE d.deal_type = 'gohighlevel'
ORDER BY d.created_at DESC;
```

---

#### Test 3.2: Sync Success Logging
**Objective:** Verify successful sync is logged to analytics

**Expected Results:**
- ✅ Entry in `analytics_data` table
- ✅ `metric_name` = "integration_sync"
- ✅ `dimensions` includes contact count, deal count, pipeline value
- ✅ `duration_ms` recorded

**Verification:**
```sql
SELECT
  metric_name,
  metric_value as contact_count,
  dimensions->>'contacts' as contacts_synced,
  dimensions->>'deals' as deals_synced,
  dimensions->>'pipelineValue' as total_value,
  dimensions->>'duration_ms' as duration,
  dimensions->>'triggeredBy' as trigger_source,
  recorded_at
FROM analytics_data
WHERE source = 'gohighlevel'
  AND metric_name = 'integration_sync'
ORDER BY recorded_at DESC
LIMIT 5;
```

---

#### Test 3.3: Sync Error Handling
**Objective:** Test error scenarios are logged properly

**Steps:**
1. Temporarily revoke API key in GoHighLevel
2. Trigger sync
3. Restore API key

**Expected Results:**
- ❌ Error toast with descriptive message
- ✅ Error logged to `analytics_data`
- ✅ `metric_name` = "integration_sync_error"
- ✅ `dimensions.error` contains error message
- ✅ Function logs show detailed error context

**Verification:**
```sql
-- Check error logs
SELECT
  metric_name,
  dimensions->>'error' as error_message,
  dimensions->>'duration_ms' as duration,
  dimensions->>'location_name' as location,
  recorded_at
FROM analytics_data
WHERE source = 'gohighlevel'
  AND metric_name = 'integration_sync_error'
ORDER BY recorded_at DESC
LIMIT 5;
```

---

### Phase 4: Push Client to GHL ✅

#### Test 4.1: Push New Client
**Objective:** Test creating a new contact in GHL from local client

**Steps:**
1. Navigate to a client detail page (BD → Clients → Select Client)
2. Click "Push to GoHighLevel" button
3. Wait for completion

**Expected Results:**
- ✅ Loading state shown
- ✅ Success toast: "Client created in GoHighLevel CRM"
- ✅ `gohighlevel_contact_id` stored in client record
- ✅ `gohighlevel_last_synced_at` timestamp updated
- ✅ Contact created in GHL (verify in GHL dashboard)
- ✅ Sync log entry in `control_tower_sync_log`

**Verification:**
```sql
-- Check client sync status
SELECT
  id,
  name,
  email,
  gohighlevel_contact_id,
  gohighlevel_last_synced_at
FROM clients
WHERE email = 'test-client@example.com';

-- Check sync log
SELECT
  sync_type,
  entity_type,
  status,
  payload->>'action' as action,
  payload->>'ghl_contact_id' as ghl_id,
  created_at
FROM control_tower_sync_log
WHERE entity_type = 'client'
  AND sync_type = 'push'
ORDER BY created_at DESC
LIMIT 5;
```

---

#### Test 4.2: Update Existing Contact
**Objective:** Test updating an existing GHL contact

**Steps:**
1. Use client that was already pushed (has `gohighlevel_contact_id`)
2. Update client information locally
3. Click "Push to GoHighLevel" again

**Expected Results:**
- ✅ Success toast: "Client updated in GoHighLevel CRM"
- ✅ `gohighlevel_last_synced_at` updated
- ✅ Contact updated in GHL
- ✅ Sync log shows `action` = "updated"

---

#### Test 4.3: Duplicate Email Handling
**Objective:** Test behavior when multiple GHL contacts have same email

**Setup:**
1. Create 2+ contacts in GHL with same email
2. Push client with that email from local system

**Expected Results:**
- ⚠️ Warning logged: "Found {N} contacts with email {email}. Using first match"
- ✅ First matching contact selected
- ✅ Push completes successfully
- ✅ Function logs show warning message

**Verification:**
```bash
# Check Supabase Edge Function logs
# Look for warning: "[GHL] Found N contacts with email..."
```

---

### Phase 5: OAuth Token Refresh ✅

#### Test 5.1: Token Expiration Detection
**Objective:** Verify expired tokens are detected

**Setup:**
1. Create integration with OAuth token
2. Set `token_expires_at` to past date in database

```sql
UPDATE gohighlevel_integrations
SET token_expires_at = NOW() - INTERVAL '1 hour'
WHERE token_type = 'oauth'
  AND id = 'your-integration-id';
```

**Steps:**
1. Trigger a sync or API call

**Expected Results:**
- ✅ Function detects token is expired
- ✅ Attempts to refresh token
- ⚠️ If no refresh token: "Failed to get valid access token"
- ✅ If refresh token exists: New token retrieved and stored
- ✅ `token_expires_at` updated to future date

---

#### Test 5.2: 401 Error Token Refresh
**Objective:** Test automatic refresh on 401 response

**Setup:**
1. Use expired OAuth token
2. Trigger sync

**Expected Results:**
- ✅ Initial API call gets 401
- ✅ Function logs: "Received 401 on POST /contacts/search, attempting OAuth token refresh"
- ✅ Token refreshed automatically
- ✅ Request retried with new token
- ✅ Sync completes successfully

**Verification:**
```sql
-- Check token was refreshed
SELECT
  location_name,
  token_type,
  token_expires_at,
  updated_at
FROM gohighlevel_integrations
WHERE token_type = 'oauth'
ORDER BY updated_at DESC;
-- token_expires_at should be in the future
-- updated_at should be recent
```

---

### Phase 6: Rate Limiting & Retries ✅

#### Test 6.1: Rate Limit Handling
**Objective:** Verify exponential backoff on rate limits

**Note:** This is difficult to test without intentionally hitting rate limits. Monitor logs during heavy usage.

**Expected Behavior:**
- ✅ 429 response triggers retry
- ✅ Respects `Retry-After` header if present
- ✅ Exponential backoff: 1s → 2s → 4s
- ✅ Max 3 retries
- ✅ Function logs show: "Rate limited on POST /contacts/search, retrying after Xms"

**Verification:**
Check Supabase Edge Function logs for retry messages during heavy sync operations.

---

#### Test 6.2: Network Error Retry
**Objective:** Verify network errors trigger retries

**Expected Behavior:**
- ✅ Network/timeout errors trigger retry
- ✅ Exponential backoff applied
- ✅ Max 3 retries before failing
- ✅ Clear error message after retries exhausted

---

### Phase 7: Webhook Security ✅

#### Test 7.1: Webhook with Correct Secret
**Objective:** Verify webhook accepts requests with correct secret

**Steps:**
1. Set `GHL_WEBHOOK_SECRET` in Supabase secrets
2. Send POST request to `/gohighlevel-manage/webhook`
3. Include header: `x-webhook-secret: your-correct-secret`

**Request:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gohighlevel-manage/webhook \
  -H "x-webhook-secret: your-correct-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "your-location-id",
    "event": "contact.created"
  }'
```

**Expected Results:**
- ✅ 200 OK response
- ✅ Sync triggered
- ✅ No authentication errors in logs

---

#### Test 7.2: Webhook with Wrong Secret
**Objective:** Verify webhook rejects incorrect secret

**Request:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/gohighlevel-manage/webhook \
  -H "x-webhook-secret: wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "your-location-id"
  }'
```

**Expected Results:**
- ❌ 401 Unauthorized response
- ✅ Error: "Unauthorized - invalid webhook secret"
- ✅ Function logs show: "Webhook authentication failed"
- ✅ No sync triggered

---

#### Test 7.3: Webhook without Secret Configured
**Objective:** Verify behavior when GHL_WEBHOOK_SECRET not set

**Steps:**
1. Remove `GHL_WEBHOOK_SECRET` from Supabase secrets
2. Send webhook request

**Expected Results:**
- ⚠️ Warning in logs: "GHL_WEBHOOK_SECRET not configured. Webhook endpoint is publicly accessible!"
- ✅ Request still processed (insecure but functional)
- ⚠️ Recommendation to set webhook secret

---

### Phase 8: Error Messages & Logging ✅

#### Test 8.1: Verify Error Context
**Objective:** Ensure all errors include endpoint context

**Expected Error Format:**
```
GoHighLevel API error on {METHOD} {endpoint} ({status}): {details}
```

**Examples to verify in logs:**
- ✅ `GoHighLevel API error on POST /contacts/search (401): Invalid API key`
- ✅ `GoHighLevel API error on GET /locations/xyz (404): Location not found`
- ✅ `GoHighLevel API error on POST /contacts/ (400): Missing required field`

---

#### Test 8.2: Sync Metrics Dashboard
**Objective:** Monitor integration health via analytics

**Query - Success Rate (Last 24h):**
```sql
SELECT
  COUNT(CASE WHEN metric_name = 'integration_sync' THEN 1 END) as successes,
  COUNT(CASE WHEN metric_name = 'integration_sync_error' THEN 1 END) as failures,
  ROUND(
    100.0 * COUNT(CASE WHEN metric_name = 'integration_sync' THEN 1 END) /
    NULLIF(COUNT(*), 0), 2
  ) as success_rate_pct
FROM analytics_data
WHERE source = 'gohighlevel'
  AND recorded_at > NOW() - INTERVAL '24 hours';
```

**Expected Results:**
- ✅ Both successes and failures counted
- ✅ Success rate percentage calculated
- ✅ Can track over time

**Query - Average Sync Duration:**
```sql
SELECT
  AVG((dimensions->>'duration_ms')::numeric) as avg_duration_ms,
  MIN((dimensions->>'duration_ms')::numeric) as min_duration_ms,
  MAX((dimensions->>'duration_ms')::numeric) as max_duration_ms,
  COUNT(*) as total_syncs
FROM analytics_data
WHERE source = 'gohighlevel'
  AND metric_name IN ('integration_sync', 'integration_sync_error')
  AND recorded_at > NOW() - INTERVAL '24 hours';
```

---

### Phase 9: UI Verification ✅

#### Test 9.1: Integration Manager UI
**Objective:** Verify all UI improvements render correctly

**Checklist:**
- ✅ OAuth badge visible on "Add New Location" form
- ✅ Helper text explains OAuth refresh capability
- ✅ Test connection shows location name on success
- ✅ Connected locations show:
  - ✅ Location name as title
  - ✅ Location ID in monospace font
  - ✅ "Last updated" timestamp
  - ✅ Active/Inactive badge
  - ✅ Sync and Delete buttons
- ✅ Loading states work for all async operations
- ✅ Error states display in red with alert icon
- ✅ Success states display in green with checkmark

---

#### Test 9.2: Responsive Design
**Objective:** Verify UI works on different screen sizes

**Test on:**
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

**Checklist:**
- ✅ Form fields stack properly on mobile
- ✅ Buttons remain accessible
- ✅ Location cards are readable
- ✅ No horizontal overflow

---

## 📊 Success Criteria

### Critical (Must Pass)
- ✅ Environment variables validate on startup
- ✅ Test connection works with valid credentials
- ✅ Test connection fails gracefully with invalid credentials
- ✅ Integration creation succeeds
- ✅ Contact sync completes successfully
- ✅ Push client to GHL works
- ✅ OAuth token detection works
- ✅ All errors are logged with context
- ✅ Webhook security validation works

### Important (Should Pass)
- ✅ OAuth token refresh works (if configured)
- ✅ Rate limiting handles retries correctly
- ✅ Duplicate detection logs warnings
- ✅ Analytics track all sync attempts
- ✅ UI displays all status information clearly

### Nice to Have
- ✅ Success rate > 95% under normal conditions
- ✅ Average sync duration < 5 seconds
- ✅ No memory leaks during extended operation
- ✅ Webhook processing < 2 seconds

---

## 🐛 Common Issues & Troubleshooting

### Issue: "Missing required environment variables"
**Solution:** Add required secrets to Supabase → Project Settings → Edge Functions → Secrets

### Issue: "Invalid API key or insufficient permissions"
**Solution:**
1. Verify API key in GoHighLevel dashboard
2. Check API key has required scopes (Contacts, Opportunities)
3. Ensure location ID is correct

### Issue: "OAuth token refresh failed"
**Solution:**
1. Verify `GOHIGHLEVEL_CLIENT_ID` and `GOHIGHLEVEL_CLIENT_SECRET` are set
2. Check refresh token was provided during setup
3. Token may be revoked - reconnect integration

### Issue: No contacts synced
**Solution:**
1. Verify location has contacts in GHL
2. Check function logs for API errors
3. Verify integration is active (`is_active = true`)

### Issue: Duplicate contacts not detected
**Solution:**
1. Check function logs for duplicate warnings
2. Verify email matching logic
3. Multiple contacts might have different emails

---

## 📝 Test Results Template

```
GHL Integration Test Results
Branch: claude/test-ghl-integration-012y17YbWDondtaTbe44uQwd
Date: [DATE]
Tester: [NAME]

Phase 1: Basic Connectivity
[ ] 1.1 Environment validation - PASS/FAIL
[ ] 1.2 Test connection - PASS/FAIL

Phase 2: Integration Management
[ ] 2.1 Create integration (API key) - PASS/FAIL
[ ] 2.2 Create integration (OAuth) - PASS/FAIL
[ ] 2.3 Duplicate detection - PASS/FAIL
[ ] 2.4 Delete integration - PASS/FAIL

Phase 3: Contact Sync
[ ] 3.1 Manual sync - PASS/FAIL
[ ] 3.2 Success logging - PASS/FAIL
[ ] 3.3 Error handling - PASS/FAIL

Phase 4: Push Client
[ ] 4.1 Push new client - PASS/FAIL
[ ] 4.2 Update existing - PASS/FAIL
[ ] 4.3 Duplicate handling - PASS/FAIL

Phase 5: OAuth Refresh
[ ] 5.1 Expiration detection - PASS/FAIL
[ ] 5.2 401 refresh - PASS/FAIL

Phase 6: Rate Limiting
[ ] 6.1 429 handling - PASS/FAIL
[ ] 6.2 Network retry - PASS/FAIL

Phase 7: Webhook Security
[ ] 7.1 Correct secret - PASS/FAIL
[ ] 7.2 Wrong secret - PASS/FAIL
[ ] 7.3 No secret - PASS/FAIL

Phase 8: Logging
[ ] 8.1 Error context - PASS/FAIL
[ ] 8.2 Analytics metrics - PASS/FAIL

Phase 9: UI
[ ] 9.1 UI rendering - PASS/FAIL
[ ] 9.2 Responsive design - PASS/FAIL

Overall Result: PASS/FAIL
Notes:
[Add any observations, issues, or recommendations]
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All critical tests pass
- [ ] Environment variables configured in production
- [ ] Edge function deployed
- [ ] Database migrations applied
- [ ] Analytics queries tested
- [ ] Webhook endpoint configured (if using webhooks)
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Monitoring/alerts set up
- [ ] Rollback plan prepared

---

## 📞 Support

If you encounter issues during testing:

1. Check Supabase Edge Function logs
2. Review `GHL_INTEGRATION_FIXES.md` for detailed fix documentation
3. Query `analytics_data` for error patterns
4. Check GoHighLevel API status
5. Verify environment variables are correct

**Happy Testing! 🎉**
