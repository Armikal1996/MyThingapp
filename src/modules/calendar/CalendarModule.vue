<template>
  <DesktopRequired>
  <div class="calendar-module">
    <header class="toolbar">
      <div class="month-nav">
        <button class="btn" @click="prevMonth">‹</button>
        <h2>{{ monthLabel }}</h2>
        <button class="btn" @click="nextMonth">›</button>
        <button class="btn" @click="goToday">Today</button>
      </div>
      <div class="toolbar-actions">
        <button class="btn" @click="askAboutDay">Ask AI</button>
        <button class="btn" @click="openAddReminder">+ Reminder</button>
        <button class="btn primary" @click="openAddEvent">+ Event</button>
      </div>
    </header>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <div class="layout">
      <section class="calendar-pane">
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
      </section>

      <aside class="side-pane">
        <h3>{{ selectedLabel }}</h3>

        <div class="section">
          <h4>Due tasks</h4>
          <article v-for="task in dayTasks" :key="task.id" class="item task">
            <div class="item-body">
              <p class="title">{{ task.title }}</p>
              <p class="sub">{{ task.kind }} · {{ formatTime(task.dueAt) }}</p>
            </div>
            <div class="item-actions">
              <button class="mini" @click="goToTask(task)">Open</button>
            </div>
          </article>
          <p v-if="!dayTasks.length" class="empty">No tasks due this day.</p>
        </div>

        <div class="section">
          <h4>Events</h4>
          <article v-for="ev in dayEvents" :key="ev.id" class="item event">
            <span class="dot" :style="{ background: ev.color }" />
            <div class="item-body">
              <p class="title">{{ ev.title }}</p>
              <p class="sub">
                {{ ev.allDay ? 'All day' : formatTime(ev.startAt) }}
                <span v-if="ev.endAt && !ev.allDay"> – {{ formatTime(ev.endAt) }}</span>
              </p>
            </div>
            <div class="item-actions">
              <button class="mini" @click="openEditEvent(ev)">Edit</button>
              <button class="mini danger" @click="onDeleteEvent(ev)">×</button>
            </div>
          </article>
          <p v-if="!dayEvents.length" class="empty">No events this day.</p>
        </div>

        <div class="section">
          <h4>Reminders this day</h4>
          <article
            v-for="rem in dayReminders"
            :key="rem.id"
            class="item"
            :class="{ linked: rem.linkedType }"
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
              <button class="mini" @click="openEditReminder(rem)">Edit</button>
              <button class="mini danger" @click="onDeleteReminder(rem)">×</button>
            </div>
          </article>
          <p v-if="!dayReminders.length" class="empty">No reminders this day.</p>
        </div>

        <div class="section">
          <h4>Upcoming reminders</h4>
          <article v-for="rem in upcomingReminders" :key="rem.id" class="item">
            <div class="item-body">
              <p class="title">{{ rem.title }}</p>
              <p class="sub">{{ formatDateTime(rem.remindAt) }}</p>
            </div>
            <div class="item-actions">
              <button class="mini" @click="openEditReminder(rem)">Edit</button>
              <button class="mini danger" @click="onDeleteReminder(rem)">×</button>
            </div>
          </article>
          <p v-if="!upcomingReminders.length" class="empty">No upcoming reminders.</p>
        </div>
      </aside>
    </div>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalTitle }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
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
      </div>
    </div>
  </div>
  </DesktopRequired>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EventFormModal from '@/modules/calendar/components/EventFormModal.vue'
import ReminderFormModal from '@/modules/calendar/components/ReminderFormModal.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { getTasksForDay } from '@/services/hubContext.js'
import { askAiAbout } from '@/services/integrations.js'
import { navigateToLinkedItem } from '@/services/integrations.js'
import {
  buildMonthGrid,
  createEmptyEvent,
  deleteEvent,
  formatDateLabel,
  formatTime,
  getEventsForDay,
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
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const selectedDate = ref(new Date())
const today = new Date()
const events = ref([])
const reminders = ref([])
const upcomingReminders = ref([])
const dayTasks = ref([])
const message = ref('')
const messageType = ref('info')

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

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

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
    await navigateToLinkedItem(rem.linkedType, rem.linkedId, router)
  }
}

