import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

/**
 * Get current user (read-only query)
 * Returns null if user doesn't exist yet
 * Use ensure mutation to create user on first login
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    return user ?? null
  },
})

/**
 * Ensure user exists (create if needed)
 * Called by providers on app load to proactively create user record
 */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user) {
      // Create user on first login
      const username = identity.preferredUsername || identity.name || `user-${identity.subject.slice(-6)}`
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        username,
        updatedAt: Date.now(),
      })
      user = await ctx.db.get(userId)
    }

    return user
  },
})

/**
 * Get user by Clerk ID
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique()
  },
})
