import { useCallback } from "react"

import type { Id } from "@/convex/_generated/dataModel"
import type { NoteVisibility } from "@/convex/lib/note_helpers"
import { useNoteVisibility } from "./use-note-visibility"
import { useCollaboratorManagement } from "./use-collaborator-management"

interface UseNoteSharingOptions {
  noteId: Id<"notes">
  noteTitle: string
  isOwner: boolean
  visibility: NoteVisibility
  onVisibilityChange: (visibility: NoteVisibility) => void
}

/**
 * Composition hook that combines visibility and collaborator management.
 * This hook maintains backward compatibility while using the split hooks internally.
 */
export function useNoteSharing({
  noteId,
  noteTitle,
  isOwner,
  visibility,
  onVisibilityChange,
}: UseNoteSharingOptions) {
  // Get collaborator management functionality
  const {
    shareData,
    shareQueryError,
    collaborators,
    handleAddCollaborator,
    handleUpdateCollaborator,
    handleRemoveCollaborator,
    registerManualRemoval,
  } = useCollaboratorManagement({
    noteId,
    noteTitle,
    isOwner,
    visibility,
    onVisibilityChange,
  })

  // Get visibility management functionality
  const { handleChangeVisibility: changeVisibility } = useNoteVisibility({
    noteId,
    visibility,
    onVisibilityChange,
    onPrivateConversion: (collaboratorIds) => {
      // Register manual removals when converting to private to suppress notifications
      collaboratorIds.forEach((id) => registerManualRemoval(id))
    },
  })

  // Wrap visibility change to pass collaborator IDs
  const handleChangeVisibility = useCallback(
    async (nextVisibility: NoteVisibility) => {
      const collaboratorIds = collaborators.map((c) => String(c.userId))
      await changeVisibility(nextVisibility, collaboratorIds)
    },
    [changeVisibility, collaborators],
  )

  return {
    shareData,
    shareQueryError,
    handleChangeVisibility,
    handleAddCollaborator,
    handleUpdateCollaborator,
    handleRemoveCollaborator,
  }
}
