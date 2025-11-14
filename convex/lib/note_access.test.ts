import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import { ConvexError } from "convex/values"
import schema from "../schema"
import { setupUser, createNote, grantPermission, mockIdentity } from "./test_helpers"
import type { Doc, Id } from "../_generated/dataModel"

describe("note_access permission resolution", () => {
  describe("resolvePermission", () => {
    it("should return 'owner' for note owner", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "owner")
      const noteId = await createNote(t, identity, "Test Note", { visibility: "private" })

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, userId)
      })

      expect(permission).toBe("owner")
    })

    it("should return null for non-owner of private note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Private Note", { visibility: "private" })

      const otherIdentity = mockIdentity("other-123", "other")
      const otherId = await setupUser(t, otherIdentity, "other")

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, otherId)
      })

      expect(permission).toBeNull()
    })

    it("should return null for public note with no permission entry", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const otherIdentity = mockIdentity("other-123", "other")
      const otherId = await setupUser(t, otherIdentity, "other")

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, otherId)
      })

      expect(permission).toBeNull()
    })

    it("should return 'reader' for public note with reader permission", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const readerIdentity = mockIdentity("reader-123", "reader")
      const readerId = await setupUser(t, readerIdentity, "reader")
      await grantPermission(t, noteId, readerId, "reader")

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, readerId)
      })

      expect(permission).toBe("reader")
    })

    it("should return 'editor' for public note with editor permission", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const editorIdentity = mockIdentity("editor-123", "editor")
      const editorId = await setupUser(t, editorIdentity, "editor")
      await grantPermission(t, noteId, editorId, "editor")

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, editorId)
      })

      expect(permission).toBe("editor")
    })

    it("should return 'owner' for owner regardless of visibility", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "owner")
      const noteId = await createNote(t, identity, "Public Note", { visibility: "public" })

      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, userId)
      })

      expect(permission).toBe("owner")
    })

    it("should return 'owner' even if notePermissions entry exists", async () => {
      // Arrange
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const owner = mockIdentity("owner-123", "owner")
      await setupUser(t, owner, "owner")

      const noteId = await createNote(t, owner, "Test Note", { visibility: "public" })
      const ownerId = await t.run(async (ctx) => {
        return (await ctx.db.get(noteId))!.ownerId
      })

      // Manually create a permission entry for owner (shouldn't happen but defensive test)
      await grantPermission(t, noteId, ownerId, "reader")

      // Act
      const { resolvePermission } = await import("./note_access")
      const permission = await t.run(async (ctx) => {
        const note = await ctx.db.get(noteId)
        return await resolvePermission(ctx, note!, ownerId)
      })

      // Assert - Owner permission wins
      expect(permission).toBe("owner")
    })
  })

  describe("fetchNoteAccess", () => {
    it("should return not_found for non-existent note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      // Create a fake note ID (valid format but doesn't exist in DB)
      const fakeNoteId = "jd7abcdefghijklmnopqrstuvwx" as Id<"notes">

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, fakeNoteId, userId)
      })

      expect(result).toEqual({ status: "not_found" })
    })

    it("should return ok for owner accessing own note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "owner")
      const noteId = await createNote(t, identity, "Test Note")

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, noteId, userId)
      })

      expect(result.status).toBe("ok")
      if (result.status === "ok") {
        expect(result.note._id).toBe(noteId)
        expect(result.permission).toBe("owner")
      }
    })

    it("should return unauthorized for non-owner accessing private note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Private Note", { visibility: "private" })

      const otherIdentity = mockIdentity("other-123", "other")
      const otherId = await setupUser(t, otherIdentity, "other")

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, noteId, otherId)
      })

      expect(result).toEqual({ status: "unauthorized" })
    })

    it("should return unauthorized for public note with no permission", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const otherIdentity = mockIdentity("other-123", "other")
      const otherId = await setupUser(t, otherIdentity, "other")

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, noteId, otherId)
      })

      expect(result).toEqual({ status: "unauthorized" })
    })

    it("should return ok for reader accessing public note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const readerIdentity = mockIdentity("reader-123", "reader")
      const readerId = await setupUser(t, readerIdentity, "reader")
      await grantPermission(t, noteId, readerId, "reader")

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, noteId, readerId)
      })

      expect(result.status).toBe("ok")
      if (result.status === "ok") {
        expect(result.note._id).toBe(noteId)
        expect(result.permission).toBe("reader")
      }
    })

    it("should return ok for editor accessing public note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })

      const editorIdentity = mockIdentity("editor-123", "editor")
      const editorId = await setupUser(t, editorIdentity, "editor")
      await grantPermission(t, noteId, editorId, "editor")

      const { fetchNoteAccess } = await import("./note_access")
      const result = await t.run(async (ctx) => {
        return await fetchNoteAccess(ctx, noteId, editorId)
      })

      expect(result.status).toBe("ok")
      if (result.status === "ok") {
        expect(result.note._id).toBe(noteId)
        expect(result.permission).toBe("editor")
      }
    })
  })

  describe("assertNoteAccess", () => {
    it("should throw ConvexError for not_found status", async () => {
      const { assertNoteAccess } = await import("./note_access")
      const access = { status: "not_found" as const }

      expect(() => assertNoteAccess(access)).toThrow(ConvexError)
      expect(() => assertNoteAccess(access)).toThrow("You don't have permission to access this note.")
    })

    it("should throw ConvexError for unauthorized status", async () => {
      const { assertNoteAccess } = await import("./note_access")
      const access = { status: "unauthorized" as const }

      expect(() => assertNoteAccess(access)).toThrow(ConvexError)
      expect(() => assertNoteAccess(access)).toThrow("You don't have permission to access this note.")
    })

    it("should not throw for ok status", async () => {
      const { assertNoteAccess } = await import("./note_access")
      const access = {
        status: "ok" as const,
        note: { _id: "note123" } as Doc<"notes">,
        permission: "owner" as const,
      }

      expect(() => assertNoteAccess(access)).not.toThrow()
    })
  })
})