-- Phase 2: extended tasks + kanban columns

ALTER TABLE tasks ADD COLUMN description TEXT;
ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN recurrence TEXT;
ALTER TABLE tasks ADD COLUMN last_completed_at TEXT;
ALTER TABLE tasks ADD COLUMN next_due_at TEXT;
ALTER TABLE tasks ADD COLUMN due_at TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
ALTER TABLE tasks ADD COLUMN tags TEXT;

CREATE TABLE IF NOT EXISTS task_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT 'moving',
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO task_columns (id, board_id, label, sort_order) VALUES
  ('backlog', 'moving', 'Backlog', 0),
  ('todo', 'moving', 'To Do', 1),
  ('doing', 'moving', 'Doing', 2),
  ('done', 'moving', 'Done', 3);

UPDATE meta SET value = '3' WHERE key = 'schema_version';
