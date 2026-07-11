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
  try {
    copyFileSync(built, dest)
    console.log(`Copied to ${dest}`)
    copied += 1
  } catch (e) {
    if (e.code === 'EBUSY') {
      console.warn(`Skipped ${dest} (file in use). Close the running launcher and rebuild, or run:\n  ${built}`)
    } else {
      throw e
    }
  }
}

if (!copied) {
  console.error('No launcher exe copied. Run: npm run launcher:build')
  process.exit(1)
}
