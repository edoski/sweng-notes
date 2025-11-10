import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { notify } from "@/lib/notifications"
import type { Editor } from "@tiptap/react"
import { useDebouncedCallback } from "use-debounce"
import { usePrevious } from "@/hooks/use-previous"

import {
  MAX_NOTE_CONTENT_LENGTH as NOTE_CONTENT_MAX_LENGTH,
  MAX_NOTE_TITLE_LENGTH as NOTE_TITLE_MAX_LENGTH,
} from "@/convex/lib/validation"
import type { Note } from "@/convex/lib/note_helpers"
import type { Collaborator } from "@/components/features/notes/dialogs/share-dialog"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("note-editor")

type NoteSaveHandler = (
  noteId: string,
  changes: Partial<Pick<Note, "title" | "content" | "tags" | "visibility">>,
  options?: { saveVersion?: boolean },
) => Promise<void> | void

// Autosave interval for keeping search index fresh
// This updates notes.content in Convex so command palette search works
// Separate from version saves (owner's "Save" button creates explicit versions)
const AUTOSAVE_DEBOUNCE_MS = 1500

/**
 * Consolidated autosave hook that handles both title and content
 * Uses a single debounce timer to batch changes and prevent race conditions
 */
interface UseNoteAutosaveOptions {
  editor: Editor | null
  noteId: string
  noteTitle: string
  initialContent: string
  canEdit: boolean
  onSave: NoteSaveHandler
}

interface NoteAutosaveResult {
  title: string
  setTitle: Dispatch<SetStateAction<string>>
  characterCount?: number
  markSubmittedTitle: (value: string) => void
  markSubmittedContent: (value: string) => void
  replaceTitle: (value: string) => void
}

export function useNoteAutosave({
  editor,
  noteId,
  noteTitle,
  initialContent,
  canEdit,
  onSave,
}: UseNoteAutosaveOptions): NoteAutosaveResult {
  const [title, setTitle] = useState(() => noteTitle.slice(0, NOTE_TITLE_MAX_LENGTH))
  const [characterCount, setCharacterCount] = useState<number>()

  // Track last saved state
  const lastSavedTitleRef = useRef(noteTitle.trim())
  const lastSavedContentRef = useRef(initialContent)

  // Accumulate pending changes within debounce window
  const pendingChangesRef = useRef<Partial<Pick<Note, "title" | "content">>>({})

  // Use refs to avoid recreating the debounced callback
  const noteIdRef = useRef(noteId)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    noteIdRef.current = noteId
    onSaveRef.current = onSave
  })

  // Single debounced save function that handles both title and content
  const saveDebounced = useDebouncedCallback(
    async () => {
      const changes = { ...pendingChangesRef.current }

      // Clear pending changes before save
      pendingChangesRef.current = {}

      // Skip if no changes
      if (Object.keys(changes).length === 0) return

      try {
        await onSaveRef.current(noteIdRef.current, changes, { saveVersion: false })

        // Update last saved refs
        if (changes.title !== undefined) {
          lastSavedTitleRef.current = changes.title
        }
        if (changes.content !== undefined) {
          lastSavedContentRef.current = changes.content
        }
      } catch (error) {
        log.error("Failed to auto-save", { error })
      }
    },
    AUTOSAVE_DEBOUNCE_MS,
  )

  // Reset saved state when note changes
  useEffect(() => {
    const normalizedTitle = noteTitle.slice(0, NOTE_TITLE_MAX_LENGTH)
    const timeoutId = setTimeout(() => {
      setTitle((current) => (current === normalizedTitle ? current : normalizedTitle))
    }, 0)

    lastSavedTitleRef.current = noteTitle.trim()
    lastSavedContentRef.current = initialContent
    pendingChangesRef.current = {}
    saveDebounced.cancel()

    return () => clearTimeout(timeoutId)
  }, [noteId, noteTitle, initialContent, saveDebounced])

  // Handle title changes
  useEffect(() => {
    if (!canEdit) return

    const trimmed = title.trim()
    if (trimmed === lastSavedTitleRef.current) return

    // Accumulate title change
    pendingChangesRef.current.title = trimmed || "Untitled"
    saveDebounced()
  }, [title, canEdit, saveDebounced])

  // Handle content changes from TipTap editor
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const characters = editor.storage.characterCount.characters({ mode: "textSize" })
      setCharacterCount(characters)

      if (!canEdit) return
      if (characters > NOTE_CONTENT_MAX_LENGTH) return

      const markdown = editor.storage.markdown.getMarkdown()
      if (markdown === lastSavedContentRef.current) return

      // Accumulate content change
      pendingChangesRef.current.content = markdown
      saveDebounced()
    }

    editor.on("update", handleUpdate)
    return () => {
      editor.off("update", handleUpdate)
    }
  }, [editor, canEdit, saveDebounced])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (!editor || !canEdit) return
      if (Object.keys(pendingChangesRef.current).length > 0) {
        saveDebounced.flush()
      }
    }
  }, [editor, canEdit, saveDebounced])

  const markSubmittedTitle = useCallback((value: string) => {
    lastSavedTitleRef.current = value.trim()
  }, [])

  const markSubmittedContent = useCallback((value: string) => {
    lastSavedContentRef.current = value
  }, [])

  const replaceTitle = useCallback(
    (value: string) => {
      const normalized = value.slice(0, NOTE_TITLE_MAX_LENGTH)
      setTitle(normalized)
      lastSavedTitleRef.current = normalized.trim()
      delete pendingChangesRef.current.title
      saveDebounced.cancel()
    },
    [saveDebounced],
  )

  return useMemo(
    () => ({
      title,
      setTitle,
      characterCount,
      markSubmittedTitle,
      markSubmittedContent,
      replaceTitle,
    }),
    [title, characterCount, markSubmittedTitle, markSubmittedContent, replaceTitle],
  )
}

interface UseCollaboratorNotificationsOptions {
  collaborators: Collaborator[] | undefined
  isOwner: boolean
  noteTitle: string
}

interface CollaboratorNotificationsResult {
  registerManualRemoval: (userId: string) => void
}

export function useCollaboratorNotifications({
  collaborators,
  isOwner,
  noteTitle,
}: UseCollaboratorNotificationsOptions): CollaboratorNotificationsResult {
  const [manualRemovals, setManualRemovals] = useState<Set<string>>(new Set())
  const previousCollaborators = usePrevious(collaborators)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Initialize on first render
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    if (!previousCollaborators || !isOwner) return

    // Build maps for efficient lookup
    const prevMap = new Map(previousCollaborators.map((c) => [String(c.userId), c]))
    const nextMap = new Map((collaborators ?? []).map((c) => [String(c.userId), c]))
    const normalizedTitle = noteTitle.trim() || "Untitled"

    // Detect collaborators who left (excluding manual removals)
    for (const [userId, prev] of prevMap.entries()) {
      if (!nextMap.has(userId) && !manualRemovals.has(userId)) {
        const username = prev.username || "A collaborator"
        notify({
          type: "note.left",
          level: "info",
          message: `${username} left "${normalizedTitle}".`,
        })
      }
    }
  }, [collaborators, previousCollaborators, isOwner, noteTitle, manualRemovals])

  const registerManualRemoval = useCallback((userId: string) => {
    setManualRemovals((prev) => new Set(prev).add(userId))
  }, [])

  return useMemo(
    () => ({
      registerManualRemoval,
    }),
    [registerManualRemoval],
  )
}