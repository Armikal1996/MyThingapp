<template>
  <div ref="rootRef" class="hub-actions" @click.stop>
    <button
      type="button"
      class="trigger"
      aria-label="Hub actions"
      aria-haspopup="true"
      :aria-expanded="open"
      @click="toggle"
    >
      <MoreHorizontal :size="16" />
    </button>
    <div v-if="open" class="menu" role="menu">
      <p class="menu-label">AI</p>
      <button type="button" role="menuitem" @click="run('askAi')">Ask AI</button>
      <button type="button" role="menuitem" @click="run('agent')">Send to agent</button>

      <p class="menu-label">Schedule</p>
      <button v-if="showReminder" type="button" role="menuitem" @click="run('reminder')">Add reminder</button>
      <button v-if="showCalendar" type="button" role="menuitem" @click="run('calendar')">Add to calendar</button>
      <button v-if="showTonight" type="button" role="menuitem" @click="run('tonight')">Watch / play tonight</button>
      <button v-if="showEpisode" type="button" role="menuitem" @click="run('episode')">+1 episode</button>

      <p class="menu-label">Navigate</p>
      <button type="button" role="menuitem" @click="run('pin')">Pin to Favorites</button>
      <button type="button" role="menuitem" @click="run('open')">Open in module</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreHorizontal } from 'lucide-vue-next'
import {
  askAiAbout,
  createReminderFor,
  createWatchTonight,
  dispatchToAgent,
  incrementWatchEpisode,
  openInModule,
  pinQuickFavorite,
  syncTaskToCalendar,
  hubItemFromRaw
} from '@/services/integrations.js'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  item: { type: Object, required: true },
  itemType: { type: String, required: true }
})

const emit = defineEmits(['done', 'error'])

const router = useRouter()
const route = useRoute()
const { success } = useToast()
const open = ref(false)
const rootRef = ref(null)

const hubItem = computed(() => {
  if (props.item.key) return props.item
  return hubItemFromRaw(props.itemType, props.item)
})

const showReminder = computed(() => ['task', 'game', 'watch', 'event', 'app'].includes(props.itemType))
const showCalendar = computed(() => props.itemType === 'task' && props.item.dueAt)
const showTonight = computed(() => ['game', 'watch'].includes(props.itemType))
const showEpisode = computed(() => props.itemType === 'watch' && props.item.mediaType === 'series')

function toggle() {
  open.value = !open.value
}

function onClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

async function run(action) {
  open.value = false
  try {
    const item = hubItem.value
    switch (action) {
      case 'askAi':
        await askAiAbout(item, null, router)
        break
      case 'pin':
        await pinQuickFavorite(item)
        success('Pinned to Favorites')
        break
      case 'reminder':
        await createReminderFor(item)
        success('Reminder created')
        break
      case 'calendar':
        await syncTaskToCalendar(props.item)
        success('Added to calendar')
        break
      case 'tonight':
        await createWatchTonight(item)
        success('Scheduled for tonight')
        break
      case 'episode':
        await incrementWatchEpisode(props.item.id)
        success('Episode incremented')
        break
      case 'agent':
        await dispatchToAgent(item)
        success('Sent to agent inbox')
        break
      case 'open':
        await openInModule(item, router, route.path.split('/')[1] || 'hub')
        break
    }
    emit('done', action)
  } catch (e) {
    emit('error', e.message)
  }
}
</script>

<style scoped>
.hub-actions {
  position: relative;
}

.trigger {
  background: var(--surface-hover);
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.trigger:hover {
  color: var(--text-primary);
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: var(--z-dropdown);
  min-width: 200px;
  background: var(--surface-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--shadow-lg);
}

.menu-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding: var(--space-2) var(--space-2) var(--space-1);
  margin-top: var(--space-1);
}

.menu-label:first-child {
  margin-top: 0;
}

.menu button {
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-primary);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-small);
}

.menu button:hover {
  background: var(--surface-hover);
}
</style>
