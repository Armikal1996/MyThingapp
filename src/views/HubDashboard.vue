<template>
  <div class="dashboard">
    <section class="hero">
      <h2>Your local command center</h2>
      <p>
        MyThing runs on your PC — tasks, calendar, media, launcher, favorites, and local AI via LM Studio.
        Press <kbd>Ctrl+Shift+M</kbd> anywhere to open Favorites.
      </p>
    </section>

    <section v-if="snapshot" class="today">
      <h3>Today</h3>
      <div class="today-grid">
        <article class="today-card">
          <p class="label">Due tasks</p>
          <p class="value">{{ snapshot.dueToday.length }}</p>
          <ul v-if="snapshot.dueToday.length">
            <li v-for="t in snapshot.dueToday.slice(0, 3)" :key="t.id">{{ t.title }}</li>
          </ul>
        </article>
        <article class="today-card">
          <p class="label">Events</p>
          <p class="value">{{ snapshot.todayEvents.length }}</p>
        </article>
        <article class="today-card">
          <p class="label">Playing / watching</p>
          <p class="value">{{ snapshot.playing.length + snapshot.watching.length }}</p>
          <p v-if="snapshot.playing[0]" class="hint-line">▣ {{ snapshot.playing[0].title }}</p>
          <p v-if="snapshot.watching[0]" class="hint-line">▶ {{ snapshot.watching[0].title }}</p>
        </article>
        <article class="today-card">
          <p class="label">Agent inbox</p>
          <p class="value">{{ snapshot.unreadAnnouncements }}</p>
          <RouterLink to="/ai" class="inbox-link">Open AI Chat →</RouterLink>
        </article>
      </div>
    </section>

    <section class="quick-actions">
      <h3>Quick actions</h3>
      <div class="action-row">
        <button class="backup-btn" @click="router.push('/tasks')">New task</button>
        <button class="backup-btn" @click="router.push('/media')">Add watch item</button>
        <button class="backup-btn" @click="router.push('/ai')">Open AI</button>
        <button class="backup-btn" :disabled="platform.runtime !== 'desktop'" @click="onExport">Backup now</button>
      </div>
      <p v-if="lastBackup" class="hint">Last auto-backup: {{ formatBackupTime(lastBackup) }}</p>
    </section>

    <section v-if="activity.length" class="activity">
      <h3>Recent activity</h3>
      <ul class="activity-list">
        <li v-for="item in activity" :key="`${item.type}-${item.id}`">
          <span class="act-type">{{ item.type }}</span>
          {{ item.title }}
          <span class="act-time">{{ formatActivityTime(item.at) }}</span>
        </li>
      </ul>
    </section>

    <section class="status-grid">
      <article class="status-card">
        <p class="label">Runtime</p>
        <p class="value">{{ platform.runtime }}</p>
      </article>
      <article class="status-card">
        <p class="label">Schema</p>
        <p class="value">v{{ meta.schema_version || '—' }}</p>
      </article>
      <article class="status-card">
        <p class="label">Apps</p>
        <p class="value">{{ counts.apps }}</p>
      </article>
      <article class="status-card">
        <p class="label">Tasks</p>
        <p class="value">{{ counts.tasks ?? 0 }}</p>
      </article>
      <article class="status-card">
        <p class="label">Favorites</p>
        <p class="value">{{ counts.favorites ?? 0 }}</p>
      </article>
      <article class="status-card">
        <p class="label">Events</p>
        <p class="value">{{ counts.events ?? 0 }}</p>
      </article>
      <article class="status-card">
        <p class="label">Games</p>
        <p class="value">{{ counts.games ?? 0 }}</p>
      </article>
      <article class="status-card">
        <p class="label">Watchlist</p>
        <p class="value">{{ counts.watchlist ?? 0 }}</p>
      </article>
      <article class="status-card">
        <p class="label">AI chats</p>
        <p class="value">{{ counts.aiThreads ?? 0 }}</p>
      </article>
    </section>

    <section class="modules">
      <h3>Modules</h3>
      <div class="module-grid">
        <RouterLink
          v-for="module in modules"
          :key="module.id"
          :to="module.to"
          class="module-card"
          :class="{ disabled: module.disabled }"
          @click="onModuleClick($event, module)"
        >
          <span class="module-icon">{{ module.icon }}</span>
          <div>
            <p class="module-title">{{ module.title }}</p>
            <p class="module-desc">{{ module.description }}</p>
          </div>
          <span v-if="module.disabled" class="badge">Phase {{ module.phase }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="backup">
      <h3>Backup</h3>
      <p class="hint">Export apps, tasks, favorites, calendar, media, AI chats, and settings to JSON. Import replaces current data.</p>
      <div class="backup-actions">
        <button class="backup-btn" @click="onExport">Export backup</button>
        <button class="backup-btn" :disabled="platform.runtime !== 'desktop'" @click="onImport">Import backup</button>
      </div>
      <p v-if="backupMsg" class="backup-msg">{{ backupMsg }}</p>
    </section>

    <section class="lmstudio">
      <h3>LM Studio</h3>
      <div class="lm-grid">
        <article v-for="(model, key) in lmstudio.models" :key="key" class="lm-card">
          <p class="lm-name">
            <span class="status-dot" :class="lmHealth[key]?.online ? 'ok' : 'bad'" />
            {{ model.label }}
          </p>
          <p class="lm-role">{{ model.role }}</p>
          <p class="lm-url">{{ model.baseUrl }}</p>
          <p class="lm-status">{{ lmHealth[key]?.online ? 'Online' : (lmHealth[key]?.error || 'Offline') }}</p>
        </article>
      </div>
      <p class="hint">
        Load Gemma on port <strong>1234</strong> and Gwen on port <strong>1235</strong> in LM Studio,
        then open <strong>AI Chat</strong> to check status and start a conversation.
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPlatformMeta, getTableCounts } from '@/services/database.js'
import { autoBackupIfStale, exportBackup, getLastBackupTime, importBackupData, pickBackupForImport } from '@/services/backup.js'
import { getPlatformInfo, getLmStudioConfig } from '@/services/platform.js'
import { getHubSnapshot, getActivityFeed } from '@/services/hubContext.js'
import { checkAllModels } from '@/services/lmstudio.js'

