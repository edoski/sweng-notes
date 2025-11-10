"use client"

import { createContext, useContext } from "react"
import type { VersionHistoryItem } from "@/components/features/notes/version/version-history"

/**
 * Version history management.
 */
export interface EditorVersionContextValue {
  openVersionHistory: () => void
  closeVersionHistory: () => void
  versionItems: VersionHistoryItem[]
  restoringVersionId: string | null
  handleRestoreVersion: (version: VersionHistoryItem) => void | Promise<void>
}

const EditorVersionContext = createContext<EditorVersionContextValue | null>(null)

export function useEditorVersion() {
  const context = useContext(EditorVersionContext)
  if (!context) {
    throw new Error("useEditorVersion must be used within EditorVersionProvider")
  }
  return context
}

export const EditorVersionProvider = EditorVersionContext.Provider
