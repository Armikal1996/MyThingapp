<template>
  <div class="dashboard hub-scroll">
    <DashboardHero />
    <TodayPanel :snapshot="snapshot" />
    <QuickActionsBar
      :snapshot="snapshot"
      :platform="platform"
      :last-backup="lastBackup"
      @backup="onExport"
    />
    <ActivityFeed :activity="activity" />
    <StatsStrip :counts="counts" :meta="meta" :platform="platform" />
    <ModuleGrid :counts="counts" />
    <SystemPanel
      :platform="platform"
      :lm-health="lmHealth"
      :backup-msg="backupMsg"
      :msg-type="backupMsgType"
      @export="onExport"
      @import="onImport"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getPlatformMeta, getTableCounts } from '@/services/database.js'
import {
  autoBackupIfStale,
  exportBackup,
  getLastBackupTime,
  importBackupData,
  pickBackupForImport
} from '@/services/backup.js'
import { getPlatformInfo } from '@/services/platform.js'
import { getHubSnapshot, getActivityFeed } from '@/services/hubContext.js'
import { checkAllModels } from '@/services/lmstudio.js'
import { useToast } from '@/composables/useToast.js'
import DashboardHero from '@/views/dashboard/DashboardHero.vue'
import TodayPanel from '@/views/dashboard/TodayPanel.vue'
import QuickActionsBar from '@/views/dashboard/QuickActionsBar.vue'
import ActivityFeed from '@/views/dashboard/ActivityFeed.vue'
import StatsStrip from '@/views/dashboard/StatsStrip.vue'
import ModuleGrid from '@/views/dashboard/ModuleGrid.vue'
import SystemPanel from '@/views/dashboard/SystemPanel.vue'

const platform = ref({ runtime: 'loading' })
const meta = ref({})
const counts = ref({ apps: 0, tasks: 0, favorites: 0, games: 0, watchlist: 0, aiThreads: 0, events: 0 })
const backupMsg = ref('')
const backupMsgType = ref('success')
const snapshot = ref(null)
const activity = ref([])
const lmHealth = ref({})
const lastBackup = ref(null)

const { success, error: toastError } = useToast()

function formatPreviewTable(key) {
  const labels = {
    apps: 'Apps', tasks: 'Tasks', favorites: 'Favorites', calendarEvents: 'Events',
    reminders: 'Reminders', mediaGames: 'Games', mediaWatchlist: 'Watchlist',
    aiThreads: 'AI chats', agentAnnouncements: 'Inbox'
  }
  return labels[key] || key
}

async function onExport() {
  try {
    const r = await exportBackup()
    backupMsg.value = r.path ? `Saved to ${r.path}` : 'Backup exported.'
    backupMsgType.value = 'success'
    success(backupMsg.value)
    lastBackup.value = await getLastBackupTime()
    counts.value = await getTableCounts()
  } catch (e) {
    backupMsg.value = e.message
    backupMsgType.value = 'error'
    toastError(e.message)
  }
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
    backupMsgType.value = 'success'
    success(backupMsg.value)
    meta.value = await getPlatformMeta()
    counts.value = await getTableCounts()
    snapshot.value = await getHubSnapshot()
    activity.value = await getActivityFeed()
  } catch (e) {
    backupMsg.value = e.message
    backupMsgType.value = 'error'
    toastError(e.message)
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
    } catch { /* silent */ }
  }
})
</script>

<style scoped>
.dashboard {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
</style>