const platform = ref({ runtime: 'loading' })
const meta = ref({})
const counts = ref({ apps: 0, tasks: 0, favorites: 0, games: 0, watchlist: 0, aiThreads: 0, events: 0 })
const backupMsg = ref('')
const lmstudio = getLmStudioConfig()
const snapshot = ref(null)
const activity = ref([])
const lmHealth = ref({})
const lastBackup = ref(null)

const router = useRouter()

const modules = [
  {
    id: 'launcher',
    title: 'App Launcher',
    description: 'Start WOrK projects with npm / Python',
    icon: '▶',
    to: '/launcher',
    disabled: false
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Work, moving, and cycling tasks',
    icon: '☑',
    to: '/tasks',
    disabled: false
  },
  {
    id: 'favorites',
    title: 'Favorites',
    description: 'Start-menu style quick panel',
    icon: '★',
    to: '/favorites',
    disabled: false
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Events and reminders',
    icon: '📅',
    to: '/calendar',
    disabled: false
  },
  {
    id: 'media',
    title: 'Media',
    description: 'Games to play and watchlists',
    icon: '▣',
    to: '/media',
    disabled: false
  },
  {
    id: 'ai',
    title: 'AI Chat',
    description: 'LM Studio bots and agent inbox',
    icon: '✦',
    to: '/ai',
    disabled: false
  },
  {
    id: 'history-game',
    title: 'History Game',
    description: 'Time Web Academy — branching history explorer',
    icon: '◎',
    to: '/history-game',
    disabled: false
  }
]

