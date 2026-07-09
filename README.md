# MyThing

Local desktop hub for tasks, calendar, media, app launching, and AI agents.

**Phase 0:** Tauri shell + Vue hub + SQLite schema + History Game module.

**Phase 1:** App Launcher — scan WOrK folder, add/edit/delete apps, run install/start in terminal.

**Phase 2:** Tasks — work list, moving kanban, cycling recurring tasks, JSON backup export/import.

**Phase 3:** Favorites — Start-menu panel with modules, apps, links, and folders.

**Phase 4:** Calendar — month view, events, and desktop reminder notifications.

**Phase 5:** Media — games queue and movies/series watchlist.

**Phase 6:** AI Chat — LM Studio (Gemma/Gwen) and agent announcement inbox.

Polish/QA pass completed after Phase 6.

## Quick start

### Double-click launcher (easiest)

1. Build the launcher once:

```powershell
cd "C:\Users\khoub\OneDrive\Desktop\My thing app v2.0"
npm run launcher:build
```

2. Double-click **`Launch-MyThing.exe`** in the project folder.

It loads your full Windows PATH (so Node and Cargo are found), installs npm deps if needed, then runs `npm run tauri:dev`. Pin it to the taskbar or keep a Desktop shortcut — the `.exe` must stay in the project folder.

Alternative: run **`Launch-MyThing.ps1`** (same behavior via PowerShell).

### Terminal

```bash
npm install
npm run tauri:dev
```

See [SETUP.md](./SETUP.md) for LM Studio ports and prerequisites.

## Scripts

| Command | Description |
|---------|-------------|
| `Launch-MyThing.exe` | Double-click dev launcher (build with `launcher:build` first) |
| `npm run launcher:build` | Build / refresh `Launch-MyThing.exe` |
| `npm run tauri:dev` | Desktop app (recommended) |
| `npm run dev` | Browser preview only |
| `npm run tauri:build` | Production installer (`.msi` / setup `.exe`) |
| `npm run validate` | Validate history narration JSON |
