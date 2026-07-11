<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
          @click="dismiss(t.id)"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast.js'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 360px;
}

.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-small);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-default);
}

.toast.success {
  background: var(--status-success-bg);
  color: var(--status-success);
  border-color: rgba(34, 197, 94, 0.3);
}

.toast.error {
  background: var(--status-error-bg);
  color: var(--status-error);
  border-color: rgba(248, 113, 113, 0.3);
}

.toast.info {
  background: var(--status-info-bg);
  color: var(--status-info);
}

.toast.warning {
  background: var(--status-warning-bg);
  color: var(--status-warning);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
