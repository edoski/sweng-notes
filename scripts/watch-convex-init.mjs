#!/usr/bin/env node
import chokidar from "chokidar"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { execSync } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Setup paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")
const flagFile = join(rootDir, "node_modules", ".cache", ".convex-env-synced")
const envFile = join(rootDir, ".env.local")

// Check flag file
if (existsSync(flagFile)) {
  console.log("✓ Convex environment already configured")
  process.exit(0)
}

console.log("⏳ Waiting for Convex initialization...")

// Helper function: Wait for Convex to be ready for env var changes
async function waitForConvexReady(maxAttempts = 60) {
  console.log("  Waiting for Convex to be ready...")

  // Initial delay to let Convex start its push
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Poll until Convex is ready (can accept env var changes)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      execSync("npx convex env list", {
        cwd: rootDir,
        stdio: "pipe", // Suppress output
        encoding: "utf-8"
      })
      return true // Convex is ready!
    } catch {
      // Not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return false // Timeout
}

// Watch .env.local
const watcher = chokidar.watch(envFile, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
})

watcher.on("change", async () => {
  try {
    // Read .env.local
    const content = readFileSync(envFile, "utf-8")

    // Check if NEXT_PUBLIC_CONVEX_URL is present (indicates Convex initialized)
    if (!content.includes("NEXT_PUBLIC_CONVEX_URL=")) {
      // Not initialized yet, keep watching
      return
    }

    console.log("✓ Convex initialized! Syncing environment variables...")

    // Wait for Convex to finish its initial push
    const ready = await waitForConvexReady()
    if (!ready) {
      console.error("✖ Timeout waiting for Convex to be ready")
      console.log("  You can manually re-sync by running: rm node_modules/.cache/.convex-env-synced && pnpm dev")
      watcher.close()
      process.exit(1)
    }

    // Now Convex is ready - run setup script
    execSync("node scripts/setup-convex-env.mjs", {
      cwd: rootDir,
      stdio: "inherit"
    })

    // Create cache directory if needed
    const cacheDir = join(rootDir, "node_modules", ".cache")
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }

    // Write flag file with timestamp
    writeFileSync(flagFile, new Date().toISOString())

    console.log("✓ Environment variables synced to Convex backend")

    // Close watcher and exit
    watcher.close()
    process.exit(0)
  } catch (error) {
    console.error("✖ Error syncing environment variables:", error.message)
    watcher.close()
    process.exit(1)
  }
})

watcher.on("error", (error) => {
  console.error("✖ Watcher error:", error.message)
  watcher.close()
  process.exit(1)
})

// Timeout after 5 minutes
setTimeout(() => {
  console.log("⏱  Timeout waiting for Convex initialization (this is normal if you cancelled setup)")
  watcher.close()
  process.exit(0)
}, 5 * 60 * 1000)
