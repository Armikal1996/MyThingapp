import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const built = join(root, 'launcher', 'target', 'release', 'Launch-MyThing.exe')
const dest = join(root, 'Launch-MyThing.exe')

if (!existsSync(built)) {
  console.error('Launcher exe not found. Run: npm run launcher:build')
  process.exit(1)
}

copyFileSync(built, dest)
console.log(`Copied to ${dest}`)
