-- Phase 3: extended favorites for Start-menu panel

ALTER TABLE favorites ADD COLUMN icon TEXT;
ALTER TABLE favorites ADD COLUMN description TEXT;
ALTER TABLE favorites ADD COLUMN group_name TEXT NOT NULL DEFAULT 'Pinned';
ALTER TABLE favorites ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;

UPDATE meta SET value = '4' WHERE key = 'schema_version';
