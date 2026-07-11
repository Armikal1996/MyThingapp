<template>
  <label class="base-field" :class="{ error: !!error }">
    <span v-if="label" class="label">{{ label }}</span>
    <slot>
      <component
        :is="inputTag"
        v-bind="inputProps"
        :value="modelValue"
        @input="onInput"
        @change="$emit('change', $event)"
      />
    </slot>
    <span v-if="error" class="error-text">{{ error }}</span>
    <span v-else-if="hint" class="hint">{{ hint }}</span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  as: { type: String, default: 'input' }, // input | select | textarea
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  inputProps: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'change'])

const inputTag = computed(() => props.as)

const inputProps = computed(() => ({
  type: props.type,
  class: 'field-input',
  ...props.inputProps
}))

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<style scoped>
.base-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-caption);
  color: var(--text-muted);
  font-weight: 500;
}

.field-input,
.base-field :deep(input),
.base-field :deep(select),
.base-field :deep(textarea) {
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: var(--text-body);
  font-family: inherit;
}

.base-field :deep(textarea) {
  min-height: 80px;
  resize: vertical;
}

.base-field.error :deep(input),
.base-field.error :deep(select),
.base-field.error :deep(textarea) {
  border-color: var(--status-error);
}

.error-text {
  font-size: var(--text-caption);
  color: var(--status-error);
}

.hint {
  font-size: var(--text-caption);
  color: var(--text-faint);
}
</style>
