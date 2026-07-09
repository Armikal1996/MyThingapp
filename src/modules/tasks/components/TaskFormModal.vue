<template>
  <form class="task-form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Task title" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="3" placeholder="Optional details" />
    </label>

    <label v-if="showStatus" class="field">
      <span>Status</span>
      <select v-model="form.status">
        <option v-for="opt in statusOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
      </select>
    </label>

    <label v-if="showRecurrence" class="field">
      <span>Recurrence</span>
      <select v-model="form.recurrence">
        <option v-for="opt in recurrenceOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
      </select>
    </label>

    <label class="field">
      <span>Priority</span>
      <select v-model.number="form.priority">
        <option :value="0">Normal</option>
        <option :value="1">Low</option>
        <option :value="2">High</option>
        <option :value="3">Urgent</option>
      </select>
    </label>

    <label class="field">
      <span>Due date (optional)</span>
      <input v-model="dueInput" type="date" />
    </label>

    <label class="field span-2">
      <span>Tags (comma-separated)</span>
      <input v-model="tagsInput" type="text" placeholder="work, urgent" />
    </label>

    <div class="actions">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add task' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { RECURRENCE_OPTIONS, WORK_STATUSES } from '@/services/tasks.js'

const props = defineProps({
  task: { type: Object, required: true },
  mode: { type: String, default: 'add' },
  showStatus: { type: Boolean, default: true },
  showRecurrence: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.task })
const recurrenceOptions = RECURRENCE_OPTIONS
const statusOptions = WORK_STATUSES

const tagsInput = computed({
  get: () => (Array.isArray(form.tags) ? form.tags.join(', ') : ''),
  set: v => { form.tags = v.split(',').map(t => t.trim()).filter(Boolean) }
})

const dueInput = computed({
  get: () => form.dueAt ? form.dueAt.slice(0, 10) : '',
  set: v => { form.dueAt = v ? new Date(v).toISOString() : null }
})

watch(() => props.task, v => Object.assign(form, v), { deep: true })

function onSubmit() {
  emit('save', { ...form })
}
</script>

<style scoped>
.task-form { display: flex; flex-direction: column; gap: 16px; }
.form-grid, .task-form { }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field select, .field textarea {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
</style>
