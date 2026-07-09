import { getDatabase } from '@/services/database.js'

export const GAME_STATUSES = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'playing', label: 'Playing' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' }
]

export const WATCH_STATUSES = [
  { id: 'backlog', label: 'To watch' },
  { id: 'watching', label: 'Watching' },
  { id: 'completed', label: 'Finished' },
  { id: 'dropped', label: 'Dropped' }
]

export const MEDIA_TYPES = [
  { id: 'movie', label: 'Movie' },
  { id: 'series', label: 'Series' }
]

export const PLATFORMS = [
  'PC', 'Steam', 'Xbox', 'PlayStation', 'Switch', 'Mobile', 'Other'
]

function rowToGame(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    platform: row.platform || '',
    status: row.status,
    priority: row.priority ?? 0,
    hoursPlayed: row.hours_played ?? null,
    notes: row.notes || '',
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToWatch(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    mediaType: row.media_type || 'movie',
    status: row.status,
    season: row.season ?? null,
    episode: row.episode ?? null,
    rating: row.rating ?? null,
    notes: row.notes || '',
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function newGameId() {
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function newWatchId() {
  return `watch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyGame() {
  return {
    id: '',
    title: '',
    description: '',
    platform: 'PC',
    status: 'backlog',
    priority: 0,
    hoursPlayed: null,
    notes: '',
    tags: []
  }
}

export function createEmptyWatchItem() {
  return {
    id: '',
    title: '',
    description: '',
    mediaType: 'movie',
    status: 'backlog',
    season: null,
    episode: null,
    rating: null,
    notes: '',
    tags: []
  }
}

export async function listGames() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM media_games ORDER BY priority DESC, updated_at DESC'
  )
  return rows.map(rowToGame)
}

export async function saveGame(game) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const tags = Array.isArray(game.tags) ? game.tags.join(',') : (game.tags || '')

  await db.execute(
    `INSERT INTO media_games (
      id, title, description, platform, status, priority,
      hours_played, notes, tags, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      platform = excluded.platform,
      status = excluded.status,
      priority = excluded.priority,
      hours_played = excluded.hours_played,
      notes = excluded.notes,
      tags = excluded.tags,
      updated_at = excluded.updated_at`,
    [
      game.id, game.title, game.description || '', game.platform || '',
      game.status, game.priority ?? 0, game.hoursPlayed ?? null,
      game.notes || '', tags || null, game.createdAt || now, now
    ]
  )

  const rows = await db.select('SELECT * FROM media_games WHERE id = $1', [game.id])
  return rowToGame(rows[0])
}

export async function deleteGame(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM media_games WHERE id = $1', [id])
}

export async function listWatchlist() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM media_watchlist ORDER BY updated_at DESC'
  )
  return rows.map(rowToWatch)
}

export async function saveWatchItem(item) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const tags = Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || '')

  await db.execute(
    `INSERT INTO media_watchlist (
      id, title, description, media_type, status, season, episode,
      rating, notes, tags, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      media_type = excluded.media_type,
      status = excluded.status,
      season = excluded.season,
      episode = excluded.episode,
      rating = excluded.rating,
      notes = excluded.notes,
      tags = excluded.tags,
      updated_at = excluded.updated_at`,
    [
      item.id, item.title, item.description || '', item.mediaType || 'movie',
      item.status, item.season ?? null, item.episode ?? null,
      item.rating ?? null, item.notes || '', tags || null,
      item.createdAt || now, now
    ]
  )

  const rows = await db.select('SELECT * FROM media_watchlist WHERE id = $1', [item.id])
  return rowToWatch(rows[0])
}

export async function deleteWatchItem(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM media_watchlist WHERE id = $1', [id])
}

export async function getMediaCounts() {
  const db = await getDatabase()
  const [games] = await db.select('SELECT COUNT(*) as count FROM media_games')
  const [watching] = await db.select(
    "SELECT COUNT(*) as count FROM media_watchlist WHERE status = 'watching'"
  )
  const [playing] = await db.select(
    "SELECT COUNT(*) as count FROM media_games WHERE status = 'playing'"
  )
  return {
    games: games?.count ?? 0,
    watchlist: watching?.count ?? 0,
    playing: playing?.count ?? 0
  }
}
