import lmstudioConfig from '../../config/lmstudio.json'

export function isTauri() {
  return import.meta.env.TAURI_ENV_PLATFORM != null
}

export async function getPlatformInfo() {
  if (!isTauri()) {
    return { name: 'MyThing', phase: 0, version: '0.1.0-web', runtime: 'browser' }
  }

  const { invoke } = await import('@tauri-apps/api/core')
  const info = await invoke('get_platform_info')
  return { ...info, runtime: 'desktop' }
}

export function getLmStudioConfig() {
  return lmstudioConfig
}
