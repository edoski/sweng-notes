import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "../schema"
import { setupUser, createNote, createTag, linkNoteTag, mockIdentity } from "./test_helpers"

describe("note_tags junction table helpers", () => {
  describe("getNoteTags", () => {
    it("should handle orphaned noteTag references gracefully", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")
      const noteId = await createNote(t, identity, "Test Note")

      const tagId1 = await createTag(t, userId, "valid-tag")
      const tagId2 = await createTag(t, userId, "to-be-deleted")

      await linkNoteTag(t, noteId, tagId1)
      await linkNoteTag(t, noteId, tagId2)

      // Delete the tag directly (simulates orphaned reference scenario)
      await t.run(async (ctx) => {
        await ctx.db.delete(tagId2)
      })

      // Verify orphaned noteTags entries exist (this is the defensive scenario)
      const orphanedNoteTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_tag_note_id", (q) => q.eq("tagId", tagId2))
          .collect()
      })
      // Note: In direct deletion, orphaned entries remain - this tests defensive handling
      expect(orphanedNoteTags).toHaveLength(1)

      const { getNoteTags } = await import("./note_tags")
      const tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })

      // Should filter out null tags and only return valid ones (defensive handling)
      expect(tags).toEqual(["valid-tag"])
    })
  })

  describe("batchGetNoteTags", () => {
    it("should return empty arrays for notes with no tags", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "testuser")

      const noteId = await createNote(t, identity, "Note with no tags")

      const { batchGetNoteTags } = await import("./note_tags")
      // Convert Map to object for testing
      const result = await t.run(async (ctx) => {
        const map = await batchGetNoteTags(ctx, [noteId])
        return {
          size: map.size,
          tags: map.get(noteId),
        }
      })

      expect(result.size).toBe(1)
      expect(result.tags).toEqual([])
    })
  })

  describe("setNoteTags", () => {
    it("should handle empty tags array", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")
      const noteId = await createNote(t, identity, "Test Note")

      const tagId1 = await createTag(t, userId, "typescript")
      const tagId2 = await createTag(t, userId, "react")

      await linkNoteTag(t, noteId, tagId1)
      await linkNoteTag(t, noteId, tagId2)

      const { setNoteTags, getNoteTags } = await import("./note_tags")
      await t.run(async (ctx) => {
        await setNoteTags(ctx, noteId, [])
      })

      const tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })

      expect(tags).toEqual([])

      // Verify database state - should be no noteTags entries
      const noteTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
          .collect()
      })
      expect(noteTags).toHaveLength(0)
    })

    it("should replace all tags atomically", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")
      const noteId = await createNote(t, identity, "Test Note")

      const tagId1 = await createTag(t, userId, "typescript")
      const tagId2 = await createTag(t, userId, "react")
      const tagId3 = await createTag(t, userId, "vue")

      const { setNoteTags, getNoteTags } = await import("./note_tags")

      // Set initial tags
      await t.run(async (ctx) => {
        await setNoteTags(ctx, noteId, [tagId1, tagId2])
      })

      let tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })
      expect(tags).toHaveLength(2)

      // Replace with different tags
      await t.run(async (ctx) => {
        await setNoteTags(ctx, noteId, [tagId3])
      })

      tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })

      expect(tags).toEqual(["vue"])

      // Verify database state - should only have one noteTags entry
      const noteTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
          .collect()
      })
      expect(noteTags).toHaveLength(1)
    })

    it("should deduplicate tags when setting", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")
      const noteId = await createNote(t, identity, "Test Note")

      const tagId = await createTag(t, userId, "typescript")

      const { setNoteTags, getNoteTags } = await import("./note_tags")

      // Pass duplicate tagIds
      await t.run(async (ctx) => {
        await setNoteTags(ctx, noteId, [tagId, tagId, tagId])
      })

      const tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })

      expect(tags).toEqual(["typescript"]) // Only one entry

      // Verify database state - should only have one noteTags entry
      const noteTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
          .collect()
      })
      expect(noteTags).toHaveLength(1)
    })
  })

  describe("deleteAllNoteTags", () => {
    it("should delete all noteTags entries for a note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("../**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "testuser")
      const noteId = await createNote(t, identity, "Test Note")

      const tagId1 = await createTag(t, userId, "typescript")
      const tagId2 = await createTag(t, userId, "react")
      const tagId3 = await createTag(t, userId, "vue")

      await linkNoteTag(t, noteId, tagId1)
      await linkNoteTag(t, noteId, tagId2)
      await linkNoteTag(t, noteId, tagId3)

      const { deleteAllNoteTags, getNoteTags } = await import("./note_tags")
      await t.run(async (ctx) => {
        await deleteAllNoteTags(ctx, noteId)
      })

      const tags = await t.run(async (ctx) => {
        return await getNoteTags(ctx, noteId)
      })

      expect(tags).toEqual([])

      // Verify database state - should be no noteTags entries
      const noteTags = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_note_tag_id", (q) => q.eq("noteId", noteId))
          .collect()
      })
      expect(noteTags).toHaveLength(0)
    })
  })
})