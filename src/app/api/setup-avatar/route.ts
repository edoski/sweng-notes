import { auth, clerkClient } from "@clerk/nextjs/server"
import { getPresenceInfo } from "@/lib/presence-info"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("setup-avatar")

/**
 * API route to set up user's DiceBear avatar in Clerk profile.
 * Called once after user registration to populate profile image.
 */
export async function POST() {
  // Authenticate the request
  const { userId } = await auth()

  if (!userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    // Get DiceBear avatar URL with coordinated color
    const { avatar } = getPresenceInfo(userId)

    // Fetch the avatar image from DiceBear
    const imageResponse = await fetch(avatar)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch avatar from DiceBear: ${imageResponse.statusText}`)
    }

    // Convert to blob
    const imageBlob = await imageResponse.blob()

    // Update Clerk user profile with avatar
    const clerk = await clerkClient()
    await clerk.users.updateUserProfileImage(userId, {
      file: imageBlob,
    })

    return Response.json({ success: true })
  } catch (error) {
    log.error("Failed to setup avatar", { error })
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to setup avatar" },
      { status: 500 }
    )
  }
}
