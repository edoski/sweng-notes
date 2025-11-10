import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import {
  MAX_NOTE_TITLE_LENGTH,
  NoteTitleSchema,
  sanitizeNoteTitle,
} from "./validation"

type AnyCtx = MutationCtx | QueryCtx

function computeBaseFragment(baseTitle: string, suffix: number): string {
  const suffixText = ` (${suffix})`
  const maxBaseLength = MAX_NOTE_TITLE_LENGTH - suffixText.length
  if (maxBaseLength <= 0) {
    return ""
  }
  return baseTitle.slice(0, maxBaseLength).trimEnd()
}

export function generateUniqueTitle(baseTitle: string, existingTitles: string[]): string {
  const normalizedBase = baseTitle.trim()
  if (normalizedBase.length === 0) {
    return "Untitled"
  }

  const existingLower = new Set(existingTitles.map((title) => title.trim().toLowerCase()))
  const baseLower = normalizedBase.toLowerCase()

  if (!existingLower.has(baseLower)) {
    return normalizedBase
  }

  let suffix = 2
  while (true) {
    const suffixText = ` (${suffix})`
    const baseFragment = computeBaseFragment(normalizedBase, suffix)
    const candidate = baseFragment ? `${baseFragment}${suffixText}` : suffixText.trim()
    const candidateLower = candidate.toLowerCase()

    if (!existingLower.has(candidateLower)) {
      return candidate
    }

    existingLower.add(candidateLower)
    suffix += 1
  }
}

export async function ensureUniqueTitle(
  ctx: AnyCtx,
  ownerId: Id<"users">,
  desiredTitle: string,
  options?: { excludeNoteId?: Id<"notes"> },
): Promise<string> {
  const normalizedBase = sanitizeNoteTitle(desiredTitle)

  const existingNotes = await ctx.db
    .query("notes")
    .withIndex("by_ownerId_updatedAt", (q) => q.eq("ownerId", ownerId))
    .collect()

  const filteredTitles = options?.excludeNoteId
    ? existingNotes.filter((note) => note._id !== options.excludeNoteId).map((note) => note.title)
    : existingNotes.map((note) => note.title)

  const uniqueTitle = generateUniqueTitle(normalizedBase, filteredTitles)
  return NoteTitleSchema.parse(uniqueTitle)
}
