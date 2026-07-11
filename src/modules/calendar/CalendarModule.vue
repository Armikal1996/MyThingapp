<template>
  <ModuleShell accent="calendar">
    <template #toolbar>
      <ModuleToolbar>
        <template #leading>
          <div class="month-nav">
            <BaseButton size="sm" @click="prevMonth">‹</BaseButton>
            <h2>{{ monthLabel }}</h2>
            <BaseButton size="sm" @click="nextMonth">›</BaseButton>
            <BaseButton size="sm" @click="goToday">Today</BaseButton>
          </div>
        </template>
        <template #trailing>
          <BaseButton @click="askAboutDay">Ask AI</BaseButton>
          <BaseButton @click="openAddReminder">+ Reminder</BaseButton>
          <BaseButton variant="primary" @click="openAddEvent">+ Event</BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired>
      <div class="layout">
        <BaseCard class="calendar-pane">
          <div class="weekdays">
            <span v-for="d in weekdays" :key="d">{{ d }}</span>
          </div>
          <div class="grid">
            <button
              v-for="(cell, i) in monthCells"
              :key="i"
              class="day"
              :class="{
                empty: !cell,
                today: cell && isSameDay(cell, today),
                selected: cell && isSameDay(cell, selectedDate)
              }"
              :disabled="!cell"
              @click="cell && selectDay(cell)"
            >
              <span v-if="cell" class="num">{{ cell.getDate() }}</span>
              <span v-if="cell && eventCountForDay(cell)" class="dots">
                <i
                  v-for="(ev, j) in eventsForDay(cell).slice(0, 3)"
                  :key="j"
                  :style="{ background: ev.color }"
                />
              </span>
            </button>
          </div>
        </BaseCard>

        <BaseCard class="side-pane">
          <div ref="sidePaneRef" class="side-content">
          <h3>{{ selectedLabel }}</h3>

          <div class="section">
            <h4>Due tasks</h4>
            <article
              v-for="task in dayTasks"
              :key="task.id"
              class="item"
              :data-highlight-id="task.id"
            >
              <div class="item-body">
                <p class="title">{{ task.title }}</p>
                <p class="sub">{{ task.kind }} · {{ formatTime(task.dueAt) }}</p>
              </div>
              <div class="item-actions">
                <BaseButton size="sm" @click="goToTask(task)">Open</BaseButton>
              </div>
            </article>
            <BaseEmptyState
              v-if="!dayTasks.length"
              variant="inline"
              description="No tasks due this day."
            />
          </div>

          <div class="section">
            <h4>Events</h4>
            <article
              v-for="ev in dayEvents"
              :key="ev.id"
              class="item event"
              :data-highlight-id="ev.id"
            >
              <span class="dot" :style="{ background: ev.color }" />
              <div class="item-body">
                <p class="title">{{ ev.title }}</p>
                <p class="sub">
                  {{ ev.allDay ? 'All day' : formatTime(ev.startAt) }}
                  <span v-if="ev.endAt && !ev.allDay"> – {{ formatTime(ev.endAt) }}</span>
                </p>
              </div>
              <div class="item-actions">
                <HubActionMenu item-type="event" :item="ev" @error="onHubError" />
                <BaseButton size="sm" @click="openEditEvent(ev)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDeleteEvent(ev)">×</BaseButton>
              </div>
            </article>
            <BaseEmptyState
              v-if="!dayEvents.length"
              variant="inline"
              description="No events this day."
            />
          </div>

          <div class="section">
            <h4>Reminders this day</h4>
            <article
              v-for="rem in dayReminders"
              :key="rem.id"
              class="item"
              :class="{ linked: rem.linkedType }"
              :data-highlight-id="rem.id"
              @click="onReminderClick(rem)"
            >
              <div class="item-body">
                <p class="title">{{ rem.title }}</p>
                <p class="sub">
                  {{ formatDateTime(rem.remindAt) }}
                  <span v-if="rem.linkedType" class="link-hint"> · linked {{ rem.linkedType }}</span>
                </p>
              </div>
              <div class="item-actions" @click.stop>
                <BaseButton size="sm" @click="openEditReminder(rem)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDeleteReminder(rem)">×</BaseButton>
              </div>
            </article>
            <BaseEmptyState
              v-if="!dayReminders.length"
              variant="inline"
              description="No reminders this day."
            />
          </div>

          <div class="section">
            <h4>Upcoming reminders</h4>
            <article
              v-for="rem in upcomingReminders"
              :key="rem.id"
              class="item"
              :class="{ linked: rem.linkedType }"
              :data-highlight-id="rem.id"
              @click="onUpcomingReminderClick(rem)"
            >
              <div class="item-body">
                <p class="title">{{ rem.title }}</p>
                <p class="sub">{{ formatDateTime(rem.remindAt) }}</p>
              </div>
              <div class="item-actions" @click.stop>
                <BaseButton size="sm" @click="openEditReminder(rem)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDeleteReminder(rem)">×</BaseButton>
              </div>
            </article>
            <BaseEmptyState
              v-if="!upcomingReminders.length"
              variant="inline"
              description="No upcoming reminders."
            />
          </div>
          </div>
        </BaseCard>
      </div>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      size="sm"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
      <EventFormModal
        v-if="modalKind === 'event'"
        :event="editingEvent"
        :mode="modalMode"
        @save="onSaveEvent"
        @cancel="closeModal"
      />
      <ReminderFormModal
        v-else
        :reminder="editingReminder"
        :mode="modalMode"
        @save="onSaveReminder"
        @cancel="closeModal"
      />
    </BaseModal>
  </ModuleShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EventFormModal from '@/modules/calendar/components/EventFormModal.vue'
