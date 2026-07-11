<template>
  <ModuleShell sticky-toolbar accent="tasks">
    <template #toolbar>
      <ModuleToolbar>
        <template #leading>
          <BaseTabs v-model="activeTab" :tabs="tabs" />
        </template>
        <template #trailing>
          <BaseButton @click="onExportBackup">Export backup</BaseButton>
          <BaseButton :disabled="!isDesktop" @click="onImportBackup">Import backup</BaseButton>
          <BaseButton variant="primary" @click="openAdd">Add task</BaseButton>
        </template>
      </ModuleToolbar>
    </template>

    <DesktopRequired>
      <div ref="listRef" class="tasks-content">
        <!-- Work tasks -->
        <section v-if="activeTab === 'work'" class="panel">
          <div class="filters">
            <BasePill :active="workFilter === 'all'" @click="workFilter = 'all'">
              All ({{ workTasks.length }})
            </BasePill>
            <BasePill
              v-for="s in workStatuses"
              :key="s.id"
              :active="workFilter === s.id"
              @click="workFilter = s.id"
            >
              {{ s.label }} ({{ countByStatus('work', s.id) }})
            </BasePill>
          </div>
          <div class="task-list">
            <BaseCard
              v-for="task in filteredWorkTasks"
              :key="task.id"
              class="task-row"
              accent="var(--accent-tasks)"
              :data-highlight-id="task.id"
            >
              <div class="task-main">
                <h3>{{ task.title }}</h3>
                <p v-if="task.description" class="desc">{{ task.description }}</p>
                <div class="meta">
                  <BaseBadge v-if="task.dueAt">Due {{ formatDate(task.dueAt) }}</BaseBadge>
                  <BaseBadge v-for="tag in task.tags" :key="tag">{{ tag }}</BaseBadge>
                </div>
              </div>
              <div class="row-actions">
                <HubActionMenu item-type="task" :item="task" @done="onHubAction" @error="onHubError" />
                <select :value="task.status" @change="onStatusChange(task, $event.target.value)">
                  <option v-for="s in workStatuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>
                <BaseButton size="sm" @click="openEdit(task)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDelete(task)">Delete</BaseButton>
              </div>
            </BaseCard>
            <BaseEmptyState
              v-if="!filteredWorkTasks.length"
              variant="inline"
              title="No work tasks in this view."
            />
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
            <BaseCard
              v-for="task in cyclingTasks"
              :key="task.id"
              class="task-row"
              accent="var(--accent-tasks)"
              :data-highlight-id="task.id"
            >
              <div class="task-main">
                <h3>{{ task.title }}</h3>
                <p v-if="task.description" class="desc">{{ task.description }}</p>
                <div class="meta">
                  <BaseBadge>{{ task.recurrence || 'daily' }}</BaseBadge>
                  <BaseBadge v-if="task.nextDueAt" :variant="isOverdue(task) ? 'danger' : 'default'">
                    Next: {{ formatDate(task.nextDueAt) }}
                  </BaseBadge>
                  <BaseBadge v-if="task.lastCompletedAt">Last: {{ formatDate(task.lastCompletedAt) }}</BaseBadge>
                </div>
              </div>
              <div class="row-actions">
                <HubActionMenu item-type="task" :item="task" @done="onHubAction" @error="onHubError" />
                <BaseButton size="sm" variant="primary" @click="onCompleteCycle(task)">Complete</BaseButton>
                <BaseButton size="sm" @click="openEdit(task)">Edit</BaseButton>
                <BaseButton size="sm" variant="danger" @click="onDelete(task)">Delete</BaseButton>
              </div>
            </BaseCard>
            <BaseEmptyState
              v-if="!cyclingTasks.length"
              variant="inline"
              title="No cycling tasks yet."
            />
          </div>
        </section>
      </div>
    </DesktopRequired>

    <BaseModal
      :open="modalOpen"
      :title="modalMode === 'edit' ? 'Edit task' : 'Add task'"
      @update:open="modalOpen = $event"
      @close="closeModal"
    >
      <TaskFormModal
        :task="editingTask"
        :mode="modalMode"
        :show-status="activeTab === 'work'"
        :show-recurrence="activeTab === 'cycling'"
        @save="onSave"
        @cancel="closeModal"
      />
    </BaseModal>
  </ModuleShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import KanbanBoard from '@/modules/tasks/components/KanbanBoard.vue'
import TaskFormModal from '@/modules/tasks/components/TaskFormModal.vue'
import HubActionMenu from '@/components/HubActionMenu.vue'
import DesktopRequired from '@/components/DesktopRequired.vue'
import ModuleShell from '@/components/ui/ModuleShell.vue'
import ModuleToolbar from '@/components/ui/ModuleToolbar.vue'
import BaseTabs from '@/components/ui/BaseTabs.vue'
import BasePill from '@/components/ui/BasePill.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseEmptyState from '@/components/ui/BaseEmptyState.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { exportBackup, importBackup } from '@/services/backup.js'
import { isTauri } from '@/services/platform.js'
import { useToast } from '@/composables/useToast.js'
import { useHubHighlight } from '@/composables/useHubHighlight.js'
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

const route = useRoute()
const { success, error: toastError } = useToast()
const { applyHighlight } = useHubHighlight()

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
const listRef = ref(null)
const modalOpen = ref(false)
const modalMode = ref('add')
const editingTask = ref(createEmptyTask())

const workTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.WORK))
const movingTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.MOVING))
const cyclingTasks = computed(() => allTasks.value.filter(t => t.kind === TASK_KINDS.CYCLING))

const filteredWorkTasks = computed(() =>
  workTasks.value.filter(t => workFilter.value === 'all' || t.status === workFilter.value)
)

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
    success(`Saved "${payload.title}".`)
  } catch (e) {
    toastError(e.message)
  }
}

async function onDelete(task) {
  if (!confirm(`Delete "${task.title}"?`)) return
  await deleteTask(task.id)
  await refresh()
  success(`Deleted "${task.title}".`)
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
  success(`Completed "${task.title}" — next due scheduled.`)
}

async function onExportBackup() {
  try {
    const result = await exportBackup()
    success(result.path ? `Backup saved to ${result.path}` : 'Backup exported.')
  } catch (e) {
    toastError(e.message)
  }
}

async function onImportBackup() {
  if (!confirm('Import will replace all current data. Continue?')) return
  try {
    const result = await importBackup()
    if (!result) return
    await refresh()
    success(`Restored backup from ${result.importedAt || 'file'}.`)
  } catch (e) {
    toastError(e.message)
  }
}

function onHubAction(action) {
  success(`Done: ${action}`)
  refresh()
}

function onHubError(err) {
  toastError(err)
}

onMounted(async () => {
  movingColumns.value = await getMovingColumns()
  await refresh()
  if (route.query.action === 'add') openAdd()
  await applyHighlight(listRef)
})

watch(() => route.query.highlight, () => applyHighlight(listRef))
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.task-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
}

.task-main h3 {
  font-size: var(--text-body);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.desc {
  font-size: var(--text-small);
  color: var(--text-faint);
  margin-bottom: var(--space-2);
  line-height: 1.4;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.row-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
  align-items: center;
}

.row-actions select {
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  padding: 6px 8px;
}

.panel {
  min-height: 300px;
}
</style>
