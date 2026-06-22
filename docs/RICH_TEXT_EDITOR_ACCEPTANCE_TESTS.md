# Rich Text Editor - Acceptance Tests

## Overview

This document outlines all acceptance tests for the Rich Text Editor feature. Each test must pass before considering the feature complete.

## Test Environment Setup

1. **Browser:** Latest Chrome/Firefox/Safari
2. **Screen Sizes:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
3. **Network:** Throttle to Fast 3G for performance tests
4. **Users:** At least 2 test users for mention testing

---

## Test Suite 1: Toolbar Actions

### Test 1.1: Bold Formatting

**Steps:**
1. Type "This is bold text" in editor
2. Select "bold text"
3. Click Bold button
4. Check live preview

**Expected:**
- Selected text becomes bold in editor
- Preview shows bold text
- HTML contains `<b>` or `<strong>` tags

**Status:** [ ] Pass [ ] Fail

---

### Test 1.2: Italic Formatting

**Steps:**
1. Type "This is italic text"
2. Select "italic text"
3. Click Italic button
4. Check live preview

**Expected:**
- Selected text becomes italic
- Preview shows italic text
- HTML contains `<i>` or `<em>` tags

**Status:** [ ] Pass [ ] Fail

---

### Test 1.3: Underline Formatting

**Steps:**
1. Type "This is underlined"
2. Select "underlined"
3. Click Underline button
4. Check live preview

**Expected:**
- Selected text is underlined
- Preview shows underline
- HTML contains `<u>` tag

**Status:** [ ] Pass [ ] Fail

---

### Test 1.4: Strikethrough Formatting

**Steps:**
1. Type "This is struck through"
2. Select "struck through"
3. Click Strikethrough button
4. Check live preview

**Expected:**
- Selected text has strikethrough
- Preview shows strikethrough
- HTML contains `<strike>` tag

**Status:** [ ] Pass [ ] Fail

---

### Test 1.5: Multiple Formatting

**Steps:**
1. Type "Bold and italic"
2. Select text
3. Click Bold
4. With selection, click Italic
5. Check preview

**Expected:**
- Text is both bold and italic
- Preview renders correctly
- HTML has nested tags

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 2: Font Size

### Test 2.1: Change Font Size on Selection

**Steps:**
1. Type "Large text here"
2. Select "Large text"
3. Open font size dropdown
4. Select "18px"
5. Check preview

**Expected:**
- Selected text size changes to 18px
- Preview shows larger text
- HTML has `style="font-size: 18px"`

**Status:** [ ] Pass [ ] Fail

---

### Test 2.2: Change Font Size at Caret

**Steps:**
1. Click in empty editor
2. Select "16px" from dropdown
3. Type "This is 16px"
4. Select "12px"
5. Type "This is 12px"

**Expected:**
- First text is 16px
- Second text is 12px
- Preview shows size differences

**Status:** [ ] Pass [ ] Fail

---

### Test 2.3: All Font Sizes Work

**Steps:**
1. Test each size: 12, 14, 16, 18
2. Check preview for each
3. Verify HTML

**Expected:**
- All sizes apply correctly
- Preview accurate
- No layout breaks

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 3: Lists

### Test 3.1: Create Bulleted List

**Steps:**
1. Click Bulleted List icon
2. Type "Item 1"
3. Press Enter
4. Type "Item 2"
5. Press Enter
6. Type "Item 3"

**Expected:**
- Bullet points appear
- Enter creates new item
- Preview shows bullets

**Status:** [ ] Pass [ ] Fail

---

### Test 3.2: Create Numbered List

**Steps:**
1. Click Numbered List icon
2. Type "First item"
3. Press Enter
4. Type "Second item"
5. Press Enter
6. Type "Third item"

**Expected:**
- Numbers appear (1, 2, 3)
- Auto-increment works
- Preview shows numbers

**Status:** [ ] Pass [ ] Fail

---

### Test 3.3: Exit List with Backspace

**Steps:**
1. Create bulleted list
2. Add 2 items
3. Press Enter for new item
4. Press Backspace on empty item

**Expected:**
- List exits
- Cursor returns to normal
- No bullet on next line

**Status:** [ ] Pass [ ] Fail

---

### Test 3.4: Nested Lists

**Steps:**
1. Create list
2. Tab to indent (if supported)
3. Check nesting

**Expected:**
- Nested items show correctly
- Preview renders nesting
- HTML has nested `<ul>`/`<ol>`

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 4: Link Insertion

### Test 4.1: Insert Link on Selection

**Steps:**
1. Type "Click here to visit site"
2. Select "visit site"
3. Click Link icon
4. Enter URL: "https://example.com"
5. Enter text: "visit site"
6. Check "Open in new tab"
7. Click Insert

