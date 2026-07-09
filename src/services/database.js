import Database from '@tauri-apps/plugin-sql'

const DB_URL = 'sqlite:mything.db'

let dbPromise = null

export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL)
  }
  return dbPromise
}

export async function getPlatformMeta() {
  try {
    const db = await getDatabase()
    const rows = await db.select('SELECT key, value FROM meta ORDER BY key')
    return Object.fromEntries(rows.map(row => [row.key, row.value]))
  } catch {
    return { schema_version: 'browser', app_name: 'MyThing' }
  }
}

export async function getTableCounts() {
  try {
    const db = await getDatabase()
    const [apps] = await db.select('SELECT COUNT(*) as count FROM apps')
    const [tasks] = await db.select('SELECT COUNT(*) as count FROM tasks')
    const [favorites] = await db.select('SELECT COUNT(*) as count FROM favorites')
    const [games] = await db.select('SELECT COUNT(*) as count FROM media_games')
    const [watchlist] = await db.select('SELECT COUNT(*) as count FROM media_watchlist')
    const [aiThreads] = await db.select('SELECT COUNT(*) as count FROM ai_threads')
    const [events] = await db.select('SELECT COUNT(*) as count FROM calendar_events')
    return {
      apps: apps?.count ?? 0,
      tasks: tasks?.count ?? 0,
      favorites: favorites?.count ?? 0,
      games: games?.count ?? 0,
      watchlist: watchlist?.count ?? 0,
      aiThreads: aiThreads?.count ?? 0,
      events: events?.count ?? 0
    }
  } catch {
    return { apps: 0, tasks: 0, favorites: 0, games: 0, watchlist: 0, aiThreads: 0, events: 0 }
  }
}
