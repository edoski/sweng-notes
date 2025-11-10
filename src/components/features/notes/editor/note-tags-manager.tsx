"use client"

import { NoteTagsSection } from "./note-tags-section"
import { useNoteDialog } from "@/contexts/note-dialog-context"
import { useEditorCore } from "./contexts/editor-core-context"
import { useEditorCollaboration } from "./contexts/editor-collaboration-context"

export function NoteTagsManager() {
  const { isDialogOpen, openDialog, closeDialog } = useNoteDialog()
  const { note, isOwner } = useEditorCore()
  const {
    tags,
    tagOptions,
    isTagSaving,
    handleAddTagToNote,
    handleRemoveSingleTag,
    handleCreateTag,
  } = useEditorCollaboration()

  return (
    <NoteTagsSection
      tags={tags}
      tagOptions={tagOptions}
      isOwner={isOwner}
      isTagSaving={isTagSaving}
      isDialogOpen={isDialogOpen(note.id, "tags")}
      onDialogOpenChange={(open) => (open ? openDialog(note.id, "tags") : closeDialog(note.id))}
      onAddTag={handleAddTagToNote}
      onRemoveTag={handleRemoveSingleTag}
      onCreateTag={handleCreateTag}
    />
  )
}