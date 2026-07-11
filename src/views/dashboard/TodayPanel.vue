<template>
  <section v-if="snapshot" class="today-panel">
    <h3 class="hub-section-title">Today</h3>
    <div class="today-grid">
      <BaseCard class="today-card" accent="var(--accent-tasks)">
        <p class="label">Due tasks</p>
        <p class="value">{{ snapshot.dueToday.length }}</p>
        <div v-if="snapshot.dueToday.length" class="chips">
          <HubItemChip
            v-for="t in snapshot.dueToday.slice(0, 3)"
            :key="t.id"
            :item="{ type: 'task', id: t.id, title: t.title }"
            from="dashboard"
          />
        </div>
        <RouterLink v-else to="/tasks?action=add&from=dashboard" class="hub-link">Add a task</RouterLink>
      </BaseCard>

      <BaseCard class="today-card" accent="var(--accent-calendar)">
        <p class="label">Events</p>
        <p class="value">{{ snapshot.todayEvents.length }}</p>
        <div v-if="snapshot.todayEvents.length" class="chips">
          <HubItemChip
            v-for="e in snapshot.todayEvents.slice(0, 3)"
            :key="e.id"
            :item="{ type: 'event', id: e.id, title: e.title }"
            from="dashboard"
          />
        </div>
        <RouterLink v-else to="/calendar?from=dashboard" class="hub-link">View calendar</RouterLink>
      </BaseCard>

      <BaseCard class="today-card" accent="var(--accent-media)">
        <p class="label">Playing / watching</p>
        <p class="value">{{ snapshot.playing.length + snapshot.watching.length }}</p>
        <div class="chips">
          <HubItemChip
            v-for="g in snapshot.playing.slice(0, 2)"
            :key="'g-' + g.id"
            :item="{ type: 'game', id: g.id, title: g.title }"
            from="dashboard"
          />
          <HubItemChip
            v-for="w in snapshot.watching.slice(0, 2)"
            :key="'w-' + w.id"
            :item="{ type: 'watch', id: w.id, title: w.title }"
            from="dashboard"
          />
        </div>
      </BaseCard>

      <BaseCard class="today-card" accent="var(--accent-ai)">
        <p class="label">Agent inbox</p>
        <p class="value">{{ snapshot.unreadAnnouncements }}</p>
        <RouterLink to="/ai?tab=inbox&from=dashboard" class="hub-link">
          Open AI Chat →
        </RouterLink>
      </BaseCard>
    </div>
  </section>
</template>

<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import HubItemChip from '@/components/ui/HubItemChip.vue'

defineProps({
  snapshot: { type: Object, default: null }
})
</script>

<style scoped>
.today-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.today-card {
  padding: var(--space-4);
}

.label {
  font-size: var(--text-caption);
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-1);
}

.value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: var(--space-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
