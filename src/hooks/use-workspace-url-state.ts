"use client"

import { useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { DateFilter } from "@/components/features/workspace/types"

export type AuthorSelection = { id: string; username: string } | null

/**
 * Manages workspace state via URL search parameters.
 *
 * This hook provides a Next.js-native approach to state management by using
 * URL search params as the single source of truth. Benefits:
 * - Shareable: Users can share filtered views via URL
 * - Bookmarkable: Save frequently used filter combinations
 * - Browser navigation: Back/forward buttons work naturally
 * - Deep linking: Direct links to specific states
 *
 * URL format: /?search=query&tags=tag1,tag2&author=userId&date=last7days&note=noteId
 */
export function useWorkspaceUrlState() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read current state from URL
  const searchQuery = searchParams.get("search") || ""
  const selectedTags = useMemo(() => {
    return searchParams.get("tags")?.split(",").filter(Boolean) || []
  }, [searchParams])
  const activeNoteId = searchParams.get("note") || null

  // Parse author from URL (format: "id:username")
  const authorParam = searchParams.get("author")
  const selectedAuthor: AuthorSelection = authorParam
    ? (() => {
        const [id, username] = authorParam.split(":")
        return id && username ? { id, username } : null
      })()
    : null

  // Parse date filter from URL (JSON-encoded)
  const dateParam = searchParams.get("date")
  const selectedDate: DateFilter | null = dateParam
    ? (() => {
        try {
          return JSON.parse(decodeURIComponent(dateParam)) as DateFilter
        } catch {
          return null
        }
      })()
    : null

  // Helper to build new URL with updated params
  const buildUrl = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key)
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            params.delete(key)
          } else {
            params.set(key, value.join(","))
          }
        } else {
          params.set(key, value)
        }
      })

      const queryString = params.toString()
      return queryString ? `/?${queryString}` : "/"
    },
    [searchParams],
  )

  // State setters that update URL
  const setSearchQuery = useCallback(
    (query: string) => {
      router.push(buildUrl({ search: query }))
    },
    [router, buildUrl],
  )

  const setSelectedTags = useCallback(
    (tags: string[] | ((prev: string[]) => string[])) => {
      const newTags = typeof tags === "function" ? tags(selectedTags) : tags
      router.push(buildUrl({ tags: newTags }))
    },
    [router, buildUrl, selectedTags],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
      router.push(buildUrl({ tags: newTags }))
    },
    [router, buildUrl, selectedTags],
  )

  const setSelectedAuthor = useCallback(
    (author: AuthorSelection) => {
      const authorValue = author ? `${author.id}:${author.username}` : null
      router.push(buildUrl({ author: authorValue }))
    },
    [router, buildUrl],
  )

  const setSelectedDate = useCallback(
    (date: DateFilter | null) => {
      const dateValue = date ? encodeURIComponent(JSON.stringify(date)) : null
      router.push(buildUrl({ date: dateValue }))
    },
    [router, buildUrl],
  )

  const setActiveNoteId = useCallback(
    (noteId: string | null) => {
      router.push(buildUrl({ note: noteId }))
    },
    [router, buildUrl],
  )

  const clearFilters = useCallback(() => {
    router.push(buildUrl({ search: null, tags: null, author: null, date: null }))
  }, [router, buildUrl])

  return {
    // Current state
    searchQuery,
    selectedTags,
    selectedAuthor,
    selectedDate,
    activeNoteId,

    // Setters
    setSearchQuery,
    setSelectedTags,
    toggleTag,
    setSelectedAuthor,
    setSelectedDate,
    setActiveNoteId,
    clearFilters,
  }
}
