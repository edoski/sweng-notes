import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { zodOutputToConvex } from "convex-helpers/server/zod"
import { NoteVisibilitySchema } from "./lib/validation"

export const noteVisibilityEnum = zodOutputToConvex(NoteVisibilitySchema)

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"]),

  notes: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    content: v.string(),
    visibility: noteVisibilityEnum,
    updatedAt: v.number(),
    version: v.number(),
    activeVersionId: v.optional(v.id("noteVersions")),
  })
    .index("by_ownerId_updatedAt", ["ownerId", "updatedAt"])
    .searchIndex("search_title", {
      searchField: "title",
    })
    .searchIndex("search_content", {
      searchField: "content",
    }),

  tags: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    sharedFromNoteId: v.optional(v.id("notes")),
  })
    .index("by_owner_name", ["ownerId", "name"])
    .index("by_name", ["name"]),

  noteTags: defineTable({
    noteId: v.id("notes"),
    tagId: v.id("tags"),
  })
    .index("by_note_tag_id", ["noteId", "tagId"])
    .index("by_tag_note_id", ["tagId", "noteId"]),

  notePermissions: defineTable({
    noteId: v.id("notes"),
    userId: v.id("users"),
    role: v.union(v.literal("reader"), v.literal("editor")),
  })
    .index("by_note", ["noteId"])
    .index("by_user", ["userId"])
    .index("by_note_user", ["noteId", "userId"]),

  noteVersions: defineTable({
    noteId: v.id("notes"),
    ownerId: v.id("users"),
    title: v.string(),
    snapshot: v.string(),
  })
    .index("by_note", ["noteId"]),

})