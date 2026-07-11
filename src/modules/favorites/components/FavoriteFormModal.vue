<template>
  <form class="form" @submit.prevent="onSubmit">
    <BaseField label="Label" v-model="form.label" :input-props="{ required: true, placeholder: 'My App' }" />

    <BaseField label="Icon (emoji or character)" v-model="form.icon" :input-props="{ maxlength: 4, placeholder: '★' }" />

    <BaseField label="Group" v-model="form.groupName" :input-props="{ placeholder: 'Pinned', list: 'group-suggestions' }" />
    <datalist id="group-suggestions">
      <option v-for="g in groupSuggestions" :key="g" :value="g" />
    </datalist>

    <BaseField class="span-2" label="Description (optional)" v-model="form.description" :input-props="{ placeholder: 'Short hint shown on hover' }" />

    <label class="field">
      <span class="label">Type</span>
      <select v-model="form.targetType" class="field-input" @change="onTypeChange">
        <option v-for="t in targetTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
    </label>

    <div v-if="form.targetType === 'hub_item'" class="field span-2 hub-picker">
      <span class="label">Hub item</span>
      <div class="hub-picker-row">
        <HubItemChip v-if="selectedHubItem" :item="selectedHubItem" removable @remove="clearHubItem" />
        <BaseButton type="button" size="sm" @click="pickerOpen = true">
          {{ selectedHubItem ? 'Change item…' : 'Pick item…' }}
        </BaseButton>
      </div>
    </div>

    <BaseField v-else label="Target">
      <select v-if="form.targetType === 'route'" v-model="form.targetId" class="field-input">
        <option v-for="r in builtinRoutes" :key="r.id" :value="r.id">{{ r.label }}</option>
      </select>
      <select v-else-if="form.targetType === 'app'" v-model="form.targetId" class="field-input">
        <option value="">Select app…</option>
        <option v-for="app in apps" :key="app.id" :value="app.id">{{ app.title }}</option>
      </select>
      <input
        v-else
        v-model="form.targetId"
        type="text"
        class="field-input"
        :placeholder="targetPlaceholder"
        required
      />
    </BaseField>

    <BaseField label="Sort order" v-model="form.sortOrder" type="number" :input-props="{ min: 0 }" />

    <label class="checkbox span-2">
      <input v-model="form.enabled" type="checkbox" />
      <span>Show in panel</span>
    </label>

    <div class="actions">
      <BaseButton type="button" variant="ghost" @click="$emit('cancel')">Cancel</BaseButton>
      <BaseButton type="submit" variant="primary">{{ mode === 'edit' ? 'Save' : 'Add' }}</BaseButton>
    </div>

    <ContextPicker
      :open="pickerOpen"
      :initial="hubPickerInitial"
      single
      @update:open="pickerOpen = $event"
      @confirm="onHubPick"
      @cancel="pickerOpen = false"
    />
  </form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import HubItemChip from '@/components/ui/HubItemChip.vue'
import ContextPicker from '@/components/ContextPicker.vue'
import { BUILTIN_ROUTES, TARGET_TYPES } from '@/services/favorites.js'
import { getContextItem, parseHubItemKey } from '@/services/hubContext.js'

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
const pickerOpen = ref(false)
const selectedHubItem = ref(null)

const targetPlaceholder = computed(() => {
  const t = TARGET_TYPES.find(x => x.id === form.targetType)
  return t?.hint || ''
})

const hubPickerInitial = computed(() =>
  selectedHubItem.value ? [selectedHubItem.value] : []
)

watch(() => props.favorite, v => {
  Object.assign(form, v)
  loadHubItem(v.targetId)
}, { deep: true })

async function loadHubItem(key) {
  if (form.targetType !== 'hub_item' || !key) {
    selectedHubItem.value = null
    return
  }
  const parsed = parseHubItemKey(key)
  if (!parsed) {
    selectedHubItem.value = null
    return
  }
  selectedHubItem.value = await getContextItem(parsed.type, parsed.id)
}

function onTypeChange() {
  if (form.targetType === 'route') form.targetId = '/'
  else if (form.targetType === 'app') form.targetId = props.apps[0]?.id || ''
  else if (form.targetType === 'hub_item') {
    form.targetId = selectedHubItem.value?.key || ''
  } else form.targetId = ''
}

function onHubPick(items) {
  const item = items[0]
  if (!item) return
  selectedHubItem.value = item
  form.targetId = item.key
  if (!form.label) form.label = item.title
  if (!form.icon) form.icon = item.type === 'task' ? '☑' : '★'
  pickerOpen.value = false
}

function clearHubItem() {
  selectedHubItem.value = null
  form.targetId = ''
}

function onSubmit() {
  if (form.targetType === 'hub_item' && !form.targetId) return
  emit('save', { ...form })
}

loadHubItem(form.targetId)
</script>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.span-2 {
  grid-column: span 2;
}

.hub-picker .label {
  font-size: var(--text-caption);
  color: var(--text-muted);
  font-weight: 500;
}

.hub-picker-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field .label {
  font-size: var(--text-caption);
  color: var(--text-muted);
  font-weight: 500;
}

.field-input {
  background: var(--surface-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: var(--text-body);
  font-family: inherit;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-small);
  color: var(--text-secondary);
}

.actions {
  grid-column: span 2;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
