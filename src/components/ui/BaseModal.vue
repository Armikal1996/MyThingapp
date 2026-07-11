<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="onBackdrop">
      <div class="modal" :class="size" role="dialog" aria-modal="true" @keydown.esc="close">
        <header v-if="title || $slots.header" class="modal-header">
          <slot name="header">
            <h2>{{ title }}</h2>
          </slot>
          <button type="button" class="close" aria-label="Close" @click="close">×</button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
  closeOnBackdrop: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'update:open'])

function close() {
  emit('update:open', false)
  emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.75);
  display: grid;
  place-items: center;
  z-index: var(--z-modal);
  padding: var(--space-6);
}

.modal {
  background: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal.sm { max-width: 520px; }
.modal.md { max-width: 560px; }
.modal.lg { max-width: 720px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h2 {
  font-size: var(--text-heading);
  font-weight: 600;
}

.close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}

.close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
