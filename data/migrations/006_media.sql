-- Phase 5: games queue and watchlist

CREATE TABLE IF NOT EXISTS media_games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority INTEGER NOT NULL DEFAULT 0,
  hours_played REAL,
  notes TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_watchlist (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL DEFAULT 'movie',
  status TEXT NOT NULL DEFAULT 'backlog',
  season INTEGER,
  episode INTEGER,
  rating INTEGER,
  notes TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

UPDATE meta SET value = '6' WHERE key = 'schema_version';
