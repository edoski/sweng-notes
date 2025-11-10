"use client"

import type {ReactNode} from "react"
import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react"
import {ConvexProviderWithClerk} from "convex/react-clerk"
import {ConvexReactClient, useMutation} from "convex/react"
import {useAuth, useUser} from "@clerk/nextjs"
import {LiveblocksProvider} from "@liveblocks/react/suspense"
import {Toaster} from "@/components/ui/sonner"
import {notify} from "@/lib/notifications"
import pRetry from "p-retry"
import {api} from "@/convex/_generated/api"
import type {Id} from "@/convex/_generated/dataModel"
import {buildLiveblocksUserInfo} from "@/lib/liveblocks-user-info"
import {ErrorBoundary} from "./error-boundary"
import {logger} from "@/convex/lib/logger"
import {usePrevious} from "@/hooks/use-previous"

const log = logger.withModule("providers")

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const liveblocksAuthEndpoint = process.env.NEXT_PUBLIC_LIVEBLOCKS_AUTH_ENDPOINT ?? "/api/liveblocks-auth"

type LiveblocksUserInfo = Liveblocks["UserMeta"]["info"]

/**
 * Context to synchronize authenticated Convex queries with user record creation.
 *
 * **Problem:** First-time registration causes "session expired" errors because
 * authenticated queries (notes.list, tags.list) execute before the async
 * users.ensure mutation completes, resulting in queries being called when
 * the user record doesn't exist yet in the Convex database.
 *
 * **Solution:** This context tracks the completion of users.ensure, and
 * queries check isConvexUserReady before executing (using Convex's "skip" parameter).
 *
 * **Non-signed-in users:** Context value is true to allow public queries.
 */
const ConvexUserReadyContext = createContext<boolean>(false)

export function useConvexUserReady() {
  return useContext(ConvexUserReadyContext)
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [convexClient] = useState(() => {
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured")
    }
    return new ConvexReactClient(convexUrl)
  })

  // Move cache to component state to prevent memory leaks
  const liveblocksUsersCacheRef = useRef(new Map<string, LiveblocksUserInfo>())

  // Inline resolver that calls Convex directly (Liveblocks automatically batches these)
  const resolveUsers = useCallback(
    async ({ userIds }: { userIds: string[] }): Promise<LiveblocksUserInfo[]> => {
      const cache = liveblocksUsersCacheRef.current
      const pendingUserIds = userIds.filter((userId) => !cache.has(userId))

      if (pendingUserIds.length > 0) {
        try {
          const profiles = await convexClient.query(api.users.resolveProfiles, { clerkIds: pendingUserIds })
          for (const profile of profiles) {
            const userInfo = buildLiveblocksUserInfo(profile.clerkId, profile.username)
            cache.set(profile.clerkId, userInfo)
          }
        } catch (error) {
          log.error("Failed to resolve users from Convex", { error })
        }
      }

      return userIds.map((userId) => {
        const cached = cache.get(userId)
        if (cached) {
          return cached
        }
        // Fallback: use userId as name
        return buildLiveblocksUserInfo(userId, userId)
      })
    },
    [convexClient],
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

            // Pre-populate cache for these users
            if (clerkIds.length > 0) {
              await resolveUsers({ userIds: clerkIds })
            }

            resolve(clerkIds)
          } catch (error) {
            log.error("Failed to resolve mention suggestions from Convex", { error })
            resolve([])
          }
        })
      })
    },
    [convexClient, resolveUsers],
  )

  return (
    <ErrorBoundary>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <LiveblocksProvider
          authEndpoint={liveblocksAuthEndpoint}
          resolveUsers={resolveUsers}
          resolveMentionSuggestions={resolveMentionSuggestions}
        >
          <AuthToastWatcher />
          <EnsureConvexUser>
            {children}
          </EnsureConvexUser>
          <Toaster richColors closeButton position="top-right" duration={3000} />
        </LiveblocksProvider>
      </ConvexProviderWithClerk>
    </ErrorBoundary>
  )
}

function EnsureConvexUser({ children }: { children: ReactNode }) {
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser()

  if (!isClerkLoaded) {
    return null
  }

  // Key by isSignedIn to reset state when user signs out
  return isSignedIn ? (
    <EnsureConvexUserInner key="signed-in">{children}</EnsureConvexUserInner>
  ) : (
    <ConvexUserReadyContext.Provider value={true}>{children}</ConvexUserReadyContext.Provider>
  )
}

function EnsureConvexUserInner({ children }: { children: ReactNode }) {
  const [isConvexUserReady, setIsConvexUserReady] = useState(false)
  const onReady = useCallback(() => setIsConvexUserReady(true), [])

  return (
    <ConvexUserReadyContext.Provider value={isConvexUserReady}>
      <EnsureConvexUserTask onReady={onReady} />
      {children}
    </ConvexUserReadyContext.Provider>
  )
}

function EnsureConvexUserTask({ onReady }: { onReady: () => void }) {
  const ensure = useMutation(api.users.ensure)
  const { user } = useUser()
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
      .then(() => {
        // Mutation succeeded - user record exists
        // Setup DiceBear avatar in Clerk profile (fire-and-forget)
        // Only call if user doesn't already have an image
        if (!hasImage) {
          fetch("/api/setup-avatar", { method: "POST" }).catch((error) => {
            log.warn("Failed to setup avatar, user will have default Clerk avatar", { error })
          })
        }
      })
      .catch((error) => {
        log.error("Failed to ensure Convex user after all retry attempts", { error })
        // Still allow UI to proceed (graceful degradation)
      })
      .finally(() => {
        onReady()
      })
  }, [ensure, onReady, userId, hasImage])

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
      notify({
        type: "auth.signedOut",
        level: "info",
        message: `Signed out from ${previousUsername}.`,
      })
    }
  }, [isLoaded, isSignedIn, previousIsSignedIn, currentUsername, previousUsername])

  return null
}