import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { convexTest } from "convex-test"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { api } from "./_generated/api"

// Define a minimal schema for testing
const testSchema = defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"]),
})

// Import all Convex modules for convex-test
// @ts-expect-error glob
const modules = import.meta.glob("./**/*.{js,ts}")

describe("liveblocks actions", () => {
  describe("deleteRoom", () => {
    let originalEnv: NodeJS.ProcessEnv
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      // Store original environment
      originalEnv = { ...process.env }

      // Mock fetch
      fetchMock = vi.fn()
      global.fetch = fetchMock as never
    })

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv

      // Clear mocks
      vi.restoreAllMocks()
    })

    it("should successfully delete a room with valid credentials", async () => {
      const t = convexTest(testSchema, modules)

      // Set up environment with valid secret key
      process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_valid_key"

      // Mock successful API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: "No Content",
      })

      // Call internal action directly
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-test123",
      })

      // Verify fetch was called with correct parameters
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.liveblocks.io/v2/rooms/note-test123",
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer sk_test_valid_key",
          },
        }
      )
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("should handle missing LIVEBLOCKS_SECRET_KEY gracefully", async () => {
      const t = convexTest(testSchema, modules)

      // Ensure no secret key is set
      delete process.env.LIVEBLOCKS_SECRET_KEY

      // Should not throw - just logs error and returns early
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-test123",
      })

      // Verify fetch was not called
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("should handle Liveblocks API error responses", async () => {
      const t = convexTest(testSchema, modules)

      process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_valid_key"

      // Mock error response (e.g., room not found)
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => JSON.stringify({ error: "Room not found" }),
      })

      // Should not throw - just logs error and returns
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-nonexistent",
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("should handle Liveblocks API 500 error", async () => {
      const t = convexTest(testSchema, modules)

      process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_valid_key"

      // Mock server error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Internal Server Error",
      })

      // Should not throw - just logs error and returns
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-test123",
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("should handle network errors gracefully", async () => {
      const t = convexTest(testSchema, modules)

      process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_valid_key"

      // Mock network error
      fetchMock.mockRejectedValueOnce(new Error("Network error"))

      // Should not throw - just logs error and returns
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-test123",
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("should handle non-Error exceptions", async () => {
      const t = convexTest(testSchema, modules)

      process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_valid_key"

      // Mock fetch throwing a non-Error object
      fetchMock.mockRejectedValueOnce("String error")

      // Should not throw - just logs error and returns
      // @ts-expect-error ts compiler
      await t.action(api.liveblocks.deleteRoom, {
        roomId: "note-test123",
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})