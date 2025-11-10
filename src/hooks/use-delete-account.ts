"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { notify } from "@/lib/notifications"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("use-delete-account")

export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteAccountMutation = useMutation(api.users.deleteAccount)
  const { user } = useUser()
  const router = useRouter()

  const deleteAccount = async () => {
    if (!user) {
      log.error("No user found")
      return
    }

    setIsDeleting(true)

    try {
      // Delete all user data from Convex
      await deleteAccountMutation({})

      // Navigate away IMMEDIATELY (unmounts component, cancels React queries)
      router.push("/")

      // Show success and sign out (no errors - component is unmounted)
      notify({ type: "auth.signedOut", level: "info", message: "Account deleted successfully" })
      await user.delete()
    } catch (error) {
      log.error("Failed to delete account", { error })
      notify(error, "Failed to delete account. Please try again.")
      setIsDeleting(false)
    }
  }

  return { deleteAccount, isDeleting }
}
