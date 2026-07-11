import { nextTick } from 'vue'
import { useRoute } from 'vue-router'

const HIGHLIGHT_CLASS = 'hub-highlight'
const HIGHLIGHT_DURATION = 2500

export function useHubHighlight() {
  const route = useRoute()

  async function applyHighlight(containerRef, attrName = 'data-highlight-id') {
    const id = route.query.highlight
    if (!id) return

    await nextTick()

    const root = containerRef?.value ?? containerRef
    if (!root) return

    const el = root.querySelector?.(`[${attrName}="${id}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el.classList.add(HIGHLIGHT_CLASS)
    setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_DURATION)
  }

  return { applyHighlight }
}
