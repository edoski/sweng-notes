import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"

type AnyCtx = QueryCtx | MutationCtx

/**
 * Batch-loads user documents by IDs, returning a map for O(1) lookups.
 * Deduplicates IDs before fetching.
 */
export async function loadUsersByIds(
  ctx: AnyCtx,
  ids: Iterable<Id<"users">>,
): Promise<Map<Id<"users">, Doc<"users">>> {
  const unique = Array.from(new Set(ids))
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)))
  return new Map(
    docs.filter((doc): doc is Doc<"users"> => Boolean(doc)).map((doc) => [doc._id, doc] as const),
  )
}
