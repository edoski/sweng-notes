"use client"

import type {ReactNode} from "react"
import {useCallback, useEffect, useState} from "react"
import {ConvexProviderWithClerk} from "convex/react-clerk"
import {ConvexReactClient, useMutation} from "convex/react"
import {useAuth, useUser} from "@clerk/nextjs"
import {LiveblocksProvider} from "@liveblocks/react/suspense"
import {Toaster} from "@/components/ui/sonner"
import {notify} from "@/lib/notifications"
import pRetry from "p-retry"
import {api} from "@/convex/_generated/api"
import type {Id} from "@/convex/_generated/dataModel"
import {buildLiveblocksUserInfo} from "@/convex/lib/liveblocks_user_info"
import {ErrorBoundary} from "./error-boundary"
import {logger} from "@/convex/lib/logger"
import {usePrevious} from "@/hooks/use-previous"
import {STORAGE_KEY} from "@/hooks/use-persisted-tabs"
import {AccountDeletionProvider} from "@/contexts/account-deletion-context"

const log = logger.withModule("providers")

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

// Local deployments: HTTP actions on port 3211 (backend on 3210)
// Production deployments: .convex.cloud → .convex.site
const convexHttpUrl = convexUrl?.replace(".convex.cloud", ".convex.site").replace(":3210", ":3211") || convexUrl

type LiveblocksUserInfo = Liveblocks["UserMeta"]["info"]

export function AppProviders({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()

  const [convexClient] = useState(() => {
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured")
    }
    return new ConvexReactClient(convexUrl)
  })

  // Inline resolver that calls Convex directly (Liveblocks automatically batches these)
  const resolveUsers = useCallback(
    async ({ userIds }: { userIds: string[] }): Promise<LiveblocksUserInfo[]> => {
      if (userIds.length === 0) return []

      try {
        const profiles = await convexClient.query(api.users.resolveProfiles, { clerkIds: userIds })
        return profiles.map(profile => buildLiveblocksUserInfo(profile.clerkId, profile.username))
      } catch (error) {
        log.error("Failed to resolve users from Convex", { error })
        // Fallback: use userId as name
        return userIds.map(userId => buildLiveblocksUserInfo(userId, userId))
      }
    },
    [convexClient]
  )

  // Inline resolver for mention suggestions (calls Convex directly)
  // Deferred to avoid flushSync errors in React 19
  const resolveMentionSuggestions = useCallback(
    async ({ text, roomId }: { text: string; roomId: string }): Promise<string[]> => {
      // Defer to microtask to avoid flushSync during render
      return new Promise((resolve) => {
        queueMicrotask(async () => {
          try {
            // roomId is the noteId directly
            const clerkIds = await convexClient.query(api.notes.queries.getMentionSuggestions, {
              noteId: roomId as Id<"notes">,
              text,
            })

            resolve(clerkIds)
          } catch (error) {
            log.error("Failed to resolve mention suggestions from Convex", { error })
            resolve([])
          }
        })
      })
    },
    [convexClient]
  )

  return (
    <AccountDeletionProvider>
      <ErrorBoundary>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <LiveblocksProvider
            authEndpoint={async (room) => {
              const token = await getToken({ template: "convex" })

              const response = await fetch(`${convexHttpUrl}/liveblocks-auth`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ room }),
              })

              if (!response.ok) {
                const errorData = await response.json()
                const errorMessage = errorData.details || errorData.error || "Authentication failed"
                throw new Error(errorMessage)
              }

              return await response.json()
            }}
            resolveUsers={resolveUsers}
            resolveMentionSuggestions={resolveMentionSuggestions}
          >
            <AuthToastWatcher />
            <AvatarSetupTask />
            {children}
            <Toaster richColors closeButton position="top-right" duration={3000} />
          </LiveblocksProvider>
        </ConvexProviderWithClerk>
      </ErrorBoundary>
    </AccountDeletionProvider>
  )
}

function AvatarSetupTask() {
  const ensure = useMutation(api.users.ensure)
  const { user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id
  const hasImage = user?.hasImage

  useEffect(() => {
    if (!userId) {
      return
    }

    pRetry(() => ensure(), {
      retries: 5,
      factor: 1.5,
      minTimeout: 1000,
      maxTimeout: 3000,
      onFailedAttempt: (error) => {
        log.warn("Failed to ensure Convex user, retrying", {
          attemptNumber: error.attemptNumber,
          totalAttempts: error.retriesLeft + error.attemptNumber,
        })
      },
    })
      .then(async () => {
        // Mutation succeeded - user record exists
        // Setup DiceBear avatar in Clerk profile (fire-and-forget)
        // Only call if user doesn't already have an image
        if (!hasImage) {
          try {
            const token = await getToken({ template: "convex" })
            await fetch(`${convexHttpUrl}/setup-avatar`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
          } catch (error) {
            log.warn("Failed to setup avatar, user will have default Clerk avatar", { error })
          }
        }
      })
      .catch((error) => {
        log.error("Failed to ensure Convex user after all retry attempts", { error })
        // Still allow UI to proceed (graceful degradation)
      })
  }, [ensure, userId, hasImage, getToken])

  return null
}

function AuthToastWatcher() {
  const { isLoaded, isSignedIn, user } = useUser()

  const currentUsername = user?.username || user?.id || "account"
  const previousIsSignedIn = usePrevious(isSignedIn)
  const previousUsername = usePrevious(currentUsername)

  useEffect(() => {
    if (!isLoaded || previousIsSignedIn === undefined) return

    if (!previousIsSignedIn && isSignedIn) {
      notify({
        type: "auth.signedIn",
        level: "success",
        message: `Signed in as ${currentUsername}.`,
      })
    }

    if (previousIsSignedIn && !isSignedIn) {
      // Clear open note tabs from session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY)
      }

      notify({
        type: "auth.signedOut",
        level: "info",
        message: `Signed out from ${previousUsername}.`,
      })
    }
  }, [isLoaded, isSignedIn, previousIsSignedIn, currentUsername, previousUsername])

  return null
}