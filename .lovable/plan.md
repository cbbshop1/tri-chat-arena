

## Plan: Add Delete Button to Knowledge Preview Dialog

The delete button exists on the card but gets clipped by the narrow sidebar. The simplest fix: add a Delete button to the preview dialog that opens when you click the card.

### File: `src/components/chat/KnowledgeManager.tsx`

**Change:** Add a Delete button next to the existing Edit button in the preview dialog footer (lines 228-247).

The footer currently has Edit and Close buttons. Add a destructive Delete button:

```
<Button
  variant="destructive"
  onClick={() => {
    if (previewItem) {
      handleDelete(previewItem.id);
      setIsPreviewOpen(false);
    }
  }}
  className="gap-2"
>
  <Trash2 className="w-4 h-4" />
  Delete
</Button>
```

This goes before the Edit button in the footer row, giving users a clear, always-visible way to delete items.

