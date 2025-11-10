import { getPresenceInfo } from "./presence-info"

/**
 * Builds standardized Liveblocks user info for UserMeta.
 * Used by both server-side auth and client-side resolvers.
 */
export function buildLiveblocksUserInfo(
  clerkId: string,
  username: string,
): { name: string; color: string; avatar: string } {
  const { color, avatar } = getPresenceInfo(clerkId)
  return {
    name: username,
    color,
    avatar,
  }
}
