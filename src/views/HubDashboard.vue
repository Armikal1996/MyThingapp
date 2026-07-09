<template>
  <div class="dashboard">
    <section class="hero">
      <h2>Your local command center</h2>
      <p>
        MyThing runs on your PC. Phase 4 adds calendar events and desktop reminders.
      </p>
    </section>

    <section class="status-grid">
      <article class="status-card">
        <p class="label">Runtime</p>
        <p class="value">{{ platform.runtime }}</p>
      </article>
      <article class="status-card">
        <p class="label">Database</p>
        <p class="value">SQLite v{{ meta.schema_version || '—' }}</p>
      </article>
      <article class="status-card">
        <p class="label">Registered apps</p>
        <p class="value">{{ counts.apps }}</p>
      </article>
      <article class="status-card">
        <p class="label">Tasks</p>
        <p class="value">{{ counts.tasks }}</p>
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
      <p class="hint">Export all apps, tasks, and settings to a JSON file. Import restores everything.</p>
      <div class="backup-actions">
        <button class="backup-btn" @click="onExport">Export backup</button>
        <button class="backup-btn" :disabled="platform.runtime !== 'desktop'" @click="onImport">Import backup</button>
      </div>
      <p v-if="backupMsg" class="backup-msg">{{ backupMsg }}</p>
    </section>

    <section class="lmstudio">
      <h3>LM Studio (configured, not wired yet)</h3>
      <div class="lm-grid">
        <article v-for="(model, key) in lmstudio.models" :key="key" class="lm-card">
          <p class="lm-name">{{ model.label }}</p>
          <p class="lm-role">{{ model.role }}</p>
          <p class="lm-url">{{ model.baseUrl }}</p>
        </article>
      </div>
      <p class="hint">
        Load Gemma on port <strong>1234</strong> and Gwen on port <strong>1235</strong> in LM Studio
        before Phase 6 (AI chat). MyThing will call those OpenAI-compatible endpoints.
      </p>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getPlatformMeta, getTableCounts } from '@/services/database.js'
import { exportBackup, importBackup } from '@/services/backup.js'
import { getPlatformInfo, getLmStudioConfig } from '@/services/platform.js'

const platform = ref({ runtime: 'loading' })
const meta = ref({})
const counts = ref({ apps: 0, tasks: 0, favorites: 0 })
const backupMsg = ref('')
const lmstudio = getLmStudioConfig()

const modules = [
  {
    id: 'history-game',
    title: 'History Game',
    description: 'Time Web Academy — branching history explorer',
    icon: '◎',
    to: '/history-game',
    disabled: false
  },
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
    to: '/',
    disabled: true,
    phase: 5
  },
  {
    id: 'ai',
    title: 'AI Chat',
    description: 'LM Studio bots and agent inbox',
    icon: '✦',
    to: '/',
    disabled: true,
    phase: 6
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
    counts.value = await getTableCounts()
  } catch (e) {
    backupMsg.value = e.message
  }
}

async function onImport() {
  if (!confirm('Import replaces all current data. Continue?')) return
  try {
    const r = await importBackup()
    if (!r) return
    backupMsg.value = 'Backup restored.'
    meta.value = await getPlatformMeta()
    counts.value = await getTableCounts()
  } catch (e) {
    backupMsg.value = e.message
  }
}

onMounted(async () => {
  platform.value = await getPlatformInfo()
  meta.value = await getPlatformMeta()
  counts.value = await getTableCounts()
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
.backup h3 {
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

@media (max-width: 900px) {
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
