import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const noteVisibilityEnum = v.union(v.literal("private"), v.literal("public"))

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"])
    .searchIndex("search_username", {
      searchField: "username",
    }),

  notes: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    content: v.string(),
    visibility: noteVisibilityEnum,
    updatedAt: v.number(),
    version: v.number(),
    activeVersionId: v.optional(v.id("noteVersions")),
  })
    .index("by_owner_updated", ["ownerId", "updatedAt"])
    .index("by_owner_visibility", ["ownerId", "visibility"])
    .searchIndex("search_title", {
      searchField: "title",
    })
    .searchIndex("search_content", {
      searchField: "content",
    }),

  tags: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    shared: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_shared", ["ownerId", "shared"])
    .index("by_owner_name", ["ownerId", "name"])
    .index("by_owner_name_shared", ["ownerId", "name", "shared"])
    .searchIndex("search_tags", {
      searchField: "name",
    }),

  noteTags: defineTable({
    noteId: v.id("notes"),
    tag: v.string(),
  })
    .index("by_note", ["noteId"])
    .index("by_tag", ["tag"])
    .index("by_note_tag", ["noteId", "tag"]),

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
    editorId: v.id("users"),
    title: v.string(),
    snapshot: v.string(),
  })
    .index("by_note", ["noteId"]),

})