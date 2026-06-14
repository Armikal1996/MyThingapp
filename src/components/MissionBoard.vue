<template>
  <aside v-if="missions.length" class="mission-board">
    <div class="mission-header">
      <span>Mission Paths</span>
      <small>{{ completedCount }}/{{ missions.length }} complete</small>
    </div>
    <div class="mission-list">
      <article
        v-for="mission in missions"
        :key="mission.id"
        class="mission-card"
        :class="{ complete: isComplete(mission) }"
      >
        <div class="mission-title-row">
          <strong>{{ mission.title }}</strong>
          <span>{{ progressFor(mission).done }}/{{ progressFor(mission).total }}</span>
        </div>
        <p>{{ mission.description }}</p>
        <div class="mission-track">
          <span :style="{ width: `${progressFor(mission).percent}%` }" />
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  missions: { type: Array, default: () => [] },
  visibleNodeIds: { type: Object, default: () => new Set() }
})

const completedCount = computed(() => props.missions.filter(isComplete).length)

function progressFor(mission) {
  const ids = mission.nodeIds || []
  const done = ids.filter(id => props.visibleNodeIds.has(id)).length
  const total = ids.length || 1
  return { done, total, percent: Math.round((done / total) * 100) }
}

function isComplete(mission) {
  const progress = progressFor(mission)
  return progress.done >= progress.total
}
</script>

<style scoped>
.mission-board {
  position: absolute;
  left: 18px;
  top: 18px;
  z-index: 12;
  width: 300px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 34%, #1e293b);
  border-radius: 18px;
  background: rgba(2, 6, 23, 0.68);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.32);
  overflow: hidden;
}

.mission-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
  color: var(--theme-accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mission-header small {
  color: var(--theme-muted);
  font-size: 11px;
  letter-spacing: normal;
  text-transform: none;
}

.mission-list {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.mission-card {
  border: 1px solid #243247;
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.68);
}

.mission-card.complete {
  border-color: #166534;
  background: rgba(20, 83, 45, 0.2);
}

.mission-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #e2e8f0;
  font-size: 12px;
}

.mission-title-row span {
  color: var(--theme-muted);
  flex-shrink: 0;
}

p {
  margin: 6px 0 8px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.35;
}

.mission-track {
  height: 5px;
  border-radius: 999px;
  background: #1e293b;
  overflow: hidden;
}

.mission-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--theme-accent), var(--theme-accent-2));
}
</style>
