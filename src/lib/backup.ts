import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import { format } from 'date-fns'

export async function runDatabaseBackup(): Promise<void> {
  const pgBinPath = process.env.POSTGRES_BIN_PATH ?? '/opt/homebrew/opt/postgresql@16/bin/'
  const backupPath = process.env.BACKUP_PATH ?? '/tmp/PharmacyBackup/'
  const dbName = process.env.POSTGRES_DB_NAME ?? 'pharmacy_db'
  const dbUser = process.env.POSTGRES_USER ?? 'pharmacy_user'

  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
  }

  const filename = `pharmacy_${format(new Date(), 'yyyyMMdd_HHmmss')}.dump`
  const outputPath = path.join(backupPath, filename)
  const pgDump = path.join(pgBinPath, 'pg_dump')

  await new Promise<void>((resolve, reject) => {
    execFile(
      pgDump,
      ['-U', dbUser, '-Fc', dbName, '-f', outputPath],
      { env: { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD } },
      (err) => {
        if (err) reject(err)
        else resolve()
      }
    )
  })

  // Prune backups older than 30 days
  const files = fs.readdirSync(backupPath)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  for (const file of files) {
    const fp = path.join(backupPath, file)
    const stat = fs.statSync(fp)
    if (stat.mtimeMs < cutoff) fs.unlinkSync(fp)
  }
}
