# In-App Notifications System

## Overview

A complete in-app notification system has been implemented for the SJ BD Dashboard. Users now receive real-time notifications for deal assignments in addition to email notifications.

## Features

✅ **Real-time Notifications** - Instant in-app alerts using Supabase Realtime
✅ **Notification Bell** - Header badge showing unread notification count
✅ **Notification Center** - Dropdown list of all notifications
✅ **Mark as Read** - Individual and bulk read/unread management
✅ **Delete Notifications** - Remove individual notifications
✅ **Click to Navigate** - Clicking a notification navigates to the relevant deal
✅ **Toast Alerts** - New notifications show as toast pop-ups
✅ **Email Independence** - In-app notifications are created even if email is disabled

## What Was Built

### 1. Database Schema
**Migration:** `20251212100000_create_user_notifications.sql`

Created `user_notifications` table with:
- `id` - Unique notification ID
- `user_id` - User receiving the notification
- `type` - Notification type (e.g., `deal_owner_assigned`, `deal_pm_assigned`)
- `title` - Notification title
- `message` - Notification message
- `data` - JSONB field for additional structured data
- `link` - URL to navigate to when clicked
- `read` - Boolean flag for read/unread status
- `read_at` - Timestamp when marked as read
- `created_at` / `updated_at` - Audit timestamps

**Helper Functions:**
- `mark_notification_as_read(notification_id)` - Mark specific notification as read
- `mark_all_notifications_as_read()` - Mark all user notifications as read
- `get_unread_notification_count()` - Get count of unread notifications

**RLS Policies:**
- Users can only view/update/delete their own notifications
- Service role can insert notifications for any user

### 2. Edge Function Updates
**File:** `supabase/functions/deal-assignee-notification/index.ts`

Added `createInAppNotification()` function that:
- Creates a notification record in the database
- Includes deal details (title, client, value, stage)
- Provides link to deal detail page
- Always creates notification (even if email is disabled)

**Email vs In-App:**
- Email notifications respect user preferences (`deal_owner_assigned`, `deal_pm_assigned`)
- In-app notifications are ALWAYS created regardless of email preferences
- Users can disable emails but still get in-app notifications

### 3. Frontend Components

**Hook:** `src/hooks/useNotifications.tsx`
- Fetches notifications from database
- Sets up Supabase Realtime subscription for new notifications
- Provides functions for marking as read, deleting, etc.
- Shows toast when new notifications arrive
- Auto-navigates when notification is clicked

**Notification Bell:** `src/components/notifications/NotificationBell.tsx`
- Bell icon with badge showing unread count
- Displays "99+" for counts over 99
- Opens notification popover on click

**Notification List:** `src/components/notifications/NotificationList.tsx`
- Scrollable list of up to 50 most recent notifications
- Shows unread notifications with accent background
- Displays relative time (e.g., "5 minutes ago")
- Hover actions: Mark as read, Delete
- Header with "Mark all read" button
- Empty state with icon when no notifications

**Layout Integration:** `src/components/Layout.tsx`
- Added `<NotificationBell />` to top navigation bar
- Positioned next to the page title

## User Experience

### Notification Flow

1. **Deal Assignment Changes**
   - Admin/User changes deal owner or PM assignee
   - Database trigger fires (`notify_deal_assignee_change`)
   - Trigger calls edge function via pg_net

2. **Edge Function Processing**
   - Fetches deal details (title, client, value, stage)
   - Fetches assignee details (name, email)
   - Checks email notification preferences
   - **Sends email** (if preferences allow)
   - **Creates in-app notification** (always)

3. **Real-Time Delivery**
   - Supabase Realtime pushes notification to user's browser
   - Notification appears in bell badge count
   - Toast notification pops up
   - User can click toast "View" button or bell icon

4. **Notification Actions**
   - **Click notification** → Navigate to deal + mark as read
   - **Click checkmark** → Mark as read (stays in list)
   - **Click X** → Delete notification
   - **Click "Mark all read"** → Mark all as read at once

### Visual Design

- **Unread**: Blue dot + accent background
- **Read**: No dot, normal background
- **Badge**: Red circle with white text
- **Icons**: Bell (header), BellOff (empty state)

## Testing the System

### 1. Prerequisites
Ensure the database migrations and edge function updates are deployed:
- Run migrations to create `user_notifications` table
- Deploy updated `deal-assignee-notification` edge function
- Configure service role key (see DEAL_NOTIFICATION_SETUP.md)

### 2. Test Deal Owner Assignment
```sql
-- In Supabase SQL Editor
UPDATE deals
SET owner_id = 'USER_ID_HERE'
WHERE id = 'DEAL_ID_HERE';
```

**Expected Result:**
- User with `USER_ID_HERE` receives:
  - ✉️ Email (if preferences enabled)
  - 🔔 In-app notification (always)
  - 🍞 Toast notification (if user is logged in)

### 3. Test PM Assignment
```sql
UPDATE deals
SET pm_assigned_id = 'USER_ID_HERE'
WHERE id = 'DEAL_ID_HERE';
```

**Expected Result:**
- Same as above, with "Project Manager" instead of "Deal Owner"

