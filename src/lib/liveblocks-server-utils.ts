import { auth, clerkClient } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { buildLiveblocksUserInfo } from "./liveblocks-user-info"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("liveblocks-server")

export interface AuthenticatedConvexClient {
  convex: ConvexHttpClient
  userId: string
}

/**
 * Authenticate the current request and create an authenticated Convex client
 * Uses Clerk auth() helper for App Router and returns null if auth fails
 */
export async function getAuthenticatedConvexClient(
  convexUrl: string,
): Promise<AuthenticatedConvexClient | null> {
  const requestAuth = await auth()
  const userId = requestAuth?.userId
  const sessionId = requestAuth?.sessionId
  const getToken = requestAuth?.getToken

  if (!userId || !getToken) {
    return null
  }

  // Try to get Convex token from Clerk
  let convexToken = await getToken({ template: "convex" })

  // Fallback: get token via Clerk client if session exists
  if (!convexToken && sessionId) {
    try {
      const clerk = await clerkClient()
      const token = await clerk.sessions.getToken(sessionId, "convex")
      convexToken = token.jwt
    } catch (error) {
      log.error("Failed to fetch Convex token via clerkClient", {
        userId,
        sessionId,
        error,
      })
    }
  }

  if (!convexToken) {
    return null
  }

  const convex = new ConvexHttpClient(convexUrl)
  convex.setAuth(convexToken)

  return { convex, userId }
}

export interface LiveblocksUserProfile {
  name: string
  color: string
  avatar: string
}

/**
 * Resolve a user's display name, color, and avatar from Convex
 * Falls back to "Collaborator" if user not found
 */
export async function resolveLiveblocksUserProfile(
  convex: ConvexHttpClient,
  clerkId: string,
): Promise<LiveblocksUserProfile> {
  const fallbackName = "Collaborator"

  try {
    const user = await convex.query(api.users.getByClerkId, { clerkId }).catch(() => null)
    const username = user?.username ?? fallbackName
    return buildLiveblocksUserInfo(clerkId, username)
  } catch {
    return buildLiveblocksUserInfo(clerkId, fallbackName)
  }
}

export interface NoteAccess {
  canEdit: boolean
}

/**
 * Check if the authenticated user has access to a note
 * Returns null if note doesn't exist or user lacks permission
 */
export async function authorizeNoteAccess(
  convex: ConvexHttpClient,
  noteId: Id<"notes"> | null,
): Promise<NoteAccess | null> {
  if (!noteId) {
    return null
  }

  try {
    const result = await convex.query(api.notes.queries.get, { noteId })
    if (!result) {
      return null
    }
    return { canEdit: result.canEdit }
  } catch (error) {
    log.error("Failed to authorize note access", {
      noteId,
      error,
    })
    return null
  }
}