<template>
  <component
    :is="tag"
    class="base-card"
    :class="[variant, { interactive, accent }]"
    :style="accentStyle"
    v-bind="linkProps"
  >
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: { type: String, default: 'raised' }, // raised | flat | dashed
  interactive: { type: Boolean, default: false },
  accent: { type: String, default: '' },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null }
})

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'div'
})

const linkProps = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href) return { href: props.href }
  return {}
})

const accentStyle = computed(() => {
  if (!props.accent) return {}
  return { '--card-accent': props.accent }
})
</script>

<style scoped>
.base-card {
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  position: relative;
}

.base-card.accent::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--card-accent, var(--accent-primary));
}

.base-card.flat {
  background: transparent;
}

.base-card.dashed {
  border-style: dashed;
  border-color: var(--border-strong);
}

.base-card.interactive {
  cursor: pointer;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.base-card.interactive:hover {
  border-color: var(--border-default);
  transform: translateY(-1px);
}
</style>
