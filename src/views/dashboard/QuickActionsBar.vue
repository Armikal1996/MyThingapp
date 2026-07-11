<template>
  <section class="quick-actions">
    <h3 class="hub-section-title">Quick actions</h3>
    <div class="action-row">
      <BaseButton @click="router.push('/tasks?action=add&from=dashboard')">New task</BaseButton>
      <BaseButton @click="router.push('/media?action=add&from=dashboard')">Add watch item</BaseButton>
      <BaseButton @click="askAiAboutToday">Ask AI about today</BaseButton>
      <BaseButton @click="router.push('/ai?from=dashboard')">Open AI</BaseButton>
      <BaseButton :disabled="platform.runtime !== 'desktop'" @click="$emit('backup')">Backup now</BaseButton>
    </div>
    <p v-if="lastBackup" class="hint">Last auto-backup: {{ formatBackupTime(lastBackup) }}</p>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { openAiWithContext } from '@/services/integrations.js'
import { hubItemKey } from '@/services/hubContext.js'

const props = defineProps({
  snapshot: { type: Object, default: null },
  platform: { type: Object, required: true },
  lastBackup: { type: String, default: null }
})

defineEmits(['backup'])

const router = useRouter()

function formatBackupTime(iso) {
  return new Date(iso).toLocaleString()
}

async function askAiAboutToday() {
  if (!props.snapshot) {
    return router.push('/ai?from=dashboard')
  }
  const keys = []
  for (const t of props.snapshot.dueToday || []) keys.push(hubItemKey('task', t.id))
  for (const e of props.snapshot.todayEvents || []) keys.push(hubItemKey('event', e.id))
  for (const g of props.snapshot.playing || []) keys.push(hubItemKey('game', g.id))
  for (const w of props.snapshot.watching || []) keys.push(hubItemKey('watch', w.id))
  if (keys.length) {
    await openAiWithContext(keys.slice(0, 8), router)
  } else {
    await router.push({ path: '/ai', query: { from: 'dashboard' } })
  }
}
</script>

<style scoped>
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.hint {
  margin-top: var(--space-2);
  font-size: var(--text-caption);
  color: var(--text-faint);
}
</style>
