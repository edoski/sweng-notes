import type { Id } from "../_generated/dataModel"
import type { UserIdentity } from "convex/server"

/**
 * Insert a user into the database for testing.
 *
 * @param t - Convex test instance
 * @param identity - Identity object containing subject (clerkId)
 * @param username - Username for the user
 * @returns User ID
 */
export async function setupUser(
  t: ReturnType<typeof import("convex-test").convexTest>,
  identity: { subject: string },
  username: string
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      username,
      updatedAt: Date.now(),
    })
  })
}

/**
 * Create a note owned by the user with given identity.
 *
 * @param t - Convex test instance
 * @param identity - Identity object containing subject (clerkId)
 * @param title - Note title
 * @param options - Optional note properties
 * @returns Note ID
 */
export async function createNote(
  t: ReturnType<typeof import("convex-test").convexTest>,
  identity: { subject: string },
  title: string,
  options?: {
    content?: string
    visibility?: "private" | "public"
    version?: number
  }
): Promise<Id<"notes">> {
  return await t.run(async (ctx) => {
    // Look up user by clerkId
    const user = await ctx.db
      .query("users")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_clerkId" as any, (q: any) => q.eq("clerkId", identity.subject))
      .unique()

    if (!user) {
      throw new Error(`User not found for clerkId: ${identity.subject}`)
    }

    const now = Date.now()
    return await ctx.db.insert("notes", {
      ownerId: user._id,
      title,
      content: options?.content ?? "",
      visibility: options?.visibility ?? "private",
      version: options?.version ?? 1,
      updatedAt: now,
    })
  })
}

/**
 * Grant permission to a user for a note.
 *
 * @param t - Convex test instance
 * @param noteId - ID of the note
 * @param userId - ID of the user to grant permission to
 * @param role - Permission role ("reader" | "editor")
 * @returns Permission ID
 */
export async function grantPermission(
  t: ReturnType<typeof import("convex-test").convexTest>,
  noteId: Id<"notes">,
  userId: Id<"users">,
  role: "reader" | "editor"
): Promise<Id<"notePermissions">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("notePermissions", {
      noteId,
      userId,
      role,
    })
  })
}

/**
 * Create a tag for a user.
 *
 * @param t - Convex test instance
 * @param userId - ID of the tag owner
 * @param name - Tag name
 * @param sharedFromNoteId - Optional note ID that introduced this shared tag
 * @returns Tag ID
 */
export async function createTag(
  t: ReturnType<typeof import("convex-test").convexTest>,
  userId: Id<"users">,
  name: string,
  sharedFromNoteId?: Id<"notes">
): Promise<Id<"tags">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("tags", {
      ownerId: userId,
      name,
      sharedFromNoteId,
    })
  })
}

/**
 * Link a tag to a note.
 *
 * @param t - Convex test instance
 * @param noteId - ID of the note
 * @param tagId - ID of the tag
 * @returns Note-tag relationship ID
 */
export async function linkNoteTag(
  t: ReturnType<typeof import("convex-test").convexTest>,
  noteId: Id<"notes">,
  tagId: Id<"tags">
): Promise<Id<"noteTags">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("noteTags", {
      noteId,
      tagId,
    })
  })
}

/**
 * Create a note version snapshot.
 *
 * @param t - Convex test instance
 * @param noteId - ID of the note
 * @param ownerId - ID of the user who saved this version
 * @param title - Version title
 * @param snapshot - Version content snapshot
 * @returns Version ID
 */
export async function createVersion(
  t: ReturnType<typeof import("convex-test").convexTest>,
  noteId: Id<"notes">,
  ownerId: Id<"users">,
  title: string,
  snapshot: string
): Promise<Id<"noteVersions">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("noteVersions", {
      noteId,
      ownerId,
      title,
      snapshot,
    })
  })
}

/**
 * Creates a minimal mock UserIdentity for testing.
 * Only includes fields actually used in this codebase:
 * - subject: Clerk user ID (used everywhere)
 * - tokenIdentifier: Required by Convex for auth
 * - preferredUsername: Username (defaults to subject if not provided)
 *
 * @param subject - Clerk user ID (clerkId)
 * @param preferredUsername - Username (defaults to subject)
 * @returns Minimal mock UserIdentity object
 */
export function mockIdentity(
  subject: string,
  preferredUsername?: string
): UserIdentity {
  return {
    subject,
    tokenIdentifier: `https://clerk.dev|${subject}`,
    preferredUsername: preferredUsername ?? subject,
  } as UserIdentity
}