### 4. Check Notification Center
1. Log in as the assigned user
2. Look for red badge on bell icon in header
3. Click bell to open notification list
4. Verify notification appears with:
   - Title: "New Deal Owner Assignment" or "New Project Manager Assignment"
   - Message: Details about the deal
   - Unread indicator (blue dot)

### 5. Test Actions
- **Mark as Read**: Click checkmark → dot disappears, background changes
- **Navigate**: Click notification → should go to `/bd/deals/{id}`
- **Delete**: Click X → notification removed from list
- **Mark All Read**: Click "Mark all read" → all dots disappear

## Configuration

### Email Preferences vs In-App

Users can control email notifications in their profile settings:
- Go to Profile → Settings → Notifications
- Toggle "Deal Owner Assigned" email notifications
- Toggle "Deal PM Assigned" email notifications

**Important:**
- Disabling email does NOT disable in-app notifications
- In-app notifications are always created
- This ensures users never miss important assignments

### Notification Types

Current notification types:
- `deal_owner_assigned` - When assigned as deal owner
- `deal_pm_assigned` - When assigned as project manager

**Future extensibility:**
- Easily add more types (e.g., `deal_updated`, `mention`, `comment`)
- Add notification preferences for in-app notifications
- Add push notifications via web push API

## Database Queries

### Get All Notifications for a User
```sql
SELECT * FROM user_notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Count Unread Notifications
```sql
SELECT get_unread_notification_count();
```

### Mark Specific Notification as Read
```sql
SELECT mark_notification_as_read('NOTIFICATION_ID_HERE');
```

### Mark All as Read
```sql
SELECT mark_all_notifications_as_read();
```

### Delete Old Notifications (Maintenance)
```sql
DELETE FROM user_notifications
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Files Modified/Created

### Database
- ✨ `supabase/migrations/20251212000000_configure_database_settings.sql`
- ✨ `supabase/migrations/20251212000001_fix_deal_assignee_notification_trigger.sql`
- ✨ `supabase/migrations/20251212100000_create_user_notifications.sql`

### Edge Functions
- 📝 `supabase/functions/deal-assignee-notification/index.ts` (modified)

### Frontend
- ✨ `src/hooks/useNotifications.tsx`
- ✨ `src/components/notifications/NotificationBell.tsx`
- ✨ `src/components/notifications/NotificationList.tsx`
- 📝 `src/components/Layout.tsx` (modified)

### Documentation
- ✨ `DEAL_NOTIFICATION_SETUP.md`
- ✨ `IN_APP_NOTIFICATIONS.md` (this file)

## Troubleshooting

### Notifications Not Appearing

1. **Check Service Role Key Configuration**
   - See DEAL_NOTIFICATION_SETUP.md
   - Run: `SELECT get_service_role_key() IS NOT NULL;`
   - Should return `true`

2. **Check Database Trigger**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_deal_assignee_notification';
   ```

3. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → deal-assignee-notification
   - Look for errors or successful execution

4. **Check Realtime Subscription**
   - Open browser console
   - Look for Supabase Realtime connection logs
   - Should see subscription to `user-notifications` channel

5. **Check RLS Policies**
   ```sql
   SELECT * FROM user_notifications WHERE user_id = auth.uid();
   ```
   - Should return user's notifications
   - If empty, check if notifications were created

### Badge Count Wrong

- Refresh notifications: `refetch()` function in hook
- Check unread count: `SELECT get_unread_notification_count();`
- Verify RLS policies allow reading notifications

### Notifications Not Delivered in Real-Time

- Check Supabase Realtime is enabled for the project
- Verify browser is not blocking WebSocket connections
- Check console for Realtime connection errors
- Try refreshing the page

## Security Considerations

- ✅ Row Level Security (RLS) enabled on `user_notifications`
- ✅ Users can only see their own notifications
- ✅ Service role required to create notifications for users
- ✅ Database functions use SECURITY DEFINER
- ✅ Trigger uses SECURITY DEFINER
- ✅ No sensitive data exposed in notifications table

## Performance

- Notifications limited to 50 most recent in UI
- Index on `user_id` and `read` for fast queries
- Index on `created_at DESC` for chronological sorting
- Realtime subscription filtered by `user_id`
- Consider adding cleanup job for old read notifications

## Future Enhancements

Possible improvements:
- [ ] In-app notification preferences (like email preferences)
- [ ] Notification groups/categories
- [ ] Rich notifications with images/avatars
- [ ] Sound effects for new notifications
- [ ] Browser push notifications (when tab is closed)
- [ ] Notification history page (`/notifications`)
- [ ] Notification search and filtering
- [ ] Email digest of unread notifications
- [ ] Notification templates for different event types
- [ ] @mentions in deals/comments with notifications
- [ ] Deal status change notifications
- [ ] Deal milestone notifications

## Related Documentation

- `DEAL_NOTIFICATION_SETUP.md` - Service role key configuration
- `supabase/migrations/20251211120000_deal_assignee_notifications.sql` - Original trigger
- `src/pages/bd/UserSettings.tsx` - Email notification preferences UI
