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
  gap: 6px;
  min-height: 96px;
  padding: 12px 10px;
  background: linear-gradient(180deg, #1e293b 0%, #111827 100%);
  border: 1px solid #334155;
  border-radius: 12px;
  color: #e2e8f0;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s, background 0.12s;
  text-align: center;
}
.tile:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  background: linear-gradient(180deg, #273549 0%, #1e293b 100%);
}
.icon {
  font-size: 26px;
  line-height: 1;
}
.label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  word-break: break-word;
}
.sub {
  font-size: 10px;
  color: #64748b;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
