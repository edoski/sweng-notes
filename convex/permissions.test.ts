import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"
import { api } from "./_generated/api"
import { setupUser, createNote, grantPermission, mockIdentity } from "./lib/test_helpers"

describe("permissions query functions", () => {
  describe("myPermissions", () => {
    it("should return empty array for user with no permissions", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")

      const result = await t.withIdentity(identity).query(api.permissions.myPermissions, {})

      expect(result).toEqual([])
    })

    it("should return permission with note and owner details", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      // Owner creates note
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Shared Note", { visibility: "public" })

      // Collaborator gets permission
      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      await grantPermission(t, noteId, collabId, "reader")

      const result = await t.withIdentity(collabIdentity).query(api.permissions.myPermissions, {})

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        noteId,
        role: "reader",
        noteTitle: "Shared Note",
        ownerUsername: "owner",
      })
      expect(result[0]?.permissionId).toBeDefined()
      expect(result[0]?.createdAt).toBeTypeOf("number")
    })

    it("should return multiple permissions with different roles", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const note1Id = await createNote(t, ownerIdentity, "Note 1", { visibility: "public" })
      const note2Id = await createNote(t, ownerIdentity, "Note 2", { visibility: "public" })

      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      await grantPermission(t, note1Id, collabId, "reader")
      await grantPermission(t, note2Id, collabId, "editor")

      const result = await t.withIdentity(collabIdentity).query(api.permissions.myPermissions, {})

      expect(result).toHaveLength(2)

      const readerPerm = result.find(p => p.noteId === note1Id)
      const editorPerm = result.find(p => p.noteId === note2Id)

      expect(readerPerm?.role).toBe("reader")
      expect(readerPerm?.noteTitle).toBe("Note 1")
      expect(readerPerm?.ownerUsername).toBe("owner")

      expect(editorPerm?.role).toBe("editor")
      expect(editorPerm?.noteTitle).toBe("Note 2")
      expect(editorPerm?.ownerUsername).toBe("owner")
    })

    it("should return null for noteTitle when note is deleted", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })

      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      await grantPermission(t, noteId, collabId, "reader")

      // Delete the note
      await t.run(async (ctx) => {
        await ctx.db.delete(noteId)
      })

      const result = await t.withIdentity(collabIdentity).query(api.permissions.myPermissions, {})

      expect(result).toHaveLength(1)
      expect(result[0]?.noteTitle).toBeNull()
      expect(result[0]?.ownerUsername).toBeNull() // Owner can't be fetched if note is deleted
      expect(result[0]?.noteId).toBe(noteId)
      expect(result[0]?.role).toBe("reader")
    })

    it("should return null for ownerUsername when owner is deleted", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Note", { visibility: "public" })

      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      await grantPermission(t, noteId, collabId, "reader")

      // Delete the owner
      await t.run(async (ctx) => {
        await ctx.db.delete(ownerId)
      })

      const result = await t.withIdentity(collabIdentity).query(api.permissions.myPermissions, {})

      expect(result).toHaveLength(1)
      expect(result[0]?.noteTitle).toBe("Note") // Note still exists
      expect(result[0]?.ownerUsername).toBeNull() // But owner is deleted
      expect(result[0]?.noteId).toBe(noteId)
      expect(result[0]?.role).toBe("reader")
    })

    it("should return complete data with all fields", async () => {
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Complete Note", { visibility: "public" })

      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      const permissionId = await grantPermission(t, noteId, collabId, "editor")

      const result = await t.withIdentity(collabIdentity).query(api.permissions.myPermissions, {})

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        permissionId,
        noteId,
        role: "editor",
        createdAt: expect.any(Number),
        noteTitle: "Complete Note",
        ownerUsername: "owner",
      })
    })
  })
})
