import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import type { UserIdentity } from "convex/server"

type AnyCtx = QueryCtx | MutationCtx

/**
 * Gets the current authenticated user from the database.
 * Returns null if no identity or user record doesn't exist.
 * Does NOT create user records - use users.ensure for that.
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

export async function requireViewer(ctx: AnyCtx): Promise<{ user: Doc<"users">; identity: UserIdentity }> {
  const current = await getViewer(ctx)
  if (!current) {
    throw new ConvexError("Your session expired. Please sign in again.")
  }
  return current
}