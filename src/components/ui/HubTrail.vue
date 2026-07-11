<template>
  <div v-if="fromLabel" class="hub-trail">
    <ArrowLeft :size="14" />
    <span>Opened from <strong>{{ fromLabel }}</strong></span>
    <button type="button" class="dismiss" @click="dismiss">Dismiss</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const labels = {
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  favorites: 'Favorites',
  tasks: 'Tasks',
  media: 'Media',
  launcher: 'Launcher',
  ai: 'AI Chat'
}

const fromLabel = computed(() => {
  const from = route.query.from
  if (!from) return ''
  return labels[from] || String(from)
})

function dismiss() {
  const q = { ...route.query }
  delete q.from
  router.replace({ query: q })
}
</script>

<style scoped>
.hub-trail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--text-muted);
  padding: var(--space-2) var(--space-3);
  background: var(--status-info-bg);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: var(--radius-md);
}

.hub-trail strong {
  color: var(--text-secondary);
}

.dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: var(--text-caption);
  cursor: pointer;
  text-decoration: underline;
}

.dismiss:hover {
  color: var(--text-primary);
}
</style>
