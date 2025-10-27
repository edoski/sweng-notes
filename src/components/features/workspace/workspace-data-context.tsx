"use client"

import type { ReactNode } from "react"
import { createContext, useContext } from "react"
import type { MockNote, MockTag, MockUser } from "@/lib/mock-data"
import type { NoteTabEntry } from "@/hooks/use-workspace-data"

/**
 * Mock version of WorkspaceDataContext for Sprint 2
 * Provides workspace data and actions to all components
 */

export interface WorkspaceDataContextValue {
  // User
  currentUser: MockUser

  // Notes
  notes: MockNote[]
  tabs: NoteTabEntry[]

  // Tags
  tagSummaries: MockTag[]
  tagNames: string[]

  // URL State
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void
  selectedAuthor: { id: string; username: string } | null
  setSelectedAuthor: (author: { id: string; username: string } | null) => void
  selectedDate: unknown | null
  setSelectedDate: (date: unknown | null) => void
  activeNoteId: string | null
  setActiveNoteId: (noteId: string | null) => void
  clearFilters: () => void

  // Tab Actions
  openNote: (noteId: string) => void
  closeNote: (noteId: string) => void

  // Note Actions
  createNote: (data: { title: string; content: string; tags: string[] }) => Promise<void>
  saveNote: (noteId: string, changes: unknown) => Promise<void>
  duplicateNote: (noteId: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>

  // Tag Actions
  createTag: (tagName: string) => Promise<void>
  deleteTag: (tagName: string) => Promise<void>
  renameTag: (oldName: string, newName: string) => Promise<void>
  toggleTag: (tag: string) => void

  // Dialog Actions
  openNoteDialog: (noteId: string, dialogType: string) => void
}

const WorkspaceDataContext = createContext<WorkspaceDataContextValue | null>(null)

export function WorkspaceDataProvider({
  value,
  children,
}: {
  value: WorkspaceDataContextValue
  children: ReactNode
}) {
  return (
    <WorkspaceDataContext.Provider value={value}>
      {children}
    </WorkspaceDataContext.Provider>
  )
}

export function useWorkspaceData() {
  const context = useContext(WorkspaceDataContext)
  if (!context) {
    throw new Error("useWorkspaceData must be used within WorkspaceDataProvider")
  }
  return context
}
