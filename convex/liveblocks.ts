import { z } from "zod/v3"
import { zInternalAction } from "./lib/zod"
import { logger } from "./lib/logger"

const log = logger.withModule("liveblocks")

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