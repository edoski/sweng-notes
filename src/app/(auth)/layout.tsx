import type { ReactNode } from "react"
import AuthHeroHeader from "./auth-hero-header"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-8">
      <AuthHeroHeader />
      {children}
    </div>
  )
}
