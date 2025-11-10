"use client"

import { createContext, useContext } from "react"
import type { Editor } from "@tiptap/react"
import type { Note } from "@/convex/lib/note_helpers"

/**
 * Core editor state and data.
 * Contains: note data, editor instance, title, character count, permissions.
 */
export interface EditorCoreContextValue {
  // Core data
  note: Note
  currentUser: { id: string; username: string }

  // Title state
  title: string
  setTitle: (value: string) => void

  // Editor
  editor: Editor | null
  characterCount: number | undefined

  // Permissions
  canEdit: boolean
  isOwner: boolean
}

const EditorCoreContext = createContext<EditorCoreContextValue | null>(null)

export function useEditorCore() {
  const context = useContext(EditorCoreContext)
  if (!context) {
    throw new Error("useEditorCore must be used within EditorCoreProvider")
  }
  return context
}

export const EditorCoreProvider = EditorCoreContext.Provider
