import { useMemo } from "react"
import { matchSorter } from "match-sorter"
import type { Note } from "@/convex/lib/note_helpers"
import { parseDate } from "chrono-node"
import { format, isValid, parseISO } from "date-fns"
import type { DateFilter, DateFilterMode } from "@/components/features/workspace/types"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"

export type ResultItem =
  | {
      type: "note"
      note: Note
      id: string
    }
  | {
      type: "tag"
      tag: string
      id: string
    }
  | {
      type: "author"
      author: Note["owner"]
      id: string
    }
  | {
      type: "date"
      date: DateFilter
      id: string
    }

function describeDateFilter(date: DateFilter) {
  const label = format(parseISO(date.key), "dd/MM/yy")
  if (date.mode === "created") {
    return `Created · ${label}`
  }
  if (date.mode === "modified") {
    return `Modified · ${label}`
  }
  return label
}

export function useCommandPaletteSearch(query: string) {
  const { tagNames, notes, allNotes, currentUser, selectedAuthor, selectedDate } = useWorkspaceData()

  const results = useMemo(() => {
    const raw = query.trim()
    const tagOnly = raw.startsWith("#")
    const authorOnly = raw.startsWith("@")
    const lowerRaw = raw.toLowerCase()
    const canUseDateKeyword = !tagOnly && !authorOnly
    const dateKeywordMatch = canUseDateKeyword ? lowerRaw.match(/^(created|modified)\b/) : null
    const dateMode = dateKeywordMatch ? (dateKeywordMatch[1] as DateFilterMode) : null
    const keywordLength = dateKeywordMatch ? dateKeywordMatch[0].length : 0
    const dateQuery = dateMode ? raw.slice(keywordLength).trim() : raw
    const searchTerm = tagOnly || authorOnly ? raw.slice(1).trim() : dateMode ? dateQuery : raw

    // Build note results using match-sorter
    const noteResults: ResultItem[] = tagOnly || authorOnly
      ? []
      : searchTerm
        ? matchSorter(notes, searchTerm, {
            keys: [
              { threshold: matchSorter.rankings.STARTS_WITH, key: "title" },
              { threshold: matchSorter.rankings.CONTAINS, key: "content" },
              { threshold: matchSorter.rankings.CONTAINS, key: "owner.username" },
            ],
          }).map((note) => ({
            type: "note" as const,
            note,
            id: `note-${note.id}`,
          }))
        : notes.map((note) => ({
            type: "note" as const,
            note,
            id: `note-${note.id}`,
          }))

    const authorMap = new Map<string, Note["owner"]>()
    for (const note of allNotes) {
      authorMap.set(note.owner.id, note.owner)
    }
    if (selectedAuthor && !authorMap.has(selectedAuthor.id)) {
      authorMap.set(selectedAuthor.id, selectedAuthor)
    }

    const authorEntries = Array.from(authorMap.values()).filter((author) => author.id !== currentUser.id)

    // Build author results using match-sorter
    const authorResults: ResultItem[] = tagOnly
      ? []
      : searchTerm
        ? matchSorter(authorEntries, searchTerm, {
            keys: ["username"],
          }).map((author) => ({
            type: "author" as const,
            author,
            id: `author-${author.id}`,
          }))
        : authorEntries.map((author) => ({
            type: "author" as const,
            author,
            id: `author-${author.id}`,
          }))

    // Build date results (no fuzzy matching needed for dates)
    const parsedDate = canUseDateKeyword && dateQuery.length > 0 ? parseDate(dateQuery) : null
    const dateResults: ResultItem[] = (() => {
      const suggestions: ResultItem[] = []
      if (parsedDate && isValid(parsedDate)) {
        const key = format(parsedDate, "yyyy-MM-dd")
        const suggestion: DateFilter = {
          key,
          ...(dateMode ? { mode: dateMode } : {}),
        }
        suggestions.push({
          type: "date" as const,
          date: suggestion,
          id: `date-${key}-${dateMode ?? "any"}`,
        })
      }

      if (selectedDate) {
        const exists = suggestions.some(
          (entry) =>
            entry.type === "date" &&
            entry.date.key === selectedDate.key &&
            (entry.date.mode ?? null) === (selectedDate.mode ?? null),
        )
        if (!exists) {
          suggestions.unshift({
            type: "date" as const,
            date: selectedDate,
            id: `date-${selectedDate.key}-${selectedDate.mode ?? "any"}`,
          })
        }
      }

      return suggestions
    })()

    // Build tag results using match-sorter
    const tagResults: ResultItem[] = searchTerm
      ? matchSorter(tagNames, searchTerm).map((tag) => ({
          type: "tag" as const,
          tag,
          id: `tag-${tag}`,
        }))
      : tagNames.map((tag) => ({
          type: "tag" as const,
          tag,
          id: `tag-${tag}`,
        }))

    // Combine results based on filter mode
    const combined = tagOnly
      ? tagResults
      : authorOnly
        ? authorResults
        : [...dateResults, ...noteResults, ...authorResults, ...tagResults]

    // Sort notes by updatedAt if no search term
    if (!searchTerm && !tagOnly && !authorOnly) {
      const noteItems = combined.filter((item) => item.type === "note") as Extract<ResultItem, { type: "note" }>[]
      noteItems.sort((a, b) => b.note.updatedAt - a.note.updatedAt)
    }

    return combined
  }, [allNotes, currentUser.id, notes, query, selectedAuthor, selectedDate, tagNames])

  return { results, describeDateFilter }
}
