import { invoke } from '@tauri-apps/api/core'
import { getDatabase } from '@/services/database.js'
import { isTauri } from '@/services/platform.js'

const BACKUP_VERSION = 1

async function collectBackupData() {
  const db = await getDatabase()
  const meta = await db.select('SELECT key, value FROM meta ORDER BY key')
  const apps = await db.select('SELECT * FROM apps ORDER BY title')
  const tasks = await db.select('SELECT * FROM tasks ORDER BY kind, sort_order')
  const favorites = await db.select('SELECT * FROM favorites ORDER BY sort_order')
  const taskColumns = await db.select('SELECT * FROM task_columns ORDER BY sort_order')
  const calendarEvents = await db.select('SELECT * FROM calendar_events ORDER BY start_at')
  const reminders = await db.select('SELECT * FROM reminders ORDER BY remind_at')

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    apps,
    tasks,
    favorites,
    taskColumns,
    calendarEvents,
    reminders
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
  let raw

  if (!isTauri()) {
    throw new Error('Import requires the MyThing desktop app.')
  }

  raw = await invoke('pick_and_read_backup')
  if (!raw) return null

  const data = JSON.parse(raw)
  const db = await getDatabase()

  await db.execute('DELETE FROM reminders')
  await db.execute('DELETE FROM calendar_events')
  await db.execute('DELETE FROM favorites')
  await db.execute('DELETE FROM tasks')
  await db.execute('DELETE FROM apps')
  await db.execute('DELETE FROM task_columns')
  await db.execute('DELETE FROM meta')

  for (const row of data.meta || []) {
    await db.execute('INSERT INTO meta (key, value) VALUES ($1, $2)', [row.key, row.value])
  }

  for (const row of data.taskColumns || []) {
    await db.execute(
      'INSERT INTO task_columns (id, board_id, label, sort_order) VALUES ($1,$2,$3,$4)',
      [row.id, row.board_id, row.label, row.sort_order]
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
        row.id, row.name, row.title, row.description, row.root_path, row.folder_name,
        row.runtime, row.install_cmd, row.start_cmd, row.open_terminal, row.port,
        row.tags, row.auto_discovered, row.enabled, row.created_at, row.updated_at
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
        row.id, row.title, row.description, row.status, row.kind, row.priority,
        row.sort_order, row.recurrence, row.last_completed_at, row.next_due_at,
        row.due_at, row.completed_at, row.tags, row.created_at, row.updated_at
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
        row.id, row.label, row.icon, row.description, row.target_type, row.target_id,
        row.group_name || 'Pinned', row.sort_order, row.enabled ?? 1, row.created_at
      ]
    )
  }

  for (const row of data.calendarEvents || []) {
    await db.execute(
      `INSERT INTO calendar_events (
        id, title, description, start_at, end_at, all_day, color, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id, row.title, row.description, row.start_at, row.end_at,
        row.all_day, row.color, row.created_at, row.updated_at
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
        row.id, row.title, row.description, row.remind_at, row.linked_type,
        row.linked_id, row.fired, row.enabled ?? 1, row.created_at
      ]
    )
  }

  return { importedAt: data.exportedAt, version: data.version }
}
