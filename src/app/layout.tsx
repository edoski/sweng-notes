import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { AppProviders } from "@/components/shared/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SWENG Notes",
  description: "A collaborative note-taking application",
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider afterSignOutUrl="/login">
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={inter.className}>
          <AppProviders>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1 min-h-0">{children}</main>
            </div>
          </AppProviders>
        </body>
      </html>
    </ClerkProvider>
  )
}