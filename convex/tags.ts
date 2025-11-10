import { ConvexError } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { TagNameSchema } from "./lib/validation"
import { ensureTags } from "./lib/tags"
import { getNoteTags } from "./lib/note_tags"
import { authedMutation, authedQuery } from "./lib/zod"

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx.viewer

    // Fetch all user's tags (both local and shared)
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id))
      .collect()

    // Count note usage for each tag via tagId join
    const tagUsageCounts = new Map<Id<"tags">, Set<Id<"notes">>>()

    for (const tag of tags) {
      const noteTagEntries = await ctx.db
        .query("noteTags")
        .withIndex("by_tag_note_id", (q) => q.eq("tagId", tag._id))
        .collect()

      const noteIds = new Set(noteTagEntries.map((nt) => nt.noteId))
      tagUsageCounts.set(tag._id, noteIds)
    }

    // Return simplified tag list
    return tags
      .map((tag) => ({
        name: tag.name,
        shared: Boolean(tag.sharedFromNoteId),
        createdAt: tag._creationTime,
        noteCount: tagUsageCounts.get(tag._id)?.size ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const create = authedMutation({
  args: {
    name: TagNameSchema,
  },
  handler: async (ctx, { name }) => {
    const { user } = ctx.viewer

    await ensureTags(ctx, user._id, [name])

    const tag = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id).eq("name", name))
      .unique()

    if (!tag) {
      throw new ConvexError("We couldn't create that tag. Please try again.")
    }

    return {
      name: tag.name,
      createdAt: tag._creationTime,
      noteCount: 0,
      shared: Boolean(tag.sharedFromNoteId),
    }
  },
})

export const rename = authedMutation({
  args: {
    fromName: TagNameSchema,
    toName: TagNameSchema,
  },
  handler: async (ctx, { fromName, toName }) => {
    const { user } = ctx.viewer

    if (fromName === toName) {
      return { name: toName }
    }

    // Find the tag to rename
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id).eq("name", fromName))
      .unique()

    if (!tag) {
      throw new ConvexError("We couldn't find that tag. It may have been removed.")
    }

    // Check if new name already exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id).eq("name", toName))
      .unique()

    if (existing) {
      throw new ConvexError("A tag with that name already exists.")
    }

    // Single update to tags table - all noteTags entries automatically reflect the new name
    // This is O(1) thanks to the normalized schema (foreign key tagId instead of embedded strings)
    await ctx.db.patch(tag._id, { name: toName })

    return { name: toName }
  },
})

export const remove = authedMutation({
  args: {
    name: TagNameSchema,
  },
  handler: async (ctx, { name }) => {
    const { user } = ctx.viewer

    // Find the tag to delete
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id).eq("name", name))
      .unique()

    if (!tag) {
      // Tag doesn't exist, nothing to do
      return { name }
    }

    // Check if tag should be kept as shared before deleting
    // If the user still has access to shared notes with this tag, convert it to shared
    const collaborativePermissions = await ctx.db
      .query("notePermissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    let shouldConvertToShared = false
    let sharedFromNoteId: Id<"notes"> | undefined

    for (const perm of collaborativePermissions) {
      const note = await ctx.db.get(perm.noteId)
      if (!note) continue

      const noteTags = await getNoteTags(ctx, note._id)
      if (noteTags.includes(name)) {
        shouldConvertToShared = true
        sharedFromNoteId = note._id
        break // Only need one shared note reference
      }
    }

    // Delete all noteTags entries for this tag (cascade)
    const noteTagEntries = await ctx.db
      .query("noteTags")
      .withIndex("by_tag_note_id", (q) => q.eq("tagId", tag._id))
      .collect()

    await Promise.all(noteTagEntries.map((entry) => ctx.db.delete(entry._id)))

    if (shouldConvertToShared) {
      // Convert to shared tag instead of deleting
      await ctx.db.patch(tag._id, { sharedFromNoteId })
    } else {
      // No shared notes use this tag, safe to delete
      await ctx.db.delete(tag._id)
    }

    return { name }
  },
})
