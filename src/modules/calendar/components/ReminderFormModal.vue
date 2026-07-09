<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Reminder title" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="2" placeholder="Optional message for notification" />
    </label>

    <label class="field span-2">
      <span>Remind at</span>
      <input v-model="remindInput" type="datetime-local" required />
    </label>

    <label class="checkbox span-2">
      <input v-model="form.enabled" type="checkbox" />
      <span>Enabled</span>
    </label>

    <div class="actions span-2">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add reminder' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  reminder: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.reminder })

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const remindInput = computed({
  get: () => toLocalInput(form.remindAt),
  set: v => { form.remindAt = v ? new Date(v).toISOString() : form.remindAt }
})

watch(() => props.reminder, v => Object.assign(form, v), { deep: true })

function onSubmit() {
  emit('save', { ...form, fired: false })
}
</script>

<style scoped>
.form { display: grid; grid-template-columns: 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field textarea {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.checkbox { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #cbd5e1; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
</style>