function onModuleClick(event, module) {
  if (module.disabled) {
    event.preventDefault()
  }
}

async function onExport() {
  try {
    const r = await exportBackup()
    backupMsg.value = r.path ? `Saved to ${r.path}` : 'Backup exported.'
    lastBackup.value = await getLastBackupTime()
    counts.value = await getTableCounts()
  } catch (e) {
    backupMsg.value = e.message
  }
}

function formatBackupTime(iso) {
  return new Date(iso).toLocaleString()
}

function formatActivityTime(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPreviewTable(key) {
  const labels = {
    apps: 'Apps', tasks: 'Tasks', favorites: 'Favorites', calendarEvents: 'Events',
    reminders: 'Reminders', mediaGames: 'Games', mediaWatchlist: 'Watchlist',
    aiThreads: 'AI chats', agentAnnouncements: 'Inbox'
  }
  return labels[key] || key
}

async function onImport() {
  try {
    const picked = await pickBackupForImport()
    if (!picked) return

    const lines = picked.preview.map(row =>
      `${formatPreviewTable(row.key)}: ${row.current} → ${row.backup}`
    )
    const ok = confirm(
      `Import replaces all current data.\n\nTable counts (current → backup):\n${lines.join('\n')}\n\nContinue?`
    )
    if (!ok) return

    const r = await importBackupData(picked.data)
    backupMsg.value = `Backup restored (${r.version}).`
    meta.value = await getPlatformMeta()
    counts.value = await getTableCounts()
    snapshot.value = await getHubSnapshot()
    activity.value = await getActivityFeed()
  } catch (e) {
    backupMsg.value = e.message
  }
}

onMounted(async () => {
  platform.value = await getPlatformInfo()
  meta.value = await getPlatformMeta()
  counts.value = await getTableCounts()
  snapshot.value = await getHubSnapshot()
  activity.value = await getActivityFeed()
  lmHealth.value = await checkAllModels()
  lastBackup.value = await getLastBackupTime()

  if (platform.value.runtime === 'desktop') {
    try {
      await autoBackupIfStale()
      lastBackup.value = await getLastBackupTime()
    } catch {
      /* silent auto-backup failure */
    }
  }
})
</script>

<style scoped>
.dashboard {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.hero h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.hero p {
  color: #94a3b8;
  max-width: 720px;
  line-height: 1.5;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.status-card,
.lm-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 14px 16px;
}

.label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.value {
  font-size: 18px;
  font-weight: 600;
}

.modules h3,
.lmstudio h3,
.backup h3,
.today h3,
.quick-actions h3,
.activity h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 12px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #1f2937;
  background: #0f172a;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;
}

.module-card:not(.disabled):hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.module-card.disabled {
  opacity: 0.55;
  cursor: default;
}

.module-icon {
  font-size: 22px;
  line-height: 1;
}

.module-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.module-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
}

.badge {
  margin-left: auto;
  font-size: 10px;
  color: #64748b;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
}

.lm-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.lm-name {
  font-weight: 600;
}

.lm-role {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0;
  text-transform: capitalize;
}

.lm-url {
  font-size: 12px;
  color: #93c5fd;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.hint {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
}

.backup-actions {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

.backup-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.backup-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.backup-msg {
  font-size: 13px;
  color: #86efac;
}

.today-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.today-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 14px 16px;
}

.today-card ul {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  padding-left: 16px;
}

.hint-line {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.inbox-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #93c5fd;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.activity-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-list li {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}

.act-type {
  text-transform: uppercase;
  font-size: 10px;
  color: #64748b;
  margin-right: 8px;
}

.act-time {
  float: right;
  font-size: 11px;
  color: #64748b;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 6px;
}

.status-dot.ok { background: #22c55e; }
.status-dot.bad { background: #ef4444; }

.lm-status {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

kbd {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
}

@media (max-width: 900px) {
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
