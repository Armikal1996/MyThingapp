<template>
  <div class="start-screen">
    <header class="start-header">
      <div class="eyebrow">Predict • Reveal • Research</div>
      <h1 class="app-title">Time Web Academy</h1>
      <p class="app-subtitle">
        Make a guess before each branch opens. Learn what really happened, where history gets fuzzy,
        and where alternate timelines go wild.
      </p>
      <label class="start-mode-toggle">
        <input
          type="checkbox"
          :checked="researchMode"
          @change="$emit('toggleResearchMode', $event.target.checked)"
        >
        <span>Start in Research mode (skip quizzes, show sources)</span>
      </label>
    </header>

    <main class="narration-grid">
      <button
        v-for="narration in narrations"
        :key="narration.slug"
        class="narration-card"
        @click="$emit('select', narration.slug)"
      >
        <div class="card-tag">Case File</div>
        <h2 class="card-title">{{ narration.title }}</h2>
        <p v-if="narration.description" class="card-description">{{ narration.description }}</p>
        <div class="card-footer">
          <span class="card-root-count">{{ progressFor(narration).percent }}% discovered</span>
          <span class="card-root-count">{{ progressFor(narration).score }} pts</span>
          <span class="card-cta">{{ researchMode ? 'Research →' : 'Play →' }}</span>
        </div>
      </button>
    </main>

    <footer class="start-footer">
      <span>Kids-first by default. Sources are always one toggle away.</span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import indexData from '@/data/index.json'

const narrationModules = import.meta.glob('../data/narrations/*.json', { eager: true })

defineProps({
  researchMode: { type: Boolean, default: false }
})

defineEmits(['select', 'toggleResearchMode'])

const narrations = ref(indexData.narrations)

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function progressFor(narration) {
  const module = narrationModules[`../data/narrations/${narration.file}`]
  const nodeCount = Object.keys(module?.default?.nodes || {}).length || 1
  const savedExplore = readJson(`history-explorer:state:${narration.slug}`, { visitedNodeIds: [] })
  const savedGame = readJson(`history-explorer:game:${narration.slug}`, { score: 0, badges: [] })
  const discovered = savedExplore.visitedNodeIds?.length || 0
  return {
    percent: Math.min(100, Math.round((discovered / nodeCount) * 100)),
    score: savedGame.score || 0,
    badges: savedGame.badges || []
  }
}
</script>

<style scoped>
.start-screen {
  min-height: 100vh;
  background: #0a0e1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px 40px;
  gap: 48px;
}

.start-header {
  text-align: center;
  max-width: 680px;
}

.eyebrow {
  color: #f59e0b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.app-title {
  font-size: clamp(40px, 7vw, 72px);
  font-weight: 800;
  background: linear-gradient(135deg, #f59e0b 0%, #fde68a 60%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 14px;
  letter-spacing: +0.02em;
}

.app-subtitle {
  font-size: 17px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 auto 18px;
  max-width: 620px;
}

.start-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #1e293b;
  border-radius: 999px;
  padding: 8px 12px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
}

.start-mode-toggle input {
  accent-color: #f59e0b;
}

.narration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 900px;
}

.narration-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 14px;
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 220px;
}

.narration-card:hover {
  border-color: #f59e0b;
  box-shadow: 0 0 32px rgba(245,158,11,0.15);
  transform: translateY(-3px);
}

.card-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #475569;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.3;
  margin: 0;
}

.card-description {
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
  margin: 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.card-root-count {
  font-size: 12px;
  color: #475569;
}

.card-cta {
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  letter-spacing: 0.02em;
}

.start-footer {
  font-size: 12px;
  color: #1e293b;
  margin-top: auto;
}
</style>
