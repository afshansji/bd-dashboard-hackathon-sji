# Task Enhancement Testing Guide

## Overview
This document provides a comprehensive testing plan for the enhanced task management features. Test all scenarios to ensure proper functionality and backward compatibility.

## Prerequisites
1. Run the database migration: `supabase/migrations/20250113000000_enhance_project_tasks.sql`
2. Ensure Supabase is running and connected
3. Have at least one BD campaign created
4. Have BD team members in the system

## Test Scenarios

### 1. Basic Task Creation (No Optional Fields)
**Expected:** Task should be created successfully with only required fields

**Steps:**
1. Open the task form (Create New Task)
2. Enter title: "Test Basic Task"
3. Select status: "To Do"
4. Select priority: "Medium"
5. Click "Create Task"

**Verify:**
- Task is created successfully
- Task appears in the task list
- All new fields default to null/false/empty
- No errors in console

### 2. Campaign Association Toggle
**Expected:** Campaign dropdown appears/disappears based on toggle

**Steps:**
1. Open the task form
2. Enter a title
3. Click "No" for campaign association (default)
   - Verify: Campaign dropdown is hidden
4. Click "Yes" for campaign association
   - Verify: Campaign dropdown appears
   - Verify: Red asterisk appears (required field)
5. Try to submit without selecting a campaign
   - Verify: Validation error appears
6. Select a campaign
7. Submit the form

**Verify:**
- Task is created with `is_campaign_associated = true`
- `campaign_id` is saved correctly
- Campaign badge appears on task card

### 3. Campaign Search Functionality
**Expected:** Can search for campaigns in dropdown

**Steps:**
1. Open task form
2. Set campaign association to "Yes"
3. Click on campaign dropdown
4. Type at least 3 characters in search
5. Verify filtered results appear
6. Select a campaign

**Verify:**
- Search works correctly
- Selected campaign is displayed
- Campaign is saved with the task

### 4. Assignee Selection
**Expected:** Can assign task to BD members or leave unassigned

**Steps:**
1. Open task form
2. Click assignee dropdown
3. Verify "Unassigned" is first option
4. Select a BD team member
5. Create the task

**Verify:**
- Assignee is saved correctly
- Avatar and name appear on task card
- Can edit and change assignee
- Can set back to "Unassigned"

### 5. Task Labels - Multi-Select
**Expected:** Can select multiple labels and create new ones

**Steps:**
1. Open task form
2. Click on "Labels" dropdown
3. Select 2-3 existing labels
4. Verify selected labels appear as chips above dropdown
5. Click X on a chip to remove it
6. Create task

**Verify:**
- Labels are saved correctly
- Labels appear on task card with correct colors
- Can remove labels individually
- Labels persist after editing

### 6. Task Labels - Create New
**Expected:** Can create new labels inline

**Steps:**
1. Open task form
2. Click "Labels" dropdown
3. Type a new label name (e.g., "Urgent Priority")
4. Click "Create 'Urgent Priority'"
5. Verify new label is created and selected
6. Create task

**Verify:**
- New label is created in database
- Label is assigned to task
- Label appears on task card
- Label is available for other tasks

### 7. Google Drive Folder - Valid URL
**Expected:** Can paste and validate Google Drive folder URL

**Steps:**
1. Open task form
2. Paste a valid Google Drive folder URL:
   `https://drive.google.com/drive/folders/1ABC123xyz`
3. Click "Add"
4. Create task

**Verify:**
- Folder ID is extracted correctly
- Folder badge appears showing "Google Drive Folder"
- Folder icon appears on task card
- Link opens in new tab when clicked

### 8. Google Drive Folder - Invalid URL
**Expected:** Shows validation error for invalid URLs

**Steps:**
1. Open task form
2. Paste invalid URL: `https://example.com/not-a-drive-url`
3. Click "Add"

**Verify:**
- Error toast appears: "Invalid Google Drive folder URL"
- Folder is not set
- Can still submit form without folder

### 9. Google Drive Folder - Remove
**Expected:** Can remove linked folder

