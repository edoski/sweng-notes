import { z } from "zod/v3"
import type { Doc, Id } from "../_generated/dataModel"
import type { NoteVisibility } from "./validation"
import type { NotePermission } from "./note_access"

// Re-export types for convenience
export type { NoteVisibility, NotePermission }

/**
 * Note interface for API responses
 */
export interface Note {
  id: Id<"notes">
  title: string
  content: string
  tags: string[]
  visibility: NoteVisibility
  createdAt: number
  updatedAt: number
  owner: {
    id: string
    username: string
  }
  canEdit: boolean
  sharedRole: NotePermission
  version: number
  activeVersionId: Id<"noteVersions"> | null
}

/**
 * Convert a note document to a note response
 */
export const toNote = (
  note: Doc<"notes">,
  owner: Doc<"users">,
  permission: NotePermission,
  tags: string[],
): Note => ({
  id: note._id,
  title: note.title,
  content: note.content,
  tags,
  visibility: note.visibility as NoteVisibility,
  createdAt: note._creationTime,
  updatedAt: note.updatedAt,
  owner: {
    id: owner.clerkId,
    username: owner.username,
  },
  canEdit: permission === "owner" || permission === "editor",
  sharedRole: permission,
  version: note.version,
  activeVersionId: (note.activeVersionId as Id<"noteVersions"> | undefined) ?? null,
})

/**
 * Schema for note list filtering arguments
 */
export const NoteListArgsSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().min(1).optional(),
  date: z
    .object({
      key: z.string(),
      mode: z.enum(["created", "modified"]).optional(),
    })
    .optional(),
})
