import { invoke } from '@tauri-apps/api/core'
import { getDatabase } from '@/services/database.js'
import { isTauri } from '@/services/platform.js'
import { MOVING_COLUMNS } from '@/services/tasks.js'
import backupConfig from '../../config/backup.json'

const BACKUP_VERSION = 1

const DEFAULT_TASK_COLUMNS = MOVING_COLUMNS.map((col, i) => ({
  id: col.id,
  board_id: 'moving',
  label: col.label,
  sort_order: i
}))

async function collectBackupData() {
  const db = await getDatabase()
  const meta = await db.select('SELECT key, value FROM meta ORDER BY key')
  const apps = await db.select('SELECT * FROM apps ORDER BY title')
  const tasks = await db.select('SELECT * FROM tasks ORDER BY kind, sort_order')
  const favorites = await db.select('SELECT * FROM favorites ORDER BY sort_order')
  const taskColumns = await db.select('SELECT * FROM task_columns ORDER BY sort_order')
  const calendarEvents = await db.select('SELECT * FROM calendar_events ORDER BY start_at')
  const reminders = await db.select('SELECT * FROM reminders ORDER BY remind_at')
  const mediaGames = await db.select('SELECT * FROM media_games ORDER BY title')
  const mediaWatchlist = await db.select('SELECT * FROM media_watchlist ORDER BY title')
  const aiThreads = await db.select('SELECT * FROM ai_threads ORDER BY updated_at')
  const aiMessages = await db.select('SELECT * FROM ai_messages ORDER BY created_at')
  const agentAnnouncements = await db.select('SELECT * FROM agent_announcements ORDER BY created_at')

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    apps,
    tasks,
    favorites,
    taskColumns,
    calendarEvents,
    reminders,
    mediaGames,
    mediaWatchlist,
    aiThreads,
    aiMessages,
    agentAnnouncements
  }
}

function validateBackup(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: not a JSON object.')
  }
  if (!Array.isArray(data.meta) && !Array.isArray(data.apps) && !Array.isArray(data.tasks)) {
    throw new Error('Invalid backup file: missing expected MyThing tables.')
  }
}

async function clearAllTables(db) {
  await db.execute('DELETE FROM reminders')
  await db.execute('DELETE FROM calendar_events')
  await db.execute('DELETE FROM ai_messages')
  await db.execute('DELETE FROM ai_threads')
  await db.execute('DELETE FROM agent_announcements')
  await db.execute('DELETE FROM media_watchlist')
  await db.execute('DELETE FROM media_games')
  await db.execute('DELETE FROM favorites')
  await db.execute('DELETE FROM tasks')
  await db.execute('DELETE FROM apps')
  await db.execute('DELETE FROM task_columns')
  await db.execute('DELETE FROM meta')
}

