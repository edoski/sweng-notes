#!/usr/bin/env node
import { readFileSync } from "fs"
import { execSync } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

// Environment variables to sync from .env.local to Convex
const ENV_VARS = ["LIVEBLOCKS_SECRET_KEY", "CLERK_SECRET_KEY"]

function syncEnvVar(name, value) {
  let retries = 3
  let lastError

  while (retries > 0) {
    try {
      execSync(`npx convex env set ${name} "${value}"`, {
        cwd: rootDir,
        stdio: "pipe"
      })
      console.log(`  → ${name} synced`)
      return true
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
}

try {
  // Read .env.local
  const envPath = join(rootDir, ".env.local")
  const content = readFileSync(envPath, "utf-8")

  // Sync each environment variable
  for (const varName of ENV_VARS) {
    const match = content.match(new RegExp(`^${varName}=(.*)$`, "m"))
    if (!match) {
      console.log(`ℹ No ${varName} found in .env.local`)
      continue
    }

    const value = match[1].trim()
    if (!value) {
      console.log(`ℹ ${varName} is empty`)
      continue
    }

    syncEnvVar(varName, value)
  }
} catch (error) {
  // Only log if it's not a "no deployment" error
  if (!error.message?.includes("CONVEX_DEPLOYMENT")) {
    console.error("Setup error:", error.message)
  }
}

process.exit(0)
