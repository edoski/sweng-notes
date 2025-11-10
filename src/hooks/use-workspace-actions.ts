import { useCallback } from "react"
import { notify } from "@/lib/notifications"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Note } from "@/convex/lib/note_helpers"
import type { NoteDialogType } from "@/contexts/note-dialog-context"
import { useNoteDialog } from "@/contexts/note-dialog-context"

interface UseWorkspaceActionsParams {
  openNote: (noteId: string) => void
  closeNote: (noteId: string) => void
  addToTabs: (noteId: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void
  registerManualLeave?: (noteId: Id<"notes">) => void
}

export function useWorkspaceActions({
  openNote,
  closeNote,
  addToTabs,
  selectedTags,
  setSelectedTags,
  registerManualLeave,
}: UseWorkspaceActionsParams) {
  const { openDialog } = useNoteDialog()

  // Mutations
  const createNoteMutation = useMutation(api.notes.mutations.create)
  const updateNoteMutation = useMutation(api.notes.mutations.update)
  const deleteNoteMutation = useMutation(api.notes.mutations.remove)
  const duplicateNoteMutation = useMutation(api.notes.mutations.duplicate)
  const createTagMutation = useMutation(api.tags.create)
  const deleteTagMutation = useMutation(api.tags.remove)
  const renameTagMutation = useMutation(api.tags.rename)

  /**
   * Creates a new note and opens it in the editor.
   *
   * Error handling pattern: Notify user of error then re-throw to preserve promise rejection chain.
   * This allows calling code (e.g., dialogs) to catch errors and preserve form state.
   *
   * @param input - Note creation parameters
   * @throws Re-throws error after notification to allow caller to handle failure
   *
   * @example
   * ```tsx
   * try {
   *   await createNote({ title: "New Note", content: "", tags: [] })
   *   // Success: dialog closes automatically when URL updates
   * } catch (err) {
   *   // Error: dialog stays open, form data preserved, user can retry
   * }
   * ```
   */
  const handleCreateNote = useCallback(
    async (input: { title?: string; content?: string; tags?: string[] }) => {
      try {
        const created = await createNoteMutation({
          title: input.title ?? "",
          content: input.content ?? "",
          tags: input.tags ?? [],
          visibility: "private",
        })
        if (created) {
          openNote(created.id as unknown as string)
        }
      } catch (err) {
        notify(err, "Failed to create note")
        throw err  // Re-throw to preserve promise rejection chain
      }
    },
    [createNoteMutation, openNote],
  )

  /**
   * Saves changes to an existing note.
   *
   * Error handling pattern: Notify user of error then re-throw to preserve promise rejection chain.
   * This allows calling code to handle save failures (e.g., prevent state updates, show retry UI).
   *
   * @param noteId - Note ID to update
   * @param changes - Fields to update (title, content, tags, visibility)
   * @param options - Save options (saveVersion creates a snapshot)
   * @throws Re-throws error after notification to allow caller to handle failure
   */
  const handleSaveNote = useCallback(
    async (
      noteId: string,
      changes: Partial<Pick<Note, "title" | "content" | "tags" | "visibility">>,
      options?: { saveVersion?: boolean },
    ) => {
      try {
        await updateNoteMutation({
          noteId: noteId as unknown as Id<"notes">,
          ...changes,
          ...options,
        })
      } catch (err) {
        notify(err, "Failed to save note")
        throw err  // Re-throw to preserve promise rejection chain
      }
    },
    [updateNoteMutation],
  )

  const handleDuplicateNote = useCallback(
    async (noteId: string) => {
      try {
        const duplicated = await duplicateNoteMutation({ noteId: noteId as unknown as Id<"notes"> })
        if (duplicated) {
          notify({ type: "note.duplicated", level: "success", message: "Note duplicated successfully." })
          openNote(duplicated.id as unknown as string)
        }
      } catch (err) {
        notify(err, "Failed to duplicate note")
      }
    },
    [duplicateNoteMutation, openNote],
  )

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        registerManualLeave?.(noteId as unknown as Id<"notes">)
        const result = await deleteNoteMutation({ noteId: noteId as unknown as Id<"notes"> })
        const message = result.status === "deleted" ? "Note deleted." : "You left the note."
        notify({ type: "note.deleted", level: "success", message })
        closeNote(noteId)
      } catch (err) {
        notify(err, "Failed to delete note")
      }
    },
    [deleteNoteMutation, closeNote, registerManualLeave],
  )

  const handleOpenNoteDialog = useCallback(
    (noteId: string, dialogType: NoteDialogType) => {
      addToTabs(noteId)
      openDialog(noteId, dialogType)
    },
    [addToTabs, openDialog],
  )

  const handleRenameTag = useCallback(
    async (oldName: string, newName: string) => {
      if (!newName || oldName === newName) {
        return
      }
      await renameTagMutation({ fromName: oldName, toName: newName })
      if (selectedTags.includes(oldName)) {
        setSelectedTags(selectedTags.map((tag) => (tag === oldName ? newName : tag)))
      }
    },
    [renameTagMutation, selectedTags, setSelectedTags],
  )

  return {
    createNote: handleCreateNote,
    saveNote: handleSaveNote,
    duplicateNote: handleDuplicateNote,
    deleteNote: handleDeleteNote,
    openNoteDialog: handleOpenNoteDialog,
    createTag: createTagMutation,
    deleteTag: deleteTagMutation,
    renameTag: handleRenameTag,
  }
}