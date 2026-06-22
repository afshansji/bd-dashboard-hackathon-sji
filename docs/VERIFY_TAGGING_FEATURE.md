# Task Comment Tagging - Feature Verification

## Quick Verification Steps

Follow these steps to verify the tagging feature is working correctly:

### 1. Database Verification

Run these SQL queries in Supabase SQL Editor:

```sql
-- Check if all required tables exist
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') THEN '✅' ELSE '❌' END AS task_comments,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comment_mentions') THEN '✅' ELSE '❌' END AS mentions,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN '✅' ELSE '❌' END AS notifications;

-- Check if required columns exist in user_notifications
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'user_notifications'
  AND column_name IN ('task_id', 'comment_id', 'actor_id', 'link_url')
ORDER BY column_name;

-- Expected output: All 4 columns should be listed
```

### 2. Frontend Verification

1. **Open the application** in your browser
2. **Navigate to any task** (click on a task card)
3. **Open Developer Console** (F12)
4. **Check for errors** in console
5. **Go to Comments tab**

### 3. Test @ Mention Dropdown

In the comment composer:

1. Click in the textarea
2. Type `@`
3. **Expected**: A dropdown should appear immediately
4. **Check**:
   - [ ] Dropdown is visible
   - [ ] Contains list of team members
   - [ ] Shows avatars and names
   - [ ] Shows helpful text at top

If dropdown doesn't appear:
- Check browser console for errors
- Verify `useBDTeamMembers` hook is loading data
- Check network tab for API calls

### 4. Test Mention Selection

1. Type `@`
2. Type a letter (e.g., `@j`)
3. **Expected**: List filters to matching names
4. Use arrow keys to navigate
5. Press Enter or click a name
6. **Expected**: Mention token inserted: `@[Name](userId)`

### 5. Test Comment Posting

1. Type a comment with a mention: `@[Someone] can you help?`
2. Check preview section
3. **Expected**: Mention is highlighted in preview
4. Click "Post Comment"
5. **Expected**:
   - [ ] Comment appears in list
   - [ ] Mention is highlighted with colored background
   - [ ] No errors in console
   - [ ] Comment shows correct author and timestamp

### 6. Test Notification Creation

**Requires two user accounts**

As User A:
1. Post a comment mentioning User B: `@[UserB] please review`
2. Submit comment

As User B:
1. Check notification bell in header
2. **Expected**:
   - [ ] Badge shows count (1+)
   - [ ] Red dot indicator visible
3. Click notification bell
4. **Expected**:
   - [ ] Notification list opens
   - [ ] Shows "You were mentioned in a comment"
   - [ ] Shows task title and comment preview
   - [ ] Shows timestamp
5. Click notification
6. **Expected**:
   - [ ] Navigates to task view page
   - [ ] Task loads correctly
   - [ ] Notification marked as read
   - [ ] Badge count decreases

### 7. Database Verification (After Test)

```sql
-- Check if comment was saved
SELECT
  tc.id,
  tc.body_text,
  tc.created_at,
  p.full_name as author
FROM task_comments tc
JOIN profiles p ON tc.author_id = p.id
ORDER BY tc.created_at DESC
LIMIT 5;

-- Check if mention was recorded
SELECT
  tcm.id,
  tc.body_text,
  p.full_name as mentioned_user
FROM task_comment_mentions tcm
JOIN task_comments tc ON tcm.comment_id = tc.id
JOIN profiles p ON tcm.mentioned_user_id = p.id
ORDER BY tcm.created_at DESC
LIMIT 5;

-- Check if notification was created
SELECT
  un.id,
  un.type,
  un.title,
  un.message,
  un.link_url,
  un.created_at,
  p.full_name as recipient
FROM user_notifications un
JOIN profiles p ON un.user_id = p.id
WHERE un.type = 'TASK_MENTION'
ORDER BY un.created_at DESC
LIMIT 5;
```

## Expected Results Summary

### ✅ All Green Checklist

- [ ] Database tables exist (task_comments, task_comment_mentions, user_notifications)
- [ ] user_notifications has required columns (task_id, comment_id, actor_id, link_url)
- [ ] @ symbol triggers dropdown
- [ ] Dropdown shows team members
- [ ] Search filtering works
- [ ] Mention insertion works
- [ ] Preview shows highlighted mention
- [ ] Comment posts successfully
- [ ] Mention renders with highlight
- [ ] Notification is created in database
- [ ] Notification appears in UI
- [ ] Clicking notification navigates to task
- [ ] Notification marked as read

## Common Issues and Fixes

### Issue: Dropdown doesn't appear

**Diagnosis**:
```javascript
// Check in browser console
console.log('Checking useBDTeamMembers hook');
// In React DevTools, find CommentComposer component
// Check state: showMentionDropdown should be true after typing @
```

**Fix**:
- Verify `useBDTeamMembers` hook is returning data
- Check if `findMentionTriggerPosition` function works correctly
- Ensure textarea ref is properly set

### Issue: Notifications not created

**Diagnosis**:
```sql
-- Check if mentions are being saved
SELECT * FROM task_comment_mentions
ORDER BY created_at DESC LIMIT 5;

-- Check notification service logs
-- Look in browser console for:
-- "Failed to create mention notifications"
```

