import { useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { notify } from "@/lib/notifications"

/**
 * Simplified version of useWorkspaceActions for Sprint 3
 * Uses Convex mutations for note operations only (no tag management)
 */

interface UseWorkspaceActionsParams {
  openNote: (noteId: string) => void
  closeNote: (noteId: string) => void
}

export function useWorkspaceActions({
  openNote,
  closeNote,
}: UseWorkspaceActionsParams) {
  // Convex mutations
  const createNoteMutation = useMutation(api.notes.create)
  const updateNoteMutation = useMutation(api.notes.update)
  const duplicateNoteMutation = useMutation(api.notes.duplicate)
  const removeNoteMutation = useMutation(api.notes.remove)

  // Create note
  const createNote = useCallback(
    async (data: { title: string; content: string; tags: string[] }) => {
      try {
        const noteId = await createNoteMutation({
          title: data.title,
          content: data.content,
          tags: data.tags,
          visibility: "private", // Default to private in Sprint 3
        })
        notify({
          type: "note.saved",
          level: "success",
          message: "Note created successfully",
        })
        // Open the newly created note
        openNote(noteId)
      } catch (error) {
        notify(error, "Failed to create note")
      }
    },
    [createNoteMutation, openNote]
  )

  // Save note
  const saveNote = useCallback(
    async (
      noteId: string,
      changes: {
        title?: string
        content?: string
        tags?: string[]
        visibility?: "private" | "public"
      }
    ) => {
      try {
        await updateNoteMutation({
          noteId: noteId as Id<"notes">,
          ...changes,
        })
        notify({
          type: "note.saved",
          level: "success",
          message: "Note saved",
        })
      } catch (error) {
        notify(error, "Failed to save note")
      }
    },
    [updateNoteMutation]
  )

  // Duplicate note
  const duplicateNote = useCallback(
    async (noteId: string) => {
      try {
        const duplicateId = await duplicateNoteMutation({
          noteId: noteId as Id<"notes">,
        })
        notify({
          type: "note.duplicated",
          level: "success",
          message: "Note duplicated",
        })
        // Open the duplicate
        openNote(duplicateId)
      } catch (error) {
        notify(error, "Failed to duplicate note")
      }
    },
    [duplicateNoteMutation, openNote]
  )

  // Delete note
  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        await removeNoteMutation({
          noteId: noteId as Id<"notes">,
        })
        notify({
          type: "note.deleted",
          level: "success",
          message: "Note deleted",
        })
        // Close the tab
        closeNote(noteId)
      } catch (error) {
        notify(error, "Failed to delete note")
      }
    },
    [removeNoteMutation, closeNote]
  )


  // Open note dialog (placeholder for Sprint 3)
  const openNoteDialog = useCallback((_noteId: string, _dialogType: string) => {
    console.log("Note dialogs not implemented in Sprint 3")
  }, [])

  return {
    createNote,
    saveNote,
    duplicateNote,
    deleteNote,
    openNoteDialog,
  }
}
