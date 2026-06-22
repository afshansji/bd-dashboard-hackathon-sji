# Rich Text Editor for Task Comments - User Guide

## Overview

The task comment system now features a comprehensive Rich Text Editor with live preview, allowing users to format their comments with various styling options, insert links and images, and see changes in real-time.

## Features

### Text Formatting

- **Bold** - Make text stand out with bold formatting
- **Italic** - Emphasize text with italic style
- **Underline** - Underline important text
- **Strikethrough** - Strike through text for corrections or deletions

#### How to Use:

**Toolbar Method:**
1. Select text you want to format
2. Click the appropriate formatting button in the toolbar
3. Or click the button without selection to insert placeholder text

**Keyboard Shortcuts:**
- **Ctrl/Cmd + B** - Bold
- **Ctrl/Cmd + I** - Italic
- **Ctrl/Cmd + U** - Underline
- **Ctrl/Cmd + Shift + S** - Strikethrough

### Font Size

Change the size of your text to emphasize or de-emphasize content.

**Available Sizes:** 12px, 14px (default), 16px, 18px

**How to Use:**
1. Select the text you want to resize
2. Click the font size dropdown in the toolbar
3. Choose your desired size

### Lists

Create organized bullet points or numbered lists.

**How to Use:**
- **Bulleted List** - Click the bullet list icon
- **Numbered List** - Click the numbered list icon
- Press **Enter** to create a new list item
- Press **Backspace** at the start of an empty item to exit the list

### Links

Insert hyperlinks with the option to open in a new tab.

