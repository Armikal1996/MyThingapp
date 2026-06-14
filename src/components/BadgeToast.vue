<template>
  <Transition name="toast">
    <div v-if="badge" class="badge-toast">
      <span class="badge-icon">★</span>
      <div>
        <strong>Badge earned: {{ badge.label }}</strong>
        <p>{{ badge.description }}</p>
      </div>
      <button @click="$emit('close')" title="Dismiss">×</button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  badge: { type: Object, default: null }
})

defineEmits(['close'])
</script>

<style scoped>
.badge-toast {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 70;
  width: min(340px, calc(100% - 36px));
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 54%, #1e293b);
  border-radius: 16px;
  padding: 12px;
  background: var(--theme-panel);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
}

.badge-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--theme-accent);
  color: #08111f;
  font-weight: 900;
}

strong {
  color: var(--theme-text);
  font-size: 13px;
}

p {
  margin: 3px 0 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.35;
}

button {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--theme-muted);
  cursor: pointer;
  font-size: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
