import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"

export type NotePermission = "owner" | "reader" | "editor"

type AnyCtx = MutationCtx | QueryCtx

export type NoteAccessStatus =
  | { status: "ok"; note: Doc<"notes">; permission: NotePermission }
  | { status: "not_found" }
  | { status: "unauthorized" }

export async function resolvePermission(
  ctx: AnyCtx,
  note: Doc<"notes">,
  userId: Id<"users">,
): Promise<NotePermission | null> {
  if (note.ownerId === userId) {
    return "owner"
  }

  if (note.visibility === "private") {
    return null
  }

  const share = await ctx.db
    .query("notePermissions")
    .withIndex("by_note_user", (q) => q.eq("noteId", note._id).eq("userId", userId))
    .unique()

  if (!share) {
    return null
  }

  return share.role
}

export async function fetchNoteAccess(
  ctx: AnyCtx,
  noteId: Id<"notes">,
  userId: Id<"users">,
): Promise<NoteAccessStatus> {
  const note = await ctx.db.get(noteId)
  if (!note) {
    return { status: "not_found" }
  }

  const permission = await resolvePermission(ctx, note, userId)
  if (!permission) {
    return { status: "unauthorized" }
  }

  return { status: "ok", note, permission }
}

/**
 * Type assertion helper for note access with runtime validation.
 *
 * Use this when `requirePermission` guarantees access is "ok" (e.g., in note-scoped
 * builders with required permissions). This provides both runtime safety and TypeScript
 * type narrowing, replacing verbose manual checks or type casts.
 *
 * @throws Error if access status is not "ok"
 *
 * @example
 * ```typescript
 * export const myMutation = noteMutation({ requirePermission: "owner" })({
 *   handler: async (ctx) => {
 *     assertNoteAccess(ctx.noteAccess)
 *     const { note } = ctx.noteAccess  // TypeScript knows this is safe
 *   }
 * })
 * ```
 */
export function assertNoteAccess(
  access: NoteAccessStatus,
): asserts access is { status: "ok"; note: Doc<"notes">; permission: NotePermission } {
  if (access.status !== "ok") {
    throw new ConvexError("You don't have permission to access this note.")
  }
}