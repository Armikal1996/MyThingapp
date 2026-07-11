<template>
  <div class="hub" :class="{ collapsed: sidebarCollapsed }">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">M</span>
        <div v-if="!sidebarCollapsed" class="brand-text">
          <p class="brand-title">MyThing</p>
          <p class="brand-sub">Local hub</p>
        </div>
        <span v-if="!sidebarCollapsed && platformVersion" class="version-chip">v{{ platformVersion }}</span>
      </div>

      <nav class="nav">
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <p v-if="!sidebarCollapsed" class="group-label">{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            active-class="active"
            :title="item.label"
          >
            <component :is="item.icon" v-if="item.lucide" :size="18" class="nav-icon" />
            <span v-else class="nav-icon emoji">{{ item.emoji }}</span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
            <BaseBadge
              v-if="!sidebarCollapsed && item.badge"
              variant="primary"
              class="nav-badge"
            >{{ item.badge }}</BaseBadge>
          </RouterLink>
        </div>
      </nav>

      <footer class="sidebar-footer">
        <p v-if="!sidebarCollapsed" class="runtime">{{ runtimeLabel }}</p>
      </footer>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" class="collapse-btn" :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="sidebarCollapsed = !sidebarCollapsed">
            <PanelLeft :size="18" />
          </button>
          <div>
            <h1>{{ pageTitle }}</h1>
            <HubTrail />
          </div>
        </div>
        <div class="topbar-actions">
          <span class="hotkey-hint" title="Global shortcut"><kbd>Ctrl+Shift+M</kbd> Favorites</span>
          <BaseButton variant="ghost" size="sm" @click="router.push('/ai')">
            <Bot :size="16" /> Ask AI
          </BaseButton>
        </div>
      </header>
      <section class="content">
        <RouterView />
      </section>
    </main>

    <ToastHost />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  Rocket,
  CheckSquare,
  Star,
  Calendar,
  Clapperboard,
  Bot,
  PanelLeft
} from 'lucide-vue-next'
import { getPlatformInfo, isTauri } from '@/services/platform.js'
import { startReminderScheduler } from '@/services/reminders.js'
import { autoBackupIfStale } from '@/services/backup.js'
import { getHubSnapshot } from '@/services/hubContext.js'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import HubTrail from '@/components/ui/HubTrail.vue'
import ToastHost from '@/components/ui/ToastHost.vue'

const route = useRoute()
const router = useRouter()
const runtime = ref('browser')
const platformVersion = ref('0.1.0')
const sidebarCollapsed = ref(false)
const snapshot = ref(null)

const dueCount = computed(() => snapshot.value?.dueToday?.length ?? 0)
const inboxCount = computed(() => snapshot.value?.unreadAnnouncements ?? 0)

const navGroups = computed(() => [
  {
    label: 'Work',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, lucide: true },
      { to: '/tasks', label: 'Tasks', icon: CheckSquare, lucide: true, badge: dueCount.value || null },
      { to: '/calendar', label: 'Calendar', icon: Calendar, lucide: true }
    ]
  },
  {
    label: 'Media',
    items: [
      { to: '/launcher', label: 'Launcher', icon: Rocket, lucide: true },
      { to: '/media', label: 'Media', icon: Clapperboard, lucide: true }
    ]
  },
  {
    label: 'Quick access',
    items: [
      { to: '/favorites', label: 'Favorites', icon: Star, lucide: true },
      { to: '/ai', label: 'AI Chat', icon: Bot, lucide: true, badge: inboxCount.value || null },
      { to: '/history-game', label: 'History Game', emoji: '◎', lucide: false }
    ]
  }
])

const pageTitle = computed(() => route.meta.title || 'MyThing')
const runtimeLabel = computed(() =>
  runtime.value === 'desktop' ? 'Desktop (Tauri)' : 'Browser preview'
)

onMounted(async () => {
  const info = await getPlatformInfo()
  runtime.value = info.runtime
  platformVersion.value = info.version
  try {
    snapshot.value = await getHubSnapshot()
  } catch { /* silent */ }
  if (isTauri()) {
    startReminderScheduler()
    try {
      await autoBackupIfStale()
    } catch { /* silent */ }
  }
  if (window.innerWidth < 1100) sidebarCollapsed.value = true
})
</script>

<style scoped>
.hub {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  height: 100vh;
  overflow: hidden;
  background: var(--surface-base);
  color: var(--text-primary);
  transition: grid-template-columns var(--transition-base);
}

.hub.collapsed {
  grid-template-columns: var(--sidebar-collapsed) 1fr;
}

.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background: linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-base) 100%);
  padding: var(--space-5) var(--space-3);
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: 0 var(--space-2);
  position: relative;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent-launcher), #8b5cf6);
  font-weight: 700;
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
}

.brand-sub {
  font-size: var(--text-label);
  color: var(--text-muted);
}

.version-chip {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 10px;
  color: var(--text-faint);
  background: var(--surface-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  padding: 2px 6px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
  overflow-y: auto;
}

.group-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding: 0 var(--space-3);
  margin-bottom: var(--space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--text-small);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-link:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.nav-link.active {
  background: var(--accent-active);
  color: #fff;
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.nav-icon.emoji {
  width: 18px;
  text-align: center;
}

.nav-label {
  flex: 1;
  min-width: 0;
}

.nav-badge {
  margin-left: auto;
}

.hub.collapsed .nav-link {
  justify-content: center;
  padding: 10px;
}

.hub.collapsed .group-label,
.hub.collapsed .nav-label,
.hub.collapsed .nav-badge,
.hub.collapsed .brand-text,
.hub.collapsed .version-chip {
  display: none;
}

.sidebar-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--space-3);
}

.runtime {
  font-size: var(--text-label);
  color: var(--text-faint);
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(17, 24, 39, 0.6);
  min-height: var(--topbar-height);
}

.topbar-left {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.topbar h1 {
  font-size: var(--text-title);
  font-weight: 600;
  line-height: 1.2;
}

.collapse-btn {
  background: var(--surface-hover);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  padding: 8px;
  cursor: pointer;
  display: grid;
  place-items: center;
  margin-top: 2px;
}

.collapse-btn:hover {
  color: var(--text-primary);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.hotkey-hint {
  font-size: var(--text-caption);
  color: var(--text-faint);
}

.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content :deep(> *) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

@media (max-width: 1100px) {
  .hub:not(.collapsed) {
    grid-template-columns: var(--sidebar-collapsed) 1fr;
  }

  .hub:not(.collapsed) .group-label,
  .hub:not(.collapsed) .nav-label,
  .hub:not(.collapsed) .nav-badge,
  .hub:not(.collapsed) .brand-text,
  .hub:not(.collapsed) .version-chip {
    display: none;
  }
}
</style>
