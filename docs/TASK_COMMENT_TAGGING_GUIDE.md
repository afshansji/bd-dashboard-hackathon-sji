# Task Comment Tagging Feature - User Guide

## Overview

The task comment tagging feature allows you to mention team members in task comments using the `@` symbol. When you tag someone, they receive an in-app notification and can quickly navigate to the task.

## ✅ Feature Status: FULLY IMPLEMENTED

All components are already built and ready to use!

## How to Use

### 1. Tagging a Member in a Comment

1. Navigate to any task by clicking on it from the tasks list
2. Go to the **Comments** tab
3. Click in the comment text area
4. Type `@` to trigger the mention dropdown
5. A list of team members will appear
6. You can:
   - **Search**: Continue typing to filter members by name
   - **Navigate**: Use arrow keys (↑/↓) to select
   - **Select**: Click on a member or press Enter
7. The mention will be inserted in format: `@[Member Name](user-id)`
8. Continue typing your comment
9. Click **Post Comment**

### 2. What Happens After Tagging

When you tag someone:
- ✅ The mention is saved with your comment
- ✅ The mentioned user receives a notification
- ✅ The mention is highlighted in the comment display
- ✅ Multiple tags in one comment are supported

### 3. Viewing Notifications

Tagged users will:
1. See a notification badge in the header (red dot with count)
2. Click the notification bell to view details
3. See: "You were mentioned in a comment"
4. Click the notification to navigate directly to the task and comment
5. Notification is automatically marked as read

## Technical Details

### Database Tables

- `task_comments` - Stores comment text with mentions
- `task_comment_mentions` - Tracks which users are mentioned
- `user_notifications` - Stores notification records

### Mention Format

Mentions are stored as: `@[Display Name](userId)`

Example: `@[John Doe](123e4567-e89b-12d3-a456-426614174000)`

### Features

✅ **Auto-complete dropdown** - Shows after typing @
✅ **Search filtering** - Type to filter members
✅ **Keyboard navigation** - Arrow keys + Enter
✅ **Multiple mentions** - Tag multiple people in one comment
✅ **Notifications** - Real-time notification system
✅ **Highlight rendering** - Mentions are visually distinct
✅ **Comment editing** - Preserve mentions when editing
✅ **Preview mode** - See how mentions will look before posting

### Permissions

- Only users with access to the task can comment
- Only users with access can see comments and mentions
- Users receive notifications only for mentions on tasks they can access

## Troubleshooting

### Dropdown Doesn't Appear

If the mention dropdown doesn't show up when you type @:

1. **Check browser console** for errors (F12)
2. **Verify you're in the comment composer** (textarea is focused)
3. **Try typing @ at the start of a new line**
4. **Check if team members are loaded** (should see profiles)

### Mentions Not Highlighting

If mentions appear as plain text:

1. **Check the format**: Must be `@[Name](userId)` exactly
2. **Verify the RichText component** is rendering
3. **Check browser console** for rendering errors

### Notifications Not Received

If tagged users don't receive notifications:

1. **Verify database migrations** are applied:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_name = 'user_notifications'
   );
   ```

2. **Check notification creation** in database:
   ```sql
   SELECT * FROM user_notifications
   WHERE type = 'TASK_MENTION'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Check RLS policies** allow notification insertion
4. **Verify mentioned user has access** to the task

### Migration Issues

If you see "Migration Required" error:

Run these migrations in order in Supabase SQL Editor:

1. `supabase/migrations/20250113000001_task_comments_history_notifications.sql`
2. `supabase/migrations/20251212100000_create_user_notifications.sql`
3. `supabase/migrations/20260114000000_fix_notifications_schema.sql`

Or use Supabase CLI:
```bash
supabase db push
```

## Testing Checklist

Use this checklist to verify the feature works:

- [ ] Type @ in comment box → dropdown appears
- [ ] Type @j → filters to users with "j" in name
- [ ] Arrow keys navigate dropdown options
- [ ] Enter key selects highlighted user
- [ ] Click on user name selects user
- [ ] Mention token `@[Name](id)` is inserted
- [ ] Preview shows mention highlighted
- [ ] Post comment → comment appears with highlighted mention
- [ ] Tagged user receives notification
- [ ] Notification shows correct task and comment
- [ ] Clicking notification navigates to task
- [ ] Multiple mentions work in one comment
- [ ] Self-mentions don't create notifications

## Code References

### Key Components

- `src/components/tasks/comments/CommentComposer.tsx` - Comment input with @ trigger
- `src/components/tasks/comments/MentionDropdown.tsx` - User selection dropdown
- `src/components/tasks/comments/MentionText.tsx` - Renders mentions
- `src/components/tasks/comments/RichText.tsx` - Rich text parsing
- `src/hooks/useTaskComments.tsx` - Comment CRUD operations
- `src/services/notificationService.ts` - Notification creation
- `src/utils/mentionParser.ts` - Mention parsing utilities

### Database Schema

```sql
-- Comment table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL,
  author_id UUID NOT NULL,
  body_text TEXT NOT NULL,  -- Contains @[Name](userId) tokens
  created_at TIMESTAMPTZ,
  edited BOOLEAN
);

-- Mention tracking
CREATE TABLE task_comment_mentions (
  id UUID PRIMARY KEY,
  comment_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL
);

-- Notifications
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  task_id UUID,
  comment_id UUID,
  actor_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

## Feature Roadmap

### ✅ Completed
- [x] @ trigger and dropdown
- [x] User search and selection
- [x] Mention storage
- [x] Mention rendering
- [x] Notification creation
- [x] Notification display
- [x] Comment editing with mentions
- [x] Preview mode

### 🚀 Future Enhancements
- [ ] @channel or @all to notify everyone
- [ ] @assignee to notify current assignee
- [ ] Mention autocomplete improvements
- [ ] Recent mentions history
- [ ] Email notifications for mentions
- [ ] Mobile app notifications

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify database migrations are applied
3. Test with the troubleshooting guide above
4. Report bugs with screenshots and console errors

## Examples

### Basic Mention
```
Hey @[John Doe](user-id), can you review this task?
```

### Multiple Mentions
```
@[Alice Smith](user-1) and @[Bob Jones](user-2),
please collaborate on this feature.
```

### Mention with Formatting
```
@[Manager Name](user-id) **urgent**: This needs immediate attention!
```

## Best Practices

1. **Use mentions sparingly** - Only tag people who need to take action
2. **Provide context** - Explain why you're tagging someone
3. **Don't spam** - Avoid tagging the same person repeatedly
4. **Check task access** - Ensure tagged users can access the task
5. **Use clear messages** - Make your request or update clear

---

**Last Updated**: January 15, 2026
**Feature Status**: ✅ Fully Operational
**Version**: 1.0
