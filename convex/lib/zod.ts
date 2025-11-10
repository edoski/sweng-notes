/**
 * Custom Convex function builders with authentication and authorization.
 *
 * This module provides a set of builder functions that wrap convex-helpers'
 * zCustomQuery, zCustomMutation, and zCustomAction with authentication and
 * authorization logic.
 *
 * ## Architecture
 *
 * The builders use a factory pattern where options are captured in closures:
 * 1. Factory function accepts options (e.g., noteQuery(options))
 * 2. Returns a builder that has the options baked in
 * 3. Builder is used to define the actual function with args and handler
 *
 * ## Available Builders
 *
 * ### Base Builders (no auth)
 * - `zQuery`, `zMutation`
 * - `zInternalQuery`, `zInternalMutation`, `zInternalAction` - Internal functions
 *
 * ### Authenticated Builders (require login)
 * - `authedQuery`, `authedMutation` - Add `ctx.viewer` to context
 *
 * ### Note-Scoped Builders (require note access)
 * - `noteQuery(options?)` - Query with note access check
 * - `noteMutation(options?)` - Mutation with note access check
 *
 * Note: Actions are not included in authenticated/note-scoped builders because
 * Convex actions don't have direct database access and must use runQuery/runMutation
 * for data operations.
 *
 * ## Usage Examples
 *
 * ### Basic authenticated query
 * ```typescript
 * export const myQuery = authedQuery({
 *   args: { name: z.string() },
 *   handler: async (ctx, args) => {
 *     // ctx.viewer.user is available
 *     return `Hello ${args.name}!`
 *   }
 * })
 * ```
 *
 * ### Note-scoped mutation with default behavior
 * ```typescript
 * export const updateTitle = noteMutation()({
 *   args: { title: z.string() },
 *   handler: async (ctx, args) => {
 *     // ctx.viewer and ctx.noteAccess are available
 *     // args.noteId is automatically added
 *     if (ctx.noteAccess.status !== "ok") throw new Error("No access")
 *     await ctx.db.patch(args.noteId, { title: args.title })
 *   }
 * })
 * ```
 *
 * ### Require specific permission
 * ```typescript
 * export const deleteNote = noteMutation({
 *   requirePermission: "owner"
 * })({
 *   args: {},
 *   handler: async (ctx) => {
 *     // Only owners can call this - automatic check
 *     const { note } = ctx.noteAccess as { status: "ok", ... }
 *     await ctx.db.delete(note._id)
 *   }
 * })
 * ```
 *
 * ### Optional access (don't throw on failure)
 * ```typescript
 * export const getNoteIfAllowed = noteQuery({ optional: true })({
 *   args: {},
 *   handler: async (ctx) => {
 *     // Handler is called even if access fails
 *     if (ctx.noteAccess.status !== "ok") {
 *       return null
 *     }
 *     return ctx.noteAccess.note
 *   }
 * })
 * ```
 */

