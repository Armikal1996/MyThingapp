<template>
  <div class="hub">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">M</span>
        <div>
          <p class="brand-title">MyThing</p>
          <p class="brand-sub">Phase 2</p>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          active-class="active"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span v-if="item.soon" class="soon">soon</span>
        </RouterLink>
      </nav>

      <footer class="sidebar-footer">
        <p class="runtime">{{ runtimeLabel }}</p>
        <p v-if="platformVersion" class="version">v{{ platformVersion }}</p>
      </footer>
    </aside>

    <main class="main">
      <header class="topbar">
        <h1>{{ pageTitle }}</h1>
      </header>
      <section class="content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPlatformInfo } from '@/services/platform.js'

const route = useRoute()
const runtime = ref('browser')
const platformVersion = ref('0.1.0')

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⌂' },
  { to: '/launcher', label: 'Launcher', icon: '▶' },
  { to: '/tasks', label: 'Tasks', icon: '☑' },
  { to: '/history-game', label: 'History Game', icon: '◎' },
  { to: '/', label: 'Calendar', icon: '📅', soon: true },
  { to: '/', label: 'Media', icon: '▣', soon: true },
  { to: '/', label: 'AI Chat', icon: '✦', soon: true },
  { to: '/', label: 'Favorites', icon: '★', soon: true }
]

const pageTitle = computed(() => route.meta.title || 'MyThing')
const runtimeLabel = computed(() =>
  runtime.value === 'desktop' ? 'Desktop (Tauri)' : 'Browser preview'
)

onMounted(async () => {
  const info = await getPlatformInfo()
  runtime.value = info.runtime
  platformVersion.value = info.version
})
</script>

<style scoped>
.hub {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  background: #0b1020;
  color: #e8edf7;
}

.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1f2a44;
  background: linear-gradient(180deg, #0f172a 0%, #0b1224 100%);
  padding: 20px 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 0 8px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  font-weight: 700;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
}

.brand-sub {
  font-size: 11px;
  color: #94a3b8;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: #1e293b;
  color: #f8fafc;
}

.nav-link.active {
  background: #1d4ed8;
  color: #fff;
}

.nav-icon {
  width: 18px;
  text-align: center;
  opacity: 0.9;
}

.soon {
  margin-left: auto;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 2px 6px;
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid #1f2a44;
  margin-top: 12px;
}

.runtime,
.version {
  font-size: 11px;
  color: #64748b;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  padding: 18px 24px;
  border-bottom: 1px solid #1f2a44;
  background: rgba(15, 23, 42, 0.6);
}

.topbar h1 {
  font-size: 20px;
  font-weight: 600;
}

.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
