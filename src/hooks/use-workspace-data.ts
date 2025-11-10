import { useMemo } from "react"
import { useQueries, useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { DateFilter } from "@/components/features/workspace/types"
import type { AuthorSelection } from "@/hooks/use-workspace-url-state"
import { useConvexUserReady } from "@/components/shared/providers"

type QueriesRequest = Parameters<typeof useQueries>[0]
type NoteQueryResult = typeof api.notes.queries.get._returnType

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
  const isConvexUserReady = useConvexUserReady()

  const currentUser = useMemo(() => {
    if (!isUserLoaded) return undefined
    if (!user) return null
    return {
      id: user.id,
      username: user.username ?? "Unknown",
    }
  }, [isUserLoaded, user])

  // Query notes list with filters
  const notes = useQuery(
    api.notes.queries.list,
    currentUser && isConvexUserReady
      ? {
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          authorId: selectedAuthor?.id,
          date: selectedDate || undefined,
        }
      : "skip",
  )

  // Query open note tabs
  const noteQueries = useMemo<QueriesRequest>(() => {
    // Don't query if user record not ready yet
    if (!isConvexUserReady) return {}

    const queries: QueriesRequest = {}
    for (const noteId of openNotes) {
      queries[noteId] = {
        query: api.notes.queries.get,
        args: { noteId: noteId as unknown as Id<"notes"> },
      }
    }
    return queries
  }, [openNotes, isConvexUserReady])

  const noteQueryResults = useQueries(noteQueries)

  const openNoteTabs = useMemo(() => {
    if (!notes) return openNotes.map((noteId) => ({ id: noteId, note: null, status: "loading" as const }))
    const listMap = new Map(notes.map((note) => [note.id as unknown as string, note]))
    return openNotes.map((noteId) => {
      const result = noteQueryResults[noteId] as NoteQueryResult | Error | undefined
      if (result instanceof Error) {
        return {
          id: noteId,
          note: listMap.get(noteId) ?? null,
          status: "error" as const,
          error: result,
        }
      }
      if (result === undefined) {
        return {
          id: noteId,
          note: null,
          status: "loading" as const,
        }
      }
      if (result === null) {
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
  }, [notes, openNotes, noteQueryResults])

  // Query tag summaries
  const tagSummaries = useQuery(api.tags.list, currentUser && isConvexUserReady ? {} : "skip")
  const tagNames = useMemo(() => {
    if (!tagSummaries) return []
    return tagSummaries.map((tag) => tag.name)
  }, [tagSummaries])

  return {
    currentUser,
    notes: notes ?? [],
    isNotesLoading: notes === undefined,
    openNoteTabs,
    tagSummaries: tagSummaries ?? [],
    tagNames,
  }
}