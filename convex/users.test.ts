import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import { ConvexError } from "convex/values"
import schema from "./schema"
import { api } from "./_generated/api"
import {
  setupUser,
  createNote,
  mockIdentity,
} from "./lib/test_helpers"

describe("users management functions", () => {
  describe("ensure", () => {
    it("should throw error if no identity", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      await expect(t.mutation(api.users.ensure, {})).rejects.toThrow(ConvexError)

      await expect(t.mutation(api.users.ensure, {})).rejects.toThrow(
        "Your session expired. Please sign in again."
      )
    })

    it("should return existing user if already exists", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "johndoe")
      await setupUser(t, identity, "johndoe")

      const result = await t.withIdentity(identity).mutation(api.users.ensure, {})

      expect(result.id).toBe("user-123")
      expect(result.username).toBe("johndoe")
    })

    it("should create new user with derived username", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user|abc123def456", "newuser")

      const result = await t.withIdentity(identity).mutation(api.users.ensure, {})

      expect(result.id).toBe("user|abc123def456")
      expect(result.username).toBe("newuser")
    })
  })

  describe("getByClerkId", () => {
    it("should return null for non-existent clerkId", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))

      const result = await t.query(api.users.getByClerkId, { clerkId: "nonexistent" })

      expect(result).toBeNull()
    })

    it("should return user data for existing clerkId", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("clerk-123", "testuser")
      const userId = await setupUser(t, identity, "testuser")

      const result = await t.query(api.users.getByClerkId, { clerkId: "clerk-123" })

      expect(result).not.toBeNull()
      expect(result?.id).toBe(userId)
      expect(result?.username).toBe("testuser")
      expect(result?.clerkId).toBe("clerk-123")
    })
  })

  describe("deleteAccount (cascade deletion)", () => {
    it("should delete owned notes", async () => {
      // @ts-expect-error glob
      const t = convexTest(schema, import.meta.glob("./**/*.{js,ts}"))
      const identity = mockIdentity("user-123", "user")
      await setupUser(t, identity, "user")

      const noteId = await createNote(t, identity, "My Note")

      await t.withIdentity(identity).mutation(api.users.deleteAccount, {})

      // Verify note was deleted
      const note = await t.run(async (ctx) => await ctx.db.get(noteId))
      expect(note).toBeNull()
    })
  })
})