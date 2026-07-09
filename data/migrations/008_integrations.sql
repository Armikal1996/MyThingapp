-- Phase 8: hub integration metadata (favorites hub_item support documented in meta)

INSERT OR IGNORE INTO meta (key, value) VALUES ('integrations_version', '1');
INSERT OR IGNORE INTO meta (key, value) VALUES ('last_auto_backup', '');

UPDATE meta SET value = '8' WHERE key = 'schema_version';