**Expected:**
- Link created with correct text
- URL is href attribute
- target="_blank" and rel="noopener noreferrer"
- Preview shows clickable link

**Status:** [ ] Pass [ ] Fail

---

### Test 4.2: Insert Link Without Selection

**Steps:**
1. Click Link icon
2. Enter text: "Google"
3. Enter URL: "https://google.com"
4. Uncheck "Open in new tab"
5. Click Insert

**Expected:**
- Link inserted at cursor
- Text is "Google"
- No target attribute
- Preview shows link

**Status:** [ ] Pass [ ] Fail

---

### Test 4.3: URL Validation - Valid URLs

**Steps:**
1. Try URLs:
   - http://example.com
   - https://example.com
   - https://example.com/path?query=1
2. Each should work

**Expected:**
- All URLs accepted
- No error messages
- Links created successfully

**Status:** [ ] Pass [ ] Fail

---

### Test 4.4: URL Validation - Invalid URLs

**Steps:**
1. Try URLs:
   - example.com (no protocol)
   - ftp://example.com
   - javascript:alert('xss')
2. Try to insert

**Expected:**
- Error toast shows
- "Invalid URL" message
- Link not inserted

**Status:** [ ] Pass [ ] Fail

---

### Test 4.5: Edit Existing Link

**Steps:**
1. Create a link
2. Click on link in editor
3. Click Link icon
4. Dialog pre-fills with link data
5. Change URL
6. Click Update

**Expected:**
- Dialog shows current values
- Changes apply to link
- Preview updates

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 5: Image Insertion

### Test 5.1: Insert Image from URL

**Steps:**
1. Click Image icon
2. Select "URL" tab
3. Enter: "https://via.placeholder.com/150"
4. Alt text: "Placeholder"
5. Check preview appears
6. Click Insert

**Expected:**
- Image shows in editor
- Preview shows image
- Image has alt attribute
- maxWidth: 100%, height: auto

**Status:** [ ] Pass [ ] Fail

---

### Test 5.2: Insert Image from File Upload

**Steps:**
1. Click Image icon
2. Select "Upload" tab
3. Choose an image file (<5MB)
4. Wait for conversion
5. Check preview
6. Alt text: "Test image"
7. Click Insert

**Expected:**
- File converts to base64
- "Converting image..." message shows
- Preview appears
- Image inserts successfully

**Status:** [ ] Pass [ ] Fail

---

### Test 5.3: Image Upload - File Too Large

**Steps:**
1. Try to upload >5MB image
2. Check error

**Expected:**
- Error toast: "File too large"
- Image not uploaded
- Dialog stays open

**Status:** [ ] Pass [ ] Fail

---

### Test 5.4: Image Upload - Invalid File Type

**Steps:**
1. Try to upload .pdf file
2. Check error

**Expected:**
- Error toast: "Invalid file"
- File not accepted
- Dialog stays open

**Status:** [ ] Pass [ ] Fail

---

### Test 5.5: Image URL Validation

**Steps:**
1. Try invalid URLs:
   - example.com/image.jpg (no protocol)
   - ftp://site.com/img.png
2. Try to insert

**Expected:**
- Error toast shown
- Image not inserted

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 6: Undo/Redo

### Test 6.1: Undo Text Entry

**Steps:**
1. Type "Hello world"
2. Click Undo button
3. Click Undo again

**Expected:**
- Each undo removes last action
- Editor content reverts
- Preview updates

**Status:** [ ] Pass [ ] Fail

---

### Test 6.2: Redo Text Entry

**Steps:**
1. Type "Test"
2. Undo
3. Click Redo button

**Expected:**
- Redo restores text
- Matches original state

**Status:** [ ] Pass [ ] Fail

---

### Test 6.3: Undo/Redo with Formatting

**Steps:**
1. Type "Text"
2. Bold it
3. Undo (removes bold)
4. Undo (removes text)
5. Redo twice

**Expected:**
- Each undo/redo works
- Formatting preserved

**Status:** [ ] Pass [ ] Fail

---

### Test 6.4: Undo/Redo Limits

**Steps:**
1. Perform 60+ actions
2. Try to undo all

**Expected:**
- Can undo up to 50
- Undo button disables at limit
- No errors

**Status:** [ ] Pass [ ] Fail

---

### Test 6.5: Keyboard Shortcuts

**Steps:**
1. Type text
2. Press Ctrl+Z / Cmd+Z
3. Press Ctrl+Y / Cmd+Y

**Expected:**
- Undo works
- Redo works
- Same as button clicks

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 7: Keyboard Shortcuts

### Test 7.1: Bold Shortcut

**Steps:**
1. Type "bold"
2. Select "bold"
3. Press Ctrl+B / Cmd+B

**Expected:**
- Text becomes bold
- Same as clicking button

**Status:** [ ] Pass [ ] Fail

---

