import { getDatabase } from '@/services/database.js'
import { createThread, deleteThread, sendChatMessage } from '@/services/aiChat.js'
import { getAgencyRoles, modelKeyForAgencyRole } from '@/services/agency.js'

export const AGENT_ROLES = getAgencyRoles()

export const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' }
]

export const STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
  { id: 'dismissed', label: 'Dismissed' }
]

function rowToAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    agentRole: row.agent_role,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at
  }
}

export function newAnnouncementId() {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyAnnouncement() {
  return {
    id: '',
    title: '',
    body: '',
    agentRole: 'implementation',
    priority: 'normal',
    status: 'pending'
  }
}

export async function listAnnouncements(statusFilter = 'all') {
  const db = await getDatabase()
  let rows
  if (statusFilter === 'all') {
    rows = await db.select(
      'SELECT * FROM agent_announcements ORDER BY created_at DESC'
    )
  } else {
    rows = await db.select(
      'SELECT * FROM agent_announcements WHERE status = $1 ORDER BY created_at DESC',
      [statusFilter]
    )
  }
  return rows.map(rowToAnnouncement)
}

export async function countUnread() {
  const db = await getDatabase()
  const [row] = await db.select(
    "SELECT COUNT(*) as count FROM agent_announcements WHERE read_at IS NULL AND status != 'dismissed'"
  )
  return row?.count ?? 0
}

export async function saveAnnouncement(announcement) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = announcement.id || newAnnouncementId()

  if (announcement.id) {
    await db.execute(
      `UPDATE agent_announcements
       SET title = $1, body = $2, agent_role = $3, priority = $4, status = $5, updated_at = $6
       WHERE id = $7`,
      [
        announcement.title.trim(),
        announcement.body.trim(),
        announcement.agentRole,
        announcement.priority,
        announcement.status,
        now,
        id
      ]
    )
  } else {
    await db.execute(
      `INSERT INTO agent_announcements (
        id, title, body, agent_role, priority, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        announcement.title.trim(),
        announcement.body.trim(),
        announcement.agentRole,
        announcement.priority,
        announcement.status || 'pending',
        now,
        now
      ]
    )
  }

  const rows = await db.select('SELECT * FROM agent_announcements WHERE id = $1', [id])
  return rowToAnnouncement(rows[0])
}

export async function updateAnnouncementStatus(id, status) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.execute(
    'UPDATE agent_announcements SET status = $1, updated_at = $2 WHERE id = $3',
    [status, now, id]
  )
}

export async function markAnnouncementRead(id) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.execute(
    'UPDATE agent_announcements SET read_at = $1, updated_at = $2 WHERE id = $3',
    [now, now, id]
  )
}

export async function deleteAnnouncement(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM agent_announcements WHERE id = $1', [id])
}

export function modelKeyForRole(agentRole) {
  return modelKeyForAgencyRole(agentRole)
}

export async function dispatchToChat(announcement) {
  const modelKey = modelKeyForRole(announcement.agentRole)
  const roleLabel = AGENT_ROLES.find(r => r.id === announcement.agentRole)?.label || 'Agent'

  const thread = await createThread({
    title: announcement.title,
    modelKey
  })

  const prompt = [
    `[Agent announcement — ${roleLabel}]`,
    `Priority: ${announcement.priority}`,
    '',
    announcement.body
  ].join('\n')

  try {
    await sendChatMessage(thread.id, prompt)
    await updateAnnouncementStatus(announcement.id, 'in_progress')
    await markAnnouncementRead(announcement.id)
    return thread
  } catch (e) {
    await deleteThread(thread.id)
    throw e
  }
}
