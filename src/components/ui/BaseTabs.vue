<template>
  <div class="base-tabs" role="tablist">
    <BasePill
      v-for="tab in tabs"
      :key="tab.id"
      :active="modelValue === tab.id"
      :badge="tab.badge"
      @click="$emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </BasePill>
  </div>
</template>

<script setup>
import BasePill from './BasePill.vue'

defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.base-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
