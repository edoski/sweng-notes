import { ConvexError } from "convex/values"
import { z } from "zod/v3"
import { zid } from "convex-helpers/server/zod"
import type { Doc } from "./_generated/dataModel"
import { sanitizeNoteTitle } from "./lib/validation"
import { ensureUniqueTitle } from "./lib/note_titles"
import { noteQuery, noteMutation } from "./lib/zod"

const toVersionDto = (version: Doc<"noteVersions">) => ({
  id: version._id,
  noteId: version.noteId,
  ownerId: version.ownerId,
  createdAt: version._creationTime,
  title: version.title,
  snapshot: version.snapshot,
})

export const list = noteQuery({
  requirePermission: "owner",
  unauthorizedMessage: "Only owners can view version history",
})({
  args: {
    limit: z.number().int().min(1).optional(),
  },
  handler: async (ctx, { limit }) => {
    const { note } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" }

    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect()

    const sorted = versions.sort((a, b) => a._creationTime - b._creationTime)
    const sliced = limit ? sorted.slice(0, limit) : sorted

    return Promise.all(
      sliced.map(async (version, index) => {
        const owner = await ctx.db.get(version.ownerId)
        return {
          ...toVersionDto(version),
          versionNumber: index + 1,
          ownerUsername: owner?.username ?? "Unknown",
        }
      })
    )
  },
})

/**
 * List versions with UI-ready display fields (owner label, isCurrent flag)
 * Optimized for version history UI - computes display logic server-side
 */
export const listForDisplay = noteQuery({
  requirePermission: "owner",
  unauthorizedMessage: "Only owners can view version history",
})({
  args: {
    limit: z.number().int().min(1).optional(),
  },
  handler: async (ctx, { limit }) => {
    const { note } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" }
    const { user: currentUser } = ctx.viewer

    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect()

    const sorted = versions.sort((a, b) => a._creationTime - b._creationTime)
    const sliced = limit ? sorted.slice(0, limit) : sorted

    return Promise.all(
      sliced.map(async (version, index) => {
        const owner = await ctx.db.get(version.ownerId)
        const ownerUsername = owner?.username ?? "Unknown"
        const versionNumber = index + 1

        // Compute display fields server-side
        const ownerLabel = ownerUsername === currentUser.username ? "You" : ownerUsername
        const isCurrent = note.activeVersionId
          ? version._id === note.activeVersionId
          : versionNumber === note.version

        return {
          ...toVersionDto(version),
          versionNumber,
          ownerUsername,
          ownerLabel,
          isCurrent,
        }
      })
    )
  },
})

export const restore = noteMutation({
  requirePermission: "owner",
})({
  args: {
    versionId: zid("noteVersions"),
  },
  handler: async (ctx, { versionId, noteId }) => {
    const { note } = ctx.noteAccess as { note: Doc<"notes"> }

    const version = await ctx.db.get(versionId)
    if (!version) throw new ConvexError("We couldn't find that version. It may have been removed.")

    // Verify version belongs to this note
    if (version.noteId !== noteId) {
      throw new ConvexError("This version doesn't belong to the current note.")
    }

    const allVersions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect()
    const orderedVersions = allVersions.sort((a, b) => a._creationTime - b._creationTime)
    const versionIndex = orderedVersions.findIndex((entry) => entry._id === version._id)
    if (versionIndex === -1) {
      throw new ConvexError("We couldn't find that version in the history.")
    }

    const restoredVersionNumber = versionIndex + 1
    const sanitizedTitle = sanitizeNoteTitle(version.title)
    const resolvedTitle = await ensureUniqueTitle(ctx, note.ownerId, sanitizedTitle, {
      excludeNoteId: note._id,
    })

    await ctx.db.patch(note._id, {
      title: resolvedTitle,
      content: version.snapshot,
      updatedAt: Date.now(),
      version: restoredVersionNumber,
      activeVersionId: version._id,
    })

    return { status: "restored" as const }
  },
})