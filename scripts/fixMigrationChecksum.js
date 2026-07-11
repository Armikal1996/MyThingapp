/**
 * Fix _sqlx_migrations checksum after a migration SQL file was edited post-apply.
 * Usage: node scripts/fixMigrationChecksum.js 9
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { createHash } from 'crypto'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const version = Number(process.argv[2] || '9')
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const files = {
  9: 'data/migrations/009_agent_threads.sql'
}

const rel = files[version]
if (!rel) {
  console.error(`No migration file mapped for version ${version}`)
  process.exit(1)
}

const sqlPath = join(root, rel)
const dbPath = join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'com.mything.desktop', 'mything.db')

const bytes = readFileSync(sqlPath)
const checksum = createHash('sha384').update(bytes).digest()

console.log(`Migration ${version}: ${rel}`)
console.log(`DB: ${dbPath}`)
console.log(`New SHA384: ${checksum.toString('hex')}`)

const binPath = join(__dirname, `_checksum_v${version}.bin`)
writeFileSync(binPath, checksum)

// Use sqlite3 hex() update via PowerShell reading bytes
const hex = checksum.toString('hex').toUpperCase()
const sql = `UPDATE _sqlx_migrations SET checksum = X'${hex}' WHERE version = ${version};`

execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, { stdio: 'inherit', shell: true })

try { unlinkSync(binPath) } catch { /* ignore */ }

const row = execSync(
  `sqlite3 "${dbPath}" "SELECT version, description, success FROM _sqlx_migrations WHERE version = ${version};"`,
  { encoding: 'utf8', shell: true }
)
console.log('Updated:', row.trim())
console.log('Done — restart MyThing.')
