import { httpRouter } from "convex/server"
import { corsRouter } from "convex-helpers/server/cors"
import { httpAction } from "./_generated/server"
import { Liveblocks } from "@liveblocks/node"
import type { Id } from "./_generated/dataModel"
import { api, internal } from "./_generated/api"
import { buildLiveblocksUserInfo } from "./lib/liveblocks_user_info"
import { getPresenceInfo } from "./lib/presence_info"
import { logger } from "./lib/logger"

const log = logger.withModule("http")

const http = httpRouter()

// Note: corsRouter returns a wrapper that adds routes to the underlying http router
const cors = corsRouter(http, {
  allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000", "https://sweng-notes.vercel.app"],
  allowedHeaders: ["Content-Type", "Authorization"],
  allowCredentials: true,
  browserCacheMaxAge: 86400,
})

// Routes added via cors.route() are actually added to http with CORS wrapping
// So http now contains the CORS-enabled routes

/**
 * POST /liveblocks-auth
 *
 * Authenticates users for Liveblocks real-time collaboration rooms.
 * This endpoint is called by the Liveblocks client when a user attempts to join a room.
 *
 * Flow:
 * 1. Validate environment configuration
 * 2. Authenticate user via Clerk JWT verification
 * 3. Parse and validate room ID (noteId) from request
 * 4. Verify user has access to the note (via Convex query)
 * 5. Resolve user profile for presence info
 * 6. Create Liveblocks session with user info and permissions
 * 7. Return session token for room access
 */
cors.route({
  path: "/liveblocks-auth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Validate environment and initialize Liveblocks client
      const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY
      if (!liveblocksSecret) {
        log.error("LIVEBLOCKS_SECRET_KEY not configured")
        return new Response(
          JSON.stringify({
            code: "CONFIG_ERROR",
            error: "Server configuration error",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      const liveblocks = new Liveblocks({ secret: liveblocksSecret })

      // 2. Authenticate user via Convex built-in auth (Clerk JWT)
      const identity = await ctx.auth.getUserIdentity()
      if (!identity) {
        log.warn("Unauthenticated request")
        return new Response(
          JSON.stringify({ code: "AUTH_REQUIRED", error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }

      const clerkId = identity.subject

      // 3. Parse request body and extract room ID (noteId)
      let body: { room?: string; roomId?: string }
      try {
        body = await request.json()
      } catch {
        return new Response(
          JSON.stringify({ code: "INVALID_REQUEST", error: "Invalid request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const noteId = (body.room ?? body.roomId)?.trim() as Id<"notes"> | undefined
      if (!noteId) {
        return new Response(
          JSON.stringify({ code: "INVALID_REQUEST", error: "Missing room identifier" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      // 4. Get user from Convex database
      const user = await ctx.runQuery(api.users.getByClerkId, { clerkId })
      if (!user) {
        log.warn("User not found in database", { clerkId })
        return new Response(
          JSON.stringify({ code: "USER_NOT_FOUND", error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      // 5. Authorize note access using the user we already fetched
      const access = await ctx.runQuery(internal.liveblocks.checkNoteAccess, {
        noteId,
        userId: user.id,
      })
      if (access.status !== "ok") {
        log.warn("Access denied", { noteId, clerkId, accessStatus: access.status })
        return new Response(
          JSON.stringify({ code: "NOTE_NOT_FOUND", error: "Note not found or access denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      // 6. Build user profile for presence
      const userProfile = buildLiveblocksUserInfo(clerkId, user.username)

      // 7. Create Liveblocks session
      const session = liveblocks.prepareSession(clerkId, {
        userInfo: userProfile,
      })

      // 8. Grant room access based on note permissions
      const accessLevel = (access.permission === "owner" || access.permission === "editor")
        ? session.FULL_ACCESS
        : session.READ_ACCESS
      session.allow(noteId, accessLevel)

      // 9. Authorize and return session token
      const authResult = await session.authorize()

      if (authResult.status !== 200) {
        let errorBody: unknown
        try {
          errorBody = JSON.parse(authResult.body)
        } catch {
          errorBody = authResult.body
        }

        log.error("Session authorization failed", {
          status: authResult.status,
          body: errorBody,
          noteId,
          clerkId,
        })

        return new Response(
          JSON.stringify({
            code: "SESSION_FAILED",
            error: "Failed to create session",
            details: (errorBody as { reason?: string })?.reason ?? "Liveblocks authorization error",
          }),
          { status: authResult.status, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response(authResult.body, {
        status: authResult.status,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      log.error("Unexpected error", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return new Response(
        JSON.stringify({
          code: "INTERNAL_ERROR",
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  }),
})

/**
 * POST /setup-avatar
 *
 * Sets up user's DiceBear avatar in Clerk profile.
 * Called once after user registration to populate profile image.
 *
 * Flow:
 * 1. Authenticate user via Clerk JWT verification
 * 2. Get DiceBear avatar URL
 * 3. Fetch avatar image from DiceBear
 * 4. Update Clerk user profile with avatar (using Clerk Backend API)
 * 5. Return success response
 */
cors.route({
  path: "/setup-avatar",
  method: "POST",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: httpAction(async (ctx, _request) => {
    const avatarLog = logger.withModule("setup-avatar")

    try {
      // 1. Authenticate user via Convex built-in auth (Clerk JWT)
      const identity = await ctx.auth.getUserIdentity()
      if (!identity) {
        avatarLog.warn("Unauthenticated request")
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      const clerkId = identity.subject

      // 2. Get DiceBear avatar URL with coordinated color
      const { avatar } = getPresenceInfo(clerkId)

      // 3. Fetch the avatar image from DiceBear
      const imageResponse = await fetch(avatar)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch avatar from DiceBear: ${imageResponse.statusText}`)
      }

      // Convert to blob
      const imageBlob = await imageResponse.blob()

      // 4. Update Clerk user profile with avatar using Clerk Backend API
      // Clerk requires multipart/form-data format with a "file" field
      const formData = new FormData()
      formData.append("file", imageBlob, "avatar.png")

      const clerkApiUrl = `https://api.clerk.com/v1/users/${clerkId}/profile_image`
      const updateResponse = await fetch(clerkApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          // Don't set Content-Type - FormData sets it automatically with boundary
        },
        body: formData,
      })

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        avatarLog.error("Failed to update Clerk profile image", {
          status: updateResponse.status,
          error: errorText,
        })
        throw new Error(`Failed to update Clerk profile: ${updateResponse.statusText}`)
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      avatarLog.error("Failed to setup avatar", { error })
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Failed to setup avatar",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  }),
})

// The corsRouter modifies http in-place, so we export http
// (the CORS-wrapped version), not the cors helper object
export default http
