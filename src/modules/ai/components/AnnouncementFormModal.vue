<template>
  <form class="ann-form" @submit.prevent="onSubmit">
    <label>
      Title
      <input v-model="form.title" required placeholder="Task for agents…" />
    </label>
    <label>
      Body
      <textarea v-model="form.body" rows="5" required placeholder="What should Gemma or Gwen do?" />
    </label>
    <div class="row">
      <label>
        Agent role
        <select v-model="form.agentRole">
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
        <span v-if="selectedRole?.description" class="role-hint">{{ selectedRole.description }}</span>
      </label>
      <label>
        Priority
        <select v-model="form.priority">
          <option v-for="p in priorities" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </label>
      <label v-if="mode === 'edit'">
        Status
        <select v-model="form.status">
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </label>
    </div>
    <footer>
      <button type="button" class="btn" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Post' }}</button>
    </footer>
  </form>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import { AGENT_ROLES, PRIORITIES, STATUSES } from '@/services/announcements.js'
import { getAgencyRole } from '@/services/agency.js'

const props = defineProps({
  announcement: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const roles = AGENT_ROLES
const priorities = PRIORITIES
const statuses = STATUSES

const form = reactive({
  title: '',
  body: '',
  agentRole: 'implementation',
  priority: 'normal',
  status: 'pending'
})

const selectedRole = computed(() => getAgencyRole(form.agentRole))

watch(
  () => props.announcement,
  (a) => {
    form.title = a.title || ''
    form.body = a.body || ''
    form.agentRole = a.agentRole || 'implementation'
    form.priority = a.priority || 'normal'
    form.status = a.status || 'pending'
  },
  { immediate: true }
)

function onSubmit() {
  emit('save', {
    ...props.announcement,
    title: form.title,
    body: form.body,
    agentRole: form.agentRole,
    priority: form.priority,
    status: form.status
  })
}
</script>

<style scoped>
.ann-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

input,
textarea,
select {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
  font-size: 14px;
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

.btn.primary {
  background: #1d4ed8;
  border-color: #2563eb;
}

.role-hint {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
