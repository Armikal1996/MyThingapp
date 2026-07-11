<template>
  <div v-if="isApp" class="app-tile">
    <div class="app-head">
      <span class="icon">{{ favorite.icon || '▶' }}</span>
      <span class="label">{{ favorite.label }}</span>
    </div>
    <div class="app-actions">
      <BaseButton size="sm" variant="primary" @click="$emit('start', favorite)">Start</BaseButton>
      <BaseButton size="sm" @click="$emit('open-folder', favorite)">Folder</BaseButton>
      <BaseButton size="sm" @click="$emit('open-cursor', favorite)">Cursor</BaseButton>
    </div>
  </div>
  <button
    v-else
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
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { isAppFavorite } from '@/services/favorites.js'

const props = defineProps({
  favorite: { type: Object, required: true }
})

defineEmits(['launch', 'start', 'open-folder', 'open-cursor'])

const isApp = computed(() => isAppFavorite(props.favorite))
</script>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 96px;
  width: 100%;
  padding: var(--space-3);
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

.app-tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--accent-launcher);
}

.app-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-head .icon {
  font-size: 22px;
  line-height: 1;
}

.app-head .label {
  font-size: var(--text-small);
  font-weight: 600;
  line-height: 1.2;
  word-break: break-word;
}

.app-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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
