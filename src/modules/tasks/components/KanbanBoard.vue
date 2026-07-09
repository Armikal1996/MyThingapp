<template>
  <div class="kanban">
    <div v-for="col in columns" :key="col.id" class="column">
      <header class="col-head">
        <h3>{{ col.label }}</h3>
        <span class="count">{{ tasksByColumn[col.id]?.length || 0 }}</span>
      </header>
      <div class="col-body">
        <article
          v-for="task in tasksByColumn[col.id] || []"
          :key="task.id"
          class="task-card"
        >
          <h4>{{ task.title }}</h4>
          <p v-if="task.description" class="desc">{{ task.description }}</p>
          <div class="card-actions">
            <select
              class="move-select"
              :value="task.status"
              @change="onMove(task, $event.target.value)"
            >
              <option v-for="c in columns" :key="c.id" :value="c.id">→ {{ c.label }}</option>
            </select>
            <button class="btn-sm" @click="$emit('edit', task)">Edit</button>
            <button class="btn-sm danger" @click="$emit('delete', task)">×</button>
          </div>
        </article>
        <p v-if="!(tasksByColumn[col.id]?.length)" class="empty">No tasks</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] }
})

const emit = defineEmits(['move', 'edit', 'delete'])

const tasksByColumn = computed(() => {
  const map = {}
  for (const col of props.columns) map[col.id] = []
  for (const task of props.tasks) {
    const key = map[task.status] ? task.status : props.columns[0]?.id
    if (map[key]) map[key].push(task)
  }
  return map
})

function onMove(task, status) {
  if (status !== task.status) emit('move', task, status)
}
</script>

<style scoped>
.kanban {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-height: 400px;
}
.column {
  background: #0b1220;
  border: 1px solid #1f2937;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}
.col-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #1f2937;
}
.col-head h3 { font-size: 13px; font-weight: 600; }
.count {
  font-size: 11px;
  background: #1e293b;
  border-radius: 999px;
  padding: 2px 8px;
  color: #94a3b8;
}
.col-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.task-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 10px;
}
.task-card h4 { font-size: 13px; margin-bottom: 4px; }
.desc { font-size: 12px; color: #64748b; margin-bottom: 8px; line-height: 1.4; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.move-select {
  flex: 1;
  min-width: 90px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 11px;
  padding: 4px 6px;
}
.btn-sm {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}
.btn-sm.danger { color: #fca5a5; border-color: #7f1d1d; }
.empty { font-size: 12px; color: #475569; text-align: center; padding: 16px 0; }
@media (max-width: 1100px) {
  .kanban { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
