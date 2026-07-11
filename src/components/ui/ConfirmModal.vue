<template>
  <BaseModal :open="open" title="Confirm" size="sm" @update:open="$emit('update:open', $event)">
    <p class="confirm-message">{{ message }}</p>
    <template #footer>
      <BaseButton variant="ghost" @click="cancel">Cancel</BaseButton>
      <BaseButton :variant="danger ? 'danger' : 'primary'" @click="confirm">Confirm</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

defineProps({
  open: { type: Boolean, default: false },
  message: { type: String, default: 'Are you sure?' },
  danger: { type: Boolean, default: true }
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

function confirm() {
  emit('confirm')
  emit('update:open', false)
}

function cancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<style scoped>
.confirm-message {
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
