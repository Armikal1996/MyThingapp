# MyThing — Phase 0 Setup

## Prerequisites

- Node.js 18+ (you have v24)
- Rust (via rustup) — ensure `%USERPROFILE%\.cargo\bin` is on your PATH
- LM Studio (for AI phases later)

If `tauri` says `cargo not found`, open a **new terminal** after installing Rust, or run:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
```

## Run the desktop app

```bash
npm install
npm run tauri:dev
```

Browser-only preview (no SQLite / process access):

```bash
npm run dev
```

## LM Studio — when to load models

**Not needed for Phase 0.** Load models when we start **Phase 6 (AI Chat)**.

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

- **Export backup** — saves apps, tasks, meta, and favorites to a JSON file.
- **Import backup** — restores from a JSON file (replaces current data).

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
