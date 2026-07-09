<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field span-2">
      <span>Title</span>
      <input v-model="form.title" type="text" required placeholder="Meeting, deadline…" />
    </label>

    <label class="field span-2">
      <span>Description</span>
      <textarea v-model="form.description" rows="2" placeholder="Optional notes" />
    </label>

    <label class="checkbox span-2">
      <input v-model="form.allDay" type="checkbox" />
      <span>All day</span>
    </label>

    <label class="field">
      <span>Start</span>
      <input v-model="startInput" :type="form.allDay ? 'date' : 'datetime-local'" required />
    </label>

    <label class="field">
      <span>End</span>
      <input v-model="endInput" :type="form.allDay ? 'date' : 'datetime-local'" />
    </label>

    <label class="field span-2">
      <span>Color</span>
      <div class="colors">
        <button
          v-for="c in colors"
          :key="c.id"
          type="button"
          class="swatch"
          :class="{ active: form.color === c.value }"
          :style="{ background: c.value }"
          @click="form.color = c.value"
        />
      </div>
    </label>

    <div class="actions span-2">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add event' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { EVENT_COLORS } from '@/services/calendar.js'

const props = defineProps({
  event: { type: Object, required: true },
  mode: { type: String, default: 'add' }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.event })
const colors = EVENT_COLORS

function toLocalInput(iso, allDay) {
  if (!iso) return ''
  const d = new Date(iso)
  if (allDay) return d.toISOString().slice(0, 10)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value, allDay) {
  if (!value) return null
  if (allDay) return new Date(`${value}T00:00:00`).toISOString()
  return new Date(value).toISOString()
}

const startInput = computed({
  get: () => toLocalInput(form.startAt, form.allDay),
  set: v => { form.startAt = fromLocalInput(v, form.allDay) }
})

const endInput = computed({
  get: () => toLocalInput(form.endAt, form.allDay),
  set: v => { form.endAt = fromLocalInput(v, form.allDay) }
})

watch(() => props.event, v => Object.assign(form, v), { deep: true })

function onSubmit() {
  emit('save', { ...form })
}
</script>

<style scoped>
.form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field textarea {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.checkbox { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #cbd5e1; }
.colors { display: flex; gap: 8px; }
.swatch {
  width: 28px; height: 28px; border-radius: 999px; border: 2px solid transparent; cursor: pointer;
}
.swatch.active { border-color: #fff; box-shadow: 0 0 0 2px #1e293b; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
</style>
