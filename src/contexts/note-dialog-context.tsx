"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useSearchParams, useRouter } from "next/navigation"

/**
 * Dialog types for note-scoped dialogs
 */
export type NoteDialogType = "share" | "details" | "delete" | "tags" | "versionHistory"

/**
 * Global context value interface for managing note dialogs across the entire workspace
 */
interface NoteDialogContextValue {
  activeNoteId: string | null
  activeDialog: NoteDialogType | null
  openDialog: (noteId: string, type: NoteDialogType) => void
  closeDialog: (activeEditorNoteId?: string | null) => void
  isDialogOpen: (noteId: string, type: NoteDialogType) => boolean
}

const NoteDialogContext = createContext<NoteDialogContextValue | null>(null)

/**
 * NoteDialogProvider - Global dialog state manager for the entire workspace
 *
 * This provider reads dialog state from URL search parameters and provides helpers
 * to open/close dialogs by updating the URL. This approach:
 * - Makes dialogs deep-linkable
 * - Works with browser back button
 * - Provides single source of truth for all note dialogs
 * - Allows any component (sidebar, editor, command palette) to open dialogs
 *
 * URL format: /?note={noteId}&dialog={dialogType}
 */
export function NoteDialogProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read dialog state from URL
  const activeNoteId = searchParams.get("note")
  const activeDialog = searchParams.get("dialog") as NoteDialogType | null

  const value = useMemo(
    () => ({
      activeNoteId,
      activeDialog,
      openDialog: (noteId: string, type: NoteDialogType) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("note", noteId)
        params.set("dialog", type)
        router.push(`/?${params.toString()}`)
      },
      closeDialog: (activeEditorNoteId?: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("dialog")

        // Smart clearing: only clear note param if it's different from editor's active note
        const noteParam = params.get("note")
        if (noteParam && noteParam !== activeEditorNoteId) {
          params.delete("note")
        }

        router.push(`/?${params.toString()}`)
      },
      isDialogOpen: (noteId: string, type: NoteDialogType) => {
        return activeNoteId === noteId && activeDialog === type
      },
    }),
    [activeNoteId, activeDialog, router, searchParams],
  )

  return <NoteDialogContext.Provider value={value}>{children}</NoteDialogContext.Provider>
}

/**
 * Hook to access global note dialog state and actions
 *
 * Must be used within a NoteDialogProvider
 */
export function useNoteDialog() {
  const context = useContext(NoteDialogContext)
  if (!context) {
    throw new Error("useNoteDialog must be used within NoteDialogProvider")
  }
  return context
}
