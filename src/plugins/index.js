import { initPlugins } from './pluginHost.js'
import { analyticsPlugin } from './analyticsPlugin.js'
import { memoryPlugin } from './memoryPlugin.js'
import { gamePlugin } from './gamePlugin.js'

/**
 * Register plugins here. Add new scripts as { id, setup?, onEvent?, handlers? }.
 *
 * Example future plugin:
 *   export const quizPlugin = { id: 'quiz', handlers: { 'node:visited'(p, api) { ... } } }
 */
const registry = [
  analyticsPlugin,
  memoryPlugin,
  gamePlugin
]

export function bootstrapPlugins() {
  initPlugins(registry)
}

export { pluginApi, emit, registerPlugin } from './pluginHost.js'
