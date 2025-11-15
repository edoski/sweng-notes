import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import type { UserIdentity } from "convex/server"

type AnyCtx = QueryCtx | MutationCtx

/**
 * Gets the current authenticated user from the database.
 * Returns null if no identity or user record doesn't exist.
 * Does NOT create user records - use requireViewer for auto-ensure behavior.
 */
export async function getViewer(ctx: AnyCtx): Promise<{ user: Doc<"users">; identity: UserIdentity } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique()

  if (!user) {
    return null
  }

  return { user, identity }
}

/**
 * Gets the current authenticated user for queries.
 * Throws if no authenticated session exists or user record not found.
 * Use this for queries (read-only operations).
 */
export async function requireViewer(ctx: QueryCtx): Promise<{ user: Doc<"users">; identity: UserIdentity }> {
  const current = await getViewer(ctx)
  if (!current) {
    throw new ConvexError("Your session expired. Please sign in again.")
  }
  return current
}

/**
 * Gets the current authenticated user for mutations, auto-creating the user record if needed.
 * This is idempotent - safe to call multiple times for the same user.
 * Throws if no authenticated session exists.
 * Use this for mutations (write operations).
 */
export async function requireViewerMutation(ctx: MutationCtx): Promise<{ user: Doc<"users">; identity: UserIdentity }> {
  // Get identity first - throw if not authenticated
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError("Your session expired. Please sign in again.")
  }

  // Check if user already exists
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique()

  // Auto-create user if doesn't exist (idempotent)
  if (!user) {
    const username = identity.preferredUsername?.trim()
    if (!username) {
      throw new ConvexError("Your session expired. Please sign in again.")
    }

    try {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        username,
      })

      const created = await ctx.db.get(userId)
      if (!created) {
        throw new ConvexError("We couldn't create your user account. Please try again.")
      }

      user = created
    } catch (error) {
      // Race condition: Another concurrent mutation may have created the user
      // Re-query to get the record
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique()

      if (!user) {
        // Still null - truly failed, propagate error
        throw error
      }
      // User was created by concurrent mutation - continue normally
    }
  }

  return { user, identity }
}