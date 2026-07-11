/**
 * Download whisper.cpp binary + ggml model to APPDATA for dev/spike.
 * Usage: node scripts/setupWhisper.js [--model base.en|small.en]
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join, dirname, basename } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

import whisperConfig from '../config/whisper.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
const whisperRoot = join(appData, 'com.mything.desktop', 'whisper')
const binDir = join(whisperRoot, 'bin')
const modelDir = join(whisperRoot, 'models')

const modelArg = process.argv.find(a => a.startsWith('--model='))?.split('=')[1]
  || (process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : null)
  || 'base.en'

const modelDef = whisperConfig.models[modelArg]
if (!modelDef) {
  console.error(`Unknown model: ${modelArg}`)
  process.exit(1)
}

async function download(url, dest) {
  console.log(`Downloading ${basename(dest)}…`)
  mkdirSync(dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  console.log(`  Saved ${dest} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`)
}

async function downloadBinaryWindows() {
  const exePath = join(binDir, 'whisper-cli.exe')
  if (existsSync(exePath)) {
    console.log('Whisper binary already present.')
    return
  }

  const zipPath = join(whisperRoot, 'whisper-bin.zip')
  await download(whisperConfig.binary.windows.zipUrl, zipPath)

  mkdirSync(binDir, { recursive: true })
  const { execSync } = await import('child_process')
  const tempExtract = join(whisperRoot, '_extract')
  mkdirSync(tempExtract, { recursive: true })
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tempExtract.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit' }
  )

  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name)
      if (name.isDirectory()) walk(full)
      else if (name.name === 'whisper-cli.exe' || name.name.endsWith('.dll')) {
        copyFileSync(full, join(binDir, name.name))
        console.log(`  Extracted ${name.name}`)
      }
    }
  }
  walk(tempExtract)

  if (!existsSync(exePath)) {
    throw new Error('whisper-cli.exe not found after extract')
  }
  console.log('Whisper binary ready.')
}

async function downloadModel() {
  const dest = join(modelDir, modelDef.filename)
  if (existsSync(dest)) {
    console.log(`Model ${modelDef.filename} already present.`)
    return
  }
  await download(modelDef.url, dest)
}

console.log(`MyThing Whisper setup → ${whisperRoot}`)
console.log(`Model: ${modelArg} (${modelDef.label})`)

if (process.platform !== 'win32') {
  console.error('setupWhisper.js v1 supports Windows only.')
  process.exit(1)
}

try {
  await downloadBinaryWindows()
  await downloadModel()
  console.log('\nDone. Run spike test: see scripts/whisper-spike-readme.md')
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
