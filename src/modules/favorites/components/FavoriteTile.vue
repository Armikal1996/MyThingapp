<template>
  <button
    class="tile"
    :title="favorite.description || favorite.label"
    @click="$emit('launch', favorite)"
  >
    <span class="icon">{{ favorite.icon || '★' }}</span>
    <span class="label">{{ favorite.label }}</span>
    <span v-if="favorite.description" class="sub">{{ favorite.description }}</span>
  </button>
</template>

<script setup>
defineProps({
  favorite: { type: Object, required: true }
})

defineEmits(['launch'])
</script>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 96px;
  padding: var(--space-3) var(--space-3);
  background: linear-gradient(180deg, var(--surface-hover) 0%, var(--surface-raised) 100%);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  text-align: center;
}

.tile:hover {
  transform: translateY(-2px);
  border-color: var(--accent-favorites);
  background: linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-hover) 100%);
}

.icon {
  font-size: 26px;
  line-height: 1;
}

.label {
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.2;
  word-break: break-word;
}

.sub {
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
