<template>
  <button type="button" class="hub-chip" :class="[item.type, { selected }]" @click="onClick">
    <component :is="iconComponent" :size="14" class="chip-icon" />
    <span class="chip-title">{{ item.title }}</span>
    <button v-if="removable" type="button" class="remove" @click.stop="$emit('remove')">×</button>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  CheckSquare,
  Gamepad2,
  Tv,
  Rocket,
  Calendar,
  Circle
} from 'lucide-vue-next'
import { openInModule } from '@/services/integrations.js'

const props = defineProps({
  item: { type: Object, required: true },
  removable: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  from: { type: String, default: 'dashboard' }
})

const emit = defineEmits(['remove', 'click'])
const router = useRouter()

const iconMap = {
  task: CheckSquare,
  game: Gamepad2,
  watch: Tv,
  app: Rocket,
  event: Calendar
}

const iconComponent = computed(() => iconMap[props.item.type] || Circle)

async function onClick() {
  emit('click', props.item)
  if (props.selectable) return
  await openInModule(props.item, router, props.from)
}
</script>

<style scoped>
.hub-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: var(--surface-overlay);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.hub-chip:hover {
  background: var(--surface-hover);
  border-color: var(--border-default);
  color: var(--text-primary);
}

.chip-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.chip-title {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-chip.task .chip-icon { color: var(--accent-tasks); }
.hub-chip.game .chip-icon,
.hub-chip.watch .chip-icon { color: var(--accent-media); }
.hub-chip.app .chip-icon { color: var(--accent-launcher); }
.hub-chip.event .chip-icon { color: var(--accent-calendar); }

.remove {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
}

.remove:hover {
  color: var(--status-error);
}

.hub-chip.selected {
  background: var(--accent-active);
  border-color: var(--accent-primary);
  color: #fff;
}

.hub-chip.selected .chip-icon {
  color: inherit;
  opacity: 1;
}
</style>
