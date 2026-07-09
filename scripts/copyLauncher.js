import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = join(root, 'launcher', 'target', 'release')

const copies = [
  { built: join(releaseDir, 'Launch-MyThing.exe'), dest: join(root, 'Launch-MyThing.exe') },
  { built: join(releaseDir, 'Launch-MyThing-Release.exe'), dest: join(root, 'Launch-MyThing-Release.exe') }
]

let copied = 0
for (const { built, dest } of copies) {
  if (!existsSync(built)) continue
  copyFileSync(built, dest)
  console.log(`Copied to ${dest}`)
  copied += 1
}

if (!copied) {
  console.error('No launcher exe found. Run: npm run launcher:build')
  process.exit(1)
}
