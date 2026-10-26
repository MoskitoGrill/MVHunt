import type { DemoSnapshot } from '../game/model'

export interface DemoAdapter {
  read(): DemoSnapshot
}

export function createDemoAdapter(): DemoAdapter {
  return { read: () => ({ gameId: 'demo-local', source: 'demo' }) }
}

export type DataState =
  | { kind: 'demo'; snapshot: DemoSnapshot }
  | { kind: 'unconfigured'; missing: string[] }
  | { kind: 'configured' }
  | { kind: 'invalid-mode'; value: string }

const firebaseKeys = [
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_APP_ID',
] as const

export function resolveDataState(env: Record<string, unknown>, demoRequested = false): DataState {
  const mode = env.VITE_DATA_MODE
  if (demoRequested || mode === 'demo') {
    return { kind: 'demo', snapshot: createDemoAdapter().read() }
  }
  if (mode && mode !== 'production') return { kind: 'invalid-mode', value: String(mode) }
  const missing = firebaseKeys.filter(key => typeof env[key] !== 'string' || !env[key].trim())
  return missing.length ? { kind: 'unconfigured', missing } : { kind: 'configured' }
}
