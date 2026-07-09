# MyThing

Local desktop hub for tasks, calendar, media, app launching, and AI agents.

**Phase 0:** Tauri shell + Vue hub + SQLite schema + History Game module.

**Phase 1:** App Launcher — scan WOrK folder, add/edit/delete apps, run install/start in terminal.

## Quick start

```bash
npm install
npm run tauri:dev
```

See [SETUP.md](./SETUP.md) for LM Studio ports and prerequisites.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Desktop app (recommended) |
| `npm run dev` | Browser preview only |
| `npm run tauri:build` | Production installer |
| `npm run validate` | Validate history narration JSON |
