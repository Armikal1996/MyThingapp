<template>
  <div class="hub-actions" @click.stop>
    <button type="button" class="trigger" @click="open = !open">⋯</button>
    <div v-if="open" class="menu">
      <button type="button" @click="run('askAi')">Ask AI</button>
      <button type="button" @click="run('pin')">Pin to Favorites</button>
      <button v-if="showReminder" type="button" @click="run('reminder')">Add reminder</button>
      <button v-if="showCalendar" type="button" @click="run('calendar')">Add to calendar</button>
      <button v-if="showTonight" type="button" @click="run('tonight')">Watch / play tonight</button>
      <button v-if="showEpisode" type="button" @click="run('episode')">+1 episode</button>
      <button type="button" @click="run('agent')">Send to agent</button>
      <button type="button" @click="run('open')">Open in module</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  askAiAbout,
  createReminderFor,
  createWatchTonight,
  dispatchToAgent,
  incrementWatchEpisode,
  openInModule,
  pinQuickFavorite,
  syncTaskToCalendar
} from '@/services/integrations.js'
import { hubItemFromRaw } from '@/services/integrations.js'

const props = defineProps({
  item: { type: Object, required: true },
  itemType: { type: String, required: true }
})

const emit = defineEmits(['done', 'error'])

const router = useRouter()
const open = ref(false)

const hubItem = computed(() => {
  if (props.item.key) return props.item
  return hubItemFromRaw(props.itemType, props.item)
})

const showReminder = computed(() => ['task', 'game', 'watch', 'event', 'app'].includes(props.itemType))
const showCalendar = computed(() => props.itemType === 'task' && props.item.dueAt)
const showTonight = computed(() => ['game', 'watch'].includes(props.itemType))
const showEpisode = computed(() => props.itemType === 'watch' && props.item.mediaType === 'series')

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
        break
      case 'reminder':
        await createReminderFor(item)
        break
      case 'calendar':
        await syncTaskToCalendar(props.item)
        break
      case 'tonight':
        await createWatchTonight(item)
        break
      case 'episode':
        await incrementWatchEpisode(props.item.id)
        break
      case 'agent':
        await dispatchToAgent(item)
        break
      case 'open':
        await openInModule(item, router)
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
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  line-height: 1;
}

.menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 20;
  min-width: 180px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu button {
  text-align: left;
  background: transparent;
  border: none;
  color: #e2e8f0;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.menu button:hover {
  background: #1e293b;
}
</style>
