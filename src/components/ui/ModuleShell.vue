<template>
  <div class="module-shell" :class="[{ 'has-sticky': stickyToolbar }, accentClass]" :style="shellStyle">
    <div v-if="$slots.toolbar" class="module-toolbar-wrap" :class="{ sticky: stickyToolbar }">
      <slot name="toolbar" />
    </div>
    <div class="module-body hub-scroll">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stickyToolbar: { type: Boolean, default: false },
  maxWidth: { type: String, default: '' },
  accent: { type: String, default: '' }
})

const accentClass = computed(() => (props.accent ? `accent-${props.accent}` : ''))

const shellStyle = computed(() => {
  const s = {}
  if (props.maxWidth) {
    s.maxWidth = props.maxWidth
    s.margin = '0 auto'
    s.width = '100%'
  }
  return s
})
</script>

<style scoped>
.module-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.module-toolbar-wrap {
  flex-shrink: 0;
  padding: var(--space-6) var(--space-6) 0;
}

.module-toolbar-wrap.sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface-base);
}

.module-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-5) var(--space-6) var(--space-8);
}
</style>