import ReminderFormModal from '@/modules/calendar/components/ReminderFormModal.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import HubActionMenu from '@/components/HubActionMenu.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { useToast } from '@/composables/useToast.js'
import { useHubHighlight } from '@/composables/useHubHighlight.js'
import { getTasksForDay, formatContextBlock, getContextItems, hubItemKey } from '@/services/hubContext.js'
import { navigateToLinkedItem } from '@/services/integrations.js'
import { createThread, sendChatMessage } from '@/services/aiChat.js'
import {
  buildMonthGrid,
  createEmptyEvent,
  deleteEvent,
  formatDateLabel,
  formatTime,
  isSameDay,
  listEvents,
  newEventId,
  saveEvent
} from '@/services/calendar.js'
import {
  createEmptyReminder,
  deleteReminder,
  listReminders,
  listUpcomingReminders,
  newReminderId,
  saveReminder
} from '@/services/reminders.js'

const router = useRouter()
const route = useRoute()
const { success, error: toastError, info } = useToast()
const { applyHighlight } = useHubHighlight()

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const sidePaneRef = ref(null)

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const selectedDate = ref(new Date())
const today = new Date()
const events = ref([])
const reminders = ref([])
const upcomingReminders = ref([])
const dayTasks = ref([])

const modalOpen = ref(false)
const modalKind = ref('event')
const modalMode = ref('add')
const editingEvent = ref(createEmptyEvent())
const editingReminder = ref(createEmptyReminder())

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric'
  })
)

const monthCells = computed(() => buildMonthGrid(viewYear.value, viewMonth.value))
const selectedLabel = computed(() => formatDateLabel(selectedDate.value))

const dayEvents = computed(() =>
  events.value.filter(e => isSameDay(e.startAt, selectedDate.value))
)

const dayReminders = computed(() =>
  reminders.value.filter(r => isSameDay(r.remindAt, selectedDate.value))
)

const modalTitle = computed(() => {
  if (modalKind.value === 'event') {
    return modalMode.value === 'edit' ? 'Edit event' : 'Add event'
  }
  return modalMode.value === 'edit' ? 'Edit reminder' : 'Add reminder'
})

function eventsForDay(day) {
  return events.value.filter(e => isSameDay(e.startAt, day))
}

function eventCountForDay(day) {
  return eventsForDay(day).length
}

