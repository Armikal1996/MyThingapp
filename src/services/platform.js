import { invoke, isTauri as isTauriRuntime } from '@tauri-apps/api/core'
import lmstudioConfig from '../../config/lmstudio.json'

export function isTauri() {
  return isTauriRuntime()
}

export async function getPlatformInfo() {
  if (!isTauri()) {
    return { name: 'MyThing', phase: 0, version: '0.1.0-web', runtime: 'browser' }
  }

  const info = await invoke('get_platform_info')
  return { ...info, runtime: 'desktop' }
}

export function getLmStudioConfig() {
  return lmstudioConfig
}
