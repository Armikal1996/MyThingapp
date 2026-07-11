<template>
  <section class="stats-strip">
    <h3 class="hub-section-title">Stats</h3>
    <div class="stats-grid">
      <StatCard label="Runtime" :value="platform.runtime" />
      <StatCard label="Schema" :value="'v' + (meta.schema_version || '—')" />
      <StatCard label="Apps" :value="counts.apps" to="/launcher" hint="Launcher" />
      <StatCard label="Tasks" :value="counts.tasks ?? 0" to="/tasks" hint="Work & moving" />
      <StatCard label="Favorites" :value="counts.favorites ?? 0" to="/favorites" />
      <StatCard label="Events" :value="counts.events ?? 0" to="/calendar" />
      <StatCard label="Games" :value="counts.games ?? 0" to="/media" hint="Media hub" />
      <StatCard label="Watchlist" :value="counts.watchlist ?? 0" to="/media" />
      <StatCard label="AI chats" :value="counts.aiThreads ?? 0" to="/ai" />
    </div>
  </section>
</template>

<script setup>
import StatCard from '@/components/ui/StatCard.vue'

defineProps({
  counts: { type: Object, required: true },
  meta: { type: Object, required: true },
  platform: { type: Object, required: true }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-3);
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