### Test 7.2: Italic Shortcut

**Steps:**
1. Select text
2. Press Ctrl+I / Cmd+I

**Expected:**
- Text becomes italic

**Status:** [ ] Pass [ ] Fail

---

### Test 7.3: Underline Shortcut

**Steps:**
1. Select text
2. Press Ctrl+U / Cmd+U

**Expected:**
- Text underlined

**Status:** [ ] Pass [ ] Fail

---

### Test 7.4: Strikethrough Shortcut

**Steps:**
1. Select text
2. Press Ctrl+Shift+S / Cmd+Shift+S

**Expected:**
- Text struck through

**Status:** [ ] Pass [ ] Fail

---

### Test 7.5: All Shortcuts Together

**Steps:**
1. Test each shortcut
2. Verify all work

**Expected:**
- No conflicts
- All work as expected

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 8: Live Preview

### Test 8.1: Preview Updates on Typing

**Steps:**
1. Start typing "Hello world"
2. Watch preview

**Expected:**
- Preview updates in real-time
- No lag (< 100ms)
- No button needed

**Status:** [ ] Pass [ ] Fail

---

### Test 8.2: Preview Shows Formatting

**Steps:**
1. Bold some text
2. Italic other text
3. Add link
4. Insert image
5. Check preview

**Expected:**
- All formatting visible
- Links clickable in preview
- Images show
- Matches editor

**Status:** [ ] Pass [ ] Fail

---

### Test 8.3: Preview Sanitizes HTML

**Steps:**
1. Try to paste: `<script>alert('xss')</script>`
2. Check preview
3. Check final HTML

**Expected:**
- Script tags removed
- No alert executes
- Preview safe

**Status:** [ ] Pass [ ] Fail

---

### Test 8.4: Preview Font Sizes

**Steps:**
1. Add text in multiple sizes
2. Check preview

**Expected:**
- Font sizes match editor
- No layout breaks

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 9: Placeholder

### Test 9.1: Placeholder Shows When Empty

**Steps:**
1. Open fresh editor
2. Check placeholder text

**Expected:**
- "Type here... Use @ to mention someone" visible
- Gray color
- Disappears on focus

**Status:** [ ] Pass [ ] Fail

---

### Test 9.2: Placeholder Hides When Typing

**Steps:**
1. Click in editor
2. Type one character

**Expected:**
- Placeholder disappears
- Text appears

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 10: XSS Protection

### Test 10.1: Script Tags Removed

**Steps:**
1. Try HTML: `<b>Bold</b><script>alert('XSS')</script>`
2. Post comment
3. Check rendered output

**Expected:**
- Bold works
- Script removed
- No alert

**Status:** [ ] Pass [ ] Fail

---

### Test 10.2: Event Handlers Removed

**Steps:**
1. Try: `<a href="#" onclick="alert('XSS')">Click</a>`
2. Post comment
3. Click link

**Expected:**
- Link works
- onclick removed
- No alert

**Status:** [ ] Pass [ ] Fail

---

### Test 10.3: Dangerous Protocols Blocked

**Steps:**
1. Try link: `javascript:alert('XSS')`
2. Try to insert
3. Check result

**Expected:**
- Error or removed
- No execution

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 11: Responsive Design

### Test 11.1: Desktop Layout (>1024px)

**Steps:**
1. Open on desktop
2. Check toolbar
3. Check editor size

**Expected:**
- Toolbar single line
- All buttons visible
- Editor full width
- Preview side-by-side

**Status:** [ ] Pass [ ] Fail

---

### Test 11.2: Tablet Layout (768-1024px)

**Steps:**
1. Resize to tablet size
2. Check toolbar wrapping
3. Test all functions

**Expected:**
- Toolbar may wrap
- All buttons accessible
- Touch targets adequate (44px)
- Editor responsive

**Status:** [ ] Pass [ ] Fail

---

### Test 11.3: Mobile Layout (<768px)

**Steps:**
1. Resize to mobile
2. Test toolbar
3. Type in editor
4. Test all features

**Expected:**
- Toolbar stacks/wraps
- Buttons touch-friendly
- Editor full width
- Preview below editor
- All features work

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 12: Error Handling

### Test 12.1: Invalid Link URL

**Steps:**
1. Try bad URL
2. Check error

**Expected:**
- Toast: "Invalid URL"
- Variant: destructive (red)
- Dialog stays open

**Status:** [ ] Pass [ ] Fail

---

### Test 12.2: Image Upload Failure

**Steps:**
1. Simulate upload error
2. Check handling

**Expected:**
- Toast: "Upload failed"
- User can retry
- No crash

**Status:** [ ] Pass [ ] Fail

---

### Test 12.3: Network Errors

**Steps:**
1. Disable network
2. Try operations
3. Re-enable

