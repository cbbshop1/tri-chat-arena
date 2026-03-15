

## Plan: Fix Knowledge Card Layout and Add Attach Knowledge Button

### Problem
The knowledge cards have 3 action buttons (Eye, Edit, Trash2) in a horizontal row that overflows on narrow sidebar widths. The buttons get clipped, making Delete invisible.

### Changes

**File: `src/components/chat/KnowledgeManager.tsx`**

1. **Fix card layout** (lines 277-326): Restructure the card to stack the action buttons vertically or move them below the content. Replace the current side-by-side layout with a bottom-row layout:
   - Remove the `flex items-start justify-between` wrapper
   - Show title and content as full-width
   - Place action buttons in a bottom row with `flex justify-end` so they never get clipped
   - Keep all 3 buttons (Eye, Edit, Trash2) but ensure they fit

2. **Simplify buttons**: Remove the Eye/Preview button since clicking the card already opens preview. This leaves only Edit and Delete -- fewer buttons, less overflow.

**File: `src/components/chat/ChatInterface.tsx`**

3. **Add "Attach Knowledge" button** next to the Paperclip button in the input area:
   - Add `knowledgePickerOpen` state
   - Import `Popover`, `PopoverTrigger`, `PopoverContent`, `Checkbox`, `BookOpen`
   - Add a `toggleKnowledgeAttachment` helper function
   - Place a BookOpen icon button that opens a Popover with checkboxes for each knowledge item
   - Apply to both mobile and desktop input areas

