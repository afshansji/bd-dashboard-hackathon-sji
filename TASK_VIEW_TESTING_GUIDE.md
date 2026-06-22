# Task View, Comments, History & Notifications - Testing Guide

## Overview

This guide provides comprehensive testing instructions for the new Task View page, comments system with @mentions, history timeline, and notifications feature.

## Prerequisites

1. **Database Migration Applied**: Ensure migration `20250113000001_task_comments_history_notifications.sql` has been applied
2. **Test Data**: Have at least 2-3 test users and some existing tasks
3. **Browser**: Use latest Chrome/Firefox with dev tools open

## Test Environment Setup

### 1. Apply Database Migration

```bash
# If using local Supabase
supabase db push

# Or apply migration manually through Supabase dashboard
```

### 2. Verify Tables Created

Run these queries in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('task_comments', 'task_comment_mentions', 'task_history', 'notifications');

-- Check initial state
SELECT COUNT(*) FROM task_comments;
SELECT COUNT(*) FROM task_history;
SELECT COUNT(*) FROM notifications;
```

### 3. Prepare Test Users

Ensure you have at least 2 BD team members for mention testing.

## Testing Checklist

### Phase 1: Task View Page (Basic)

#### Test 1.1: Navigation to Task View
- [ ] Click on a task card from the tasks list
- [ ] URL should change to `/bd/actions/tasks/:taskId`
- [ ] Page should load task details
- [ ] Back button should return to tasks list

**Expected**: Smooth navigation without errors

#### Test 1.2: Task Details Display
- [ ] Task title displays correctly
- [ ] Status and priority badges show appropriate colors
- [ ] Description renders with proper formatting
- [ ] Assignee shows name and avatar (if assigned)
- [ ] Due date displays in correct format
- [ ] Campaign badge appears (if associated)
- [ ] Labels display with correct colors
- [ ] Google Drive folder link is clickable
- [ ] Attachments list shows correct file names
- [ ] Optional links (Active Collab, Workboard AI, Reference) are functional

**Expected**: All task fields display correctly

#### Test 1.3: Quick Actions
- [ ] Click Edit button → TaskForm dialog opens with populated data
- [ ] Edit task → Save → Changes reflect immediately
- [ ] Click Delete button → Confirmation modal appears
- [ ] Confirm delete → Redirects to tasks list
- [ ] Task is removed from list

**Expected**: Edit and delete work correctly

### Phase 2: Comments System

#### Test 2.1: Empty State
- [ ] Open a task with no comments
- [ ] Should display "No comments yet. Be the first to comment!"
- [ ] Comment composer should be visible

**Expected**: Friendly empty state message

#### Test 2.2: Create Comment (Without Mentions)
- [ ] Type a simple comment (e.g., "This is a test comment")
- [ ] Character counter should update
- [ ] Click "Post Comment" button
- [ ] Comment appears at bottom of list
- [ ] Shows author avatar and name
- [ ] Shows "just now" timestamp
- [ ] Composer clears after posting

**Expected**: Comment posts successfully

#### Test 2.3: Comment Validation
- [ ] Try to post empty comment → Button should be disabled
- [ ] Try to post whitespace only → Button should be disabled
- [ ] Type over 4000 characters → Counter turns red, button disabled
- [ ] Clear button should work

**Expected**: Proper validation

#### Test 2.4: Multiple Comments
- [ ] Post 3-4 comments
- [ ] Comments should appear in chronological order
- [ ] Each should have unique timestamp
- [ ] Scroll should work if many comments

**Expected**: Comments list correctly

### Phase 3: Mention System

#### Test 3.1: Mention Dropdown Trigger
- [ ] Type "@" in comment composer
- [ ] Mention dropdown should appear immediately
- [ ] Should list BD team members
- [ ] Should show avatars and names

**Expected**: Dropdown appears on "@"

#### Test 3.2: Mention Search
- [ ] Type "@j" → Should filter to users with "j" in name
- [ ] Type "@test" → Should filter appropriately
- [ ] Empty search → Shows all users

**Expected**: Search filters correctly

#### Test 3.3: Mention Selection
- [ ] Type "@"
- [ ] Click on a user from dropdown
- [ ] Token `@[UserName](userId)` should be inserted
- [ ] Dropdown should close
- [ ] Cursor should be positioned after mention

**Expected**: Mention inserts correctly

#### Test 3.4: Keyboard Navigation
- [ ] Type "@"
- [ ] Press Arrow Down → Selection moves
- [ ] Press Arrow Up → Selection moves
- [ ] Press Enter → Selected user is inserted
- [ ] Press Escape → Dropdown closes

**Expected**: Keyboard navigation works

#### Test 3.5: Multiple Mentions
- [ ] Type "Hey @[User1] and @[User2], please review"
- [ ] Both mentions should be highlighted
- [ ] Post comment
- [ ] Both mentions should render with highlight styling

**Expected**: Multiple mentions work

#### Test 3.6: Mention Rendering
- [ ] Post a comment with "@[TestUser](uuid)"
- [ ] Comment should render with highlighted mention
- [ ] Hover over mention should show styling
- [ ] Plain text around mention should be normal

**Expected**: Mentions render highlighted

### Phase 4: Mention Notifications

#### Test 4.1: Notification Creation
**Setup**: Use two different user accounts

User A (Commenter):
- [ ] Post comment with @[UserB]
- [ ] Submit comment successfully

User B (Mentioned):
- [ ] Check notification badge in header
- [ ] Should show unread count (1)
- [ ] Badge should have red indicator

**Expected**: Notification created for mentioned user

#### Test 4.2: Notification Display
User B:
- [ ] Click notification badge
- [ ] Notification list should open
- [ ] Should see "You were mentioned in a comment"
- [ ] Should show comment preview
- [ ] Should show timestamp
- [ ] Should have unread indicator

**Expected**: Notification displays correctly

#### Test 4.3: Notification Navigation
User B:
- [ ] Click on notification
- [ ] Should navigate to task view page
- [ ] Should scroll to comment (if implemented)
- [ ] Notification should mark as read
- [ ] Badge count should decrease

**Expected**: Navigation works correctly

#### Test 4.4: Self-Mention Prevention
- [ ] Post comment mentioning yourself
- [ ] Check your own notifications
- [ ] Should NOT receive notification

**Expected**: No notification for self-mention

#### Test 4.5: Duplicate Mention Prevention
- [ ] Post comment with "@[User1] and @[User1]" (same user twice)
- [ ] User1 should receive only ONE notification

**Expected**: No duplicate notifications

### Phase 5: Task History Timeline

#### Test 5.1: Task Creation History
- [ ] Create a brand new task
- [ ] Open task view page
- [ ] Go to History tab
- [ ] Should show "User created this task" as first entry

**Expected**: Creation history recorded

#### Test 5.2: Field Change History
Edit the task and change:
- [ ] Title → History shows "changed Title from X to Y"
- [ ] Status → History shows status change
- [ ] Priority → History shows priority change
- [ ] Assignee → History shows assignee change
- [ ] Due Date → History shows date change
- [ ] Description → History shows description change

**Expected**: All changes tracked

#### Test 5.3: History Display
- [ ] Each history item shows author avatar
- [ ] Shows clear change message
- [ ] Shows relative timestamp ("2 minutes ago")
- [ ] Shows appropriate icon for change type
- [ ] Timeline visual connector shows

**Expected**: History renders beautifully

#### Test 5.4: Complex Changes
- [ ] Edit task and change 3-4 fields at once
- [ ] Save
- [ ] History should show separate entry for each field
- [ ] All should have same timestamp

**Expected**: Multiple changes tracked

#### Test 5.5: Label Changes
- [ ] Add a label → History shows "added label 'LabelName'"
- [ ] Remove a label → History shows "removed label 'LabelName'"

**Expected**: Label changes tracked

#### Test 5.6: Attachment Changes
- [ ] Add an attachment → History shows "added attachment 'file.pdf'"
- [ ] Remove attachment → History shows "removed attachment 'file.pdf'"

**Expected**: Attachment changes tracked

### Phase 6: Assignee Change Notifications

#### Test 6.1: Assign Task to User
**Setup**: Use two user accounts

User A (Editor):
- [ ] Open a task with no assignee
- [ ] Edit task
- [ ] Assign to User B
- [ ] Save

User B (Assignee):
- [ ] Check notification badge
- [ ] Should show new notification
- [ ] Notification says "You were assigned a task"
- [ ] Shows task title
- [ ] Click notification → Navigate to task

**Expected**: Assignee receives notification

#### Test 6.2: Reassign Task
- [ ] Task assigned to User B
- [ ] Change assignment to User C
- [ ] User C should receive notification
- [ ] User B should NOT receive notification

**Expected**: Only new assignee notified

#### Test 6.3: Self-Assignment Prevention
- [ ] Assign task to yourself
- [ ] Check your notifications
- [ ] Should NOT receive notification

**Expected**: No notification for self-assignment

#### Test 6.4: Unassign Task
- [ ] Remove assignee (set to Unassigned)
- [ ] No notification should be created

**Expected**: No notification for unassignment

### Phase 7: Notification Management

#### Test 7.1: Mark Single as Read
- [ ] Click on a notification
- [ ] It should disappear from unread list
- [ ] Badge count should decrease
- [ ] Notification should still appear in full list

**Expected**: Individual mark as read works

#### Test 7.2: Mark All as Read
- [ ] Have 3+ unread notifications
- [ ] Click "Mark all read" button
- [ ] Badge should show 0
- [ ] All notifications should lose unread indicator

**Expected**: Bulk mark as read works

#### Test 7.3: Notification Pagination
- [ ] Generate 20+ notifications (if possible)
- [ ] Open notification list
- [ ] Should scroll smoothly
- [ ] All should display

**Expected**: Handles many notifications

### Phase 8: Error Handling

#### Test 8.1: Comment Post Failure
- [ ] Simulate network error (disable internet temporarily)
- [ ] Try to post comment
- [ ] Should show error message
- [ ] Comment text should be preserved (draft)
- [ ] Re-enable network
- [ ] Retry posting → Should work

**Expected**: Graceful error handling

#### Test 8.2: Failed to Load Comments
- [ ] Simulate API error
- [ ] Should show error state
- [ ] Should show "Retry" button
- [ ] Retry should work

**Expected**: Error recovery works

#### Test 8.3: Failed to Load History
- [ ] Same as comments test
- [ ] Error state with retry

**Expected**: Error recovery works

#### Test 8.4: Failed to Load Notifications
- [ ] Simulate error
- [ ] Badge should handle gracefully
- [ ] Clicking should show empty or error state

**Expected**: Graceful degradation

### Phase 9: Loading States

#### Test 9.1: Task Loading
- [ ] Navigate to task with slow network (throttle in dev tools)
- [ ] Should show skeleton loaders
- [ ] No layout shift when content loads

**Expected**: Smooth loading experience

#### Test 9.2: Comments Loading
- [ ] Should show skeleton loaders for comments
- [ ] Smooth transition to actual comments

**Expected**: Loading state visible

#### Test 9.3: Comment Posting
- [ ] Post comment
- [ ] Submit button should show spinner
- [ ] Should be disabled during post
- [ ] Optimistic UI update (if implemented)

**Expected**: Loading feedback clear

### Phase 10: Responsive Design

#### Test 10.1: Mobile View (< 768px)
- [ ] Open task view on mobile
- [ ] Layout should stack vertically
- [ ] Task details should be full width
- [ ] Comments/History tabs below details
- [ ] All buttons accessible
- [ ] Mention dropdown fits screen
- [ ] Notification list fits screen

**Expected**: Mobile responsive

#### Test 10.2: Tablet View (768px - 1024px)
- [ ] Layout should adapt
- [ ] May stack or use two columns
- [ ] No horizontal scrolling

**Expected**: Tablet responsive

#### Test 10.3: Desktop View (> 1024px)
- [ ] Two-column layout
- [ ] Task details on left
- [ ] Comments/History on right
- [ ] Proper spacing

**Expected**: Desktop layout optimal

### Phase 11: Permissions & Security

#### Test 11.1: View Task Permission
- [ ] User who created task can view
- [ ] Assigned user can view
- [ ] Admin can view
- [ ] Unauthorized user gets error or redirect

**Expected**: Proper access control

#### Test 11.2: Comment Permission
- [ ] Only users who can view task can comment
- [ ] Test with different user roles

**Expected**: Comment access controlled

#### Test 11.3: Edit Permission
- [ ] Only authorized users see edit button
- [ ] Others see view-only mode

**Expected**: Edit permission respected

#### Test 11.4: History Privacy
- [ ] History should only show for accessible tasks
- [ ] No sensitive data leaked

**Expected**: History secure

#### Test 11.5: Notification Privacy
- [ ] Users only see their own notifications
- [ ] No cross-user notification access

**Expected**: Notifications private

### Phase 12: Edge Cases

#### Test 12.1: Deleted User Mentions
- [ ] Post comment with mention
- [ ] Delete mentioned user (if possible in test env)
- [ ] Comment should render gracefully
- [ ] Mention should show as "Unknown User" or similar

**Expected**: Graceful handling

#### Test 12.2: Very Long Comments
- [ ] Post comment at max length (4000 chars)
- [ ] Should render properly
- [ ] Should not break layout

**Expected**: Long text handled

#### Test 12.3: Special Characters
- [ ] Post comment with emojis, special chars
- [ ] Should render correctly
- [ ] Mention parsing should not break

**Expected**: Special chars supported

#### Test 12.4: Rapid Actions
- [ ] Post 5 comments quickly
- [ ] All should process
- [ ] No race conditions

**Expected**: Concurrent actions handled

#### Test 12.5: Old Tasks
- [ ] Open task created before this feature
- [ ] Comments tab should show empty state
- [ ] History might be empty or show minimal data
- [ ] No errors

**Expected**: Backward compatible

### Phase 13: Performance

#### Test 13.1: Large Comment List
- [ ] Task with 50+ comments
- [ ] Should load within reasonable time (<3s)
- [ ] Scroll should be smooth
- [ ] Consider pagination if slow

**Expected**: Performs well

#### Test 13.2: Large History
- [ ] Task with 100+ history entries
- [ ] Should load on tab switch (lazy load)
- [ ] Scroll should be smooth

**Expected**: Performs well

#### Test 13.3: Network Performance
- [ ] Monitor network tab
- [ ] Should not make redundant requests
- [ ] React Query caching should work

**Expected**: Efficient requests

## Automated Testing (Optional)

### Unit Tests to Write

```typescript
// mentionParser.test.ts
- extractMentionUserIds()
- parseTextWithMentions()
- insertMention()

