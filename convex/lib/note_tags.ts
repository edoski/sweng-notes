import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

type AnyCtx = QueryCtx | MutationCtx

export async function getNoteTags(ctx: AnyCtx, noteId: Id<"notes">): Promise<string[]> {
  const noteTags = await ctx.db
    .query("noteTags")
    .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
    .collect()

  // Join to tags table to get tag names
  const tags = await Promise.all(noteTags.map((nt) => ctx.db.get(nt.tagId)))

  // Filter out null tags (shouldn't happen but defensive)
  return tags
    .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
    .map((tag) => tag.name)
}

/** Fetches tags for multiple notes in parallel, returning a map for O(1) lookups. */
export async function batchGetNoteTags(
  ctx: AnyCtx,
  noteIds: Id<"notes">[]
): Promise<Map<Id<"notes">, string[]>> {
  const tagArrays = await Promise.all(noteIds.map((id) => getNoteTags(ctx, id)))

  const tagsByNote = new Map<Id<"notes">, string[]>()
  for (let i = 0; i < noteIds.length; i++) {
    tagsByNote.set(noteIds[i]!, tagArrays[i]!)
  }

  return tagsByNote
}

/**
 * Set tags for a note (replaces all existing tags)
 * @param ctx - Mutation context
 * @param noteId - ID of the note
 * @param tagIds - Array of tag IDs from the tags table
 */
export async function setNoteTags(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  tagIds: Id<"tags">[],
): Promise<void> {
  // Remove all existing tags
  const existingTags = await ctx.db
    .query("noteTags")
    .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
    .collect()
  await Promise.all(existingTags.map((nt) => ctx.db.delete(nt._id)))

  // Insert new tags (deduplicate tagIds)
  const uniqueTagIds = Array.from(new Set(tagIds))
  await Promise.all(
    uniqueTagIds.map((tagId) =>
      ctx.db.insert("noteTags", {
        noteId,
        tagId,
      }),
    ),
  )
}

/**
 * Delete all tags for a note (used when deleting the note)
 */
export async function deleteAllNoteTags(ctx: MutationCtx, noteId: Id<"notes">): Promise<void> {
  const noteTags = await ctx.db
    .query("noteTags")
    .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
    .collect()
  await Promise.all(noteTags.map((nt) => ctx.db.delete(nt._id)))
}