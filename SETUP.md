# MyThing — Setup

## Prerequisites

- Node.js 18+ (you have v24)
- Rust (via rustup) — ensure `%USERPROFILE%\.cargo\bin` is on your PATH
- LM Studio (for AI Chat)

If `tauri` says `cargo not found`, open a **new terminal** after installing Rust, or run:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
```

## Run the desktop app

### Option A — double-click launcher (recommended)

1. Build the launcher once (needs Rust installed):

```powershell
cd "C:\Users\khoub\OneDrive\Desktop\My thing app v2.0"
npm run launcher:build
```

2. Double-click **`Launch-MyThing.exe`** in the project folder.

The exe prepends `%USERPROFILE%\.cargo\bin` to PATH, installs npm deps if needed, then runs `npm run tauri:dev`.

You can pin `Launch-MyThing.exe` to the taskbar or copy it to your Desktop (keep it in the project folder, or it won't find the app).

### Option B — PowerShell script

Right-click **`Launch-MyThing.ps1`** → **Run with PowerShell**, or:

```powershell
cd "C:\Users\khoub\OneDrive\Desktop\My thing app v2.0"
.\Launch-MyThing.ps1
```

### Option C — terminal

```bash
npm install
npm run tauri:dev
```

Browser-only preview (no SQLite / process access):

```bash
npm run dev
```

## LM Studio — when to load models

Load models for **AI Chat (Phase 6)**.

| Model | Port | Role in MyThing |
|-------|------|-----------------|
| **Gemma** | `1234` | Implementation specs, coding tasks |
| **Gwen** | `1235` | Long-context commit review |

### Steps in LM Studio

1. Open LM Studio → **Local Server** tab.
2. Load **Gemma** → start server on port **1234** (OpenAI-compatible API).
3. Open a second server instance (or switch model) for **Gwen** on port **1235**.
4. Confirm endpoints respond:
   - `http://127.0.0.1:1234/v1/models`
   - `http://127.0.0.1:1235/v1/models`

Ports are configured in `config/lmstudio.json`.

## App Launcher (Phase 1)

1. Open **Launcher** in the sidebar.
2. Confirm the **WOrK folder** path (default: `Desktop/WOrK`).
3. Click **Scan for new projects** — new subfolders are added automatically.
4. **Edit** any app to customize title, description, install/start commands, port, tags.
5. **Add app** manually for projects outside WOrK (e.g. MyThing on Desktop).
6. Use **Install** / **Start** to open a terminal and run your commands.

Re-scanning never overwrites commands you already set — only adds new folders.

## Tasks (Phase 2)

1. Open **Tasks** in the sidebar.
2. **Work** — filter by Backlog / Active / Done.
3. **Moving** — kanban board (Backlog → To Do → Doing → Done).
4. **Cycling** — recurring tasks; click **Complete** to schedule the next due date.

## Backup

From **Dashboard** or **Tasks** toolbar:

- **Export backup** — saves apps, tasks, favorites, calendar, reminders, media, AI chats, announcements, and settings to JSON.
- **Import backup** — restores from a JSON file (replaces current data; runs in a transaction).

Point exports at your OneDrive folder if you want cloud copies.

## Favorites (Phase 3)

1. Open **Favorites** in the sidebar.
2. Click tiles to open modules, start apps, open links, or folders.
3. **Edit** mode — add, edit, delete, or pin apps from the launcher.
4. Use the search bar to filter like Windows Start menu.

## Calendar (Phase 4)

1. Open **Calendar** in the sidebar.
2. Click a day to view events; use **+ Event** to schedule.
3. **+ Reminder** sets a one-shot desktop notification (checked every 30s while app is open).
4. Allow notifications when Windows prompts on first reminder.

## Media (Phase 5)

1. Open **Media** in the sidebar.
2. **Games** tab — track backlog, playing, completed, and dropped games with platform and hours.
3. **Movies & Series** tab — watchlist with season/episode progress and ratings.
4. Filter by status and search across titles.

## AI Chat (Phase 6)

1. Start **Gemma** on port **1234** and **Gwen** on port **1235** in LM Studio.
2. Open **AI Chat** → click **Check LM Studio** — green dots mean each model is reachable.
3. **Chat** tab — create threads, pick Gemma (implementation) or Gwen (review), send messages.
4. **Agent inbox** tab — post announcements for agents; **Send to chat** dispatches to the right model.

## Database

SQLite file: `mything.db` (created by Tauri in app data dir on first launch).

Schema: `data/schema.sql` — applied automatically via migrations.

## Project layout

```
src/              Vue hub UI + modules
src-tauri/        Rust desktop shell
data/             SQL schema
config/           LM Studio ports
agency/           (Phase 1+) agent role definitions
```
