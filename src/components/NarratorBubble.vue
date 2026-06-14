<template>
  <Transition name="bubble-pop">
    <aside v-if="narrator" class="narrator-bubble">
      <div class="avatar">{{ initials }}</div>
      <div>
        <div class="narrator-name">{{ narrator.name }}</div>
        <p>{{ message }}</p>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  narrator: { type: Object, default: null },
  lastGuess: { type: Object, default: null },
  researchMode: { type: Boolean, default: false }
})

const initials = computed(() => {
  return (props.narrator?.name || 'TG')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const message = computed(() => {
  if (props.researchMode) {
    return 'Research mode is on: no quizzes, more sources, cleaner reading.'
  }
  if (props.lastGuess?.feedback) {
    return props.lastGuess.feedback
  }
  return props.narrator?.intro || 'Read the clue, make a guess, then reveal the next branch.'
})
</script>

<style scoped>
.narrator-bubble {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 15;
  max-width: 340px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 36%, #1e293b);
  border-radius: 18px;
  padding: 12px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-2));
  color: #08111f;
  font-weight: 900;
}

.narrator-name {
  color: var(--theme-accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

p {
  margin: 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.45;
}

.bubble-pop-enter-active,
.bubble-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bubble-pop-enter-from,
.bubble-pop-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
