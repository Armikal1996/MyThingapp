<template>
  <div class="game-hud">
    <div class="hud-stat">
      <span class="label">Score</span>
      <strong>{{ score }}</strong>
    </div>
    <div class="hud-stat">
      <span class="label">Streak</span>
      <strong>{{ streak }}</strong>
    </div>
    <div class="hud-stat progress">
      <span class="label">Map</span>
      <strong>{{ progressPercent }}%</strong>
      <div class="progress-track">
        <span :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>
    <div class="badge-row" :title="badgeTitle">
      <span v-for="badge in badges" :key="badge.id" class="badge-chip">{{ badge.label }}</span>
      <span v-if="!badges.length" class="badge-empty">No badges yet</span>
    </div>
    <label class="mode-toggle">
      <input
        type="checkbox"
        :checked="researchMode"
        @change="$emit('toggleResearchMode', $event.target.checked)"
      >
      <span>Research mode</span>
    </label>
    <label class="difficulty-select">
      <span>Difficulty</span>
      <select :value="difficulty" @change="$emit('changeDifficulty', $event.target.value)">
        <option value="easy">Easy</option>
        <option value="hard">Hard</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  badges: { type: Array, default: () => [] },
  researchMode: { type: Boolean, default: false },
  difficulty: { type: String, default: 'easy' }
})

defineEmits(['toggleResearchMode', 'changeDifficulty'])

const badgeTitle = computed(() => {
  if (!props.badges.length) return 'Earn badges by guessing and exploring.'
  return props.badges.map(b => `${b.label}: ${b.description}`).join('\n')
})
</script>

<style scoped>
.game-hud {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, #1e293b);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.58);
  backdrop-filter: blur(8px);
}

.hud-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--theme-muted);
  font-size: 11px;
}

.hud-stat strong {
  color: var(--theme-text);
  font-size: 14px;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 800;
}

.progress {
  min-width: 110px;
}

.progress-track {
  width: 56px;
  height: 5px;
  border-radius: 999px;
  background: #1e293b;
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--theme-accent), var(--theme-accent-2));
}

.badge-row {
  display: flex;
  gap: 6px;
  align-items: center;
  max-width: 220px;
  overflow: hidden;
}

.badge-chip,
.badge-empty {
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 4px 8px;
  color: #cbd5e1;
  font-size: 11px;
  white-space: nowrap;
}

.badge-chip {
  border-color: color-mix(in srgb, var(--theme-accent) 55%, #334155);
  color: var(--theme-accent);
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mode-toggle input {
  accent-color: var(--theme-accent);
}

.difficulty-select {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

.difficulty-select select {
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 5px 8px;
  background: #0f172a;
  color: #e2e8f0;
}
</style>
