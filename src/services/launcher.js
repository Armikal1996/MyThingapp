import { invoke } from '@tauri-apps/api/core'
import { getDatabase } from '@/services/database.js'
import { isTauri } from '@/services/platform.js'
import workFolderConfig from '../../config/work-folder.json'

const META_WORK_FOLDER = 'work_folder'

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function rowToApp(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title || row.name,
    description: row.description || '',
    rootPath: row.root_path,
    folderName: row.folder_name || row.name,
    runtime: row.runtime,
    installCmd: row.install_cmd || '',
    startCmd: row.start_cmd || '',
    openTerminal: Boolean(row.open_terminal ?? 1),
    port: row.port ?? null,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    autoDiscovered: Boolean(row.auto_discovered),
    enabled: row.enabled !== 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getWorkFolder() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT value FROM meta WHERE key = $1',
    [META_WORK_FOLDER]
  )
  if (rows[0]?.value) return rows[0].value

  const def = workFolderConfig.defaultPath
  await setWorkFolder(def)
  return def
}

export async function setWorkFolder(path) {
  const db = await getDatabase()
  await db.execute(
    `INSERT INTO meta (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [META_WORK_FOLDER, path]
  )
}

export async function listApps() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM apps ORDER BY title COLLATE NOCASE, name COLLATE NOCASE'
  )
  return rows.map(rowToApp)
}

export async function getApp(id) {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM apps WHERE id = $1', [id])
  return rows[0] ? rowToApp(rows[0]) : null
}

export async function saveApp(app) {
  const db = await getDatabase()
  const tags = Array.isArray(app.tags) ? app.tags.join(',') : (app.tags || '')
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO apps (
      id, name, title, description, root_path, folder_name, runtime,
      install_cmd, start_cmd, open_terminal, port, tags,
      auto_discovered, enabled, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      title = excluded.title,
      description = excluded.description,
      root_path = excluded.root_path,
      folder_name = excluded.folder_name,
      runtime = excluded.runtime,
      install_cmd = excluded.install_cmd,
      start_cmd = excluded.start_cmd,
      open_terminal = excluded.open_terminal,
      port = excluded.port,
      tags = excluded.tags,
      auto_discovered = excluded.auto_discovered,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at`,
    [
      app.id,
      app.name,
      app.title || app.name,
      app.description || '',
      app.rootPath,
      app.folderName || app.name,
      app.runtime || 'other',
      app.installCmd || null,
      app.startCmd || null,
      app.openTerminal ? 1 : 0,
      app.port ?? null,
      tags || null,
      app.autoDiscovered ? 1 : 0,
      app.enabled === false ? 0 : 1,
      app.createdAt || now,
      now
    ]
  )

  return getApp(app.id)
}

export async function deleteApp(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM apps WHERE id = $1', [id])
}

export async function scanWorkFolder(workFolder) {
  if (!isTauri()) {
    throw new Error('Folder scan requires the MyThing desktop app.')
  }
  return invoke('scan_work_folder_cmd', { workFolder })
}

export async function syncWorkFolder() {
  const workFolder = await getWorkFolder()
  const discovered = await scanWorkFolder(workFolder)

  if (!Array.isArray(discovered)) {
    throw new Error('Scan failed: unexpected response from desktop scanner.')
  }

  let existing = await listApps()
  const byPath = new Map(existing.map(app => [normalizePath(app.rootPath), app]))
  const byFolder = new Map(existing.map(app => [app.folderName?.toLowerCase(), app]))

  let added = 0
  let updated = 0

  for (const project of discovered) {
    const normalized = normalizePath(project.rootPath)
    const existingApp = byPath.get(normalized) || byFolder.get(project.folderName.toLowerCase())

    if (existingApp) {
      if (existingApp.autoDiscovered) {
        await saveApp({
          ...existingApp,
          rootPath: project.rootPath,
          folderName: project.folderName,
          runtime: project.runtime,
          installCmd: existingApp.installCmd || project.suggestedInstall || '',
          startCmd: existingApp.startCmd || project.suggestedStart || '',
          autoDiscovered: true
        })
        updated += 1
      }
      continue
    }

    const id = uniqueId(slugify(project.folderName), existing)
    await saveApp({
      id,
      name: project.folderName,
      title: project.folderName,
      description: '',
      rootPath: project.rootPath,
      folderName: project.folderName,
      runtime: project.runtime,
      installCmd: project.suggestedInstall || '',
      startCmd: project.suggestedStart || '',
      openTerminal: true,
      port: null,
      tags: ['work'],
      autoDiscovered: true,
      enabled: true
    })
    added += 1
    existing = await listApps()
    byPath.set(normalized, existing.find(a => a.id === id))
    byFolder.set(project.folderName.toLowerCase(), existing.find(a => a.id === id))
  }

  return { added, updated, total: discovered.length }
}

function uniqueId(base, existing) {
  const ids = new Set(existing.map(app => app.id))
  if (!ids.has(base)) return base
  let i = 2
  while (ids.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

export async function runAppCommand(app, kind) {
  if (!isTauri()) {
    throw new Error('Running commands requires the MyThing desktop app.')
  }

  const command = kind === 'install' ? app.installCmd : app.startCmd
  if (!command?.trim()) {
    throw new Error(`No ${kind} command set for this app. Edit it first.`)
  }

  return invoke('run_app_command', {
    workingDir: app.rootPath,
    command,
    openTerminal: app.openTerminal
  })
}

export async function openAppFolder(app) {
  if (!isTauri()) {
    throw new Error('Opening folders requires the MyThing desktop app.')
  }
  return invoke('open_app_folder', { path: app.rootPath })
}

export async function pickProjectFolder() {
  if (!isTauri()) return null
  return invoke('pick_project_folder')
}

export async function pickWorkFolder() {
  if (!isTauri()) return null
  return invoke('pick_work_folder')
}

export async function getDefaultWorkFolder() {
  if (!isTauri()) return workFolderConfig.defaultPath
  return invoke('get_default_work_folder')
}

export function createEmptyApp(overrides = {}) {
  return {
    id: '',
    name: '',
    title: '',
    description: '',
    rootPath: '',
    folderName: '',
    runtime: 'node',
    installCmd: 'npm install',
    startCmd: 'npm run dev',
    openTerminal: true,
    port: null,
    tags: [],
    autoDiscovered: false,
    enabled: true,
    ...overrides
  }
}
