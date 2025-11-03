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
    .index("by_username", ["username"]),

  notes: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    visibility: noteVisibilityEnum,
    updatedAt: v.number(),
  })
    .index("by_owner_updated", ["ownerId", "updatedAt"])
    .searchIndex("search_title", {
      searchField: "title",
    })
    .searchIndex("search_content", {
      searchField: "content",
    }),
})
