<template>
  <DesktopRequired>
  <div class="tasks-module">
    <section class="toolbar">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="toolbar-actions">
        <button class="btn" @click="onExportBackup">Export backup</button>
        <button class="btn" :disabled="!isDesktop" @click="onImportBackup">Import backup</button>
        <button class="btn primary" @click="openAdd">Add task</button>
      </div>
    </section>

    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <!-- Work tasks -->
    <section v-if="activeTab === 'work'" class="panel">
      <div class="filters">
        <button
          class="filter"
          :class="{ active: workFilter === 'all' }"
          @click="workFilter = 'all'"
        >
          All ({{ workTasks.length }})
        </button>
        <button
          v-for="s in workStatuses"
          :key="s.id"
          class="filter"
          :class="{ active: workFilter === s.id }"
          @click="workFilter = s.id"
        >
          {{ s.label }} ({{ countByStatus('work', s.id) }})
        </button>
      </div>
      <div class="task-list">
        <article v-for="task in filteredWorkTasks" :key="task.id" class="task-row">
          <div class="task-main">
            <h3>{{ task.title }}</h3>
            <p v-if="task.description" class="desc">{{ task.description }}</p>
            <div class="meta">
              <span v-if="task.dueAt" class="pill">Due {{ formatDate(task.dueAt) }}</span>
              <span v-for="tag in task.tags" :key="tag" class="pill tag">{{ tag }}</span>
            </div>
          </div>
          <div class="row-actions">
            <HubActionMenu item-type="task" :item="task" @done="onHubAction" @error="onHubError" />
            <select :value="task.status" @change="onStatusChange(task, $event.target.value)">
              <option v-for="s in workStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
            <button class="btn-sm" @click="openEdit(task)">Edit</button>
            <button class="btn-sm danger" @click="onDelete(task)">Delete</button>
          </div>
        </article>
        <p v-if="!filteredWorkTasks.length" class="empty">No work tasks in this view.</p>
      </div>
    </section>

    <!-- Moving kanban -->
    <section v-else-if="activeTab === 'moving'" class="panel">
      <KanbanBoard
        :tasks="movingTasks"
        :columns="movingColumns"
        @move="onMove"
        @edit="openEdit"
        @delete="onDelete"
      />
    </section>

    <!-- Cycling tasks -->
    <section v-else class="panel">
      <div class="task-list">
        <article v-for="task in cyclingTasks" :key="task.id" class="task-row cycling">
          <div class="task-main">
            <h3>{{ task.title }}</h3>
            <p v-if="task.description" class="desc">{{ task.description }}</p>
            <div class="meta">
              <span class="pill">{{ task.recurrence || 'daily' }}</span>
              <span v-if="task.nextDueAt" class="pill" :class="{ overdue: isOverdue(task) }">
                Next: {{ formatDate(task.nextDueAt) }}
              </span>
              <span v-if="task.lastCompletedAt" class="pill muted">
                Last: {{ formatDate(task.lastCompletedAt) }}
              </span>
            </div>
          </div>
          <div class="row-actions">
            <button class="btn-sm primary" @click="onCompleteCycle(task)">Complete</button>
            <button class="btn-sm" @click="openEdit(task)">Edit</button>
            <button class="btn-sm danger" @click="onDelete(task)">Delete</button>
          </div>
        </article>
        <p v-if="!cyclingTasks.length" class="empty">No cycling tasks yet.</p>
      </div>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header>
          <h2>{{ modalMode === 'edit' ? 'Edit task' : 'Add task' }}</h2>
          <button class="close" @click="closeModal">×</button>
        </header>
        <TaskFormModal
          :task="editingTask"
          :mode="modalMode"
          :show-status="activeTab === 'work'"
          :show-recurrence="activeTab === 'cycling'"
          @save="onSave"
          @cancel="closeModal"
        />
      </div>
    </div>
  </div>
  </DesktopRequired>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import KanbanBoard from '@/modules/tasks/components/KanbanBoard.vue'
import TaskFormModal from '@/modules/tasks/components/TaskFormModal.vue'
import HubActionMenu from '@/components/HubActionMenu.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import { exportBackup, importBackup } from '@/services/backup.js'
import { isTauri } from '@/services/platform.js'
import {
  TASK_KINDS,
  WORK_STATUSES,
  completeCyclingTask,
  createEmptyTask,
  deleteTask,
  getMovingColumns,
  listTasks,
  moveTask,
  newTaskId,
  saveTask
} from '@/services/tasks.js'

const isDesktop = isTauri()
const tabs = [
  { id: 'work', label: 'Work' },
  { id: 'moving', label: 'Moving' },
  { id: 'cycling', label: 'Cycling' }
]

