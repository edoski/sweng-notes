import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

/**
 * List all notes owned by current user (vanilla Convex - no custom builders)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user) {
      return []
    }

    // Get all notes owned by user
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect()

    // Map notes to response format (tags already on note!)
    return notes.map((note) => ({
      id: note._id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      visibility: note.visibility,
      createdAt: note._creationTime,
      updatedAt: note.updatedAt,
      owner: {
        id: user.clerkId,
        username: user.username,
      },
      canEdit: true, // Owner can always edit
    }))
  },
})

/**
 * Get single note by ID
 */
export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const note = await ctx.db.get(noteId)
    if (!note) {
      return null
    }

    // Simple owner check (no permission system yet)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user || note.ownerId !== user._id) {
      return null
    }

    return {
      id: note._id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      visibility: note.visibility,
      createdAt: note._creationTime,
      updatedAt: note.updatedAt,
      owner: {
        id: user.clerkId,
        username: user.username,
      },
      canEdit: true,
    }
  },
})

/**
 * Create a new note
 */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, { title, content, tags, visibility }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user) {
      throw new Error("User not found")
    }

    // Create note with tags
    const noteId = await ctx.db.insert("notes", {
      ownerId: user._id,
      title: title || "Untitled",
      content,
      tags,
      visibility,
      updatedAt: Date.now(),
    })

    return noteId
  },
})

/**
 * Update an existing note
 */
export const update = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  },
  handler: async (ctx, { noteId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const note = await ctx.db.get(noteId)
    if (!note) {
      throw new Error("Note not found")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user || note.ownerId !== user._id) {
      throw new Error("Not authorized")
    }

    // Build patch object
    const patch: Record<string, unknown> = {}
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.content !== undefined) patch.content = updates.content
    if (updates.tags !== undefined) patch.tags = updates.tags
    if (updates.visibility !== undefined) patch.visibility = updates.visibility

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = Date.now()
      await ctx.db.patch(noteId, patch)
    }
  },
})

/**
 * Delete a note
 */
export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const note = await ctx.db.get(noteId)
    if (!note) {
      throw new Error("Note not found")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user || note.ownerId !== user._id) {
      throw new Error("Not authorized")
    }

    // Delete note (tags deleted automatically as part of note)
    await ctx.db.delete(noteId)
  },
})

/**
 * Duplicate a note
 */
export const duplicate = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const note = await ctx.db.get(noteId)
    if (!note) {
      throw new Error("Note not found")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user || note.ownerId !== user._id) {
      throw new Error("Not authorized")
    }

    // Create duplicate with copied tags
    const duplicateId = await ctx.db.insert("notes", {
      ownerId: user._id,
      title: `${note.title} (Copy)`,
      content: note.content,
      tags: note.tags,
      visibility: "private", // Always create duplicates as private
      updatedAt: Date.now(),
    })

    return duplicateId
  },
})

