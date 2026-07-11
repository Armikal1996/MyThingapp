import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function show(message, type = 'info', duration = 4000) {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function success(message, duration) {
    return show(message, 'success', duration)
  }

  function error(message, duration) {
    return show(message, 'error', duration ?? 6000)
  }

  function info(message, duration) {
    return show(message, 'info', duration)
  }

  function warning(message, duration) {
    return show(message, 'warning', duration)
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, show, success, error, info, warning, dismiss }
}
