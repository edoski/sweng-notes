import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "../schema"
import { setupUser, createNote, grantPermission, createTag, linkNoteTag, mockIdentity } from "./test_helpers"

describe("note_permissions query and management", () => {
  describe("loadAccessibleNotes", () => {
    it("should return only owned notes when user has no shared access", async () => {
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "owner")

      const noteId1 = await createNote(t, identity, "Note 1")
      const noteId2 = await createNote(t, identity, "Note 2")

      const { loadAccessibleNotes } = await import("./note_permissions")
      await t.run(async (ctx) => {
        const result = await loadAccessibleNotes(ctx, userId)

        expect(result.size).toBe(2)
        expect(result.get(noteId1)?.permission).toBe("owner")
        expect(result.get(noteId1)?.note._id).toBe(noteId1)
        expect(result.get(noteId2)?.permission).toBe("owner")
        expect(result.get(noteId2)?.note._id).toBe(noteId2)
      })
    })

    it("should return owned and shared notes with correct permissions", async () => {
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))

      const userIdentity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, userIdentity, "user")
      const ownedNoteId = await createNote(t, userIdentity, "Owned Note")

      // Another user shares a note
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const sharedNoteId = await createNote(t, ownerIdentity, "Shared Note", { visibility: "public" })
      await grantPermission(t, sharedNoteId, userId, "editor")

      const { loadAccessibleNotes } = await import("./note_permissions")
      await t.run(async (ctx) => {
        const result = await loadAccessibleNotes(ctx, userId)

        expect(result.size).toBe(2)
        expect(result.get(ownedNoteId)?.permission).toBe("owner")
        expect(result.get(ownedNoteId)?.note.title).toBe("Owned Note")
        expect(result.get(sharedNoteId)?.permission).toBe("editor")
        expect(result.get(sharedNoteId)?.note.title).toBe("Shared Note")
      })
    })
  })

  describe("revokeAllCollaborators", () => {
    it("should delete all permissions for note", async () => {
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Shared Note", { visibility: "public" })

      const reader1Identity = mockIdentity("reader1-123", "reader1")
      const reader1Id = await setupUser(t, reader1Identity, "reader1")
      await grantPermission(t, noteId, reader1Id, "reader")

      const reader2Identity = mockIdentity("reader2-123", "reader2")
      const reader2Id = await setupUser(t, reader2Identity, "reader2")
      await grantPermission(t, noteId, reader2Id, "editor")

      const { revokeAllCollaborators } = await import("./note_permissions")
      await t.run(async (ctx) => {
        await revokeAllCollaborators(ctx, noteId)
      })

      // Verify all permissions were deleted
      const permissions = await t.run(async (ctx) => {
        return await ctx.db.query("notePermissions").withIndex("by_note", (q) => q.eq("noteId", noteId)).collect()
      })
      expect(permissions).toHaveLength(0)
    })

    it("should prune shared tags when revoking collaborators", async () => {
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Tagged Note", { visibility: "public" })

      // Add tags to note
      const tagId = await createTag(t, ownerId, "typescript")
      await linkNoteTag(t, noteId, tagId)

      // Share with collaborator (tag gets copied to collaborator)
      const readerIdentity = mockIdentity("reader-123", "reader")
      const readerId = await setupUser(t, readerIdentity, "reader")
      await grantPermission(t, noteId, readerId, "reader")

      // Manually create shared tag for collaborator (simulating what sharing does)
      const sharedTagId = await createTag(t, readerId, "typescript", noteId)

      const { revokeAllCollaborators } = await import("./note_permissions")
      await t.run(async (ctx) => {
        await revokeAllCollaborators(ctx, noteId)
      })

      // Verify shared tag was pruned (if no longer in use)
      const collaboratorTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("tags")
          .withIndex("by_owner_name", (q) => q.eq("ownerId", readerId).eq("name", "typescript"))
          .collect()
      })

      // Tag should be deleted if not used elsewhere
      expect(collaboratorTags).toHaveLength(0)
    })
  })
})
