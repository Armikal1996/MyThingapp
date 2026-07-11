<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    class="stat-card"
    :class="{ linked: !!to }"
    :to="to"
  >
    <p class="label">{{ label }}</p>
    <p class="value">{{ value }}</p>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </component>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  to: { type: [String, Object], default: null }
})
</script>

<style scoped>
.stat-card {
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.stat-card.linked {
  cursor: pointer;
}

.stat-card.linked:hover {
  border-color: var(--border-default);
  transform: translateY(-1px);
}

.label {
  font-size: var(--text-caption);
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-1);
}

.value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.hint {
  margin-top: var(--space-1);
  font-size: var(--text-caption);
  color: var(--text-muted);
}
</style>