**Fix**:
1. Verify migrations 20251212100000 and 20260114000000 are applied
2. Check RLS policies on user_notifications table
3. Verify `createMentionNotifications` function is being called
4. Check for errors in `src/services/notificationService.ts`

### Issue: Schema mismatch

**Error**: `column "link_url" does not exist`

**Fix**:
```sql
-- Run the fix migration
-- File: supabase/migrations/20260114000000_fix_notifications_schema.sql

ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS task_id UUID,
ADD COLUMN IF NOT EXISTS comment_id UUID,
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS link_url TEXT;
```

### Issue: Mention tokens show as plain text

**Problem**: Comment shows `@[Name](userId)` literally instead of highlighted

**Diagnosis**:
- Check if `RichText` component is being used
- Verify `parseRichText` function in `src/utils/richTextParser.ts`
- Check mention regex pattern in parsing

**Fix**:
- Ensure `MentionText` component is rendering in both preview and display
- Verify regex pattern: `/@\[([^\]]+)\]\(([^)]+)\)/g`

## Performance Verification

### Check Query Performance

```sql
-- Should be fast (<100ms)
EXPLAIN ANALYZE
SELECT tc.*, p.full_name
FROM task_comments tc
JOIN profiles p ON tc.author_id = p.id
WHERE tc.task_id = 'some-uuid'
ORDER BY tc.created_at ASC;

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('task_comments', 'task_comment_mentions', 'user_notifications');
```

### Expected Indexes

- `idx_task_comments_task_id`
- `idx_task_comments_author_id`
- `idx_task_comment_mentions_comment_id`
- `idx_task_comment_mentions_mentioned_user_id`
- `idx_user_notifications_user_id`
- `idx_user_notifications_actor_id`

## Security Verification

### Check RLS Policies

```sql
-- View all policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('task_comments', 'task_comment_mentions', 'user_notifications')
ORDER BY tablename, policyname;
```

### Expected Policies

**task_comments**:
- SELECT: Users can view comments on accessible tasks
- INSERT: Users can create comments on accessible tasks
- UPDATE: Users can update their own comments

**task_comment_mentions**:
- SELECT: Users can view mentions in accessible comments
- INSERT: Users can create mentions when commenting

**user_notifications**:
- SELECT: Users can view their own notifications
- UPDATE: Users can update their own notifications
- INSERT: Service role can insert notifications

## Automated Test Script

```bash
# Run this in project root

# Check if migrations are applied
echo "Checking migrations..."
supabase db diff --check

# Check if tables exist
echo "Verifying tables..."
supabase db execute "
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') as comments,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comment_mentions') as mentions,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') as notifications;
"

# Run application tests
echo "Running application tests..."
npm run test -- comments

echo "✅ Verification complete!"
```

## Manual Test Scenarios

### Scenario 1: Single Mention

1. User A comments: "Hey @[User B], can you review?"
2. Verify: User B gets notification
3. User B clicks notification
4. Verify: Navigates to correct task

### Scenario 2: Multiple Mentions

1. User A comments: "@[User B] and @[User C], please collaborate"
2. Verify: Both User B and User C get notifications
3. Verify: No duplicate notifications

### Scenario 3: Self Mention

1. User A comments: "@[User A] reminder to self"
2. Verify: User A does NOT get notification

### Scenario 4: Edit Comment with Mention

1. User A posts comment with @[User B]
2. User B gets notification
3. User A edits comment, removes mention
4. Verify: No new notifications created

### Scenario 5: Long Comment with Formatting

1. User A posts:
   ```
   @[User B] **Important Update**

   • Point 1
   • Point 2

   [Link](https://example.com)
   ```
2. Verify: Mention AND formatting both render correctly

## Success Criteria

All of the following must pass:

- ✅ All database tables exist
- ✅ All required columns present
- ✅ All RLS policies active
- ✅ @ dropdown appears
- ✅ Mentions insert correctly
- ✅ Mentions render with highlight
- ✅ Notifications created
- ✅ Notifications display in UI
- ✅ Navigation from notification works
- ✅ No console errors
- ✅ No SQL errors
- ✅ Performance is acceptable (<1s for comment post)

## Report Template

After verification, fill out:

```
## Verification Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Development/Staging/Production]

### Database ✅/❌
- Tables exist: [ ]
- Columns correct: [ ]
- Indexes present: [ ]
- RLS policies active: [ ]

### Frontend ✅/❌
- Dropdown appears: [ ]
- Search works: [ ]
- Insertion works: [ ]
- Rendering works: [ ]

### Notifications ✅/❌
- Created in DB: [ ]
- Displayed in UI: [ ]
- Navigation works: [ ]
- Mark as read works: [ ]

### Performance ✅/❌
- Comment post < 1s: [ ]
- Dropdown appears < 500ms: [ ]
- No lag in typing: [ ]

### Issues Found
- [List any issues]

### Overall Status
- [ ] ✅ All tests passed
- [ ] ⚠️ Minor issues found
- [ ] ❌ Major issues found
```

---

**Last Updated**: January 15, 2026
