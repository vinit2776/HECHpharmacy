import { execSync } from 'child_process'

/** @type {import('next').NextConfig} */

function getBuildMeta() {
  try {
    const commit = execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
    const commitFull = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const commitDate = execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim()
    return { commit, commitFull, commitDate }
  } catch {
    return { commit: 'unknown', commitFull: 'unknown', commitDate: new Date().toISOString() }
  }
}

const { commit, commitFull, commitDate } = getBuildMeta()
const buildTime = new Date().toISOString()

console.log(`\n  Build info:`)
console.log(`    Commit : ${commitFull}`)
console.log(`    Date   : ${commitDate}`)
console.log(`    Built  : ${buildTime}\n`)

const nextConfig = {
  // pg uses native addons — keep it external so Node.js resolves it
  // from node_modules at runtime instead of bundling it into chunks.
  serverExternalPackages: ['pg', 'pg-native'],

  env: {
    NEXT_PUBLIC_BUILD_COMMIT:      commit,
    NEXT_PUBLIC_BUILD_COMMIT_DATE: commitDate,
    NEXT_PUBLIC_BUILD_TIME:        buildTime,
  },
}

export default nextConfig
