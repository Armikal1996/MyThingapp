<template>
  <div class="module-toolbar">
    <div v-if="$slots.leading" class="leading">
      <slot name="leading" />
    </div>
    <div v-if="$slots.center" class="center">
      <slot name="center" />
    </div>
    <div v-if="$slots.trailing" class="trailing">
      <slot name="trailing" />
    </div>
  </div>
</template>

<style scoped>
.module-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
}

.leading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.center {
  flex: 1;
  min-width: 200px;
}

.trailing {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}
</style>
