<template>
  <BaseCard class="action-card">
    <div class="action-header">
      <Zap :size="16" class="icon" />
      <strong>Confirm action</strong>
    </div>
    <p class="summary">{{ action.summary }}</p>
    <p class="tool-name">{{ toolLabel }}</p>
    <div class="actions">
      <BaseButton size="sm" variant="primary" :disabled="busy" @click="$emit('confirm')">
        Confirm
      </BaseButton>
      <BaseButton size="sm" variant="ghost" :disabled="busy" @click="$emit('cancel')">
        Cancel
      </BaseButton>
    </div>
  </BaseCard>
</template>

<script setup>
import { computed } from 'vue'
import { Zap } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  action: { type: Object, required: true },
  busy: { type: Boolean, default: false }
})

defineEmits(['confirm', 'cancel'])

const TOOL_LABELS = {
  start_app: 'Start app',
  open_app_folder: 'Open folder',
  open_app_in_cursor: 'Open in Cursor'
}

const toolLabel = computed(() => TOOL_LABELS[props.action.tool] || props.action.tool)
</script>

<style scoped>
.action-card {
  padding: var(--space-3);
  border-color: var(--accent-ai);
  background: rgba(139, 92, 246, 0.08);
}

.action-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--text-small);
}

.icon {
  color: var(--accent-ai);
}

.summary {
  font-size: var(--text-body);
  margin-bottom: var(--space-1);
}

.tool-name {
  font-size: var(--text-caption);
  color: var(--text-faint);
  margin-bottom: var(--space-3);
}

.actions {
  display: flex;
  gap: var(--space-2);
}
</style>
