<template>
  <button
    :type="type"
    class="base-btn"
    :class="[variant, size, { block }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'default' }, // default | primary | ghost | danger
  size: { type: String, default: 'md' }, // md | sm
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})
defineEmits(['click'])
</script>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-small);
  cursor: pointer;
  border: 1px solid var(--border-strong);
  background: var(--surface-hover);
  color: var(--text-primary);
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.base-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-btn.md {
  padding: 10px 14px;
}

.base-btn.sm {
  padding: 6px 10px;
  font-size: var(--text-caption);
}

.base-btn.primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.base-btn.primary:hover:not(:disabled) {
  background: var(--accent-primary-hover);
  border-color: var(--accent-primary-hover);
}

.base-btn.ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);
}

.base-btn.ghost:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.base-btn.danger {
  background: rgba(127, 29, 29, 0.4);
  border-color: #7f1d1d;
  color: #fca5a5;
}

.base-btn.block {
  width: 100%;
}
</style>
