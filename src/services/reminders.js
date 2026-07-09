import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'
import { getDatabase } from '@/services/database.js'
import { isTauri } from '@/services/platform.js'

function rowToReminder(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    remindAt: row.remind_at,
    linkedType: row.linked_type || null,
    linkedId: row.linked_id || null,
    fired: Boolean(row.fired),
    enabled: row.enabled !== 0,
    createdAt: row.created_at
  }
}

export function createEmptyReminder(date = new Date()) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + 30, 0, 0)
  return {
    id: '',
    title: '',
    description: '',
    remindAt: d.toISOString(),
    linkedType: null,
    linkedId: null,
    fired: false,
    enabled: true
  }
}

export function newReminderId() {
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function listReminders() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM reminders ORDER BY remind_at'
  )
  return rows.map(rowToReminder)
}

export async function listUpcomingReminders() {
  const all = await listReminders()
  const now = Date.now()
  return all.filter(r => r.enabled && !r.fired && new Date(r.remindAt).getTime() >= now)
}

export async function listDueReminders() {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const rows = await db.select(
    `SELECT * FROM reminders
     WHERE enabled = 1 AND fired = 0 AND remind_at <= $1
     ORDER BY remind_at`,
    [now]
  )
  return rows.map(rowToReminder)
}

export async function saveReminder(reminder) {
  const db = await getDatabase()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO reminders (
      id, title, description, remind_at, linked_type, linked_id,
      fired, enabled, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      remind_at = excluded.remind_at,
      linked_type = excluded.linked_type,
      linked_id = excluded.linked_id,
      fired = excluded.fired,
      enabled = excluded.enabled`,
    [
      reminder.id,
      reminder.title,
      reminder.description || '',
      reminder.remindAt,
      reminder.linkedType || null,
      reminder.linkedId || null,
      reminder.fired ? 1 : 0,
      reminder.enabled === false ? 0 : 1,
      reminder.createdAt || now
    ]
  )

  const rows = await db.select('SELECT * FROM reminders WHERE id = $1', [reminder.id])
  return rowToReminder(rows[0])
}

export async function deleteReminder(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM reminders WHERE id = $1', [id])
}

export async function markReminderFired(id) {
  const db = await getDatabase()
  await db.execute('UPDATE reminders SET fired = 1 WHERE id = $1', [id])
}

export async function showDesktopNotification(title, body) {
  if (!isTauri()) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
    return
  }

  let granted = await isPermissionGranted()
  if (!granted) {
    const permission = await requestPermission()
    granted = permission === 'granted'
  }
  if (granted) {
    sendNotification({ title, body })
  }
}

export async function processDueReminders() {
  const due = await listDueReminders()
  for (const reminder of due) {
    await showDesktopNotification(
      reminder.title,
      reminder.description || 'Reminder from MyThing'
    )
    await markReminderFired(reminder.id)
  }
  return due.length
}

let schedulerId = null

export function startReminderScheduler(intervalMs = 30000) {
  if (schedulerId) return
  processDueReminders()
  schedulerId = setInterval(() => {
    processDueReminders().catch(() => {})
  }, intervalMs)
}

export function stopReminderScheduler() {
  if (schedulerId) {
    clearInterval(schedulerId)
    schedulerId = null
  }
}
