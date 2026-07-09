import { getDatabase } from '@/services/database.js'
import { listApps } from '@/services/launcher.js'
import { listTasks } from '@/services/tasks.js'
import { listGames, listWatchlist } from '@/services/media.js'
import { listEvents } from '@/services/calendar.js'
import { listThreads } from '@/services/aiChat.js'
import { countUnread } from '@/services/announcements.js'

export const HUB_ITEM_TYPES = ['task', 'game', 'watch', 'app', 'event']

export function hubItemKey(type, id) {
  return `${type}:${id}`
}

export function parseHubItemKey(key) {
  const idx = key.indexOf(':')
  if (idx === -1) return null
  return { type: key.slice(0, idx), id: key.slice(idx + 1) }
}

export function hubItemIcon(type) {
  const icons = { task: '☑', game: '▣', watch: '▶', app: '⬡', event: '📅' }
  return icons[type] || '•'
}

function toHubItem(type, row, extra = {}) {
  const id = row.id
  const title = row.title || row.name || row.label || 'Untitled'
  return {
    type,
    id,
    key: hubItemKey(type, id),
    title,
    subtitle: extra.subtitle || '',
    status: extra.status || '',
    tags: extra.tags || [],
    raw: row,
    ...extra
  }
}

export async function getContextItem(type, id) {
  const db = await getDatabase()
  switch (type) {
    case 'task': {
      const rows = await db.select('SELECT * FROM tasks WHERE id = $1', [id])
      if (!rows[0]) return null
      const t = rows[0]
      return toHubItem('task', t, {
        subtitle: t.kind,
        status: t.status,
        tags: t.tags ? t.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      })
    }
    case 'game': {
      const rows = await db.select('SELECT * FROM media_games WHERE id = $1', [id])
      if (!rows[0]) return null
      const g = rows[0]
      return toHubItem('game', g, {
        subtitle: g.platform || 'PC',
        status: g.status,
        tags: g.tags ? g.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      })
    }
    case 'watch': {
      const rows = await db.select('SELECT * FROM media_watchlist WHERE id = $1', [id])
      if (!rows[0]) return null
      const w = rows[0]
      const ep = w.season ? `S${w.season}${w.episode ? `E${w.episode}` : ''}` : ''
      return toHubItem('watch', w, {
        subtitle: w.media_type === 'series' ? `Series ${ep}`.trim() : 'Movie',
        status: w.status,
        tags: w.tags ? w.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      })
    }
    case 'app': {
      const rows = await db.select('SELECT * FROM apps WHERE id = $1', [id])
      if (!rows[0]) return null
      const a = rows[0]
      return toHubItem('app', { id: a.id, title: a.title || a.name }, {
        subtitle: a.runtime || '',
        status: a.enabled ? 'enabled' : 'disabled',
        tags: a.tags ? a.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      })
    }
    case 'event': {
      const rows = await db.select('SELECT * FROM calendar_events WHERE id = $1', [id])
      if (!rows[0]) return null
      const e = rows[0]
      return toHubItem('event', e, { subtitle: e.start_at, status: 'scheduled' })
    }
    default:
      return null
  }
}

export async function getContextItems(keys) {
  const items = []
  for (const key of keys) {
    const parsed = parseHubItemKey(key)
    if (!parsed) continue
    const item = await getContextItem(parsed.type, parsed.id)
    if (item) items.push(item)
  }
  return items
}

