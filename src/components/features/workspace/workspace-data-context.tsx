"use client"

import type { ReactNode } from "react"
import { createContext, useContext } from "react"
import type { Note, NoteTabEntry } from "@/hooks/use-workspace-data"

/**
 * Simplified version of WorkspaceDataContext for Sprint 3
 * No tag management - tags are just arrays on notes
 */

// User type from Convex
export interface User {
  _id: string
  clerkId: string
  username: string
  updatedAt: number
  _creationTime: number
}

export interface WorkspaceDataContextValue {
  // User
  currentUser: User | null | undefined

  // Notes
  notes: Note[]
  tabs: NoteTabEntry[]

  // URL State
  searchQuery: string
  setSearchQuery: (query: string) => void
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
