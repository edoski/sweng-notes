import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { sanitizeTagName } from "./validation"

export async function ensureTags(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  tags: string[],
  options?: { sharedFromNoteId?: Id<"notes"> },
): Promise<Id<"tags">[]> {
  // Deduplicate and sanitize tags
  const uniqueTags = Array.from(
    new Set(tags.map((tag) => sanitizeTagName(tag))),
  )

  const sharedFromNoteId = options?.sharedFromNoteId

  // Create tags that don't exist, return all tag IDs
  // Relies on Convex's OCC (Optimistic Concurrency Control) to handle race conditions
  const tagIds = await Promise.all(
    uniqueTags.map(async (tagName) => {
      // Check if tag already exists for this user
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_owner_name", (q) => q.eq("ownerId", ownerId).eq("name", tagName))
        .unique()

      if (existing) {
        // Convert shared tag to local if being used locally
        if (existing.sharedFromNoteId && !sharedFromNoteId) {
          await ctx.db.patch(existing._id, { sharedFromNoteId: undefined })
        }
        return existing._id
      }

      // Create new tag
      // If another transaction creates the same tag concurrently,
      // Convex's OCC will detect the stale read and automatically retry this mutation
      const tagId = await ctx.db.insert("tags", {
        ownerId,
        name: tagName,
        sharedFromNoteId,
      })

      return tagId
    }),
  )

  return tagIds
}

/**
 * Prunes unused tag entries for a user.
 *
 * @param ctx - Mutation context
 * @param ownerId - User ID who owns the tag entry
 * @param tagName - Tag name to prune
 *
 * Deletes the tag if no noteTags entries reference it.
 * Race conditions are automatically handled by Convex's OCC (Optimistic Concurrency Control).
 * If another transaction adds a noteTag entry concurrently, this mutation will retry.
 */
export async function pruneTag(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  tagName: string,
) {
  // Find the tag entry
  const tag = await ctx.db
    .query("tags")
    .withIndex("by_owner_name", (q) => q.eq("ownerId", ownerId).eq("name", tagName))
    .unique()

  if (!tag) {
    // Tag doesn't exist, nothing to prune
    return
  }

  // Check if any noteTags entries reference this tag
  const tagInUse = await ctx.db
    .query("noteTags")
    .withIndex("by_tag_note_id", (q) => q.eq("tagId", tag._id))
    .first()

  if (tagInUse) {
    // Tag is still in use, don't delete
    return
  }

  // Safe to delete - Convex's OCC ensures atomicity
  // If another transaction adds a noteTag entry between the check and delete,
  // Convex will detect the stale read and automatically retry this mutation
  await ctx.db.delete(tag._id)
}
