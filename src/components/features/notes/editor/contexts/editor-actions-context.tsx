"use client"

import { createContext, useContext } from "react"

/**
 * Editor actions: save, duplicate, delete.
 */
export interface EditorActionsContextValue {
  // Delete
  deleteMenuLabel: string
  deleteDialogTitle: string
  deleteDialogDescription: string
  deleteConfirmLabel: string
  handleDeleteNote: () => void

  // Save
  isSaving: boolean
  handleSave: () => Promise<void>
  handleDuplicate: () => void
}

const EditorActionsContext = createContext<EditorActionsContextValue | null>(null)

export function useEditorActions() {
  const context = useContext(EditorActionsContext)
  if (!context) {
    throw new Error("useEditorActions must be used within EditorActionsProvider")
  }
  return context
}

export const EditorActionsProvider = EditorActionsContext.Provider