**Steps:**
1. Open task form
2. Add a valid Google Drive folder URL
3. Click the X button on the folder badge
4. Create task

**Verify:**
- Folder badge disappears
- `google_folder` field is null in database
- No folder icon on task card

### 10. File Attachments - Upload
**Expected:** Can upload multiple files

**Steps:**
1. Open task form
2. Drag and drop 2-3 files (PDF, image, doc)
3. Verify files appear in list with name and size
4. Create task

**Verify:**
- Files are uploaded to `task-files` storage bucket
- File metadata is saved in `task_attachments` table
- Attachment count appears on task card
- All file types are accepted (within limits)

### 11. File Attachments - Size Limit
**Expected:** Rejects files over 5MB

**Steps:**
1. Open task form
2. Try to upload a file > 5MB

**Verify:**
- Error toast appears about file size limit
- File is not added to list
- Can still upload smaller files

### 12. File Attachments - Remove Before Submit
**Expected:** Can remove files before creating task

**Steps:**
1. Open task form
2. Add 3 files
3. Click X on the second file
4. Verify file is removed from list
5. Create task

**Verify:**
- Only 2 files are uploaded
- Removed file is not in storage or database
- Attachment count is correct on task card

### 13. Optional Links - Valid URLs
**Expected:** Can add optional reference links

**Steps:**
1. Open task form
2. Expand "Optional Reference Links"
3. Add Active Collab link: `https://app.activecollab.com/123/projects/456`
4. Add Workboard AI link: `https://workboard.ai/task/789`
5. Add Reference URL: `https://docs.google.com/document/d/abc123`
6. Create task

**Verify:**
- All three links are saved
- Links are available when editing task
- Links remain in collapsed section

### 14. Optional Links - Invalid URLs
**Expected:** Shows validation error for invalid URLs

**Steps:**
1. Open task form
2. Expand "Optional Reference Links"
3. Enter invalid URL: `not-a-valid-url`
4. Try to submit

**Verify:**
- Validation error appears
- Cannot submit until fixed
- Can clear the field to make it valid (empty is OK)

### 15. Optional Links - Empty Fields
**Expected:** Can submit with empty optional link fields

**Steps:**
1. Open task form
2. Don't fill any optional link fields
3. Create task

**Verify:**
- Task is created successfully
- All link fields are null in database
- No errors occur

### 16. Edit Existing Task - Preserve Fields
**Expected:** Existing task data loads correctly in edit mode

**Steps:**
1. Create a task with all fields populated
2. Save and close
3. Click Edit on the task
4. Verify all fields are pre-populated:
   - Campaign association and selection
   - Labels
   - Google folder
   - Optional links
5. Make no changes and save

**Verify:**
- All data is preserved
- No fields are cleared
- Attachments remain (if any were added)

### 17. Edit Existing Task - Modify Fields
**Expected:** Can modify all enhanced fields

**Steps:**
1. Open existing task for editing
2. Change campaign (toggle or selection)
3. Add/remove labels
4. Change Google folder URL
5. Modify optional links
6. Save

**Verify:**
- All changes are saved correctly
- Old values are replaced
- Task card reflects new data
- No duplicate entries in junction tables

### 18. Backward Compatibility - Old Tasks
**Expected:** Existing tasks (pre-migration) load without errors

**Steps:**
1. If you have tasks created before migration, open them
2. Verify they display correctly in task list
3. Open for editing
4. Verify form loads without errors

**Verify:**
- Old tasks display normally
- All new fields show as empty/null
- Can edit and add new fields to old tasks
- No console errors

### 19. Form Validation - Campaign Required
**Expected:** Campaign must be selected when association is "Yes"

**Steps:**
1. Open task form
2. Enter title
3. Set campaign association to "Yes"
4. Don't select a campaign
5. Try to submit

**Verify:**
- Validation error appears
- Form cannot be submitted
- Error message is clear

### 20. Loading States
**Expected:** Shows appropriate loading indicators

**Steps:**
1. Open task form with slow network (throttle in DevTools)
2. Observe loading states for:
   - Campaign dropdown
   - BD members dropdown
   - Labels dropdown
