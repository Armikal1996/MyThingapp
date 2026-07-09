# MyThing

Local desktop hub for tasks, calendar, media, app launching, and AI agents.

**Phase 0:** Tauri shell + Vue hub + SQLite schema + History Game module.

**Phase 1:** App Launcher — scan WOrK folder, add/edit/delete apps, run install/start in terminal.

**Phase 2:** Tasks — work list, moving kanban, cycling recurring tasks, JSON backup export/import.

**Phase 3:** Favorites — Start-menu panel with modules, apps, links, and folders.

**Phase 4:** Calendar — month view, events, and desktop reminder notifications.

**Phase 5:** Media — games queue and movies/series watchlist.

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
