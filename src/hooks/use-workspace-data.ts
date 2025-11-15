import { useMemo } from "react"
import { useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { DateFilter } from "@/components/features/workspace/types"
import type { AuthorSelection } from "@/hooks/use-workspace-url-state"
import { useAccountDeletion } from "@/contexts/account-deletion-context"

interface UseWorkspaceDataParams {
  searchQuery: string
  selectedTags: string[]
  selectedAuthor: AuthorSelection
  selectedDate: DateFilter | null
  openNotes: string[]
}

export function useWorkspaceData({
  searchQuery,
  selectedTags,
  selectedAuthor,
  selectedDate,
  openNotes,
}: UseWorkspaceDataParams) {

  // Get current user from Clerk (client-side, no network call)
  const { user, isLoaded: isUserLoaded } = useUser()

  // Get account deletion state
  const { isDeletingAccount } = useAccountDeletion()

  const currentUser = useMemo(() => {
    // Skip all queries during account deletion
    if (isDeletingAccount) return undefined
    if (!isUserLoaded) return undefined
    if (!user) return null
    return {
      id: user.id,
      username: user.username ?? "Unknown",
    }
  }, [isDeletingAccount, isUserLoaded, user])

  // Query notes list with filters
  const notes = useQuery(
    api.notes.queries.list,
    currentUser
      ? {
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          authorId: selectedAuthor?.id,
          date: selectedDate || undefined,
        }
      : "skip",
  )

  // Query open note tabs (batch query - single network call)
  const batchNotesResult = useQuery(
    api.notes.queries.batchGet,
    currentUser && openNotes.length > 0
      ? { noteIds: openNotes as unknown as Id<"notes">[] }
      : "skip",
  )

  const openNoteTabs = useMemo(() => {
    // If notes list hasn't loaded yet, return loading state for all
    if (!notes) return openNotes.map((noteId) => ({ id: noteId, note: null, status: "loading" as const }))

    // Create map from notes list for fallback
    const listMap = new Map(notes.map((note) => [note.id as unknown as string, note]))

    // If batch query is still loading, return loading state for all
    if (batchNotesResult === undefined) {
      return openNotes.map((noteId) => ({ id: noteId, note: null, status: "loading" as const }))
    }

    // Transform batch result into Map for O(1) lookup
    // batchGet returns: Array<{ noteId: Id<"notes">, note: Note | null }>
    const noteById = new Map(
      batchNotesResult.map((item) => [item.noteId as unknown as string, item.note])
    )

    return openNotes.map((noteId) => {
      const result = noteById.get(noteId)

      if (result === null || result === undefined) {
        // Note not found or access denied
        return {
          id: noteId,
          note: listMap.get(noteId) ?? null,
          status: "error" as const,
        }
      }

      return {
        id: noteId,
        note: result,
        status: "ready" as const,
      }
    })
  }, [notes, openNotes, batchNotesResult])

  // Query tag summaries (for sidebar filters that need metadata)
  const tagSummaries = useQuery(api.tags.list, currentUser ? {} : "skip")

  // Query tag names (optimized for autocomplete/command palette)
  const tagNames = useQuery(api.tags.listNames, currentUser ? {} : "skip")

  return {
    currentUser,
    notes: notes ?? [],
    isNotesLoading: notes === undefined,
    openNoteTabs,
    tagSummaries: tagSummaries ?? [],
    tagNames: tagNames ?? [],
  }
}