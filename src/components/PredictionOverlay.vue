<template>
  <Transition name="overlay-fade">
    <div v-if="node" class="overlay-backdrop">
      <section class="prediction-card" role="dialog" aria-modal="true">
        <button
          class="close-overlay-btn"
          title="Cancel question"
          aria-label="Cancel question"
          @click="$emit('cancel')"
        >
          ×
        </button>

        <div class="prediction-kicker">
          <span>{{ narrator?.name || 'Time Guide' }}</span>
          <span class="points-pill">+{{ correctPoints }} if correct · {{ difficultyLabel }}</span>
        </div>

        <h2 class="prediction-title">Predict before you reveal</h2>
        <p class="prediction-node">{{ node.title }}</p>
        <p class="prediction-question">{{ node.prediction.question }}</p>

        <div class="choice-list">
          <button
            v-for="choice in visibleChoices"
            :key="choice.id"
            class="choice-btn"
            :class="choiceClass(choice)"
            :disabled="Boolean(selectedChoice)"
            @click="choose(choice)"
          >
            <span class="choice-text">{{ choice.text }}</span>
            <span v-if="selectedChoice?.id === choice.id" class="choice-result">
              {{ choice.correct ? 'Correct' : 'Not quite' }}
            </span>
          </button>
        </div>

        <Transition name="feedback-slide">
          <div v-if="selectedChoice" class="feedback-box" :class="{ correct: selectedChoice.correct }">
            <div class="feedback-heading">
              {{ selectedChoice.correct ? correctLine : wrongLine }}
            </div>
            <p>{{ selectedChoice.feedback }}</p>
            <button class="continue-btn" @click="$emit('continue', selectedChoice)">
              Reveal the branch
            </button>
          </div>
        </Transition>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  node: { type: Object, default: null },
  narrator: { type: Object, default: null },
  difficulty: { type: String, default: 'easy' }
})

const emit = defineEmits(['continue', 'cancel'])

const selectedChoice = ref(null)

watch(() => props.node?.id, () => {
  selectedChoice.value = null
})

const correctLine = computed(() => {
  const lines = props.narrator?.correctLines || ['Sharp thinking!']
  return lines[0] || 'Sharp thinking!'
})

const wrongLine = computed(() => {
  const lines = props.narrator?.wrongLines || ['Good guess — history swerved another way.']
  return lines[0] || 'Good guess — history swerved another way.'
})

const difficultyLabel = computed(() => props.difficulty === 'hard' ? 'Hard mode' : 'Easy mode')
const correctPoints = computed(() => props.difficulty === 'hard' ? 150 : 100)

const visibleChoices = computed(() => {
  const choices = props.node?.prediction?.choices || []
  if (props.difficulty === 'hard' || choices.length <= 2) return choices

  const firstCorrect = choices.find(choice => choice.correct) || choices[0]
  const firstWrong = choices.find(choice => !choice.correct && choice.id !== firstCorrect.id)
  return firstWrong ? [firstCorrect, firstWrong] : choices.slice(0, 2)
})

function choose(choice) {
  selectedChoice.value = choice
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.node) {
    emit('cancel')
  }
}

function choiceClass(choice) {
  if (!selectedChoice.value) return ''
  if (choice.correct) return 'is-correct'
  if (selectedChoice.value.id === choice.id) return 'is-wrong'
  return 'is-muted'
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.overlay-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(6px);
}

.prediction-card {
  position: relative;
  width: min(620px, 100%);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
  border-radius: 22px;
  padding: 24px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--theme-accent) 20%, transparent), transparent 34%),
    var(--theme-panel);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}

.close-overlay-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid #334155;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #94a3b8;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.close-overlay-btn:hover {
  color: #f8fafc;
  border-color: var(--theme-accent);
}

.prediction-kicker {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--theme-muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.points-pill {
  color: var(--theme-accent);
}

.prediction-title {
  margin: 14px 0 6px;
  color: var(--theme-text);
  font-size: 30px;
  line-height: 1.1;
}

.prediction-node {
  color: var(--theme-accent);
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 14px;
}

.prediction-question {
  color: #cbd5e1;
  font-size: 17px;
  line-height: 1.55;
  margin: 0 0 18px;
}

.choice-list {
  display: grid;
  gap: 10px;
}

.choice-btn {
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.82);
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  transition: border-color 0.16s, background 0.16s, transform 0.16s;
}

.choice-btn:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: var(--theme-accent);
  background: color-mix(in srgb, var(--theme-accent) 12%, rgba(15, 23, 42, 0.88));
}

.choice-btn.is-correct {
  border-color: #22c55e;
  background: rgba(20, 83, 45, 0.5);
}

.choice-btn.is-wrong {
  border-color: #ef4444;
  background: rgba(127, 29, 29, 0.45);
}

.choice-btn.is-muted {
  opacity: 0.58;
}

.choice-text {
  line-height: 1.4;
}

.choice-result {
  flex-shrink: 0;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.feedback-box {
  margin-top: 16px;
  border: 1px solid #7f1d1d;
  border-radius: 16px;
  padding: 16px;
  background: rgba(127, 29, 29, 0.22);
}

.feedback-box.correct {
  border-color: #166534;
  background: rgba(20, 83, 45, 0.22);
}

.feedback-heading {
  color: #f8fafc;
  font-weight: 800;
  margin-bottom: 6px;
}

.feedback-box p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.5;
}

.continue-btn {
  margin-top: 14px;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-2));
  color: #08111f;
  font-weight: 900;
  cursor: pointer;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active,
.feedback-slide-enter-active,
.feedback-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

.feedback-slide-enter-from,
.feedback-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
