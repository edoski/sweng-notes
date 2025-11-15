"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AccountDeletionContextValue {
  isDeletingAccount: boolean
  setDeletingAccount: (deleting: boolean) => void
}

const AccountDeletionContext = createContext<AccountDeletionContextValue | undefined>(undefined)

export function AccountDeletionProvider({ children }: { children: ReactNode }) {
  const [isDeletingAccount, setDeletingAccount] = useState(false)

  return (
    <AccountDeletionContext.Provider value={{ isDeletingAccount, setDeletingAccount }}>
      {children}
    </AccountDeletionContext.Provider>
  )
}

export function useAccountDeletion() {
  const context = useContext(AccountDeletionContext)
  if (context === undefined) {
    throw new Error("useAccountDeletion must be used within AccountDeletionProvider")
  }
  return context
}
