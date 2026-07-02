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
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      console.log('[migrate] Migration succeeded.')
      return
    } catch (err) {
      const isLockTimeout = err.stderr?.toString().includes('advisory lock') ||
                            err.stdout?.toString().includes('advisory lock') ||
                            err.message?.includes('P1002')

      if (attempt < MAX_RETRIES && isLockTimeout) {
        console.log(`[migrate] Advisory lock timeout (Neon cold-start). Retrying in ${RETRY_DELAY_MS / 1000}s...`)
        await sleep(RETRY_DELAY_MS)
      } else {
        console.error('[migrate] Migration failed after all retries.')
        process.exit(1)
      }
    }
  }
}

run()