// taskDiff.test.ts
- computeTaskDiff()

// notificationService.test.ts
- createMentionNotifications()
- createAssigneeChangeNotification()
```

### Integration Tests

```typescript
// taskView.test.tsx
- renders task details
- switches between tabs
- posts comment
- navigates on notification click

// comments.test.tsx
- creates comment
- mentions user
- validates input

// history.test.tsx
- displays history
- formats messages correctly
```

## Bug Reporting Template

```
**Bug Title**: [Brief description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Screenshots**: (if applicable)

**Environment**:
- Browser: 
- User Role: 
- Task ID: 

**Console Errors**: (paste any errors)
```

## Success Criteria

✅ All Phase 1-12 tests pass
✅ No console errors during normal usage
✅ Responsive on all screen sizes
✅ Notifications work end-to-end
✅ History tracks all changes correctly
✅ Mentions create notifications
✅ Performance is acceptable
✅ Backward compatible with old tasks

## Known Limitations (Expected)

1. No real-time updates (notifications on refresh)
2. No comment editing
3. No comment deletion
4. No rich text formatting
5. No file attachments in comments
6. No threaded replies

## Post-Testing Actions

After successful testing:

1. [ ] Document any bugs found
2. [ ] Create GitHub issues for bugs
3. [ ] Update README with new features
4. [ ] Create user documentation
5. [ ] Prepare release notes
6. [ ] Conduct user acceptance testing (UAT)
7. [ ] Deploy to production

## Test Sign-Off

| Tester | Date | Phase | Status | Notes |
|--------|------|-------|--------|-------|
|        |      |       |        |       |
|        |      |       |        |       |
|        |      |       |        |       |

## Contact

For questions about testing:
- Development Team: [contact info]
- Bug Reports: [issue tracker link]

