# Plan: Add Priority Column Sorting to Feedback Manager

## Overview
Add sortable Priority column to the feedback table at `/adminpanel/feedback` that allows users to click the column heading to sort by priority.

## Requirements
- Click on "Priority" column header to toggle sorting
- Visual indicator (arrow icon) showing sort direction
- Sort order: High → Medium → Low → None (descending), reverse for ascending
- Maintain current tab and filter functionality
- Client-side sorting (data already loaded)

## Implementation Steps

### 1. Add Sorting State
**File**: `src/pages/admin/FeedbackManager.tsx`

Add state for:
- `sortColumn`: Track which column is being sorted (initially null or 'priority')
- `sortDirection`: Track 'asc' or 'desc' or null

### 2. Add Priority Sorting Logic
**File**: `src/pages/admin/FeedbackManager.tsx`

Create sorting function:
- Define priority order weights: `{ high: 3, medium: 2, low: 1, null: 0 }`
- Sort array based on priority weights
- Handle null/undefined priority values
- Apply sorting before rendering table rows

### 3. Update Table Header
**File**: `src/pages/admin/FeedbackManager.tsx`

Make Priority column header clickable:
- Add click handler to toggle sort direction
- Add visual indicator (ChevronUp/ChevronDown icon from lucide-react)
- Add cursor-pointer and hover styles
- Show active state when sorted

### 4. Apply Sorting to Data
**File**: `src/pages/admin/FeedbackManager.tsx`

- Sort `listItems` array before mapping to table rows
- Preserve original order when sort is cleared
- Maintain sort when switching between filters

## Technical Details

### Priority Weight Mapping
```typescript
const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
  null: 0
};
```

### Sort Logic (Descending - High to Low)
```typescript
items.sort((a, b) => {
  const weightA = a.priority ? PRIORITY_WEIGHTS[a.priority] : 0;
  const weightB = b.priority ? PRIORITY_WEIGHTS[b.priority] : 0;
  return weightB - weightA; // descending
});
```

### UI Changes
- Add icons: `import { ChevronUp, ChevronDown } from "lucide-react"`
- Column header becomes clickable button
- Show arrow icon based on sort direction
- Highlight active sort column

## Files to Modify
1. `src/pages/admin/FeedbackManager.tsx` - Main implementation

## Expected Behavior
1. Initial load: No sorting (default server order by created_at desc)
2. First click: Sort by priority descending (High → Medium → Low → None)
3. Second click: Sort by priority ascending (None → Low → Medium → High)
4. Third click: Clear sorting (back to default order)

## Testing Checklist
- [ ] Click Priority header toggles sorting
- [ ] Visual indicator (arrow) shows correctly
- [ ] High priority items appear first when sorted descending
- [ ] Items with no priority appear last when sorted descending
- [ ] Sorting persists when changing status filters
- [ ] Sorting resets when changing tabs
- [ ] Works with empty/loading states




