import { getDatabase } from '@/services/database.js'

export const EVENT_COLORS = [
  { id: 'blue', value: '#3b82f6' },
  { id: 'purple', value: '#8b5cf6' },
  { id: 'green', value: '#22c55e' },
  { id: 'amber', value: '#f59e0b' },
  { id: 'rose', value: '#f43f5e' }
]

function rowToEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    startAt: row.start_at,
    endAt: row.end_at || null,
    allDay: Boolean(row.all_day),
    color: row.color || '#3b82f6',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createEmptyEvent(date = new Date()) {
  const d = new Date(date)
  d.setHours(9, 0, 0, 0)
  const end = new Date(d)
  end.setHours(10, 0, 0, 0)
  return {
    id: '',
    title: '',
    description: '',
    startAt: d.toISOString(),
    endAt: end.toISOString(),
    allDay: false,
    color: '#3b82f6'
  }
}

export function newEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function listEvents() {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM calendar_events ORDER BY start_at')
  return rows.map(rowToEvent)
}

export async function listEventsInRange(startIso, endIso) {
  const events = await listEvents()
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return events.filter(e => {
    const eStart = new Date(e.startAt).getTime()
    const eEnd = e.endAt ? new Date(e.endAt).getTime() : eStart
    return eStart <= end && eEnd >= start
  })
}

export async function getEventsForDay(dayDate) {
  const start = new Date(dayDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dayDate)
  end.setHours(23, 59, 59, 999)
  return listEventsInRange(start.toISOString(), end.toISOString())
}

export async function saveEvent(event) {
  const db = await getDatabase()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO calendar_events (
      id, title, description, start_at, end_at, all_day, color, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      all_day = excluded.all_day,
      color = excluded.color,
      updated_at = excluded.updated_at`,
    [
      event.id,
      event.title,
      event.description || '',
      event.startAt,
      event.endAt || null,
      event.allDay ? 1 : 0,
      event.color || '#3b82f6',
      event.createdAt || now,
      now
    ]
  )

  const rows = await db.select('SELECT * FROM calendar_events WHERE id = $1', [event.id])
  return rowToEvent(rows[0])
}

export async function deleteEvent(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM calendar_events WHERE id = $1', [id])
}

export function getMonthRange(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start: first, end: last }
}

export function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startPad = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function isSameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateLabel(date) {
  return new Date(date).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}
