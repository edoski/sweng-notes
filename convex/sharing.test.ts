import { convexTest } from "convex-test"
import { expect, describe, it } from "vitest"
import { ConvexError } from "convex/values"
import { api } from "./_generated/api"
import schema from "./schema"
import { setupUser, createNote, grantPermission, mockIdentity } from "./lib/test_helpers"

describe("sharing collaboration functions", () => {
  describe("listCollaborators", () => {
    it("should return null when user has no access", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const otherIdentity = mockIdentity("other-456", "other")

      const ownerId = await setupUser(t, ownerIdentity, "owner")
      await setupUser(t, otherIdentity, "other")

      const noteId = await createNote(t, ownerIdentity, "Private Note")

      const result = await t.withIdentity(otherIdentity).query(api.sharing.listCollaborators, { noteId })
      expect(result).toBeNull()
    })

    it("should return correct structure for owner with canManage: true", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Test Note")

      const result = await t.withIdentity(ownerIdentity).query(api.sharing.listCollaborators, { noteId })

      expect(result).toBeTruthy()
      expect(result?.visibility).toBe("private")
      expect(result?.owner).toEqual({
        userId: ownerId,
        username: "owner"
      })
      expect(result?.collaborators).toEqual([])
      expect(result?.canManage).toBe(true)
    })

    it("should return correct structure for reader with canManage: false", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const readerIdentity = mockIdentity("reader-456", "reader")

      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const readerId = await setupUser(t, readerIdentity, "reader")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { content: "content", visibility: "public" })
      await grantPermission(t, noteId, readerId, "reader")

      const result = await t.withIdentity(readerIdentity).query(api.sharing.listCollaborators, { noteId })

      expect(result).toBeTruthy()
      expect(result?.visibility).toBe("public")
      expect(result?.owner.userId).toBe(ownerId)
      expect(result?.collaborators).toHaveLength(1)
      expect(result?.collaborators[0]).toMatchObject({
        userId: readerId,
        username: "reader",
        role: "reader"
      })
      expect(result?.canManage).toBe(false)
    })
  })

  describe("grantAccess", () => {
    it("should throw error for non-owner", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const readerIdentity = mockIdentity("reader-456", "reader")

      await setupUser(t, ownerIdentity, "owner")
      const readerId = await setupUser(t, readerIdentity, "reader")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { content: "content", visibility: "public" })
      await grantPermission(t, noteId, readerId, "reader")

      await expect(
        t.withIdentity(readerIdentity).mutation(api.sharing.grantAccess, {
          noteId,
          username: "someone",
          role: "reader"
        })
      ).rejects.toThrow(ConvexError)
    })

    it("should throw error if note is private", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      await setupUser(t, mockIdentity("target-789"), "target")

      const noteId = await createNote(t, ownerIdentity, "Private Note")

      await expect(
        t.withIdentity(ownerIdentity).mutation(api.sharing.grantAccess, {
          noteId,
          username: "target",
          role: "reader"
        })
      ).rejects.toThrow("Make the note public before adding collaborators.")
    })

    it("should create new permission entry", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const targetId = await setupUser(t, mockIdentity("target-789"), "target")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { content: "content", visibility: "public" })

      const result = await t.withIdentity(ownerIdentity).mutation(api.sharing.grantAccess, {
        noteId,
        username: "target",
        role: "reader"
      })

      expect(result).toEqual({
        userId: targetId,
        username: "target",
        role: "reader"
      })

      // Verify permission was created
      const permissions = await t.run(async (ctx) => {
        return await ctx.db
          .query("notePermissions")
          .withIndex("by_note_user", (q) => q.eq("noteId", noteId).eq("userId", targetId))
          .unique()
      })

      expect(permissions).toBeTruthy()
      expect(permissions?.role).toBe("reader")
    })
  })

  describe("revokeAccess", () => {
    it("should delete permission entry", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const readerId = await setupUser(t, mockIdentity("reader-456", "reader"), "reader")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { content: "content", visibility: "public" })
      await grantPermission(t, noteId, readerId, "reader")

      const result = await t.withIdentity(ownerIdentity).mutation(api.sharing.revokeAccess, {
        noteId,
        userId: readerId
      })

      expect(result).toEqual({ userId: readerId })

      // Verify permission was deleted
      const permissions = await t.run(async (ctx) => {
        return await ctx.db
          .query("notePermissions")
          .withIndex("by_note_user", (q) => q.eq("noteId", noteId).eq("userId", readerId))
          .unique()
      })

      expect(permissions).toBeNull()
    })

    it("should throw error if trying to revoke owner", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { content: "content", visibility: "public" })

      await expect(
        t.withIdentity(ownerIdentity).mutation(api.sharing.revokeAccess, {
          noteId,
          userId: ownerId
        })
      ).rejects.toThrow("You can't remove the owner from the note.")
    })
  })
})