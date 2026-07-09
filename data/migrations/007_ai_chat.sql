-- Phase 6: AI chat threads and agent announcement inbox

CREATE TABLE IF NOT EXISTS ai_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model_key TEXT NOT NULL DEFAULT 'gemma',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES ai_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS agent_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  agent_role TEXT NOT NULL DEFAULT 'implementation',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

UPDATE meta SET value = '7' WHERE key = 'schema_version';