const activeTab = ref('work')
const workFilter = ref('all')
const workStatuses = WORK_STATUSES
const movingColumns = ref([])
const allTasks = ref([])
const message = ref('')
const messageType = ref('info')
const modalOpen = ref(false)
const modalMode = ref('add')
const editingTask = ref(createEmptyTask())

const workTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.WORK))
const movingTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.MOVING))
const cyclingTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.CYCLING))

const filteredWorkTasks = computed(() =>
  workTasks.value.filter(t => workFilter.value === 'all' || t.status === workFilter.value)
)

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function isOverdue(task) {
  return task.nextDueAt && new Date(task.nextDueAt) < new Date()
}

function countByStatus(kind, status) {
  return allTasks.value.filter(t => t.kind === kind && t.status === status).length
}

async function refresh() {
  allTasks.value = await listTasks()
}

function openAdd() {
  const kindMap = { work: TASK_KINDS.WORK, moving: TASK_KINDS.MOVING, cycling: TASK_KINDS.CYCLING }
  editingTask.value = createEmptyTask(kindMap[activeTab.value])
  modalMode.value = 'add'
  modalOpen.value = true
}

function openEdit(task) {
  editingTask.value = { ...task, tags: [...(task.tags || [])] }
  modalMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function onSave(task) {
  try {
    const payload = { ...task }
    if (!payload.id) payload.id = newTaskId()
    await saveTask(payload)
    await refresh()
    closeModal()
    setMessage(`Saved "${payload.title}".`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onDelete(task) {
  if (!confirm(`Delete "${task.title}"?`)) return
  await deleteTask(task.id)
  await refresh()
  setMessage(`Deleted "${task.title}".`, 'success')
}

async function onStatusChange(task, status) {
  await moveTask(task, status)
  await refresh()
}

async function onMove(task, status) {
  await moveTask(task, status)
  await refresh()
}

async function onCompleteCycle(task) {
  await completeCyclingTask(task)
  await refresh()
  setMessage(`Completed "${task.title}" — next due scheduled.`, 'success')
}

async function onExportBackup() {
  try {
    const result = await exportBackup()
    setMessage(result.path ? `Backup saved to ${result.path}` : 'Backup exported.', 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

async function onImportBackup() {
  if (!confirm('Import will replace all current data. Continue?')) return
  try {
    const result = await importBackup()
    if (!result) return
    await refresh()
    setMessage(`Restored backup from ${result.importedAt || 'file'}.`, 'success')
  } catch (e) {
    setMessage(e.message, 'error')
  }
}

function onHubAction(action) {
  setMessage(`Done: ${action}`, 'success')
  refresh()
}

function onHubError(err) {
  setMessage(err, 'error')
}

onMounted(async () => {
  movingColumns.value = await getMovingColumns()
  await refresh()
})
</script>

<style scoped>
.tasks-module { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.tabs { display: flex; gap: 6px; }
.tab {
  background: #1e293b; border: 1px solid #334155; color: #94a3b8;
  border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tab.active { background: #2563eb; border-color: #2563eb; color: #fff; }
.toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn {
  background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
  border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.message { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.message.success { background: rgba(22,101,52,.25); border: 1px solid #166534; color: #86efac; }
.message.error { background: rgba(127,29,29,.25); border: 1px solid #991b1b; color: #fca5a5; }
.message.info { background: rgba(30,58,138,.25); border: 1px solid #1d4ed8; color: #93c5fd; }
.panel { min-height: 300px; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.filter {
  background: #0f172a; border: 1px solid #334155; color: #94a3b8;
  border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer;
}
.filter.active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.task-list { display: flex; flex-direction: column; gap: 10px; }
.task-row {
  display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;
  background: #0f172a; border: 1px solid #1f2937; border-radius: 12px; padding: 14px;
}
.task-main h3 { font-size: 15px; margin-bottom: 4px; }
.desc { font-size: 13px; color: #64748b; margin-bottom: 8px; line-height: 1.4; }
.meta { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  font-size: 11px; background: #1e293b; color: #94a3b8;
  border-radius: 999px; padding: 3px 8px;
}
.pill.overdue { color: #fca5a5; border: 1px solid #991b1b; }
.pill.muted { opacity: 0.7; }
.row-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
.row-actions select {
  background: #0b1220; border: 1px solid #334155; border-radius: 6px;
  color: #cbd5e1; font-size: 12px; padding: 6px 8px;
}
.btn-sm {
  background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer;
}
.btn-sm.primary { background: #2563eb; border-color: #2563eb; }
.btn-sm.danger { color: #fca5a5; border-color: #7f1d1d; }
.empty { color: #64748b; text-align: center; padding: 32px; }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,23,.75);
  display: grid; place-items: center; z-index: 100; padding: 24px;
}
.modal {
  width: min(560px, 100%); background: #111827; border: 1px solid #334155;
  border-radius: 14px; padding: 20px; max-height: 90vh; overflow: auto;
}
.modal header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.close { background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; }
</style>
