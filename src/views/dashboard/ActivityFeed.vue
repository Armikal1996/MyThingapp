<template>
  <section v-if="activity.length" class="activity-feed">
    <h3 class="hub-section-title">Recent activity</h3>
    <ul class="activity-list">
      <li
        v-for="item in activity"
        :key="`${item.type}-${item.id}`"
        class="activity-item"
        @click="onClick(item)"
      >
        <BaseBadge class="act-type">{{ item.type }}</BaseBadge>
        <span class="act-title">{{ item.title }}</span>
        <span class="act-time">{{ formatActivityTime(item.at) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { navigateToLinkedItem } from '@/services/integrations.js'

defineProps({
  activity: { type: Array, default: () => [] }
})

const router = useRouter()

function formatActivityTime(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function onClick(item) {
  if (item.type === 'task') {
    navigateToLinkedItem('task', item.id, router, 'dashboard')
  } else if (item.type === 'ai') {
    router.push({ path: '/ai', query: { thread: item.id, from: 'dashboard' } })
  } else if (item.type === 'reminder') {
    router.push({ path: '/calendar', query: { from: 'dashboard' } })
  }
}
</script>

<style scoped>
.activity-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-small);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.activity-item:hover {
  border-color: var(--border-default);
  background: var(--surface-hover);
}

.act-type {
  text-transform: uppercase;
  flex-shrink: 0;
}

.act-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.act-time {
  font-size: var(--text-caption);
  color: var(--text-faint);
  flex-shrink: 0;
}
</style>
