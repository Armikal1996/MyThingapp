import { invoke } from '@tauri-apps/api/core'
import { getDatabase } from '@/services/database.js'
import { isTauri } from '@/services/platform.js'

export const TASK_KINDS = {
  WORK: 'work',
  MOVING: 'moving',
  CYCLING: 'cycling'
}

export const WORK_STATUSES = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' }
]

export const MOVING_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done' }
]

export const RECURRENCE_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
]

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    kind: row.kind,
    priority: row.priority ?? 0,
    sortOrder: row.sort_order ?? 0,
    recurrence: row.recurrence || null,
    lastCompletedAt: row.last_completed_at || null,
    nextDueAt: row.next_due_at || null,
    dueAt: row.due_at || null,
    completedAt: row.completed_at || null,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createEmptyTask(kind = TASK_KINDS.WORK) {
  const defaults = {
    work: { status: 'backlog' },
    moving: { status: 'backlog' },
    cycling: { status: 'active', recurrence: 'daily' }
  }
  const d = defaults[kind] || defaults.work

  return {
    id: '',
    title: '',
    description: '',
    kind,
    status: d.status,
    priority: 0,
    sortOrder: 0,
    recurrence: d.recurrence || null,
    lastCompletedAt: null,
    nextDueAt: kind === TASK_KINDS.CYCLING ? computeNextDue(d.recurrence || 'daily') : null,
    dueAt: null,
    completedAt: null,
    tags: [],
    enabled: true
  }
}

export function computeNextDue(recurrence, fromDate = new Date()) {
  const d = new Date(fromDate)
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export async function getTask(id) {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM tasks WHERE id = $1', [id])
  return rows[0] ? rowToTask(rows[0]) : null
}

export async function listTasks(kind = null) {
  const db = await getDatabase()
  const rows = kind
    ? await db.select('SELECT * FROM tasks WHERE kind = $1 ORDER BY sort_order, updated_at DESC', [kind])
    : await db.select('SELECT * FROM tasks ORDER BY kind, sort_order, updated_at DESC')
  return rows.map(rowToTask)
}

export async function saveTask(task) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const tags = Array.isArray(task.tags) ? task.tags.join(',') : (task.tags || '')

  await db.execute(
    `INSERT INTO tasks (
      id, title, description, status, kind, priority, sort_order,
      recurrence, last_completed_at, next_due_at, due_at, completed_at,
      tags, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      kind = excluded.kind,
      priority = excluded.priority,
      sort_order = excluded.sort_order,
      recurrence = excluded.recurrence,
      last_completed_at = excluded.last_completed_at,
      next_due_at = excluded.next_due_at,
      due_at = excluded.due_at,
      completed_at = excluded.completed_at,
      tags = excluded.tags,
      updated_at = excluded.updated_at`,
    [
      task.id,
      task.title,
      task.description || '',
      task.status,
      task.kind,
      task.priority ?? 0,
      task.sortOrder ?? 0,
      task.recurrence || null,
      task.lastCompletedAt || null,
      task.nextDueAt || null,
      task.dueAt || null,
      task.completedAt || null,
      tags || null,
      task.createdAt || now,
      now
    ]
  )

  const rows = await db.select('SELECT * FROM tasks WHERE id = $1', [task.id])
  return rowToTask(rows[0])
}

export async function deleteTask(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM tasks WHERE id = $1', [id])
}

export async function moveTask(task, newStatus) {
  const updates = { ...task, status: newStatus }
  if (task.kind === TASK_KINDS.WORK && newStatus === 'done') {
    updates.completedAt = new Date().toISOString()
  }
  if (task.kind === TASK_KINDS.MOVING && newStatus === 'done') {
    updates.completedAt = new Date().toISOString()
  }
  return saveTask(updates)
}

export async function completeCyclingTask(task) {
  const now = new Date().toISOString()
  return saveTask({
    ...task,
    lastCompletedAt: now,
    nextDueAt: computeNextDue(task.recurrence || 'daily', now),
    status: 'active'
  })
}

export function newTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function getMovingColumns() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM task_columns WHERE board_id = $1 ORDER BY sort_order',
    ['moving']
  )
  return rows.map(r => ({ id: r.id, label: r.label, sortOrder: r.sort_order }))
}
