import {z} from "zod/v3"
import {authedQuery, noteQuery} from "../lib/zod"
import {batchGetNoteTags, getNoteTags} from "../lib/note_tags"
import {type Note, NoteListArgsSchema, toNote,} from "../lib/note_helpers"
import {loadAccessibleNotes, type NoteAccessEntry} from "../lib/note_permissions"
import {loadUsersByIds} from "../lib/user_helpers"
import {filterNotesByTags, matchesAuthor, matchesDate} from "../lib/note_filters"
import {fetchNoteAccess} from "../lib/note_access"
import type {Id} from "../_generated/dataModel"

export const list = authedQuery({
  args: NoteListArgsSchema,
  handler: async (ctx, args) => {
    const { user } = ctx.viewer

    const filters = {
      search: args.search?.toLowerCase() ?? null,
      tags: args.tags?.map((tag) => tag.toLowerCase()) ?? null,
      authorId: args.authorId ?? null,
      date: args.date ?? null,
    }

    // Load all accessible notes with permissions
    const accessMap = await loadAccessibleNotes(ctx, user._id)

    // Gather candidates based on search/tag filters
    let candidateEntries: NoteAccessEntry[]

    if (filters.search) {
      const [titleResults, contentResults] = await Promise.all([
        ctx.db.query("notes").withSearchIndex("search_title", (q) => q.search("title", filters.search!)).collect(),
        ctx.db.query("notes").withSearchIndex("search_content", (q) => q.search("content", filters.search!)).collect(),
      ])

      const searchResultsMap = new Map<string, NoteAccessEntry>()
      for (const note of [...titleResults, ...contentResults]) {
        const entry = accessMap.get(note._id)
        if (entry) {
          searchResultsMap.set(note._id as string, entry)
        }
      }
      candidateEntries = Array.from(searchResultsMap.values())
    } else if (filters.tags && filters.tags.length > 0) {
      const matchingNoteIds = await filterNotesByTags(ctx, user._id, filters.tags)
      candidateEntries = matchingNoteIds
        .map((id) => accessMap.get(id))
        .filter((entry): entry is NoteAccessEntry => Boolean(entry))
    } else {
      candidateEntries = Array.from(accessMap.values())
    }

    // Batch-fetch owners and tags for all candidates
    const ownerMap = await loadUsersByIds(ctx, candidateEntries.map((e) => e.note.ownerId))
    const tagMap = await batchGetNoteTags(ctx, candidateEntries.map((e) => e.note._id))

    // Filter using helpers and build results (no DB queries in loop)
    const results: Note[] = []
    for (const entry of candidateEntries) {
      const { note, permission } = entry

      const owner = ownerMap.get(note.ownerId)
      if (!owner) continue

      if (!matchesAuthor(owner, filters.authorId)) continue
      if (!matchesDate(note, filters.date)) continue

      const noteTags = tagMap.get(note._id) ?? []
      results.push(toNote(note, owner, permission, noteTags))
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt)
    return results
  },
})

/**
 * Get a single note by ID
 */
export const get = noteQuery({
  optional: true,
})({
  args: z.object({}),
  handler: async (ctx) => {
    if (ctx.noteAccess.status !== "ok") {
      return null
    }

    const { note, permission } = ctx.noteAccess
    const owner = await ctx.db.get(note.ownerId)
    if (!owner) {
      return null
    }

    const noteTags = await getNoteTags(ctx, note._id)
    return toNote(note, owner, permission, noteTags)
  },
})

/**
 * Batch get multiple notes by IDs
 * Returns an array with one entry per noteId, with null for inaccessible notes
 */
export const batchGet = authedQuery({
  args: z.object({
    noteIds: z.array(z.string()),
  }),
  handler: async (ctx, { noteIds }) => {
    const { user } = ctx.viewer

    // Handle empty array case
    if (noteIds.length === 0) {
      return []
    }

    // Cast strings to Id<"notes"> since Convex IDs are strings at runtime
    const typedNoteIds = noteIds as Id<"notes">[]

    // Check access for all notes in parallel
    const accessResults = await Promise.all(
      typedNoteIds.map((noteId) => fetchNoteAccess(ctx, noteId, user._id))
    )

    // Collect accessible notes and their owners
    const accessibleNotes = accessResults
      .map((access, index) => ({
        noteId: typedNoteIds[index]!,
        access,
      }))
      .filter(({ access }) => access.status === "ok")

    // Batch-fetch owners for all accessible notes
    const ownerIds = accessibleNotes
      .map(({ access }) => (access.status === "ok" ? access.note.ownerId : null))
      .filter((id): id is Id<"users"> => id !== null)
    const ownerMap = await loadUsersByIds(ctx, ownerIds)

    // Batch-fetch tags for all accessible notes
    const accessibleNoteIds = accessibleNotes
      .map(({ access }) => (access.status === "ok" ? access.note._id : null))
      .filter((id): id is Id<"notes"> => id !== null)
    const tagMap = await batchGetNoteTags(ctx, accessibleNoteIds)

    // Build result array maintaining order
    // accessResults[i] corresponds to typedNoteIds[i] due to Promise.all preserving order
    return typedNoteIds.map((noteId, index) => {
      const accessResult = accessResults[index]!

      if (accessResult.status !== "ok") {
        return { noteId, note: null }
      }

      const { note, permission } = accessResult
      const owner = ownerMap.get(note.ownerId)

      if (!owner) {
        return { noteId, note: null }
      }

      const noteTags = tagMap.get(note._id) ?? []
      return { noteId, note: toNote(note, owner, permission, noteTags) }
    })
  },
})

/**
 * Get mention suggestions for Liveblocks collaboration
 * Only returns collaborators (owner + shared users) for public notes
 */
export const getMentionSuggestions = noteQuery()({
  args: {
    text: z.string(),
  },
  handler: async (ctx, { text }) => {
    // Access already validated by noteQuery
    if (ctx.noteAccess.status !== "ok") {
      return []
    }

    const { note } = ctx.noteAccess

    // Only allow mentions in public notes
    if (note.visibility !== "public") {
      return []
    }

    const normalizedSearch = text.trim().toLowerCase()

    // Get all collaborators directly (no API call)
    const permissions = await ctx.db
      .query("notePermissions")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect()

    // Fetch all users in one batch (owner + collaborators)
    const allUserIds = [note.ownerId, ...permissions.map((p) => p.userId)]
    const users = await Promise.all(allUserIds.map((id) => ctx.db.get(id)))

    // Filter and sort alphabetically
    return users
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .filter((user) => {
        if (!normalizedSearch) return true
        const lowerUsername = user.username.toLowerCase()
        const lowerClerkId = user.clerkId.toLowerCase()
        return lowerUsername.includes(normalizedSearch) || lowerClerkId.includes(normalizedSearch)
      })
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((user) => user.clerkId)
  },
})