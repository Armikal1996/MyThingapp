-- Phase 9: agent role on AI threads

ALTER TABLE ai_threads ADD COLUMN agent_role TEXT DEFAULT 'agent';

UPDATE meta SET value = '9' WHERE key = 'schema_version';