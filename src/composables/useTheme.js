import { computed } from 'vue'
import { resolveTheme, themeVars } from '@/styles/themes.js'

export function useTheme(narrationMeta) {
  const activeTheme = computed(() => resolveTheme(narrationMeta.value?.theme))
  const activeThemeVars = computed(() => themeVars(narrationMeta.value?.theme))

  return { activeTheme, activeThemeVars }
}
