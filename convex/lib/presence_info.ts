/**
 * Presence avatar and color generation for Liveblocks.
 * Combines deterministic color selection and DiceBear avatar generation.
 */

const PRESENCE_COLORS = [
  "#F97316", // Orange
  "#0EA5E9", // Sky blue
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#14B8A6", // Teal
] as const

export type PresenceColor = (typeof PRESENCE_COLORS)[number]

/**
 * Hash a string seed to a deterministic number.
 */
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate presence info (color and avatar) from a seed.
 * Uses deterministic hashing to ensure the same seed always produces the same result.
 *
 * @param seed - Unique identifier (typically clerkId)
 * @returns Object with color (hex) and avatar (DiceBear URL)
 */
export function getPresenceInfo(seed: string): {
  color: PresenceColor
  avatar: string
} {
  const hash = hashSeed(seed)
  const color = PRESENCE_COLORS[hash % PRESENCE_COLORS.length]
  const colorParam = color.replace("#", "")

  // DiceBear bottts-neutral style with seeded background color (PNG for Clerk compatibility)
  const avatar = `https://api.dicebear.com/9.x/bottts-neutral/png?seed=${encodeURIComponent(seed)}&backgroundColor=${colorParam}`

  return { color, avatar }
}
