import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useConvexUserReady } from "@/components/shared/providers"

/**
 * Real version of useWorkspaceData for Sprint 3
 * Queries Convex for notes, tags, and user data
 */

// Real note type from Convex
export interface Note {
  id: Id<"notes">
  title: string
  content: string
  tags: string[]
  visibility: "private" | "public"
  createdAt: number
  updatedAt: number
  owner: {
    id: string
    username: string
  }
  canEdit: boolean
}

export interface NoteTabEntry {
  id: string
  note: Note | null
  status: "loading" | "ready" | "error"
  error?: Error
}

interface UseWorkspaceDataParams {
  searchQuery: string
  selectedTags: string[]
  selectedAuthor: { id: string; username: string } | null
  selectedDate: unknown | null
  openNotes: string[]
}

export function useWorkspaceData({
  searchQuery,
  selectedTags,
  selectedAuthor,
  selectedDate,
  openNotes,
}: UseWorkspaceDataParams) {
  // Wait for Convex user to be created before querying
  const isConvexUserReady = useConvexUserReady()

  // Query current user from Convex
  const currentUser = useQuery(
    api.users.current,
    isConvexUserReady ? {} : "skip"
  )

  // Query all notes (owner-only for Sprint 3)
  const allNotes = useQuery(
    api.notes.list,
    isConvexUserReady ? {} : "skip"
  )

  // Filter notes based on client-side filters (no tag filtering in Sprint 3)
  const filteredNotes = useMemo(() => {
    if (!allNotes) return []

    let result = [...allNotes]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      )
    }

    // Apply author filter
    if (selectedAuthor) {
      result = result.filter((note) => note.owner.id === selectedAuthor.id)
    }

    // Note: Date filter and tag filter not implemented in Sprint 3

    return result
  }, [allNotes, searchQuery, selectedAuthor])

  // Create tab entries for open notes
  const openNoteTabs = useMemo(() => {
    return openNotes.map((noteId): NoteTabEntry => {
      if (!allNotes) {
        return {
          id: noteId,
          note: null,
          status: "loading",
        }
      }

      const note = allNotes.find((n) => n.id === noteId)
      if (note) {
        return {
          id: noteId,
          note,
          status: "ready",
        }
      }

      return {
        id: noteId,
        note: null,
        status: "error",
        error: new Error("Note not found"),
      }
    })
  }, [openNotes, allNotes])

  return {
    currentUser,
    notes: filteredNotes,
    isNotesLoading: allNotes === undefined,
    openNoteTabs,
  }
}
