<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="field">
      <span>Label</span>
      <input v-model="form.label" type="text" required placeholder="My App" />
    </label>

    <label class="field">
      <span>Icon (emoji or character)</span>
      <input v-model="form.icon" type="text" maxlength="4" placeholder="★" />
    </label>

    <label class="field">
      <span>Group</span>
      <input v-model="form.groupName" type="text" placeholder="Pinned" list="group-suggestions" />
      <datalist id="group-suggestions">
        <option v-for="g in groupSuggestions" :key="g" :value="g" />
      </datalist>
    </label>

    <label class="field span-2">
      <span>Description (optional)</span>
      <input v-model="form.description" type="text" placeholder="Short hint shown on hover" />
    </label>

    <label class="field">
      <span>Type</span>
      <select v-model="form.targetType" @change="onTypeChange">
        <option v-for="t in targetTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
    </label>

    <label class="field">
      <span>Target</span>
      <select v-if="form.targetType === 'route'" v-model="form.targetId">
        <option v-for="r in builtinRoutes" :key="r.id" :value="r.id">{{ r.label }}</option>
      </select>
      <select v-else-if="form.targetType === 'app'" v-model="form.targetId">
        <option value="">Select app…</option>
        <option v-for="app in apps" :key="app.id" :value="app.id">{{ app.title }}</option>
      </select>
      <input
        v-else
        v-model="form.targetId"
        type="text"
        :placeholder="targetPlaceholder"
        required
      />
    </label>

    <label class="field">
      <span>Sort order</span>
      <input v-model.number="form.sortOrder" type="number" min="0" />
    </label>

    <label class="checkbox span-2">
      <input v-model="form.enabled" type="checkbox" />
      <span>Show in panel</span>
    </label>

    <div class="actions">
      <button type="button" class="btn ghost" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="btn primary">{{ mode === 'edit' ? 'Save' : 'Add' }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { BUILTIN_ROUTES, TARGET_TYPES } from '@/services/favorites.js'

const props = defineProps({
  favorite: { type: Object, required: true },
  mode: { type: String, default: 'add' },
  apps: { type: Array, default: () => [] },
  groupSuggestions: { type: Array, default: () => ['Pinned', 'Modules', 'Apps', 'Links'] }
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive({ ...props.favorite })
const targetTypes = TARGET_TYPES
const builtinRoutes = BUILTIN_ROUTES

const targetPlaceholder = computed(() => {
  const t = TARGET_TYPES.find(x => x.id === form.targetType)
  return t?.hint || ''
})

watch(() => props.favorite, v => Object.assign(form, v), { deep: true })

function onTypeChange() {
  if (form.targetType === 'route') form.targetId = '/'
  else if (form.targetType === 'app') form.targetId = props.apps[0]?.id || ''
  else form.targetId = ''
}

function onSubmit() {
  emit('save', { ...form })
}
</script>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #94a3b8; }
.field input, .field select {
  background: #0f172a; border: 1px solid #334155; border-radius: 8px;
  color: #e2e8f0; padding: 10px 12px; font-size: 14px;
}
.span-2 { grid-column: span 2; }
.checkbox { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #cbd5e1; }
.actions { grid-column: span 2; display: flex; justify-content: flex-end; gap: 10px; }
.btn { border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.ghost { background: transparent; border-color: #334155; color: #94a3b8; }
</style>