**Expected:**
- Graceful handling
- User informed
- Can recover

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 13: Disabled State

### Test 13.1: Disabled During Submission

**Steps:**
1. Fill comment
2. Click Post
3. Try to edit during submission

**Expected:**
- Editor disabled
- Toolbar buttons disabled
- No changes possible
- "Uploading" or spinner shown

**Status:** [ ] Pass [ ] Fail

---

### Test 13.2: Disabled During Image Upload

**Steps:**
1. Upload large image
2. Try to edit

**Expected:**
- Editor grayed out
- Toolbar disabled
- "Converting image..." shown

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 14: Character Limit

### Test 14.1: Counter Updates

**Steps:**
1. Type text
2. Watch counter

**Expected:**
- Counter decrements
- Shows remaining
- Updates real-time

**Status:** [ ] Pass [ ] Fail

---

### Test 14.2: Over Limit Prevents Post

**Steps:**
1. Type 4001+ characters
2. Try to post

**Expected:**
- Counter red
- Toast: "Character limit reached"
- Post button disabled

**Status:** [ ] Pass [ ] Fail

---

### Test 14.3: Limit Includes HTML Tags

**Steps:**
1. Add formatting
2. Check if HTML counts

**Expected:**
- Only text content counts
- Tags don't count toward limit

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 15: Integration Tests

### Test 15.1: Post Comment with Formatting

**Steps:**
1. Format comment with bold, italic, link
2. Add mention
3. Post comment
4. Refresh page
5. Check comment

**Expected:**
- Comment saved
- Formatting preserved
- Mention works
- HTML sanitized

**Status:** [ ] Pass [ ] Fail

---

### Test 15.2: Edit Comment

**Steps:**
1. Post formatted comment
2. Click Edit
3. RichTextEditor opens
4. Make changes
5. Save

**Expected:**
- Editor loads with HTML
- Changes save
- Formatting preserved
- "edited" label appears

**Status:** [ ] Pass [ ] Fail

---

### Test 15.3: Backward Compatibility

**Steps:**
1. Find old plain-text comment
2. View it
3. Try to edit

**Expected:**
- Plain text displays
- Can edit with rich editor
- Mentions still work

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 16: Accessibility

### Test 16.1: Keyboard Navigation

**Steps:**
1. Tab through toolbar
2. Check focus indicators
3. Activate with Enter/Space

**Expected:**
- All buttons reachable
- Focus visible
- Keyboard operable

**Status:** [ ] Pass [ ] Fail

---

### Test 16.2: ARIA Labels

**Steps:**
1. Inspect toolbar buttons
2. Check aria-label attributes
3. Test with screen reader

**Expected:**
- All buttons labeled
- Labels descriptive
- Screen reader friendly

**Status:** [ ] Pass [ ] Fail

---

### Test 16.3: Tooltips

**Steps:**
1. Hover each button
2. Check tooltip appears

**Expected:**
- Tooltips show
- Include keyboard shortcut
- Clear and helpful

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 17: Performance

### Test 17.1: Typing Performance

**Steps:**
1. Throttle CPU (4x slowdown)
2. Type continuously
3. Measure lag

**Expected:**
- Typing smooth
- No lag (< 50ms)
- Preview updates quickly

**Status:** [ ] Pass [ ] Fail

---

### Test 17.2: Large Content

**Steps:**
1. Paste 3000 characters
2. Add formatting
3. Check performance

**Expected:**
- No slowdown
- Preview renders quickly
- Undo/redo fast

**Status:** [ ] Pass [ ] Fail

---

### Test 17.3: Multiple Images

**Steps:**
1. Insert 5 images
2. Type between them
3. Check performance

**Expected:**
- Editor responsive
- No lag
- Images load

**Status:** [ ] Pass [ ] Fail

---

## Test Suite 18: Content Persistence

### Test 18.1: Clear Button

**Steps:**
1. Type content
2. Click Clear
3. Check editor

**Expected:**
- Content removed
- Editor empty
- Preview empty
- Counter resets

**Status:** [ ] Pass [ ] Fail

---

### Test 18.2: Post Clears Editor

**Steps:**
1. Type and post comment
2. Check editor after post

**Expected:**
- Editor clears
- Ready for new comment
- Counter resets

**Status:** [ ] Pass [ ] Fail

---

## Summary Report

**Total Tests:** 90
**Passed:** ___
**Failed:** ___
**Skipped:** ___

**Pass Rate:** ___%

**Critical Failures:** (List any)

**Notes:**

---

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
**Browser:** _______________
**Version:** _______________

---

## Sign-Off

**Developer:** _______________ Date: _______
**QA:** _______________ Date: _______
**Product Owner:** _______________ Date: _______

---

**Status:**
- [ ] Ready for Production
- [ ] Needs Fixes
- [ ] Requires Retesting