**How to Use:**
1. Select text to convert to a link (optional)
2. Click the link icon in the toolbar
3. In the dialog:
   - Enter **Link Text** (what users see)
   - Enter **URL** (must start with http:// or https://)
   - Check **"Open in new tab"** if desired
4. Click **Insert** or **Update**

**URL Validation:**
- URLs must start with http:// or https://
- Invalid URLs will show an error message

**Editing Links:**
- Click on a link in the editor
- Click the link icon again
- The dialog will open with current values
- Modify and click **Update**

### Images

Insert images from a URL or upload from your device.

**How to Use:**

**From URL:**
1. Click the image icon in the toolbar
2. Select **URL** tab
3. Enter the image URL (must start with http:// or https://)
4. Optionally add **Alt Text** for accessibility
5. Preview appears if URL is valid
6. Click **Insert**

**From File Upload:**
1. Click the image icon in the toolbar
2. Select **Upload** tab
3. Click **Choose File** and select an image
4. Image is converted to base64 (max 5MB)
5. Optionally add **Alt Text**
6. Preview appears after conversion
7. Click **Insert**

**Supported Formats:**
- JPG, JPEG
- PNG
- GIF
- WebP
- SVG

**Size Limit:** 5MB per image

### Undo/Redo

Revert or reapply changes to your comment.

**How to Use:**
- **Undo** - Click the undo icon or press **Ctrl/Cmd + Z**
- **Redo** - Click the redo icon or press **Ctrl/Cmd + Y** or **Ctrl/Cmd + Shift + Z**

**History:**
- Up to 50 actions are saved
- History is lost when you submit or clear the comment

### Live Preview

See exactly how your comment will look as you type.

**Features:**
- Updates automatically as you type
- Shows formatted text, links, images
- Sanitized to prevent XSS attacks
- Same styling as final comment

**How It Works:**
- Preview appears below the editor
- Updates in real-time
- No button click required
- Uses DOMPurify for security

### @ Mentions

Tag team members in your comments.

**How to Use:**
1. Type **@** anywhere in your comment
2. A dropdown appears with team members
3. Type to search by name
4. Click a name or press Enter to select
5. Mention is inserted: **@[Name]**
6. Tagged users receive notifications

**Features:**
- Search by typing after @
- Keyboard navigation (Arrow keys, Enter)
- Works with all formatting options
- Preserved when editing comments

### Character Limit

Comments have a maximum length of **4000 characters**.

**Counter Display:**
- Shows remaining characters in toolbar
- Turns red when limit exceeded
- Post button disabled when over limit

## User Interface

### Toolbar Layout

```
[B] [I] [U] [S] | [12px ▼] | [≡] [1.] | [🔗] [🖼] | [↶] [↷] | 2000 chars
```

**Sections (left to right):**
1. **Text Formatting** - Bold, Italic, Underline, Strikethrough
2. **Font Size** - Dropdown selector
3. **Lists** - Bullet and numbered lists
4. **Media** - Links and images
5. **History** - Undo and redo
6. **Counter** - Remaining characters

### Tooltips

Hover over any button to see:
- Button name
- Keyboard shortcut (if available)

### Accessibility

- All buttons have **aria-label** attributes
- Tooltips provide context
- Keyboard navigation supported
- Screen reader friendly

## Mobile Responsive

The editor adapts to different screen sizes:

**Desktop (>1024px):**
- Full toolbar on one line
- Larger editor area
- Side-by-side preview

**Tablet (768px-1024px):**
- Toolbar may wrap to two lines
- Adequate touch targets

**Mobile (<768px):**
- Toolbar stacks vertically
- Full-width editor
- Preview below editor
- Touch-optimized buttons

## Editing Comments

You can edit your own comments to fix typos or add information.

**How to Edit:**
1. Find your comment
2. Click the **Edit** icon (pencil)
3. Rich text editor opens with current content
4. Make your changes using all formatting tools
5. Click **Save** or **Cancel**

**Notes:**
- Only your own comments can be edited
- Editing preserves all formatting
- Live preview shows changes
- "edited" label appears on comment

## Security

### XSS Protection

All comments are sanitized using **DOMPurify** to prevent cross-site scripting attacks.

**Allowed HTML:**
- Basic formatting tags (b, i, u, strike, strong, em)
- Links (a) with href
- Images (img) with src and alt
- Lists (ul, ol, li)
- Structure tags (p, div, span)

**Blocked:**
- Script tags
- Event handlers (onclick, etc.)
- Dangerous protocols (javascript:, data: for links)
- Iframe, object, embed tags

### Safe Image Handling

**URL Images:**
- Must use http:// or https:// protocol
- Validated before insertion

**Uploaded Images:**
- Converted to base64 data URIs
- Stored in comment content
- No external hosting required
- Size limited to 5MB

## Best Practices

### Formatting

1. **Use formatting sparingly** - Don't overuse bold/italic
2. **Font size** - Keep text readable (14-16px for body)
3. **Lists** - Use for multiple related items
4. **Links** - Use descriptive text, not "click here"
5. **Images** - Optimize size before uploading

### Content

1. **Be clear and concise** - Get to the point quickly
2. **Use @ mentions** - Tag relevant people
3. **Add links** - Provide references and resources
4. **Structure content** - Use lists for organization
5. **Proofread** - Check preview before posting

### Performance

1. **Optimize images** - Resize before uploading
2. **Limit embeds** - Don't add too many images
3. **Keep it short** - Long comments slow loading
4. **Use external links** - For large files

## Keyboard Shortcuts Reference

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | Ctrl + B | Cmd + B |
| Italic | Ctrl + I | Cmd + I |
| Underline | Ctrl + U | Cmd + U |
| Strikethrough | Ctrl + Shift + S | Cmd + Shift + S |
| Undo | Ctrl + Z | Cmd + Z |
| Redo | Ctrl + Y | Cmd + Y |
| Redo (Alt) | Ctrl + Shift + Z | Cmd + Shift + Z |
| Submit (in edit) | Ctrl + Enter | Cmd + Enter |
| Cancel (in edit) | Esc | Esc |

## Troubleshooting

### Editor Not Loading

**Symptoms:** Editor appears as plain text box

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Check browser console for errors
4. Ensure JavaScript is enabled

### Formatting Not Applying

**Symptoms:** Clicked formatting button but nothing happened

**Solutions:**
1. Select text first, then click button
2. Click button to insert placeholder, then type
3. Check if browser supports contentEditable
4. Try different browser

### Images Not Displaying

**Symptoms:** Image icon shows but no image

**Solutions:**
1. Check URL is valid and starts with http/https
2. Verify image file size is under 5MB
3. Ensure image URL is accessible
4. Try different image format

### Link Not Opening

**Symptoms:** Link shows but doesn't work

**Solutions:**
1. Check URL includes http:// or https://
2. Verify URL is valid
3. Check if "Open in new tab" is set correctly
4. Try clicking again

### Preview Not Updating

**Symptoms:** Preview doesn't match editor content

**Solutions:**
1. Keep typing - preview updates as you type
2. Refresh the page if stuck
3. Check browser console for errors

### Character Limit Error

**Symptoms:** Can't post comment, counter is red

**Solutions:**
1. Reduce comment length
2. Remove unnecessary formatting (saves characters)
3. Use external links instead of embedding content
4. Split into multiple comments if needed

## Examples

### Basic Formatted Comment

```
Hey @[John Doe], great work on the feature!

A few **important** things to note:
• Performance looks good
• UI needs *minor* adjustments
• Documentation is ~~missing~~ added

Check out [the design](https://example.com/design) for reference.
```

### Comment with Image

```
Here's a screenshot of the bug:

[Image embedded]

As you can see, the button is misaligned. This happens on mobile devices.
```

### Structured Comment

```
**Summary:** Bug in login flow

**Steps to Reproduce:**
1. Navigate to login page
2. Enter credentials
3. Click "Login"
4. Error appears

**Expected:** User logs in successfully
**Actual:** Error message displayed

@[Support Team] please investigate ASAP.
```

## FAQ

**Q: Can I use HTML directly in comments?**
A: No, use the toolbar to format. Direct HTML is sanitized for security.

**Q: Are my edits saved automatically?**
A: No, you must click "Save" to save edits. Drafts are not auto-saved.

**Q: Can I copy-paste formatted text?**
A: Yes, but formatting may be partially preserved. Recommended to reformat using toolbar.

**Q: What happens to old plain-text comments?**
A: They display correctly. The editor is backward compatible.

**Q: Can I embed videos?**
A: No, only images and links. Link to video hosting sites instead.

**Q: Is there a dark mode for the editor?**
A: Yes, the editor respects your system/app dark mode setting.

**Q: Can I use markdown syntax?**
A: No, the editor uses a visual approach. Use toolbar for formatting.

**Q: How do I report bugs?**
A: Use the feedback system or contact your administrator.

## Technical Details

### Components

- **RichTextEditor** - Main editor component
- **CommentComposer** - Wrapper for posting comments
- **CommentItem** - Displays individual comments
- **SafeHtmlContent** - Renders sanitized HTML
- **MentionDropdown** - @ mention selector

### Dependencies

- **DOMPurify** - HTML sanitization
- **Lucide React** - Icon library
- **Radix UI** - Accessible components
- **TailwindCSS** - Styling

### Browser Compatibility

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limited Support:**
- IE 11 (no contentEditable features)

### Performance

- **Initial Load:** <100ms
- **Typing Latency:** <16ms (60fps)
- **Preview Update:** Real-time
- **Image Upload:** Depends on size
- **Max History:** 50 actions

---

## Summary Checklist

- [ ] Understand text formatting options (Bold, Italic, Underline, Strikethrough)
- [ ] Know how to change font size
- [ ] Can create bulleted and numbered lists
- [ ] Can insert links with validation
- [ ] Can insert images from URL or upload
- [ ] Understand undo/redo functionality
- [ ] Know keyboard shortcuts
- [ ] Use @ mentions to tag team members
- [ ] Understand live preview feature
- [ ] Know character limits
- [ ] Can edit your own comments
- [ ] Understand security features
- [ ] Follow best practices

---

**Last Updated:** January 15, 2026
**Feature Version:** 2.0
**Document Version:** 1.0