3. Submit form with attachments
4. Observe "Uploading..." state

**Verify:**
- Loading indicators appear
- Submit button is disabled during upload
- Success toast appears when complete

### 21. Error Handling - Network Failure
**Expected:** Graceful error handling on failure

**Steps:**
1. Disconnect network
2. Try to create a task
3. Reconnect and retry

**Verify:**
- Error toast appears with helpful message
- Form data is not lost
- Can retry successfully

### 22. Error Handling - Partial Upload Failure
**Expected:** Shows which files failed to upload

**Steps:**
1. Simulate upload failure (can be done by invalid storage bucket config temporarily)
2. Try to upload multiple files

**Verify:**
- Error indicates which files failed
- Can retry or remove failed files
- Successfully uploaded files remain

### 23. Task Card Display - All Fields
**Expected:** Task card shows all relevant information

**Steps:**
1. Create a task with all fields populated
2. View in task list

**Verify:**
- Status and priority badges visible
- Campaign badge (if associated)
- Label chips with colors
- Assignee avatar and name
- Due date
- Estimated hours
- Google folder icon
- Attachment count
- All information is readable and well-formatted

### 24. Task Card Display - Minimal Fields
**Expected:** Task card displays gracefully with only required fields

**Steps:**
1. Create a task with only title, status, priority
2. View in task list

**Verify:**
- Task displays correctly
- No empty sections or broken layout
- Optional field areas are hidden

### 25. Search and Filter Compatibility
**Expected:** New fields don't break existing search/filter

**Steps:**
1. Create several tasks with various field combinations
2. Use existing search functionality (if any)
3. Filter by status, priority, etc.

**Verify:**
- Search/filter still works
- Tasks with new fields appear correctly
- No console errors

## Database Verification Queries

Run these in Supabase SQL Editor to verify data integrity:

```sql
-- Check task with all fields
SELECT * FROM project_tasks 
WHERE is_campaign_associated = true 
LIMIT 1;

-- Verify labels junction table
SELECT pt.title, tl.name as label_name, tl.color
FROM project_tasks pt
JOIN project_task_labels ptl ON pt.id = ptl.task_id
JOIN task_labels tl ON ptl.label_id = tl.id
LIMIT 10;

-- Check attachments
SELECT pt.title, ta.file_name, ta.file_size
FROM project_tasks pt
JOIN task_attachments ta ON pt.id = ta.task_id
LIMIT 10;

-- Verify storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'task-files';

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('task_labels', 'project_task_labels', 'task_attachments');
```

## Performance Testing

1. **Large Dataset:** Create 50+ tasks with various field combinations
2. **Load Time:** Verify task list loads in < 2 seconds
3. **Form Response:** Verify form opens and responds quickly
4. **Attachment Upload:** Test upload of 5 files simultaneously

## Acceptance Criteria Checklist

- [ ] Campaign toggle works, dropdown appears/hides correctly
- [ ] Campaign selection validates when toggle = Yes
- [ ] Assignee dropdown shows BD members with "Unassigned" option
- [ ] Labels can be selected (multi-select) and created inline
- [ ] Google folder can be selected or URL pasted
- [ ] Google folder URL validation and ID extraction works
- [ ] Files can be uploaded via drag-drop or browse
- [ ] File upload shows progress and handles errors
- [ ] Optional links validate as URLs
- [ ] Existing tasks load and display without errors
- [ ] New tasks can be created with all combinations of fields
- [ ] Edit form pre-populates all new fields correctly
- [ ] TaskCard displays new fields appropriately
- [ ] All error states handled gracefully with user-friendly messages

## Known Limitations

1. Google Drive folder picker (OAuth flow) not implemented - only URL paste supported
2. Attachment preview not implemented - only file list
3. Task attachments are uploaded at task creation - no lazy upload
4. Label colors are auto-assigned (no manual color selection)
5. Campaign search requires 3+ characters to activate

## Next Steps

If all tests pass:
1. Deploy migration to staging/production
2. Monitor for any runtime errors
3. Gather user feedback
4. Consider implementing Google Drive OAuth picker
5. Add attachment preview functionality

