import { openUrl } from '@tauri-apps/plugin-opener'
import { getDatabase } from '@/services/database.js'
import { getApp, listApps, openAppFolder, runAppCommand } from '@/services/launcher.js'
import { isTauri } from '@/services/platform.js'
import defaults from '../../config/favorites-defaults.json'

export const TARGET_TYPES = [
  { id: 'route', label: 'MyThing module', hint: 'e.g. /launcher' },
  { id: 'app', label: 'Registered app', hint: 'Start command from launcher' },
  { id: 'url', label: 'Web link', hint: 'https://...' },
  { id: 'folder', label: 'Folder', hint: 'Opens in Explorer' }
]

export const BUILTIN_ROUTES = [
  { id: '/', label: 'Dashboard' },
  { id: '/launcher', label: 'Launcher' },
  { id: '/tasks', label: 'Tasks' },
  { id: '/favorites', label: 'Favorites' },
  { id: '/calendar', label: 'Calendar' },
  { id: '/media', label: 'Media' },
  { id: '/ai', label: 'AI Chat' },
  { id: '/history-game', label: 'History Game' }
]

function rowToFavorite(row) {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon || '★',
    description: row.description || '',
    targetType: row.target_type,
    targetId: row.target_id || '',
    groupName: row.group_name || 'Pinned',
    sortOrder: row.sort_order ?? 0,
    enabled: row.enabled !== 0,
    createdAt: row.created_at
  }
}

export function createEmptyFavorite(overrides = {}) {
  return {
    id: '',
    label: '',
    icon: '★',
    description: '',
    targetType: 'route',
    targetId: '/',
    groupName: 'Pinned',
    sortOrder: 0,
    enabled: true,
    ...overrides
  }
}

export function newFavoriteId() {
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function listFavorites() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM favorites WHERE enabled = 1 OR enabled IS NULL ORDER BY group_name, sort_order, label'
  )
  return rows.map(rowToFavorite)
}

export async function listAllFavorites() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM favorites ORDER BY group_name, sort_order, label'
  )
  return rows.map(rowToFavorite)
}

export async function saveFavorite(fav) {
  const db = await getDatabase()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO favorites (
      id, label, icon, description, target_type, target_id,
      group_name, sort_order, enabled, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      icon = excluded.icon,
      description = excluded.description,
      target_type = excluded.target_type,
      target_id = excluded.target_id,
      group_name = excluded.group_name,
      sort_order = excluded.sort_order,
      enabled = excluded.enabled`,
    [
      fav.id,
      fav.label,
      fav.icon || '★',
      fav.description || '',
      fav.targetType,
      fav.targetId || '',
      fav.groupName || 'Pinned',
      fav.sortOrder ?? 0,
      fav.enabled === false ? 0 : 1,
      fav.createdAt || now
    ]
  )

  const rows = await db.select('SELECT * FROM favorites WHERE id = $1', [fav.id])
  return rowToFavorite(rows[0])
}

export async function deleteFavorite(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM favorites WHERE id = $1', [id])
}

export async function seedDefaultFavorites() {
  const existing = await listAllFavorites()
  const existingIds = new Set(existing.map(f => f.id))
  let count = 0

  for (const group of defaults.groups) {
    for (const item of group.items) {
      if (existingIds.has(item.id)) continue
      await saveFavorite({
        ...item,
        groupName: group.name,
        enabled: true
      })
      count += 1
    }
  }
  return { seeded: count }
}

export function groupFavorites(favorites) {
  const groups = new Map()
  for (const fav of favorites) {
    if (!fav.enabled) continue
    const name = fav.groupName || 'Pinned'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(fav)
  }
  return Array.from(groups.entries()).map(([name, items]) => ({
    name,
    items: items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  }))
}

export async function launchFavorite(fav, router) {
  switch (fav.targetType) {
    case 'route': {
      const path = fav.targetId?.startsWith('/') ? fav.targetId : `/${fav.targetId}`
      await router.push(path)
      return { action: 'navigate', path }
    }
    case 'app': {
      const app = await getApp(fav.targetId)
      if (!app) throw new Error(`App not found: ${fav.targetId}`)
      await runAppCommand(app, 'start')
      return { action: 'start', app: app.title }
    }
    case 'url': {
      if (!fav.targetId) throw new Error('URL is empty')
      if (isTauri()) {
        await openUrl(fav.targetId)
      } else {
        window.open(fav.targetId, '_blank', 'noopener')
      }
      return { action: 'url', url: fav.targetId }
    }
    case 'folder': {
      if (!isTauri()) throw new Error('Opening folders requires the desktop app.')
      await openAppFolder({ rootPath: fav.targetId })
      return { action: 'folder', path: fav.targetId }
    }
    default:
      throw new Error(`Unknown target type: ${fav.targetType}`)
  }
}

export async function getAppsForPicker() {
  const apps = await listApps()
  return apps.filter(a => a.enabled)
}

export async function pinAppAsFavorite(app) {
  return saveFavorite({
    id: newFavoriteId(),
    label: app.title,
    icon: app.runtime === 'node' ? '⬡' : app.runtime === 'python' ? '🐍' : '▶',
    description: app.description || `Start ${app.title}`,
    targetType: 'app',
    targetId: app.id,
    groupName: 'Apps',
    sortOrder: 0,
    enabled: true
  })
}
