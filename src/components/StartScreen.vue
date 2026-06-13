<template>
  <div class="start-screen">
    <header class="start-header">
      <h1 class="app-title">History Spider-Web</h1>
      <p class="app-subtitle">
        Explore alternative timelines, consequences, and historical turning points.
        Click a narration to begin.
      </p>
    </header>

    <main class="narration-grid">
      <button
        v-for="narration in narrations"
        :key="narration.slug"
        class="narration-card"
        @click="$emit('select', narration.slug)"
      >
        <div class="card-tag">Narration</div>
        <h2 class="card-title">{{ narration.title }}</h2>
        <div class="card-footer">
          <span class="card-root-count">{{ narration.rootNodeIds.length }} root node{{ narration.rootNodeIds.length !== 1 ? 's' : '' }}</span>
          <span class="card-cta">Explore →</span>
        </div>
      </button>
    </main>

    <footer class="start-footer">
      <span>Built with Vue 3 + Vue Flow</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import indexData from '@/data/index.json'

defineEmits(['select'])

const narrations = ref(indexData.narrations)
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
  max-width: 560px;
}

.app-title {
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(135deg, #f59e0b 0%, #fde68a 60%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 14px;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
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
