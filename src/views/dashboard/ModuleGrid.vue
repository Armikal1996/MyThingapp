<template>
  <section class="module-grid-section">
    <h3 class="hub-section-title">Modules</h3>
    <div class="module-grid">
      <RouterLink
        v-for="mod in moduleList"
        :key="mod.id"
        :to="mod.to"
        class="module-card"
        :style="{ '--mod-accent': mod.accent }"
      >
        <component :is="mod.icon" :size="22" class="module-icon" />
        <div class="module-body">
          <p class="module-title">{{ mod.title }}</p>
          <p class="module-desc">{{ mod.description }}</p>
          <p class="module-connect">{{ mod.connection }}</p>
        </div>
        <span v-if="mod.count != null" class="module-count">{{ mod.count }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  Rocket,
  CheckSquare,
  Star,
  Calendar,
  Clapperboard,
  Bot
} from 'lucide-vue-next'

const props = defineProps({
  counts: { type: Object, required: true }
})

const defs = [
  {
    id: 'launcher',
    title: 'App Launcher',
    description: 'Start WOrK projects with npm / Python',
    connection: 'Pin apps to Favorites, ask AI about projects',
    icon: Rocket,
    accent: 'var(--accent-launcher)',
    to: '/launcher',
    countKey: 'apps'
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Work, moving, and cycling tasks',
    connection: 'Sync due dates to Calendar, dispatch to AI agents',
    icon: CheckSquare,
    accent: 'var(--accent-tasks)',
    to: '/tasks',
    countKey: 'tasks'
  },
  {
    id: 'favorites',
    title: 'Favorites',
    description: 'Start-menu style quick panel',
    connection: 'Launch anything — Ctrl+Shift+M from anywhere',
    icon: Star,
    accent: 'var(--accent-favorites)',
    to: '/favorites',
    countKey: 'favorites'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Events and reminders',
    connection: 'See due tasks, linked reminders open source items',
    icon: Calendar,
    accent: 'var(--accent-calendar)',
    to: '/calendar',
    countKey: 'events'
  },
  {
    id: 'media',
    title: 'Media',
    description: 'Games to play and watchlists',
    connection: 'Watch tonight creates Calendar events + reminders',
    icon: Clapperboard,
    accent: 'var(--accent-media)',
    to: '/media',
    countKey: null
  },
  {
    id: 'ai',
    title: 'AI Chat',
    description: 'LM Studio bots and agent inbox',
    connection: 'Attach any hub item as context with @ picker',
    icon: Bot,
    accent: 'var(--accent-ai)',
    to: '/ai',
    countKey: 'aiThreads'
  }
]

const moduleList = computed(() =>
  defs.map((d) => ({
    ...d,
    count: d.countKey ? (props.counts[d.countKey] ?? 0) : null
  }))
)
</script>

<style scoped>
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.module-card {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: var(--surface-raised);
  color: inherit;
  text-decoration: none;
  position: relative;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.module-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--mod-accent);
}

.module-card:hover {
  border-color: var(--border-default);
  transform: translateY(-2px);
}

.module-icon {
  color: var(--mod-accent);
  flex-shrink: 0;
  margin-left: 6px;
}

.module-body {
  flex: 1;
  min-width: 0;
}

.module-title {
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.module-desc {
  font-size: var(--text-small);
  color: var(--text-muted);
  line-height: 1.4;
}

.module-connect {
  margin-top: var(--space-2);
  font-size: var(--text-caption);
  color: var(--text-faint);
  line-height: 1.4;
}

.module-count {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--text-faint);
}
</style>