import {
  internalAction,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { NoOp } from "convex-helpers/server/customFunctions"
import { ConvexError, v } from "convex/values"
import { zCustomAction, zCustomMutation, zCustomQuery } from "convex-helpers/server/zod"
import { requireViewer } from "./auth"
import { fetchNoteAccess, type NoteAccessStatus, type NotePermission } from "./note_access"
import type { Id } from "../_generated/dataModel"

// ============================================================================
// Context Types
// ============================================================================

export type ViewerContext = Awaited<ReturnType<typeof requireViewer>>

export interface AuthedCtx {
  viewer: ViewerContext
}

export interface NoteCtx extends AuthedCtx {
  noteAccess: NoteAccessStatus
}

// ============================================================================
// Note Builder Options
// ============================================================================

export interface NoteBuilderOptions {
  /**
   * If true, the handler will be called even if note access fails.
   * The handler should check `ctx.noteAccess.status` before proceeding.
   */
  optional?: boolean

  /**
   * Required permission(s) to access the note.
   * If an array is provided, the user needs to have ANY of the listed permissions (OR logic).
   */
  requirePermission?: NotePermission | NotePermission[]

  /**
   * Custom error message when the note is not found.
   * @default "Note not found"
   */
  notFoundMessage?: string

  /**
   * Custom error message when the user lacks permission.
   * @default "Access denied" (queries/actions) or "Insufficient permissions" (mutations)
   */
  unauthorizedMessage?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

type AnyCtx = QueryCtx | MutationCtx

const normalizeRequiredPermissions = (
  value: NoteBuilderOptions["requirePermission"],
): NotePermission[] | null => {
  if (!value) {
    return null
  }
  return Array.isArray(value) ? value : [value]
}

const createAuthedInput = async (ctx: AnyCtx) => ({
  ctx: {
    viewer: await requireViewer(ctx),
  } satisfies AuthedCtx,
  args: {},
})

const createNoteScopedInput = (
  options?: NoteBuilderOptions,
  defaultUnauthorizedMessage = "Access denied",
) =>
  async (ctx: AnyCtx, args: Record<string, unknown>) => {
    // Reuse authentication logic from createAuthedInput
    const { ctx: authedCtx } = await createAuthedInput(ctx)
    const viewer = authedCtx.viewer

    const opts = options ?? {}
    const requiredPermissions = normalizeRequiredPermissions(opts.requirePermission)

    const noteId = args.noteId as Id<"notes">
    let access = await fetchNoteAccess(ctx, noteId, viewer.user._id)

    // Downgrade access to unauthorized if user lacks required permission
    if (access.status === "ok" && requiredPermissions && !requiredPermissions.includes(access.permission)) {
      access = { status: "unauthorized" }
    }

    // Throw error if access failed and not optional
    if (access.status !== "ok" && !opts.optional) {
      if (access.status === "not_found") {
        throw new ConvexError(opts.notFoundMessage ?? "We couldn't find that note. It may have been deleted.")
      }
      throw new ConvexError(opts.unauthorizedMessage ?? defaultUnauthorizedMessage)
    }

    return {
      ctx: {
        viewer,
        noteAccess: access,
      } satisfies NoteCtx,
      args: args,
    }
  }

// ============================================================================
// Base Builders (no authentication or authorization)
// ============================================================================

export const zQuery = zCustomQuery(query, NoOp)
export const zMutation = zCustomMutation(mutation, NoOp)
export const zInternalAction = zCustomAction(internalAction, NoOp)

// ============================================================================
// Authenticated Builders (require user to be logged in)
// ============================================================================

export const authedQuery = zCustomQuery(query, {
  args: {},
  input: createAuthedInput,
})

export const authedMutation = zCustomMutation(mutation, {
  args: {},
  input: createAuthedInput,
})

// ============================================================================
// Note-Scoped Builders (require authentication + note access)
// ============================================================================

/**
 * Creates a query builder with authentication and note access checking.
 *
 * @example
 * ```typescript
 * // Default behavior (any permission)
 * export const myQuery = noteQuery()({
 *   args: { title: z.string() },
 *   handler: async (ctx, args) => {
 *     // ctx.viewer and ctx.noteAccess are available
 *     // args.noteId and args.title are available
 *   }
 * })
 *
 * // Require specific permission
 * export const myQuery = noteQuery({ requirePermission: "editor" })({
 *   args: { title: z.string() },
 *   handler: async (ctx, args) => {
 *     // Only users with editor permission can call this
 *   }
 * })
 *
 * // Optional access (don't throw on failure)
 * export const myQuery = noteQuery({ optional: true })({
 *   args: {},
 *   handler: async (ctx, args) => {
 *     if (ctx.noteAccess.status !== "ok") {
 *       return null
 *     }
 *     // Proceed with note access
 *   }
 * })
 * ```
 */
export const noteQuery = (options?: NoteBuilderOptions) =>
  zCustomQuery(query, {
    args: {
      noteId: v.id("notes"),
    },
    input: createNoteScopedInput(options, "Access denied"),
  })

/**
 * Creates a mutation builder with authentication and note access checking.
 *
 * Usage is similar to `noteQuery()`.
 */
export const noteMutation = (options?: NoteBuilderOptions) =>
  zCustomMutation(mutation, {
    args: {
      noteId: v.id("notes"),
    },
    input: createNoteScopedInput(options, "Insufficient permissions"),
  })