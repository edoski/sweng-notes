/**
 * Permission-related queries for tracking user access to notes.
 *
 * This module provides queries for fetching all permissions granted to the current user,
 * enabling notifications for permission changes without relying on filtered note lists.
 */

import { authedQuery } from "./lib/zod"

/**
 * Fetches all permissions for the authenticated user.
 *
 * Returns an array of permission objects with note and owner details.
 * Handles cases where notes or owners may have been deleted.
 *
 * @returns Array of permission objects containing:
 *   - permissionId: ID of the permission record
 *   - noteId: ID of the note
 *   - role: "reader" or "editor"
 *   - createdAt: Timestamp when permission was granted
 *   - noteTitle: Title of the note (null if note deleted)
 *   - ownerUsername: Username of note owner (null if owner deleted)
 */
export const myPermissions = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx.viewer

    // Query all permissions for this user using the by_user index
    const permissions = await ctx.db
      .query("notePermissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    // Map permissions to include note and owner details
    const permissionsWithDetails = await Promise.all(
      permissions.map(async (permission) => {
        const note = await ctx.db.get(permission.noteId)
        const owner = note ? await ctx.db.get(note.ownerId) : null

        return {
          permissionId: permission._id,
          noteId: permission.noteId,
          role: permission.role,
          createdAt: permission._creationTime,
          noteTitle: note?.title ?? null,
          ownerUsername: owner?.username ?? null,
        }
      })
    )

    return permissionsWithDetails
  },
})