import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"
import { api } from "./_generated/api"
import {
  setupUser,
  createNote,
  createVersion,
  grantPermission,
  mockIdentity,
} from "./lib/test_helpers"

describe("versions management functions", () => {
  describe("list", () => {
    it("should throw error for non-owner", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })

      const readerIdentity = mockIdentity("reader-123", "reader")
      const readerId = await setupUser(t, readerIdentity, "reader")
      await grantPermission(t, noteId, readerId, "reader")

      await expect(
        t.withIdentity(readerIdentity).query(api.versions.list, { noteId })
      ).rejects.toThrow("Only owners can view version history")
    })

    it("should return empty array for note with no versions", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")
      const noteId = await createNote(t, identity, "Note")

      const result = await t.withIdentity(identity).query(api.versions.list, { noteId })

      expect(result).toEqual([])
    })

    it("should return versions sorted by creation time (oldest first)", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")
      const noteId = await createNote(t, identity, "Note")

      // Create versions (they'll have incrementing timestamps)
      const version1Id = await createVersion(t, noteId, userId, "Version 1", "content 1")
      const version2Id = await createVersion(t, noteId, userId, "Version 2", "content 2")
      const version3Id = await createVersion(t, noteId, userId, "Version 3", "content 3")

      const result = await t.withIdentity(identity).query(api.versions.list, { noteId })

      expect(result).toHaveLength(3)
      expect(result[0]?.id).toBe(version1Id)
      expect(result[1]?.id).toBe(version2Id)
      expect(result[2]?.id).toBe(version3Id)
      expect(result[0]?.versionNumber).toBe(1)
      expect(result[1]?.versionNumber).toBe(2)
      expect(result[2]?.versionNumber).toBe(3)
    })
  })

  describe("restore", () => {
    it("should throw error if version not found", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")
      const noteId = await createNote(t, identity, "Note")

      // Create a valid version ID then delete it to simulate "not found"
      const versionId = await createVersion(t, noteId, userId, "Version", "content")
      await t.run(async (ctx) => {
        await ctx.db.delete(versionId)
      })

      await expect(
        t.withIdentity(identity).mutation(api.versions.restore, {
          noteId,
          versionId,
        })
      ).rejects.toThrow("We couldn't find that version")
    })

    it("should restore note to previous version", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")
      const noteId = await createNote(t, identity, "Current Title", { content: "current content" })

      // Get note before restore
      const noteBefore = await t.run(async (ctx) => await ctx.db.get(noteId))
      const timestampBefore = noteBefore!.updatedAt

      const versionId = await createVersion(t, noteId, userId, "Old Title", "old content")

      const result = await t.withIdentity(identity).mutation(api.versions.restore, {
        noteId,
        versionId,
      })

      expect(result.status).toBe("restored")

      // Verify note was updated
      const updatedNote = await t.run(async (ctx) => await ctx.db.get(noteId))
      expect(updatedNote?.title).toBe("Old Title")
      expect(updatedNote?.content).toBe("old content")
      expect(updatedNote?.activeVersionId).toBe(versionId)

      // Verify updatedAt changed
      expect(updatedNote!.updatedAt).toBeGreaterThan(timestampBefore)
    })
  })
})