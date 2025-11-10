import { Liveblocks } from "@liveblocks/node"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { Id } from "@/convex/_generated/dataModel"
import {
  authorizeNoteAccess,
  getAuthenticatedConvexClient,
  resolveLiveblocksUserProfile,
} from "@/lib/liveblocks-server-utils"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("liveblocks-auth")

export const runtime = "nodejs"

/**
 * POST /api/liveblocks-auth
 *
 * Authenticates users for Liveblocks real-time collaboration rooms.
 * This endpoint is called by the Liveblocks client when a user attempts to join a room.
 *
 * Flow:
 * 1. Validate environment configuration
 * 2. Authenticate user via Clerk
 * 3. Parse and validate room ID (noteId) from request
 * 4. Verify user has access to the note (via Convex)
 * 5. Create Liveblocks session with user info and permissions
 * 6. Return session token for room access
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate environment and initialize Liveblocks client
    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })

    // 2. Authenticate user via Clerk
    const auth = await getAuthenticatedConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    if (!auth) {
      log.warn("Unauthenticated request")
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "Unauthorized" }, { status: 401 })
    }

    const { convex, userId } = auth

    // 3. Parse request body and extract room ID (noteId)
    let body: { room?: string; roomId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ code: "INVALID_REQUEST", error: "Invalid request body" }, { status: 400 })
    }

    const noteId = (body.room ?? body.roomId)?.trim() as Id<"notes"> | undefined
    if (!noteId) {
      return NextResponse.json({ code: "INVALID_REQUEST", error: "Missing room identifier" }, { status: 400 })
    }

    // 4. Authorize note access via Convex
    const noteAccess = await authorizeNoteAccess(convex, noteId)
    if (!noteAccess) {
      log.warn("Access denied", { noteId, userId })
      return NextResponse.json({ code: "NOTE_NOT_FOUND", error: "Note not found or access denied" }, { status: 403 })
    }

    // 5. Build user profile for presence
    const userProfile = await resolveLiveblocksUserProfile(convex, userId)

    // 6. Create Liveblocks session
    const session = liveblocks.prepareSession(userId, {
      userInfo: userProfile,
    })

    // 7. Grant room access based on note permissions
    const accessLevel = noteAccess.canEdit ? session.FULL_ACCESS : session.READ_ACCESS
    session.allow(noteId, accessLevel)

    // 8. Authorize and return session token
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
        userId,
      })

      return NextResponse.json(
        {
          code: "SESSION_FAILED",
          error: "Failed to create session",
          details: (errorBody as { reason?: string })?.reason ?? "Liveblocks authorization error",
        },
        { status: authResult.status },
      )
    }

    return new NextResponse(authResult.body, {
      status: authResult.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    log.error("Unexpected error", { error })
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}