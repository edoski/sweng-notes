"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { notify } from "@/lib/notifications"
import { logger } from "@/convex/lib/logger"
import { useAccountDeletion } from "@/contexts/account-deletion-context"

const log = logger.withModule("use-delete-account")

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteAccountMutation = useMutation(api.users.deleteAccount)
  const { user } = useUser()
  const router = useRouter()
  const { setDeletingAccount } = useAccountDeletion()

  const deleteAccount = async () => {
    if (!user) {
      log.error("No user found")
      return
    }

    setIsDeleting(true)

    try {
      // 1. Signal deletion intent (skips queries synchronously)
      setDeletingAccount(true)

      // 2. Delete all user data from Convex (includes Clerk user deletion via backend)
      await deleteAccountMutation({})

      // 3. Navigate away IMMEDIATELY (user will be signed out when Clerk deletion completes)
      router.push("/login")
    } catch (error) {
      log.error("Failed to delete account", { error })
      notify(error, "Failed to delete account. Please try again.")
      setDeletingAccount(false)
      setIsDeleting(false)
    }
  }

  return { deleteAccount, isDeleting }
}