function selectDay(day) {
  selectedDate.value = new Date(day)
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function goToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  selectedDate.value = now
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openAddEvent() {
  editingEvent.value = createEmptyEvent(selectedDate.value)
  modalKind.value = 'event'
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEditEvent(ev) {
  editingEvent.value = { ...ev }
  modalKind.value = 'event'
  modalMode.value = 'edit'
  modalOpen.value = true
}

function openAddReminder() {
  editingReminder.value = createEmptyReminder(selectedDate.value)
  modalKind.value = 'reminder'
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEditReminder(rem) {
  editingReminder.value = { ...rem }
  modalKind.value = 'reminder'
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function refreshDayTasks() {
  dayTasks.value = await getTasksForDay(selectedDate.value)
}

function goToTask(task) {
  router.push({ path: '/tasks', query: { highlight: task.id } })
}

async function onReminderClick(rem) {
  if (rem.linkedType && rem.linkedId) {
    await navigateToLinkedItem(rem.linkedType, rem.linkedId, router, 'calendar')
  }
}

async function onUpcomingReminderClick(rem) {
  if (rem.linkedType && rem.linkedId) {
    await navigateToLinkedItem(rem.linkedType, rem.linkedId, router, 'calendar')
  }
}

async function askAboutDay() {
  const keys = [
    ...dayEvents.value.map(e => hubItemKey('event', e.id)),
    ...dayTasks.value.map(t => hubItemKey('task', t.id))
  ]
  if (!keys.length) {
    info('Nothing scheduled — add events or due tasks first.')
    return
  }
  try {
    const contextItems = await getContextItems(keys)
    const thread = await createThread({
      title: `Plan: ${selectedLabel.value}`,
      modelKey: 'gemma'
    })
    const contextBlock = formatContextBlock(contextItems)
    const userMessage = `Plan my day for ${selectedLabel.value}. Events: ${dayEvents.value.length}, due tasks: ${dayTasks.value.length}.\n\n${contextBlock}`
    await sendChatMessage(thread.id, userMessage)
    await router.push({
      path: '/ai',
      query: { thread: thread.id, context: keys.join(',') }
    })
  } catch (e) {
    toastError(e.message)
  }
}

function onHubError(msg) {
  toastError(msg)
}

async function refresh() {
  events.value = await listEvents()
  reminders.value = await listReminders()
  upcomingReminders.value = await listUpcomingReminders()
  await refreshDayTasks()
}

async function onSaveEvent(ev) {
  try {
    const payload = { ...ev }
    if (!payload.id) payload.id = newEventId()
    await saveEvent(payload)
    await refresh()
    closeModal()
    success(`Saved event "${payload.title}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onDeleteEvent(ev) {
  if (!confirm(`Delete event "${ev.title}"?`)) return
  await deleteEvent(ev.id)
  await refresh()
  success('Event deleted.')
}

async function onSaveReminder(rem) {
  try {
    const payload = { ...rem }
    if (!payload.id) payload.id = newReminderId()
    await saveReminder(payload)
    await refresh()
    closeModal()
    success(`Saved reminder "${payload.title}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onDeleteReminder(rem) {
  if (!confirm(`Delete reminder "${rem.title}"?`)) return
  await deleteReminder(rem.id)
  await refresh()
  success('Reminder deleted.')
}

watch([viewYear, viewMonth], refresh)
watch(selectedDate, refreshDayTasks)
watch(() => route.query.highlight, () => applyHighlight(sidePaneRef))

onMounted(async () => {
  await refresh()
  await applyHighlight(sidePaneRef)
})
</script>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.month-nav h2 {
  font-size: var(--text-heading);
  min-width: 180px;
  text-align: center;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-4);
}

.calendar-pane {
  padding: var(--space-4);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.weekdays span {
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-faint);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
}

.day {
  min-height: 72px;
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  color: var(--text-primary);
}

.day.empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.day.today {
  border-color: var(--accent-calendar);
}

.day.selected {
  background: rgba(16, 185, 129, 0.12);
  border-color: var(--accent-calendar);
}

.num {
  font-size: var(--text-small);
  font-weight: 600;
}

.dots {
  display: flex;
  gap: 3px;
  margin-top: auto;
}

.dots i {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  display: block;
}

.side-pane {
  padding: 0;
  max-height: 600px;
  overflow: auto;
}

.side-content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.side-pane h3 {
  font-size: var(--text-heading);
}

.section h4 {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: var(--space-2);
}

.item {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-3);
  background: var(--surface-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: var(--text-small);
  font-weight: 600;
}

.sub {
  font-size: var(--text-caption);
  color: var(--text-faint);
  margin-top: 2px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  margin-top: 5px;
  flex-shrink: 0;
}

.item-actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.item.linked {
  cursor: pointer;
}

.item.linked:hover {
  border-color: var(--accent-calendar);
}

.link-hint {
  color: var(--status-info);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
