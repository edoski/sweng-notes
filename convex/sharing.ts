import { ConvexError } from "convex/values"
import { z } from "zod/v3"
import { zid } from "convex-helpers/server/zod"
import type { Doc } from "./_generated/dataModel"
import { ensureTags, pruneTag } from "./lib/tags"
import { noteMutation, noteQuery } from "./lib/zod"
import { getNoteTags } from "./lib/note_tags"

const collaboratorRoleSchema = z.enum(["reader", "editor"])

const UsernameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Username is required"))

export const listCollaborators = noteQuery({
  optional: true,
  requirePermission: ["owner", "reader", "editor"],
})({
  args: {},
  handler: async (ctx) => {
    if (ctx.noteAccess.status !== "ok") {
      return null
    }

    const { note, permission } = ctx.noteAccess

    const owner = await ctx.db.get(note.ownerId)
    if (!owner) throw new ConvexError("We couldn't load the note owner. Please refresh and try again.")

    let collaborators: Array<{
      userId: string
      username: string
      role: "reader" | "editor"
      joinedAt: number
    }> = []

    if (note.visibility === "public") {
      const permissions = await ctx.db
        .query("notePermissions")
        .withIndex("by_note", (q) => q.eq("noteId", note._id))
        .collect()

      const users = await Promise.all(permissions.map((entry) => ctx.db.get(entry.userId)))

      collaborators = permissions
        .map((entry, index) => ({ entry, user: users[index] }))
        .filter((item): item is { entry: Doc<"notePermissions">; user: Doc<"users"> } => Boolean(item.user))
        .map(({ entry, user }) => ({
          userId: user._id,
          username: user.username,
          role: entry.role,
          joinedAt: entry._creationTime,
        }))
    }

    return {
      visibility: note.visibility,
      owner: {
        userId: owner._id,
        username: owner.username,
      },
      collaborators,
      canManage: permission === "owner",
    }
  },
})

export const grantAccess = noteMutation({
  requirePermission: "owner",
})({
  args: {
    username: UsernameSchema,
    role: collaboratorRoleSchema,
  },
  handler: async (ctx, { username, role }) => {
    // Permission already validated by builder - safe to destructure
    const { note } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" }
    const { user } = ctx.viewer

    if (note.visibility !== "public") {
      throw new ConvexError("Make the note public before adding collaborators.")
    }

    const target = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", username)).unique()

    if (!target) {
      throw new ConvexError("We couldn't find anyone with that username.")
    }
    if (target._id === user._id) {
      throw new ConvexError("The owner already has full access.")
    }

    const existing = await ctx.db
      .query("notePermissions")
      .withIndex("by_note_user", (q) => q.eq("noteId", note._id).eq("userId", target._id))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { role })
    } else {
      await ctx.db.insert("notePermissions", {
        noteId: note._id,
        userId: target._id,
        role,
      })
    }

    const noteTags = await getNoteTags(ctx, note._id)
    if (noteTags.length > 0) {
      await ensureTags(ctx, target._id, noteTags, { sharedFromNoteId: note._id })
    }

    return {
      userId: target._id,
      username: target.username,
      role,
    }
  },
})

export const revokeAccess = noteMutation({
  requirePermission: "owner",
})({
  args: {
    userId: zid("users"),
  },
  handler: async (ctx, { userId }) => {
    // Permission already validated by builder - safe to destructure
    const { note } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" }

    if (userId === note.ownerId) {
      throw new ConvexError("You can't remove the owner from the note.")
    }

    const entry = await ctx.db
      .query("notePermissions")
      .withIndex("by_note_user", (q) => q.eq("noteId", note._id).eq("userId", userId))
      .unique()

    if (entry) {
      await ctx.db.delete(entry._id)
    }

    const noteTags = await getNoteTags(ctx, note._id)
    await Promise.all(noteTags.map((tag) => pruneTag(ctx, userId, tag)))

    return { userId }
  },
})