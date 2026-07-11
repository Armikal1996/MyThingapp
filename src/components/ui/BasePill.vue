<template>
  <button
    type="button"
    class="base-pill"
    :class="{ active }"
    @click="$emit('click', $event)"
  >
    <slot />
    <BaseBadge v-if="badge != null" variant="primary" class="pill-badge">{{ badge }}</BaseBadge>
  </button>
</template>

<script setup>
import BaseBadge from './BaseBadge.vue'

defineProps({
  active: { type: Boolean, default: false },
  badge: { type: [String, Number], default: null }
})
defineEmits(['click'])
</script>

<style scoped>
.base-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: var(--surface-base);
  color: var(--text-secondary);
  font-size: var(--text-small);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.base-pill:hover {
  background: var(--surface-hover);
}

.base-pill.active {
  background: var(--accent-active);
  border-color: var(--accent-active);
  color: #fff;
}

.pill-badge {
  text-transform: none;
  letter-spacing: 0;
}
</style>
