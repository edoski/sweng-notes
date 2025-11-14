import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import { ConvexError } from "convex/values"
import schema from "./schema"
import { api } from "./_generated/api"
import {
  setupUser,
  createNote,
  createTag,
  linkNoteTag,
  grantPermission,
  mockIdentity,
} from "./lib/test_helpers"
import { getNoteTags } from "./lib/note_tags"

describe("tags CRUD functions", () => {
  describe("list", () => {
    it("should return empty array for user with no tags", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")

      const result = await t.withIdentity(identity).query(api.tags.list, {})

      expect(result).toEqual([])
    })

    it("should return tags with correct note counts", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      // Create tags and link to notes
      const note1Id = await createNote(t, identity, "Note 1")
      const note2Id = await createNote(t, identity, "Note 2")

      const tag1Id = await createTag(t, userId, "typescript")
      const tag2Id = await createTag(t, userId, "react")

      await linkNoteTag(t, note1Id, tag1Id)
      await linkNoteTag(t, note2Id, tag1Id)
      await linkNoteTag(t, note1Id, tag2Id)

      const result = await t.withIdentity(identity).query(api.tags.list, {})

      expect(result).toHaveLength(2)
      const typescript = result.find((t) => t.name === "typescript")
      const react = result.find((t) => t.name === "react")

      expect(typescript?.noteCount).toBe(2)
      expect(react?.noteCount).toBe(1)
    })
  })

  describe("create", () => {
    it("should create new tag successfully", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")

      const result = await t.withIdentity(identity).mutation(api.tags.create, {
        name: "typescript",
      })

      expect(result.name).toBe("typescript")
      expect(result.noteCount).toBe(0)
      expect(result.shared).toBe(false)
      expect(result.createdAt).toBeTypeOf("number")
    })
  })

  describe("rename", () => {
    it("should throw error if tag not found", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")

      await expect(
        t.withIdentity(identity).mutation(api.tags.rename, {
          fromName: "nonexistent",
          toName: "newname",
        })
      ).rejects.toThrow(ConvexError)

      await expect(
        t.withIdentity(identity).mutation(api.tags.rename, {
          fromName: "nonexistent",
          toName: "newname",
        })
      ).rejects.toThrow("We couldn't find that tag")
    })

    it("should throw error if toName already exists", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      await createTag(t, userId, "typescript")
      await createTag(t, userId, "react")

      await expect(
        t.withIdentity(identity).mutation(api.tags.rename, {
          fromName: "typescript",
          toName: "react",
        })
      ).rejects.toThrow(ConvexError)

      await expect(
        t.withIdentity(identity).mutation(api.tags.rename, {
          fromName: "typescript",
          toName: "react",
        })
      ).rejects.toThrow("A tag with that name already exists")
    })

    it("should successfully rename tag (O(1) operation)", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      await createTag(t, userId, "typescript")

      const result = await t.withIdentity(identity).mutation(api.tags.rename, {
        fromName: "typescript",
        toName: "TypeScript",
      })

      expect(result.name).toBe("TypeScript")

      // Verify old name doesn't exist
      const tags = await t.run(async (ctx) => {
        return await ctx.db
          .query("tags")
          .withIndex("by_owner_name", (q) =>
            q.eq("ownerId", userId).eq("name", "typescript")
          )
          .collect()
      })
      expect(tags).toHaveLength(0)
    })

    it("should verify rename updates tags table only (O(1) proof)", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      // Create tag and link to multiple notes
      const tagId = await createTag(t, userId, "javascript")
      const note1Id = await createNote(t, identity, "Note 1")
      const note2Id = await createNote(t, identity, "Note 2")
      const note3Id = await createNote(t, identity, "Note 3")

      await linkNoteTag(t, note1Id, tagId)
      await linkNoteTag(t, note2Id, tagId)
      await linkNoteTag(t, note3Id, tagId)

      // Verify noteTags count before rename
      const noteTagsBefore = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_tag_note_id", (q) => q.eq("tagId", tagId))
          .collect()
      })
      expect(noteTagsBefore).toHaveLength(3)

      // Perform rename
      await t.withIdentity(identity).mutation(api.tags.rename, {
        fromName: "javascript",
        toName: "JavaScript",
      })

      // Verify only the tags table entry was modified (single update)
      const tag = await t.run(async (ctx) => await ctx.db.get(tagId))
      expect(tag?.name).toBe("JavaScript")

      // Verify noteTags entries remain unchanged (still 3 entries, same IDs)
      const noteTagsAfter = await t.run(async (ctx) => {
        return await ctx.db
          .query("noteTags")
          .withIndex("by_tag_note_id", (q) => q.eq("tagId", tagId))
          .collect()
      })
      expect(noteTagsAfter).toHaveLength(3)
      expect(noteTagsAfter.map(nt => nt._id).sort()).toEqual(noteTagsBefore.map(nt => nt._id).sort())

      // Verify all notes now see the new tag name (via foreign key lookup)
      const note1Tags = await t.run(async (ctx) => await getNoteTags(ctx, note1Id))
      const note2Tags = await t.run(async (ctx) => await getNoteTags(ctx, note2Id))
      const note3Tags = await t.run(async (ctx) => await getNoteTags(ctx, note3Id))

      expect(note1Tags).toEqual(["JavaScript"])
      expect(note2Tags).toEqual(["JavaScript"])
      expect(note3Tags).toEqual(["JavaScript"])
    })
  })

  describe("remove", () => {
    it("should delete tag completely when not used in shared notes", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      const userId = await setupUser(t, identity, "user")

      const tagId = await createTag(t, userId, "typescript")

      await t.withIdentity(identity).mutation(api.tags.remove, {
        name: "typescript",
      })

      // Verify tag was deleted
      const tag = await t.run(async (ctx) => await ctx.db.get(tagId))
      expect(tag).toBeNull()
    })

    it("should convert to shared tag when removing tag used in collaborative note", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      // Owner creates note with tag
      const ownerIdentity = mockIdentity("owner-123", "owner")
      const ownerId = await setupUser(t, ownerIdentity, "owner")
      const noteId = await createNote(t, ownerIdentity, "Shared Note", {
        visibility: "public",
      })
      const ownerTagId = await createTag(t, ownerId, "typescript")
      await linkNoteTag(t, noteId, ownerTagId)

      // Collaborator gets access and has same tag
      const collabIdentity = mockIdentity("collab-123", "collaborator")
      const collabId = await setupUser(t, collabIdentity, "collaborator")
      await grantPermission(t, noteId, collabId, "reader")
      const collabTagId = await createTag(t, collabId, "typescript")

      // Collaborator removes tag
      await t.withIdentity(collabIdentity).mutation(api.tags.remove, {
        name: "typescript",
      })

      // Verify tag was converted to shared (not deleted)
      const tag = await t.run(async (ctx) => await ctx.db.get(collabTagId))
      expect(tag).not.toBeNull()
      expect(tag?.sharedFromNoteId).toBe(noteId)
    })
  })
})