async function insertBackupRows(db, data) {
  for (const row of data.meta || []) {
    await db.execute('INSERT INTO meta (key, value) VALUES ($1, $2)', [
      row.key,
      row.value ?? ''
    ])
  }

  const columns = data.taskColumns?.length ? data.taskColumns : DEFAULT_TASK_COLUMNS
  for (const row of columns) {
    await db.execute(
      'INSERT INTO task_columns (id, board_id, label, sort_order) VALUES ($1,$2,$3,$4)',
      [row.id, row.board_id || 'moving', row.label, row.sort_order ?? 0]
    )
  }

  for (const row of data.apps || []) {
    await db.execute(
      `INSERT INTO apps (
        id, name, title, description, root_path, folder_name, runtime,
        install_cmd, start_cmd, open_terminal, port, tags,
        auto_discovered, enabled, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        row.id,
        row.name,
        row.title || row.name,
        row.description || '',
        row.root_path,
        row.folder_name || row.name,
        row.runtime || 'node',
        row.install_cmd || '',
        row.start_cmd || '',
        row.open_terminal ?? 1,
        row.port ?? null,
        row.tags || '',
        row.auto_discovered ?? 0,
        row.enabled ?? 1,
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.tasks || []) {
    await db.execute(
      `INSERT INTO tasks (
        id, title, description, status, kind, priority, sort_order,
        recurrence, last_completed_at, next_due_at, due_at, completed_at,
        tags, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        row.id,
        row.title,
        row.description || '',
        row.status || 'backlog',
        row.kind || 'work',
        row.priority ?? 0,
        row.sort_order ?? 0,
        row.recurrence || null,
        row.last_completed_at || null,
        row.next_due_at || null,
        row.due_at || null,
        row.completed_at || null,
        row.tags || '',
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.favorites || []) {
    await db.execute(
      `INSERT INTO favorites (
        id, label, icon, description, target_type, target_id,
        group_name, sort_order, enabled, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        row.id,
        row.label,
        row.icon || '★',
        row.description || '',
        row.target_type,
        row.target_id,
        row.group_name || 'Pinned',
        row.sort_order ?? 0,
        row.enabled ?? 1,
        row.created_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.calendarEvents || []) {
    await db.execute(
      `INSERT INTO calendar_events (
        id, title, description, start_at, end_at, all_day, color, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id,
        row.title,
        row.description || '',
        row.start_at,
        row.end_at || null,
        row.all_day ?? 0,
        row.color || null,
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.reminders || []) {
    await db.execute(
      `INSERT INTO reminders (
        id, title, description, remind_at, linked_type, linked_id,
        fired, enabled, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id,
        row.title,
        row.description || '',
        row.remind_at,
        row.linked_type || null,
        row.linked_id || null,
        row.fired ?? 0,
        row.enabled ?? 1,
        row.created_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.mediaGames || []) {
    await db.execute(
      `INSERT INTO media_games (
        id, title, description, platform, status, priority,
        hours_played, notes, tags, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        row.id,
        row.title,
        row.description || '',
        row.platform || '',
        row.status || 'backlog',
        row.priority ?? 0,
        row.hours_played ?? null,
        row.notes || '',
        row.tags || '',
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.mediaWatchlist || []) {
    await db.execute(
      `INSERT INTO media_watchlist (
        id, title, description, media_type, status, season, episode,
        rating, notes, tags, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        row.id,
        row.title,
        row.description || '',
        row.media_type || 'movie',
        row.status || 'backlog',
        row.season ?? null,
        row.episode ?? null,
        row.rating ?? null,
        row.notes || '',
        row.tags || '',
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.aiThreads || []) {
    await db.execute(
      `INSERT INTO ai_threads (id, title, model_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        row.id,
        row.title || 'New chat',
        row.model_key || 'gemma',
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.aiMessages || []) {
    await db.execute(
      `INSERT INTO ai_messages (id, thread_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        row.id,
        row.thread_id,
        row.role,
        row.content || '',
        row.created_at || new Date().toISOString()
      ]
    )
  }

  for (const row of data.agentAnnouncements || []) {
    await db.execute(
      `INSERT INTO agent_announcements (
        id, title, body, agent_role, priority, status, created_at, updated_at, read_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id,
        row.title,
        row.body || '',
        row.agent_role || 'implementation',
        row.priority || 'normal',
        row.status || 'pending',
        row.created_at || new Date().toISOString(),
        row.updated_at || new Date().toISOString(),
        row.read_at || null
      ]
    )
  }
}

export async function exportBackup() {
  if (!isTauri()) {
    const data = await collectBackupData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mything-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    return { path: 'browser-download', tables: Object.keys(data).length }
  }

  const data = await collectBackupData()
  const path = await invoke('export_backup_file', { payload: JSON.stringify(data, null, 2) })
  return { path, tables: Object.keys(data).length }
}

export async function importBackup() {
  if (!isTauri()) {
    throw new Error('Import requires the MyThing desktop app.')
  }

  const raw = await invoke('pick_and_read_backup')
  if (!raw) return null

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Invalid backup file: could not parse JSON.')
  }

  validateBackup(data)

  const db = await getDatabase()

  try {
    await db.execute('BEGIN')
    await clearAllTables(db)
    await insertBackupRows(db, data)
    await db.execute('COMMIT')
  } catch (e) {
    try {
      await db.execute('ROLLBACK')
    } catch {
      /* ignore rollback errors */
    }
    throw new Error(`Import failed: ${e.message || e}`)
  }

  return { importedAt: data.exportedAt, version: data.version ?? BACKUP_VERSION }
}

export async function pickBackupForImport() {
  if (!isTauri()) throw new Error('Import requires the MyThing desktop app.')
  const raw = await invoke('pick_and_read_backup')
  if (!raw) return null
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Invalid backup file: could not parse JSON.')
  }
  validateBackup(data)
  const preview = await previewBackupImport(data)
  return { raw, data, preview }
}

export async function importBackupData(data) {
  if (!isTauri()) throw new Error('Import requires the MyThing desktop app.')
  validateBackup(data)
  const db = await getDatabase()
  try {
    await db.execute('BEGIN')
    await clearAllTables(db)
    await insertBackupRows(db, data)
    await db.execute('COMMIT')
  } catch (e) {
    try {
      await db.execute('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw new Error(`Import failed: ${e.message || e}`)
  }
  return { importedAt: data.exportedAt, version: data.version ?? BACKUP_VERSION }
}

function countRows(data, key) {
  return Array.isArray(data[key]) ? data[key].length : 0
}

export async function previewBackupImport(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  validateBackup(data)
  const current = await collectBackupData()

  const tables = [
    'apps', 'tasks', 'favorites', 'calendarEvents', 'reminders',
    'mediaGames', 'mediaWatchlist', 'aiThreads', 'agentAnnouncements'
  ]

  return tables.map(key => ({
    key,
    backup: countRows(data, key),
    current: countRows(current, key)
  }))
}

export async function getLastBackupTime() {
  try {
    const db = await getDatabase()
    const rows = await db.select("SELECT value FROM meta WHERE key = 'last_auto_backup'")
    return rows[0]?.value || null
  } catch {
    return null
  }
}

async function setLastBackupTime(iso) {
  const db = await getDatabase()
  await db.execute(
    `INSERT INTO meta (key, value) VALUES ('last_auto_backup', $1)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [iso]
  )
}

export async function exportBackupToFolder(folder = backupConfig.folder) {
  if (!isTauri()) throw new Error('Auto-backup requires desktop app.')
  const data = await collectBackupData()
  const path = await invoke('export_backup_to_folder', {
    folder,
    payload: JSON.stringify(data, null, 2)
  })
  await setLastBackupTime(new Date().toISOString())
  return path
}

export async function autoBackupIfStale() {
  if (!isTauri()) return null
  const last = await getLastBackupTime()
  const hours = backupConfig.intervalHours || 24
  const staleMs = hours * 60 * 60 * 1000
  if (last && Date.now() - new Date(last).getTime() < staleMs) return null
  return exportBackupToFolder()
}
