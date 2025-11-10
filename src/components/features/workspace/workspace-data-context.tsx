"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { Note } from "@/convex/lib/note_helpers"
import type { NoteTabEntry } from "@/components/features/notes/note-tabs"
import type { NoteDialogType } from "@/contexts/note-dialog-context"
import type { DateFilter } from "@/components/features/workspace/types"
import type { AuthorSelection } from "@/hooks/use-workspace-url-state"

interface WorkspaceDataContextValue {
  // User data
  currentUser: { id: string; username: string }

  // Notes data
  notes: Note[] // Ordered and filtered notes (for display)
  allNotes: Note[] // Unfiltered notes (for command palette)
  tabs: NoteTabEntry[]

  // Tags data
  tagSummaries: { name: string; shared: boolean }[]
  tagNames: string[]

  // URL-based filter state
  searchQuery: string
  selectedTags: string[]
  selectedAuthor: AuthorSelection
  selectedDate: DateFilter | null
  activeNoteId: string | null

  // Filter state setters
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void
  toggleTag: (tag: string) => void
  setSelectedAuthor: (author: AuthorSelection) => void
  setSelectedDate: (date: DateFilter | null) => void
  setActiveNoteId: (noteId: string | null) => void
  clearFilters: () => void

  // Tab management
  openNote: (noteId: string) => void
  closeNote: (noteId: string) => void

  // Note actions
  createNote: (note: { title: string; content: string; tags: string[] }) => Promise<void>
  saveNote: (
    noteId: string,
    changes: Partial<Pick<Note, "title" | "content" | "tags" | "visibility">>,
    options?: { saveVersion?: boolean },
  ) => Promise<void>
  duplicateNote: (noteId: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  openNoteDialog: (noteId: string, dialogType: NoteDialogType) => void

  // Tag actions
  createTag: (args: { name: string }) => Promise<{ name: string; createdAt: number; noteCount: number; shared: boolean }>
  deleteTag: (args: { name: string }) => Promise<{ name: string }>
  renameTag: (oldName: string, newName: string) => Promise<void>
}

const WorkspaceDataContext = createContext<WorkspaceDataContextValue | null>(null)

export function WorkspaceDataProvider({
  value,
  children,
}: {
  value: WorkspaceDataContextValue
  children: ReactNode
}) {
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>
}

export function useWorkspaceData() {
  const context = useContext(WorkspaceDataContext)
  if (!context) {
    throw new Error("useWorkspaceData must be used within a WorkspaceDataProvider")
  }
  return context
}
