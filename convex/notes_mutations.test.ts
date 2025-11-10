import { convexTest } from "convex-test"
import { expect, describe, it } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { setupUser, createNote, grantPermission, mockIdentity } from "./lib/test_helpers"

describe("notes mutation functions", () => {
  describe("create", () => {
    it("should create note with title and content", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")

      const result = await t.withIdentity(identity).mutation(api.notes.mutations.create, {
        title: "My Note",
        content: "Note content",
        tags: [],
        visibility: "private"
      })

      expect(result.title).toBe("My Note")
      expect(result.content).toBe("Note content")
      expect(result.visibility).toBe("private")
      expect(result.sharedRole).toBe("owner")
      expect(result.canEdit).toBe(true)
      expect(result.tags).toEqual([])

      // Verify note was created in database
      const note = await t.run(async (ctx) => await ctx.db.get(result.id))
      expect(note).toBeTruthy()
      expect(note?.title).toBe("My Note")
    })

    it("should create note with tags", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const result = await t.withIdentity(identity).mutation(api.notes.mutations.create, {
        title: "Tagged Note",
        content: "Content",
        tags: ["typescript", "testing"],
        visibility: "private"
      })

      expect(result.tags).toEqual(["typescript", "testing"])

      // Verify tags were created
      const tags = await t.run(async (ctx) => {
        return await ctx.db.query("tags").collect()
      })
      expect(tags).toHaveLength(2)
    })

    it("should create initial version", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const result = await t.withIdentity(identity).mutation(api.notes.mutations.create, {
        title: "Versioned Note",
        content: "Initial content",
        tags: [],
        visibility: "private"
      })

      // Verify initial version was created
      const versions = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteVersions")
          .withIndex("by_note", (q) => q.eq("noteId", result.id))
          .collect()
      })

      expect(versions).toHaveLength(1)
      expect(versions[0]?.title).toBe("Versioned Note")
      expect(versions[0]?.snapshot).toBe("Initial content")
    })
  })

  describe("update", () => {
    it("should update title", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const noteId = await createNote(t, identity, "Original Title")

      const result = await t.withIdentity(identity).mutation(api.notes.mutations.update, {
        noteId,
        title: "Updated Title"
      })

      expect(result.title).toBe("Updated Title")
    })

    it("should throw error if editor tries to update tags", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const editorIdentity = mockIdentity("editor-456", "editor")

      await setupUser(t, ownerIdentity, "owner")
      const editorId = await setupUser(t, editorIdentity, "editor")

      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })
      await grantPermission(t, noteId, editorId, "editor")

      await expect(
        t.withIdentity(editorIdentity).mutation(api.notes.mutations.update, {
          noteId,
          tags: ["newtag"]
        })
      ).rejects.toThrow("Only the note owner can manage tags")
    })

    it("should revoke collaborators when downgrading to private", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const collaboratorIdentity = mockIdentity("collab-456", "collab")

      await setupUser(t, ownerIdentity, "owner")
      const collabId = await setupUser(t, collaboratorIdentity, "collab")

      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })
      await grantPermission(t, noteId, collabId, "reader")

      await t.withIdentity(ownerIdentity).mutation(api.notes.mutations.update, {
        noteId,
        visibility: "private"
      })

      // Verify permission was revoked
      const permissions = await t.run(async (ctx) => {
        return await ctx.db
          .query("notePermissions")
          .withIndex("by_note", (q) => q.eq("noteId", noteId))
          .collect()
      })

      expect(permissions).toHaveLength(0)
    })

    it("should throw error if reader tries to update", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const readerIdentity = mockIdentity("reader-456", "reader")

      await setupUser(t, ownerIdentity, "owner")
      const readerId = await setupUser(t, readerIdentity, "reader")

      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })
      await grantPermission(t, noteId, readerId, "reader")

      await expect(
        t.withIdentity(readerIdentity).mutation(api.notes.mutations.update, {
          noteId,
          title: "Attempted Edit"
        })
      ).rejects.toThrow("Insufficient permissions to edit")
    })
  })

  describe("remove", () => {
    it("should allow owner to delete note", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const noteId = await createNote(t, identity, "Note to Delete")

      const result = await t.withIdentity(identity).mutation(api.notes.mutations.remove, { noteId })

      expect(result.status).toBe("deleted")

      // Verify note was deleted
      const note = await t.run(async (ctx) => await ctx.db.get(noteId))
      expect(note).toBeNull()
    })
  })
})