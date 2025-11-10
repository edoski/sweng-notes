"use client"

import { createContext, useContext } from "react"
import type { NoteVisibility } from "@/convex/lib/note_helpers"
import type { Collaborator } from "@/components/features/notes/dialogs/share-dialog"

/**
 * Collaboration features: tags, sharing, visibility, presence.
 */
export interface EditorCollaborationContextValue {
  // Tags state
  tags: string[]
  tagOptions: string[]
  isTagSaving: boolean
  handleAddTagToNote: (tagName: string) => Promise<void>
  handleRemoveSingleTag: (tag: string) => Promise<void>
  handleCreateTag: (tagName: string) => Promise<void>

  // Visibility & sharing
  visibility: NoteVisibility
  shareData: {
    owner?: { username: string }
    collaborators: Collaborator[]
    canManage: boolean
  } | null | undefined
  handleChangeVisibility: (visibility: NoteVisibility) => Promise<void>
  handleAddCollaborator: (username: string, role: "reader" | "editor") => Promise<boolean>
  handleUpdateCollaborator: (userId: string, role: "reader" | "editor") => Promise<void>
  handleRemoveCollaborator: (userId: string) => Promise<void>
}

const EditorCollaborationContext = createContext<EditorCollaborationContextValue | null>(null)

export function useEditorCollaboration() {
  const context = useContext(EditorCollaborationContext)
  if (!context) {
    throw new Error("useEditorCollaboration must be used within EditorCollaborationProvider")
  }
  return context
}

export const EditorCollaborationProvider = EditorCollaborationContext.Provider