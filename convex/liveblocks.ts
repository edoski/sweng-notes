import { z } from "zod/v3"
import { zid } from "convex-helpers/server/zod"
import { zInternalAction, zInternalQuery } from "./lib/zod"
import { logger } from "./lib/logger"
import { fetchNoteAccess } from "./lib/note_access"

const log = logger.withModule("liveblocks")

/**
 * Internal query to check note access for Liveblocks authentication
 * Used by HTTP action in convex/http.ts to verify user has permission to join a room
 */
export const checkNoteAccess = zInternalQuery({
  args: {
    noteId: zid("notes"),
    userId: zid("users"),
  },
  handler: async (ctx, { noteId, userId }) => {
    return await fetchNoteAccess(ctx, noteId, userId)
  },
})

/**
 * Delete a Liveblocks room using the REST API
 * This is called internally when a note is deleted
 */
export const deleteRoom = zInternalAction({
  args: {
    roomId: z.string().min(1, "roomId is required"),
  },
  handler: async (_ctx, { roomId }) => {
    const secretKey = process.env.LIVEBLOCKS_SECRET_KEY

    if (!secretKey) {
      log.error(
        "LIVEBLOCKS_SECRET_KEY not set in Convex environment. " +
          "Run: npx convex env set LIVEBLOCKS_SECRET_KEY <your-key>"
      )
      return
    }

    try {
      const response = await fetch(`https://api.liveblocks.io/v2/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error("Liveblocks API error", {
          roomId, status: response.status, statusText: response.statusText, error: errorText,
        })
        return
      }

      log.info("Successfully deleted room", { roomId })
    } catch (error) {
      log.error("Failed to delete room", {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})