async function askAboutDay() {
  const items = [
    ...dayEvents.value.map(e => ({ type: 'event', id: e.id, title: e.title })),
    ...dayTasks.value.map(t => ({ type: 'task', id: t.id, title: t.title }))
  ]
  if (!items.length) {
    setMessage('Nothing scheduled — add events or due tasks first.', 'info')
    return
  }
  try {
    await askAiAbout(items[0], `Plan my day for ${selectedLabel.value}. Events: ${dayEvents.value.length}, due tasks: ${dayTasks.value.length}.`, router)
  } catch (e) {
    setMessage(e.message, 'error')
  }
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
    setMessage(`Saved event "${payload.title}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onDeleteEvent(ev) {
  if (!confirm(`Delete event "${ev.title}"?`)) return
  await deleteEvent(ev.id)
  await refresh()
  setMessage('Event deleted.', 'success')
}

async function onSaveReminder(rem) {
  try {
    const payload = { ...rem }
    if (!payload.id) payload.id = newReminderId()
    await saveReminder(payload)
    await refresh()
    closeModal()
    setMessage(`Saved reminder "${payload.title}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onDeleteReminder(rem) {
  if (!confirm(`Delete reminder "${rem.title}"?`)) return
  await deleteReminder(rem.id)
  await refresh()
  setMessage('Reminder deleted.', 'success')
}

watch([viewYear, viewMonth], refresh)
watch(selectedDate, refreshDayTasks)

onMounted(refresh)
</script>

<style scoped>
.calendar-module { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.month-nav { display: flex; align-items: center; gap: 10px; }
.month-nav h2 { font-size: 18px; min-width: 180px; text-align: center; }
.toolbar-actions { display: flex; gap: 8px; }
.btn {
  background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
  border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.message { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.message.success { background: rgba(22,101,52,.25); border: 1px solid #166534; color: #86efac; }
.message.info { background: rgba(30,58,138,.25); border: 1px solid #1d4ed8; color: #93c5fd; }
.layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
.calendar-pane { background: #0f172a; border: 1px solid #1f2937; border-radius: 14px; padding: 14px; }
.weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px; }
.weekdays span { text-align: center; font-size: 11px; color: #64748b; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.day {
  min-height: 72px; background: #111827; border: 1px solid #1f2937; border-radius: 8px;
  padding: 6px; display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; color: #e2e8f0;
}
.day.empty { background: transparent; border-color: transparent; cursor: default; }
.day.today { border-color: #3b82f6; }
.day.selected { background: #1e3a5f; border-color: #2563eb; }
.num { font-size: 13px; font-weight: 600; }
.dots { display: flex; gap: 3px; margin-top: auto; }
.dots i { width: 6px; height: 6px; border-radius: 999px; display: block; }
.side-pane {
  background: #0f172a; border: 1px solid #1f2937; border-radius: 14px; padding: 16px;
  display: flex; flex-direction: column; gap: 16px; max-height: 600px; overflow: auto;
}
.side-pane h3 { font-size: 16px; margin-bottom: 4px; }
.section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 8px; }
.item {
  display: flex; gap: 8px; align-items: flex-start; padding: 10px;
  background: #111827; border: 1px solid #1f2937; border-radius: 10px; margin-bottom: 8px;
}
.item-body { flex: 1; min-width: 0; }
.title { font-size: 13px; font-weight: 600; }
.sub { font-size: 11px; color: #64748b; margin-top: 2px; }
.dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 5px; flex-shrink: 0; }
.item-actions { display: flex; gap: 4px; }
.mini {
  background: #1e293b; border: 1px solid #334155; color: #94a3b8;
  border-radius: 6px; padding: 2px 6px; font-size: 11px; cursor: pointer;
}
.mini.danger { color: #fca5a5; border-color: #7f1d1d; }
.item.linked { cursor: pointer; }
.item.linked:hover { border-color: #3b82f6; }
.link-hint { color: #93c5fd; }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,23,.75);
  display: grid; place-items: center; z-index: 100; padding: 24px;
}
.modal {
  width: min(520px, 100%); background: #111827; border: 1px solid #334155;
  border-radius: 14px; padding: 20px; max-height: 90vh; overflow: auto;
}
.modal header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.close { background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
}
</style>
