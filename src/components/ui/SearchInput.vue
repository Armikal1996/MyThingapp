<template>
  <div class="search-input">
    <Search class="icon" :size="16" />
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { Search } from 'lucide-vue-next'

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search…' }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.search-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 0 var(--space-3);
  min-width: 180px;
}

.search-input .icon {
  color: var(--text-faint);
  flex-shrink: 0;
}

.search-input input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: 10px 0;
  font-size: var(--text-body);
  outline: none;
}

.search-input input::placeholder {
  color: var(--text-faint);
}
</style>
