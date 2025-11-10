import { ConvexError } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { z } from "zod/v3"
import { zid } from "convex-helpers/server/zod"
import { authedQuery, authedMutation, zMutation, zQuery } from "./lib/zod"
import { deleteAllNoteTags } from "./lib/note_tags"
import { revokeAllCollaborators } from "./lib/note_permissions"
import { internal } from "./_generated/api"

const ClerkIdListSchema = z
  .array(
    z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1, "Clerk ID is required")),
  )
  .transform((ids) => {
    const seen = new Set<string>()
    const unique: string[] = []
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id)
        unique.push(id)
      }
    }
    return unique
  })

const UserIdListSchema = z
  .array(zid("users"))
  .transform((ids) => {
    const seen = new Set<string>()
    const unique: Id<"users">[] = []
    for (const id of ids) {
      const key = id as unknown as string
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(id)
      }
    }
    return unique
  })

/**
 * Ensures a user record exists for the current authenticated Clerk user.
 * Creates the user if they don't exist. Idempotent - safe to call multiple times.
 * Called automatically by EnsureConvexUserTask on sign-in.
 */
export const ensure = zMutation({
  args: {},
  handler: async (ctx) => {
    // Get identity directly (don't use requireViewer to avoid old lazy-creation logic)
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError("Your session expired. Please sign in again.")
    }

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (existing) {
      return {
        id: existing.clerkId,
        username: existing.username,
      }
    }

    // Create new user record
    const username = identity.preferredUsername!.trim()
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      username,
      updatedAt: Date.now(),
    })

    const created = await ctx.db.get(userId)
    if (!created) {
      throw new ConvexError("We couldn't create your user account. Please try again.")
    }

    return {
      id: created.clerkId,
      username: created.username,
    }
  },
})

/**
 * Get user by Clerk ID
 * Used by Liveblocks authentication to resolve user profiles for real-time collaboration
 * See: src/lib/liveblocks-server-utils.ts
 */
export const getByClerkId = zQuery({
  args: {
    clerkId: z.string(),
  },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique()

    if (!user) {
      return null
    }

    return {
      id: user._id,
      username: user.username,
      clerkId: user.clerkId,
    }
  },
})

export const resolveProfiles = authedQuery({
  args: {
    clerkIds: ClerkIdListSchema,
  },
  handler: async (ctx, { clerkIds }) => {
    if (clerkIds.length === 0) {
      return []
    }

    const profiles = await Promise.all(
      clerkIds.map(async (clerkId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
          .unique()

        if (!user) {
          return null
        }

        return {
          clerkId,
          userId: user._id,
          username: user.username,
        }
      }),
    )

    return profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null)
  },
})

export const resolveClerkIdentities = authedQuery({
  args: {
    userIds: UserIdListSchema,
  },
  handler: async (ctx, { userIds }) => {
    if (userIds.length === 0) {
      return []
    }
    const records = await Promise.all(userIds.map((userId) => ctx.db.get(userId)))
    return records
      .filter((record): record is NonNullable<typeof record> => Boolean(record))
      .map((record) => ({
        userId: record._id,
        clerkId: record.clerkId,
        username: record.username,
      }))
  },
})

/**
 * Delete current user account and cascade delete all associated data.
 * Called from frontend when user requests account deletion.
 */
export const deleteAccount = authedMutation({
  args: {},
  handler: async (ctx) => {
    const user = ctx.viewer.user

    // 1. Delete all notes owned by the user
    const ownedNotes = await ctx.db
      .query("notes")
      .withIndex("by_ownerId_updatedAt", (q) => q.eq("ownerId", user._id))
      .collect()

    for (const note of ownedNotes) {
      // Delete note versions
      const versions = await ctx.db
        .query("noteVersions")
        .withIndex("by_note", (q) => q.eq("noteId", note._id))
        .collect()
      await Promise.all(versions.map((v) => ctx.db.delete(v._id)))

      // Delete note tags
      await deleteAllNoteTags(ctx, note._id)

      // Revoke all collaborators (deletes permissions and prunes their shared tags)
      await revokeAllCollaborators(ctx, note._id)

      // Schedule Liveblocks room deletion
      await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, {
        roomId: note._id,
      })

      // Delete the note itself
      await ctx.db.delete(note._id)
    }

    // 2. Delete permissions where user is a collaborator
    const collaboratorPermissions = await ctx.db
      .query("notePermissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
    await Promise.all(collaboratorPermissions.map((p) => ctx.db.delete(p._id)))

    // 3. Delete all user's tags (both owned and shared)
    const userTags = await ctx.db
      .query("tags")
      .withIndex("by_owner_name", (q) => q.eq("ownerId", user._id))
      .collect()
    await Promise.all(userTags.map((tag) => ctx.db.delete(tag._id)))

    // 4. Delete the user record
    await ctx.db.delete(user._id)
  },
})