export function formatContextBlock(items) {
  if (!items?.length) return ''
  const lines = ['## MyThing context', '']
  for (const item of items) {
    lines.push(`### ${item.type}: ${item.title}`)
    if (item.subtitle) lines.push(`- ${item.subtitle}`)
    if (item.status) lines.push(`- Status: ${item.status}`)
    if (item.tags?.length) lines.push(`- Tags: ${item.tags.join(', ')}`)
    const raw = item.raw
    if (raw?.description) lines.push(`- Description: ${raw.description}`)
    if (raw?.notes) lines.push(`- Notes: ${raw.notes}`)
    if (raw?.body) lines.push(`- Body: ${raw.body}`)
    if (raw?.due_at) lines.push(`- Due: ${raw.due_at}`)
    if (raw?.install_cmd) lines.push(`- Install: ${raw.install_cmd}`)
    if (raw?.start_cmd) lines.push(`- Start: ${raw.start_cmd}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

export async function searchHubItems(query, limit = 30) {
  const q = query.trim().toLowerCase()
  const [tasks, games, watchlist, apps, events] = await Promise.all([
    listTasks(),
    listGames(),
    listWatchlist(),
    listApps(),
    listEvents()
  ])

  const all = [
    ...tasks.map(t => toHubItem('task', { id: t.id, title: t.title }, {
      subtitle: t.kind, status: t.status, tags: t.tags
    })),
    ...games.map(g => toHubItem('game', { id: g.id, title: g.title }, {
      subtitle: g.platform, status: g.status, tags: g.tags, raw: g
    })),
    ...watchlist.map(w => toHubItem('watch', { id: w.id, title: w.title }, {
      subtitle: w.mediaType, status: w.status, tags: w.tags, raw: w
    })),
    ...apps.map(a => toHubItem('app', { id: a.id, title: a.title }, {
      subtitle: a.runtime, status: a.enabled ? 'enabled' : 'disabled', tags: a.tags, raw: a
    })),
    ...events.map(e => toHubItem('event', { id: e.id, title: e.title }, {
      subtitle: e.startAt, raw: e
    }))
  ]

  if (!q) return all.slice(0, limit)

  return all.filter(item => {
    const hay = [item.title, item.subtitle, item.status, ...(item.tags || [])].join(' ').toLowerCase()
    return hay.includes(q)
  }).slice(0, limit)
}

export async function getQuickContextChips() {
  const [tasks, games, watchlist, apps] = await Promise.all([
    listTasks(),
    listGames(),
    listWatchlist(),
    listApps()
  ])

  const chips = []
  for (const g of games.filter(x => ['backlog', 'playing'].includes(x.status)).slice(0, 4)) {
    chips.push(toHubItem('game', { id: g.id, title: g.title }, { status: g.status, raw: g }))
  }
  for (const w of watchlist.filter(x => ['backlog', 'watching'].includes(x.status)).slice(0, 4)) {
    chips.push(toHubItem('watch', { id: w.id, title: w.title }, { status: w.status, raw: w }))
  }
  for (const t of tasks.filter(x => x.status === 'active' || x.kind === 'work').slice(0, 4)) {
    chips.push(toHubItem('task', { id: t.id, title: t.title }, { status: t.status, raw: t }))
  }
  for (const a of apps.filter(x => x.enabled).slice(0, 3)) {
    chips.push(toHubItem('app', { id: a.id, title: a.title }, { raw: a }))
  }
  return chips
}

export async function getHubSnapshot() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [tasks, games, watchlist, events, threads, unread] = await Promise.all([
    listTasks(),
    listGames(),
    listWatchlist(),
    listEvents(),
    listThreads(),
    countUnread()
  ])

  const dueToday = tasks.filter(t => {
    if (!t.dueAt) return false
    const d = new Date(t.dueAt)
    return d >= today && d < tomorrow
  })

  const playing = games.filter(g => g.status === 'playing')
  const watching = watchlist.filter(w => w.status === 'watching')
  const todayEvents = events.filter(e => {
    const d = new Date(e.startAt)
    return d >= today && d < tomorrow
  })

  return {
    dueToday,
    playing,
    watching,
    todayEvents,
    activeTasks: tasks.filter(t => t.status === 'active'),
    backlogGames: games.filter(g => g.status === 'backlog'),
    toWatch: watchlist.filter(w => w.status === 'backlog'),
    threadCount: threads.length,
    unreadAnnouncements: unread
  }
}

export async function getActivityFeed(limit = 12) {
  const db = await getDatabase()
  const items = []

  const tasks = await db.select(
    "SELECT id, title, updated_at FROM tasks ORDER BY updated_at DESC LIMIT 5"
  )
  for (const t of tasks) {
    items.push({ type: 'task', id: t.id, title: t.title, at: t.updated_at })
  }

  const threads = await db.select(
    'SELECT id, title, updated_at FROM ai_threads ORDER BY updated_at DESC LIMIT 5'
  )
  for (const t of threads) {
    items.push({ type: 'ai', id: t.id, title: t.title, at: t.updated_at })
  }

  const reminders = await db.select(
    'SELECT id, title, remind_at FROM reminders WHERE fired = 1 ORDER BY remind_at DESC LIMIT 5'
  )
  for (const r of reminders) {
    items.push({ type: 'reminder', id: r.id, title: r.title, at: r.remind_at })
  }

  return items
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}

export async function getTasksForDay(dayDate) {
  const tasks = await listTasks()
  const start = new Date(dayDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dayDate)
  end.setHours(23, 59, 59, 999)
  return tasks.filter(t => {
    if (!t.dueAt) return false
    const d = new Date(t.dueAt)
    return d >= start && d <= end
  })
}

export async function getHubDynamicTiles() {
  const snapshot = await getHubSnapshot()
  const tiles = []

  for (const g of snapshot.playing.slice(0, 1)) {
    tiles.push({
      id: `hub-game-${g.id}`,
      label: g.title,
      icon: '▣',
      description: 'Currently playing',
      targetType: 'hub_item',
      targetId: hubItemKey('game', g.id),
      groupName: 'From your hub',
      sortOrder: 0,
      enabled: true,
      dynamic: true
    })
  }

  for (const w of snapshot.watching.slice(0, 1)) {
    tiles.push({
      id: `hub-watch-${w.id}`,
      label: w.title,
      icon: '▶',
      description: 'Currently watching',
      targetType: 'hub_item',
      targetId: hubItemKey('watch', w.id),
      groupName: 'From your hub',
      sortOrder: 1,
      enabled: true,
      dynamic: true
    })
  }

  const nextDue = [...snapshot.dueToday, ...snapshot.activeTasks.filter(t => t.dueAt)]
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0]

  if (nextDue) {
    tiles.push({
      id: `hub-task-${nextDue.id}`,
      label: nextDue.title,
      icon: '☑',
      description: nextDue.dueAt ? `Due ${new Date(nextDue.dueAt).toLocaleDateString()}` : 'Active task',
      targetType: 'hub_item',
      targetId: hubItemKey('task', nextDue.id),
      groupName: 'From your hub',
      sortOrder: 2,
      enabled: true,
      dynamic: true
    })
  }

  return tiles
}
