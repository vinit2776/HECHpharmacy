#!/usr/bin/env node
// Runs prisma migrate deploy with retries to handle Neon serverless cold-starts.
// Neon pauses idle databases; the first connection attempt can exceed Prisma's
// 10s advisory lock timeout. Retrying after a short delay succeeds once Neon is warm.

const { execSync } = require('child_process')

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 8000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`\n[migrate] Attempt ${attempt}/${MAX_RETRIES}: running prisma migrate deploy...`)
      // Use 'pipe' so we can inspect stderr for lock-timeout detection.
      // Output is printed manually so it still shows in Vercel build logs.
      const result = execSync('npx prisma migrate deploy', { stdio: 'pipe' })
      if (result) process.stdout.write(result)
      console.log('[migrate] Migration succeeded.')
      return
    } catch (err) {
      const out = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '') + (err.message ?? '')
      if (err.stdout) process.stdout.write(err.stdout)
      if (err.stderr) process.stderr.write(err.stderr)

      const isLockTimeout = out.includes('advisory lock') || out.includes('P1002')

      if (attempt < MAX_RETRIES && (isLockTimeout || out.includes('connect ECONNREFUSED'))) {
        console.log(`[migrate] Transient error (Neon cold-start?). Retrying in ${RETRY_DELAY_MS / 1000}s...`)
        await sleep(RETRY_DELAY_MS)
      } else if (attempt < MAX_RETRIES) {
        console.log(`[migrate] Error on attempt ${attempt}. Retrying in ${RETRY_DELAY_MS / 1000}s...`)
        await sleep(RETRY_DELAY_MS)
      } else {
        console.error('[migrate] Migration failed after all retries.')
        process.exit(1)
      }
    }
  }
}

run()
