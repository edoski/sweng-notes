import { ConvexError } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import {
  NoteCreateInputSchema,
  NoteUpdateArgsSchema,
  sanitizeNoteTitle,
  MAX_NOTE_TITLE_LENGTH,
} from "../lib/validation"
import type { NoteVisibility } from "../lib/validation"
import { ensureTags, pruneTag } from "../lib/tags"
import { ensureUniqueTitle } from "../lib/note_titles"
import { internal } from "../_generated/api"
import { authedMutation, noteMutation } from "../lib/zod"
import { getNoteTags, setNoteTags, deleteAllNoteTags } from "../lib/note_tags"
import { revokeAllCollaborators } from "../lib/note_permissions"
import { toNote } from "../lib/note_helpers"

/**
 * Create a new note
 */
export const create = authedMutation({
  args: NoteCreateInputSchema,
  handler: async (ctx, { title, content, tags, visibility }) => {
    const { user } = ctx.viewer

    const tagIds = await ensureTags(ctx, user._id, tags)

    const now = Date.now()
    const resolvedTitle = await ensureUniqueTitle(ctx, user._id, title)
    const noteId = await ctx.db.insert("notes", {
      ownerId: user._id,
      title: resolvedTitle,
      content,
      visibility,
      updatedAt: now,
      version: 1,
    })

    // Set tags in noteTags table
    await setNoteTags(ctx, noteId, tagIds)

    const initialVersionId = await ctx.db.insert("noteVersions", {
      noteId,
      ownerId: user._id,
      title: resolvedTitle,
      snapshot: content,
    })

    await ctx.db.patch(noteId, {
      activeVersionId: initialVersionId,
    })

    const note = await ctx.db.get(noteId)
    if (!note) throw new ConvexError("Failed to load the created note. Please try again.")

    return toNote(note, user, "owner", tags)
  },
})

/**
 * Update an existing note with field-level permission granularity.
 *
 * This mutation allows both owners and editors (for title/content editing),
 * but enforces owner-only permissions for certain fields (tags, visibility, versions).
 * Field-level permission granularity cannot be expressed purely through requirePermission.
 *
 * Alternative pattern: Separate mutations (e.g., sharing.setVisibility), but that
 * creates chattier API (multiple mutations instead of single atomic update).
 */
export const update = noteMutation({
  requirePermission: ["owner", "editor"],
  unauthorizedMessage: "Insufficient permissions to edit",
})({
  args: NoteUpdateArgsSchema,
  handler: async (ctx, args) => {
    // Permission already validated by builder - safe to destructure
    const { note, permission } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" | "editor" }
    const { user } = ctx.viewer

    const saveVersion = args.saveVersion ?? false
    const patch: Partial<Doc<"notes">> = {}

    // Handle title update - ensure uniqueness
    if (args.title !== undefined) {
      const uniqueTitle = await ensureUniqueTitle(ctx, note.ownerId, args.title, { excludeNoteId: note._id })
      if (uniqueTitle !== note.title) {
        patch.title = uniqueTitle
      }
    }

    // Handle content update
    if (args.content !== undefined && args.content !== note.content) {
      patch.content = args.content
    }

    // Handle tag updates - compute diffs and sync to collaborators
    let collaboratorIds: Id<"users">[] = []
    let addedTags: string[] = []
    let removedTags: string[] = []
    let shouldUpdateNoteTags = false
    let newTagIds: Id<"tags">[] = []

    if (args.tags !== undefined) {
      if (permission !== "owner") {
        throw new ConvexError("Only the note owner can manage tags")
      }

      // Ensure tags exist and get their IDs
      const tagIds = await ensureTags(ctx, note.ownerId, args.tags)

      // Get current tags (as strings for comparison)
      const currentTagNames = await getNoteTags(ctx, note._id)

      // Compute diff (work with tag names for now)
      addedTags = args.tags.filter((tag) => !currentTagNames.includes(tag))
      removedTags = currentTagNames.filter((tag) => !args.tags!.includes(tag))

      // Prune removed tags (no options parameter)
      if (removedTags.length > 0) {
        await Promise.all(removedTags.map((tag) => pruneTag(ctx, note.ownerId, tag)))
      }

      // Only fetch collaborators if tags changed
      if (addedTags.length > 0 || removedTags.length > 0) {
        collaboratorIds = (await ctx.db
          .query("notePermissions")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect()
        ).map((entry) => entry.userId)
      }

      shouldUpdateNoteTags = addedTags.length > 0 || removedTags.length > 0
      newTagIds = tagIds
    }

    // Handle visibility update - owner only
    let nextVisibility: NoteVisibility | undefined
    if (args.visibility !== undefined) {
      if (permission !== "owner") {
        throw new ConvexError("Only the note owner can change visibility.")
      }

      if (note.visibility !== args.visibility) {
        patch.visibility = args.visibility
        nextVisibility = args.visibility
      }
    }

    // Update timestamp if there are changes
    const hasChanges = Object.keys(patch).length > 0 || shouldUpdateNoteTags
    if (hasChanges || saveVersion) {
      patch.updatedAt = Date.now()
    }

    // Handle version increment
    if (saveVersion) {
      if (permission !== "owner") {
        throw new ConvexError("Only the note owner can save versions")
      }

      const existingVersions = await ctx.db
        .query("noteVersions")
        .withIndex("by_note", (q) => q.eq("noteId", note._id))
        .collect()
      const nextVersionNumber = existingVersions.length + 1
      patch.version = nextVersionNumber
    }

    // Apply patch to note
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(note._id, patch)
    }

    // Update tags in noteTags table
    if (shouldUpdateNoteTags) {
      await setNoteTags(ctx, note._id, newTagIds)
    }

    // Sync tags to collaborators
    if (collaboratorIds.length > 0) {
      if (addedTags.length > 0) {
        await Promise.all(
          collaboratorIds.map((userId) => ensureTags(ctx, userId, addedTags, { sharedFromNoteId: note._id })),
        )
      }

      if (removedTags.length > 0) {
        await Promise.all(
          collaboratorIds.flatMap((userId) => removedTags.map((tag) => pruneTag(ctx, userId, tag))),
        )
      }
    }

    // Compute final tags (for visibility downgrade and return value)
    const finalTags = shouldUpdateNoteTags ? args.tags! : await getNoteTags(ctx, note._id)

    // Handle visibility downgrade to private - revoke all collaborators
    if (nextVisibility === "private" && note.visibility !== "private") {
      await revokeAllCollaborators(ctx, note._id, { noteTags: finalTags })
    }

    // Persist version snapshot
    if (saveVersion) {
      const snapshotContent = (patch.content as string | undefined) ?? note.content
      const versionTitle = (patch.title as string | undefined) ?? note.title
      const insertedVersionId = await ctx.db.insert("noteVersions", {
        noteId: note._id,
        ownerId: user._id,
        title: versionTitle,
        snapshot: snapshotContent,
      })
      await ctx.db.patch(note._id, {
        activeVersionId: insertedVersionId,
      })
    }

    // Load and return updated note
    const updatedNote = await ctx.db.get(note._id)
    if (!updatedNote) throw new ConvexError("Failed to load the updated note. Please try again.")
    const owner = note.ownerId === user._id ? user : await ctx.db.get(note.ownerId)
    if (!owner) throw new ConvexError("We couldn't load the note owner. Please refresh and try again.")

    return toNote(updatedNote, owner, permission, finalTags)
  },
})

