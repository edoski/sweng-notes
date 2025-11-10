import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { getLocalDateKey } from "./dates"

type AnyCtx = QueryCtx | MutationCtx

export function matchesAuthor(owner: Doc<"users"> | undefined, authorId: string | null): boolean {
  if (!authorId) return true
  if (!owner) return false
  return owner.clerkId === authorId
}

export function matchesDate(
  note: Doc<"notes">,
  dateFilter: { key: string; mode?: "created" | "modified" } | null,
): boolean {
  if (!dateFilter) return true

  const updatedKey = getLocalDateKey(note.updatedAt)
  const createdKey = getLocalDateKey(note._creationTime)

  if (!updatedKey && !createdKey) {
    return false
  }

  const expectedKey = dateFilter.key
  const mode = dateFilter.mode

  const matchesCreated = createdKey === expectedKey
  const matchesUpdated = updatedKey === expectedKey

  if (mode === "created") {
    return matchesCreated
  } else if (mode === "modified") {
    return matchesUpdated
  } else {
    return matchesCreated || matchesUpdated
  }
}

/**
 * Filters notes by tags using normalized schema with tag IDs.
 * Returns note IDs that match ALL specified tags (intersection logic).
 *
 * Uses indexed queries for optimal performance when filtering by tag names.
 * Works for both owned notes and collaborative notes by finding tags
 * across all users with matching names, then filtering by permissions.
 *
 * @param ctx - Query or mutation context with database access
 * @param userId - User ID to determine accessible notes (tags are user-scoped)
 * @param tags - Case-insensitive tag names to filter by
 * @returns Note IDs that have all specified tags attached
 *
 * @performance
 * - Time complexity: O(M * N) where M = tags matching names, N = notes per tag
 * - Step 1: Find all tags with matching names (O(T) where T = total tags)
 * - Step 2: For each tag, fetch noteTags entries (O(M) indexed queries)
 * - Step 3: Compute intersection of note sets (O(M * N))
 *
 * @example
 * ```typescript
 * // Find notes tagged with both "typescript" and "react" (case-insensitive)
 * const noteIds = await filterNotesByTags(ctx, userId, ["typescript", "React"])
 * ```
 */
export async function filterNotesByTags(
  ctx: AnyCtx,
  userId: Id<"users">,
  tags: string[],
): Promise<Id<"notes">[]> {
  if (tags.length === 0) return []

  // Normalize tag names for case-insensitive comparison
  const normalizedFilterTags = tags.map((tag) => tag.toLowerCase())

  // For each filter tag, find ALL tags with that name (across all users)
  const tagSetsPerName = await Promise.all(
    normalizedFilterTags.map(async (tagName) => {
      // Use by_name index for efficient lookup (O(M) where M = tags with this name)
      // Note: Index is case-sensitive, so we still need to filter for exact match
      const matchingTags = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", tagName))
        .collect()

      // Filter for case-insensitive match since index lookup is case-sensitive
      return matchingTags.filter((tag) => tag.name.toLowerCase() === tagName)
    }),
  )

  // If any filter tag doesn't exist anywhere, return empty
  if (tagSetsPerName.some((tagSet) => tagSet.length === 0)) {
    return []
  }

  // For each filter tag, get all notes that have any matching tag ID
  const noteIdSetsPerTag = await Promise.all(
    tagSetsPerName.map(async (tagSet) => {
      const tagIds = tagSet.map((tag) => tag._id)

      // Get all noteTags entries for these tag IDs
      const noteTagsEntries = await Promise.all(
        tagIds.map((tagId) =>
          ctx.db
            .query("noteTags")
            .withIndex("by_tag_note_id", (q) => q.eq("tagId", tagId))
            .collect(),
        ),
      )

      // Flatten and collect unique note IDs
      const noteIds = new Set<Id<"notes">>()
      for (const entries of noteTagsEntries) {
        for (const entry of entries) {
          noteIds.add(entry.noteId)
        }
      }
      return noteIds
    }),
  )

  // Compute intersection (notes that have ALL filter tags)
  if (noteIdSetsPerTag.length === 0) return []

  const candidateNoteIds = Array.from(noteIdSetsPerTag[0]!).filter((noteId) =>
    noteIdSetsPerTag.every((set) => set.has(noteId)),
  )

  // Batch load all relevant permissions (single query instead of N queries)
  const userPermissions = await ctx.db
    .query("notePermissions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()

  // Build a Set of noteIds where user has explicit permissions for O(1) lookup
  const permittedNoteIds = new Set(userPermissions.map((perm) => perm.noteId))

  // Batch load all candidate notes (single Promise.all instead of N queries)
  const candidateNotes = await Promise.all(candidateNoteIds.map((id) => ctx.db.get(id)))

  // Filter accessible notes using functional approach
  const accessibleNoteIds = candidateNotes
    .map((note, idx) => ({ note, noteId: candidateNoteIds[idx]! }))
    .filter(({ note }) => note !== null)
    .filter(({ note }) => {
      // User has access if they own the note OR have explicit permission
      const isOwner = note!.ownerId === userId
      const hasPermission = permittedNoteIds.has(note!._id)
      return isOwner || hasPermission
    })
    .map(({ noteId }) => noteId)

  return accessibleNoteIds
}
