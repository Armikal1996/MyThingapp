<template>
  <div v-if="actions.length" class="action-log">
    <span
      v-for="(action, i) in actions"
      :key="`${action.tool}-${i}`"
      class="chip"
      :class="{ confirm: action.pending }"
    >
      <Check v-if="!action.pending" :size="12" />
      <Clock v-else :size="12" />
      {{ action.summary }}
    </span>
  </div>
</template>

<script setup>
import { Check, Clock } from 'lucide-vue-next'

defineProps({
  actions: { type: Array, default: () => [] }
})
</script>

<style scoped>
.action-log {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid var(--status-success);
  color: var(--text-secondary);
}

.chip.confirm {
  background: rgba(139, 92, 246, 0.12);
  border-color: var(--accent-ai);
}
</style>
