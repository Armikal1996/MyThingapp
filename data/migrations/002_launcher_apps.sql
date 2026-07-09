-- Migration v2: extended app launcher fields

ALTER TABLE apps ADD COLUMN title TEXT;
ALTER TABLE apps ADD COLUMN description TEXT;
ALTER TABLE apps ADD COLUMN port INTEGER;
ALTER TABLE apps ADD COLUMN folder_name TEXT;
ALTER TABLE apps ADD COLUMN auto_discovered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE apps ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE apps ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

UPDATE apps SET title = name WHERE title IS NULL;
UPDATE apps SET folder_name = name WHERE folder_name IS NULL;

UPDATE meta SET value = '2' WHERE key = 'schema_version';
