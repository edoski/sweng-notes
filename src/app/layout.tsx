import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-tiptap/styles.css"
import "./globals.css"
import { AppProviders } from "@/components/shared/providers"
import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"

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
      <html lang="en" className="dark">
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