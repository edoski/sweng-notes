import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"
import type { NotePermission } from "./note_access"
import { getNoteTags } from "./note_tags"
import { pruneTag } from "./tags"

type AnyCtx = QueryCtx | MutationCtx

export interface NoteAccessEntry {
  note: Doc<"notes">
  permission: NotePermission
}

/**
 * Loads all notes accessible to the user with their permissions.
 * Returns a map for O(1) lookups, avoiding repeated permission queries
 * and eliminating double-fetching of note documents.
 */
export async function loadAccessibleNotes(
  ctx: AnyCtx,
  userId: Id<"users">,
): Promise<Map<Id<"notes">, NoteAccessEntry>> {
  const entries = new Map<Id<"notes">, NoteAccessEntry>()

  // Fetch owned notes
  const ownedNotes = await ctx.db
    .query("notes")
    .withIndex("by_ownerId_updatedAt", (q) => q.eq("ownerId", userId))
    .collect()

  for (const note of ownedNotes) {
    entries.set(note._id, { note, permission: "owner" })
  }

  // Fetch shared permissions and hydrate notes
  const sharedPermissions = await ctx.db
    .query("notePermissions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()

  const sharedNotes = await Promise.all(sharedPermissions.map((share) => ctx.db.get(share.noteId)))

  for (let i = 0; i < sharedPermissions.length; i++) {
    const note = sharedNotes[i]
    const share = sharedPermissions[i]!
    if (note && note.visibility === "public") {
      entries.set(note._id, { note, permission: share.role })
    }
  }

  return entries
}

interface RevokeCollaboratorsOptions {
  noteTags?: string[]
}

/**
 * Remove every collaborator from a note and prune their shared tags.
 * Accepts pre-fetched tags to avoid reloading data the caller already has.
 */
export async function revokeAllCollaborators(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  options?: RevokeCollaboratorsOptions,
): Promise<void> {
  const permissions = await ctx.db
    .query("notePermissions")
    .withIndex("by_note", (q) => q.eq("noteId", noteId))
    .collect()

  if (permissions.length === 0) {
    return
  }

  await Promise.all(permissions.map((entry) => ctx.db.delete(entry._id)))

  const noteTags = options?.noteTags ?? (await getNoteTags(ctx, noteId))
  if (noteTags.length === 0) {
    return
  }

  await Promise.all(
    permissions.flatMap((entry) => noteTags.map((tag) => pruneTag(ctx, entry.userId, tag))),
  )
}
