#!/usr/bin/env node
import { readFileSync } from "fs"
import { execSync } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

try {
  // Read .env.local
  const envPath = join(rootDir, ".env.local")
  const content = readFileSync(envPath, "utf-8")

  // Extract LIVEBLOCKS_SECRET_KEY
  const match = content.match(/^LIVEBLOCKS_SECRET_KEY=(.*)$/m)
  if (!match) {
    console.log("ℹ No LIVEBLOCKS_SECRET_KEY found in .env.local")
    process.exit(0)
  }

  const value = match[1].trim()
  if (!value) {
    console.log("ℹ LIVEBLOCKS_SECRET_KEY is empty")
    process.exit(0)
  }

  // Set in Convex with retry logic (fallback safety net)
  let retries = 3
  let lastError

  while (retries > 0) {
    try {
      execSync(`npx convex env set LIVEBLOCKS_SECRET_KEY "${value}"`, {
        cwd: rootDir,
        stdio: "pipe"
      })
      console.log("  → LIVEBLOCKS_SECRET_KEY synced")
      break // Success!
    } catch (error) {
      lastError = error

      // Check if it's the "env changed during push" race condition
      if (error.message?.includes("Environment variables have changed") && retries > 1) {
        // Wait 2 seconds and retry
        execSync("sleep 2", { stdio: "ignore" })
        retries--
        continue
      }

      // Other error, throw it
      throw error
    }
  }

  // If we exhausted retries, throw the last error
  if (retries === 0 && lastError) {
    throw lastError
  }
} catch (error) {
  // Only log if it's not a "no deployment" error
  if (!error.message?.includes("CONVEX_DEPLOYMENT")) {
    console.error("Setup error:", error.message)
  }
}

process.exit(0)
