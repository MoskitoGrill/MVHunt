import { describe, expect, it } from 'vitest'
import { resolveDataState } from './adapter'

describe('výběr datového režimu', () => {
  it('bez konfigurace nepředstírá hru ani demonstraci', () => {
    expect(resolveDataState({})).toMatchObject({ kind: 'unconfigured', missing: ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_APP_ID'] })
  })
  it('demo se spouští jen výslovnou volbou', () => {
    expect(resolveDataState({}, true).kind).toBe('demo')
    expect(resolveDataState({ VITE_DATA_MODE: 'demo' }).kind).toBe('demo')
  })
  it('chybný režim se nezmění potichu na demo', () => {
    expect(resolveDataState({ VITE_DATA_MODE: 'typo' }).kind).toBe('invalid-mode')
  })
  it('úplná konfigurace připraví explicitní připojení', () => {
    const env = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'DATABASE_URL', 'APP_ID'].map(key => [`VITE_FIREBASE_${key}`, 'example']))
    expect(resolveDataState(env).kind).toBe('configured')
    expect(resolveDataState({ ...env, VITE_FIREBASE_API_KEY: ' ' }).kind).toBe('unconfigured')
  })
})
