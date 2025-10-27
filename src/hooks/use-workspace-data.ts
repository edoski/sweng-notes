import { useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { MOCK_NOTES, MOCK_TAGS, MOCK_CURRENT_USER } from "@/lib/mock-data"
import type { MockNote } from "@/lib/mock-data"

/**
 * Mock version of useWorkspaceData for Sprint 2
 * Returns static mock data instead of querying Convex
 */

export interface NoteTabEntry {
  id: string
  note: MockNote | null
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
  // Get current user from Clerk (real authentication still works)
  const { user, isLoaded: isUserLoaded } = useUser()

  const currentUser = useMemo(() => {
    if (!isUserLoaded) return undefined
    if (!user) return null
    // Return mock user for demo purposes
    return MOCK_CURRENT_USER
  }, [isUserLoaded, user])

  // Filter mock notes based on filters (client-side filtering for demo)
  const filteredNotes = useMemo(() => {
    let result = [...MOCK_NOTES]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      )
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter((note) =>
        selectedTags.some((tag) => note.tags.includes(tag))
      )
    }

    // Apply author filter
    if (selectedAuthor) {
      result = result.filter((note) => note.owner.id === selectedAuthor.id)
    }

    // Note: Date filter not implemented in mock (Sprint 3 feature)

    return result
  }, [searchQuery, selectedTags, selectedAuthor])

  // Create tab entries for open notes
  const openNoteTabs = useMemo(() => {
    return openNotes.map((noteId): NoteTabEntry => {
      const note = MOCK_NOTES.find((n) => n.id === noteId)
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
  }, [openNotes])

  // Tag names for autocomplete
  const tagNames = useMemo(() => {
    return MOCK_TAGS.map((tag) => tag.name)
  }, [])

  return {
    currentUser,
    notes: filteredNotes,
    isNotesLoading: false,
    openNoteTabs,
    tagSummaries: MOCK_TAGS,
    tagNames,
  }
}