/**
 * Remove/delete a note (or leave a shared note)
 */
export const remove = noteMutation({
  optional: true,
})({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx.viewer

    if (ctx.noteAccess.status === "not_found") {
      return { status: "ok" as const }
    }

    if (ctx.noteAccess.status !== "ok") {
      throw new ConvexError("You don't have permission to delete this note.")
    }

    const { note, permission } = ctx.noteAccess

    if (permission !== "owner") {
      const share = await ctx.db
        .query("notePermissions")
        .withIndex("by_note_user", (q) => q.eq("noteId", note._id).eq("userId", user._id))
        .unique()
      if (share) {
        await ctx.db.delete(share._id)
      }
      const noteTags = await getNoteTags(ctx, note._id)
      await Promise.all(noteTags.map((tag) => pruneTag(ctx, user._id, tag)))
      return { status: "left" as const }
    }

    await ctx.db.delete(note._id)

    await revokeAllCollaborators(ctx, note._id)

    // Delete all tags for this note
    await deleteAllNoteTags(ctx, note._id)

    const versions = await ctx.db
      .query("noteVersions")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect()
    await Promise.all(versions.map((entry) => ctx.db.delete(entry._id)))

    await ctx.scheduler.runAfter(0, internal.liveblocks.deleteRoom, {
      roomId: note._id,
    })

    return { status: "deleted" as const }
  },
})

/**
 * Duplicate an existing note (create a copy)
 */
export const duplicate = noteMutation({
  unauthorizedMessage: "Access denied",
})({
  args: {},
  handler: async (ctx) => {
    // Permission already validated by builder - safe to destructure
    const { note } = ctx.noteAccess as { status: "ok"; note: Doc<"notes">; permission: "owner" | "editor" | "reader" }
    const { user } = ctx.viewer

    const now = Date.now()
    const baseTitle = sanitizeNoteTitle(note.title)
    let copyTitle = baseTitle.endsWith("(Copy)") ? baseTitle : `${baseTitle} (Copy)`
    if (copyTitle.length > MAX_NOTE_TITLE_LENGTH) {
      copyTitle = copyTitle.slice(0, MAX_NOTE_TITLE_LENGTH)
    }
    copyTitle = sanitizeNoteTitle(copyTitle)
    const ownerId = user._id
    const resolvedCopyTitle = await ensureUniqueTitle(ctx, ownerId, copyTitle)

    // Copy content directly from database (already validated at write time).
    // Do NOT slice here - slicing Markdown at arbitrary position breaks syntax.
    // Frontend enforces 280 visible character UX limit via TipTap CharacterCount.
    // Backend validates Markdown string length (≤10000 chars) at creation/update.
    // Duplication trusts database content (same pattern as version restore in convex/versions.ts).
    const duplicatedContent = note.content

    // Get tags from noteTags table
    const noteTags = await getNoteTags(ctx, note._id)
    const tagIds = await ensureTags(ctx, ownerId, noteTags)

    const visibility: NoteVisibility = "private"

    const duplicatedNoteId = await ctx.db.insert("notes", {
      ownerId,
      title: resolvedCopyTitle,
      content: duplicatedContent,
      visibility,
      updatedAt: now,
      version: 1,
    })

    // Set tags in noteTags table
    await setNoteTags(ctx, duplicatedNoteId, tagIds)

    const duplicatedVersionId = await ctx.db.insert("noteVersions", {
      noteId: duplicatedNoteId,
      ownerId: ownerId,
      title: resolvedCopyTitle,
      snapshot: duplicatedContent,
    })

    await ctx.db.patch(duplicatedNoteId, {
      activeVersionId: duplicatedVersionId,
    })

    const duplicatedNote = await ctx.db.get(duplicatedNoteId)
    if (!duplicatedNote) throw new ConvexError("Failed to load the duplicated note. Please try again.")

    return toNote(duplicatedNote, user, "owner", noteTags)
  },
})
