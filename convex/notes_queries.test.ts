import { convexTest } from "convex-test"
import { expect, describe, it } from "vitest"
import { ConvexError } from "convex/values"
import { api } from "./_generated/api"
import schema from "./schema"
import { setupUser, createNote, grantPermission, createTag, linkNoteTag, mockIdentity } from "./lib/test_helpers"

describe("notes query functions", () => {
  describe("list", () => {
    it("should return all accessible notes for authenticated user", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const note1Id = await createNote(t, identity, "First Note", { content: "Content 1" })
      const note2Id = await createNote(t, identity, "Second Note", { content: "Content 2" })

      const result = await t.withIdentity(identity).query(api.notes.queries.list, {})

      expect(result).toHaveLength(2)
      expect(result.map(n => n.id).sort()).toEqual([note1Id, note2Id].sort())
    })

    it("should filter by tags", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")

      const note1Id = await createNote(t, identity, "Note 1")
      const note2Id = await createNote(t, identity, "Note 2")
      const note3Id = await createNote(t, identity, "Note 3")

      const tag1Id = await createTag(t, userId, "typescript")
      const tag2Id = await createTag(t, userId, "testing")

      await linkNoteTag(t, note1Id, tag1Id)
      await linkNoteTag(t, note2Id, tag1Id)
      await linkNoteTag(t, note2Id, tag2Id)
      await linkNoteTag(t, note3Id, tag2Id)

      const result = await t.withIdentity(identity).query(api.notes.queries.list, {
        tags: ["typescript"]
      })

      expect(result).toHaveLength(2)
      expect(result.map(n => n.id).sort()).toEqual([note1Id, note2Id].sort())
    })

    it("should include shared notes in results", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const readerIdentity = mockIdentity("reader-456", "reader")

      await setupUser(t, ownerIdentity, "owner")
      const readerId = await setupUser(t, readerIdentity, "reader")

      const sharedNoteId = await createNote(t, ownerIdentity, "Shared Note", { visibility: "public" })
      await grantPermission(t, sharedNoteId, readerId, "reader")

      const result = await t.withIdentity(readerIdentity).query(api.notes.queries.list, {})

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(sharedNoteId)
      expect(result[0]?.sharedRole).toBe("reader")
      expect(result[0]?.canEdit).toBe(false)
    })

    it("should throw error if not authenticated", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      await expect(
        t.query(api.notes.queries.list, {})
      ).rejects.toThrow(ConvexError)
    })
  })

  describe("get", () => {
    it("should return note for owner", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const noteId = await createNote(t, identity, "My Note", { content: "Content" })

      const result = await t.withIdentity(identity).query(api.notes.queries.get, { noteId })

      expect(result).toBeTruthy()
      expect(result?.id).toBe(noteId)
      expect(result?.title).toBe("My Note")
      expect(result?.content).toBe("Content")
      expect(result?.sharedRole).toBe("owner")
      expect(result?.canEdit).toBe(true)
    })

    it("should return null for unauthorized access", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const otherIdentity = mockIdentity("other-456", "other")

      await setupUser(t, ownerIdentity, "owner")
      await setupUser(t, otherIdentity, "other")

      const noteId = await createNote(t, ownerIdentity, "Private Note")

      const result = await t.withIdentity(otherIdentity).query(api.notes.queries.get, { noteId })

      expect(result).toBeNull()
    })
  })

  describe("getMentionSuggestions", () => {
    it("should return collaborators for public notes", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const user1Identity = mockIdentity("user1-456", "user1")
      const user2Identity = mockIdentity("user2-789", "user2")

      await setupUser(t, ownerIdentity, "owner")
      const user1Id = await setupUser(t, user1Identity, "collaborator1")
      const user2Id = await setupUser(t, user2Identity, "collaborator2")

      const noteId = await createNote(t, ownerIdentity, "Public Note", { visibility: "public" })
      await grantPermission(t, noteId, user1Id, "reader")
      await grantPermission(t, noteId, user2Id, "editor")

      const result = await t.withIdentity(ownerIdentity).query(api.notes.queries.getMentionSuggestions, {
        noteId,
        text: ""
      })

      expect(result).toHaveLength(3) // owner + 2 collaborators
      expect(result).toContain("owner-123")
      expect(result).toContain("user1-456")
      expect(result).toContain("user2-789")
    })

    it("should return empty array for private notes", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const noteId = await createNote(t, identity, "Private Note")

      const result = await t.withIdentity(identity).query(api.notes.queries.getMentionSuggestions, {
        noteId,
        text: ""
      })

      expect(result).toEqual([])
    })
  })
})