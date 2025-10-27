import { useCallback } from "react"

/**
 * Mock version of useWorkspaceActions for Sprint 2
 * All actions are no-ops or show placeholder messages
 */

interface UseWorkspaceActionsParams {
  openNote: (noteId: string) => void
  closeNote: (noteId: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void
}

export function useWorkspaceActions({
  openNote,
  closeNote,
  selectedTags,
  setSelectedTags,
}: UseWorkspaceActionsParams) {
  // Mock create note - does nothing in Sprint 2
  const createNote = useCallback(async (_data: { title: string; content: string; tags: string[] }) => {
    console.log("[Sprint 2 Mock] Create note action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Mock save note - does nothing in Sprint 2
  const saveNote = useCallback(async (_noteId: string, _changes: unknown) => {
    console.log("[Sprint 2 Mock] Save note action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Mock duplicate note - does nothing in Sprint 2
  const duplicateNote = useCallback(async (_noteId: string) => {
    console.log("[Sprint 2 Mock] Duplicate note action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Mock delete note - just closes the tab
  const deleteNote = useCallback(
    async (noteId: string) => {
      console.log("[Sprint 2 Mock] Delete note action - just closing tab")
      closeNote(noteId)
      // In Sprint 3, this will call Convex mutation
    },
    [closeNote]
  )

  // Mock create tag - does nothing in Sprint 2
  const createTag = useCallback(async (_tagName: string) => {
    console.log("[Sprint 2 Mock] Create tag action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Mock delete tag - does nothing in Sprint 2
  const deleteTag = useCallback(async (_tagName: string) => {
    console.log("[Sprint 2 Mock] Delete tag action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Mock rename tag - does nothing in Sprint 2
  const renameTag = useCallback(async (_oldName: string, _newName: string) => {
    console.log("[Sprint 2 Mock] Rename tag action - not implemented yet")
    // In Sprint 3, this will call Convex mutation
  }, [])

  // Toggle tag works (client-side state only)
  const toggleTag = useCallback(
    (tag: string) => {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      )
    },
    [setSelectedTags]
  )

  // Mock open note dialog - does nothing in Sprint 2
  const openNoteDialog = useCallback((_noteId: string, _dialogType: string) => {
    console.log("[Sprint 2 Mock] Open note dialog - not implemented yet")
    // In Sprint 3, this will open share/tags dialogs
  }, [])

  return {
    createNote,
    saveNote,
    duplicateNote,
    deleteNote,
    createTag,
    deleteTag,
    renameTag,
    toggleTag,
    openNoteDialog,
  }
}
