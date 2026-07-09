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
    return {
      apps: apps?.count ?? 0,
      tasks: tasks?.count ?? 0,
      favorites: favorites?.count ?? 0
    }
  } catch {
    return { apps: 0, tasks: 0, favorites: 0 }
  }
}
