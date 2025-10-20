import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const noteVisibilityEnum = v.union(v.literal("private"), v.literal("public"))

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        username: v.string(),
        updatedAt: v.number(),
    }),

    notes: defineTable({
        ownerId: v.id("users"),
        title: v.string(),
        content: v.string(),
        tags: v.array(v.string()),
        visibility: noteVisibilityEnum,
        updatedAt: v.number(),
        version: v.number(),
        activeVersionId: v.optional(v.id("noteVersions")),
    }),

    tags: defineTable({
        ownerId: v.id("users"),
        name: v.string(),
        shared: v.boolean(),
    }),

    notePermissions: defineTable({
        noteId: v.id("notes"),
        userId: v.id("users"),
        role: v.union(v.literal("reader"), v.literal("editor")),
    }),

    noteVersions: defineTable({
        noteId: v.id("notes"),
        editorId: v.id("users"),
        title: v.string(),
        snapshot: v.string(),
    })
})