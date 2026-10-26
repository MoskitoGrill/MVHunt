import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence, signInAnonymously } from 'firebase/auth'
import { connectDatabaseEmulator, get, getDatabase, goOnline, onValue, push, ref, runTransaction, serverTimestamp, set, type Database } from 'firebase/database'
import { createGame, type Clock, type Game, type GameSettings } from '../game/model'

export type Role = 'host' | 'deputy' | 'hunter' | 'fugitive'
export interface Policy { maxAgeMs: number; lateArrivalMs: number }
export interface Point { lat: number; lng: number; accuracy: number; measuredAt: number }
const id = (value: string) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new Error('Neplatné ID.')
  return value
}

/** Odchylka je pouze pro UI. Práva a termíny vždy kontrolují rules pomocí now. */
export class ServerClock implements Clock {
  private offset: number | null = null
  constructor(private readonly local: Clock) {}
  update(offset: unknown) {
    if (typeof offset !== 'number' || !Number.isFinite(offset)) throw new Error('Neplatný serverový čas.')
    this.offset = offset
  }
  now() {
    if (this.offset === null) throw new Error('Serverový čas zatím není synchronizován.')
    return Math.round(this.local.now() + this.offset)
  }
}

export function parseGame(gameId: string, value: unknown): Game {
  if (!value || typeof value !== 'object') throw new Error('Chybějící snapshot hry.')
  const raw = value as Record<string, unknown>
  if (raw.schemaVersion !== 1 || !raw.settings || typeof raw.settings !== 'object') throw new Error('Nepodporované schéma hry.')
  const s = raw.settings as Record<string, unknown>
  for (const key of ['headStartMs', 'huntIntervalMs', 'huntDurationMs', 'headIntervalMs', 'maxAgeMs', 'lateArrivalMs']) {
    if (typeof s[key] !== 'number' || !Number.isSafeInteger(s[key])) throw new Error(`Neplatné nastavení ${key}.`)
  }
  if ((s.maxAgeMs as number) < 0 || (s.maxAgeMs as number) > 60000 || (s.lateArrivalMs as number) < 0 || (s.lateArrivalMs as number) > 30000) throw new Error('Neplatná GPS politika.')
  const settings: GameSettings = {
    headStartMs: s.headStartMs as number, huntIntervalMs: s.huntIntervalMs as number,
    huntDurationMs: s.huntDurationMs as number,
    headReveals: s.headIntervalMs === 0 ? { mode: 'off' } : { mode: 'custom', intervalMs: s.headIntervalMs as number },
  }
  const game = createGame(gameId, settings)
  if (raw.startedAt !== null && raw.startedAt !== undefined) {
    if (typeof raw.startedAt !== 'number' || !Number.isSafeInteger(raw.startedAt) || raw.startedAt < 0) throw new Error('Neplatný start.')
    game.startedAt = raw.startedAt
  }
  return game
}

export function createFirebaseAdapter(db: Database, uid: string) {
  id(uid)
  const path = (g: string, suffix: string) => ref(db, `games/${id(g)}/${suffix}`)
  return {
    uid,
    async create(settings: GameSettings, policy: Policy) {
      createGame('validate', settings)
      const g = push(ref(db, 'games')).key!
      await set(ref(db, `games/${g}`), {
        schemaVersion: 1, ownerUid: uid, members: { [uid]: { role: 'host' } },
        settings: { headStartMs: settings.headStartMs, huntIntervalMs: settings.huntIntervalMs,
          huntDurationMs: settings.huntDurationMs,
          headIntervalMs: settings.headReveals.mode === 'off' ? 0 : settings.headReveals.mode === 'same' ? settings.huntIntervalMs : settings.headReveals.intervalMs,
          ...policy },
      })
      return g
    },
    async assignMember(g: string, target: string, role: Exclude<Role, 'host'>) {
      await set(path(g, `members/${id(target)}`), { role })
    },
    async start(g: string) {
      // Transakce čte pouze start; celý herní strom se nikdy nestahuje.
      await runTransaction(path(g, 'startedAt'), current => current === null ? serverTimestamp() : undefined, { applyLocally: false })
      return (await get(path(g, 'startedAt'))).val() as number
    },
    async readGame(g: string) {
      const [version, settings, start] = await Promise.all(['schemaVersion', 'settings', 'startedAt'].map(k => get(path(g, k))))
      return parseGame(g, { schemaVersion: version.val(), settings: settings.val(), startedAt: start.val() })
    },
    watchStart(g: string, callback: (at: number | null) => void, error: (e: Error) => void) {
      return onValue(path(g, 'startedAt'), s => {
        const at: unknown = s.val()
        if (at !== null && (typeof at !== 'number' || !Number.isSafeInteger(at) || at < 0)) return error(new Error('Neplatný start.'))
        callback(at as number | null)
      }, error, { onlyOnce: false })
    },
    async writePrivate(g: string, pointId: string, point: Point) {
      await set(path(g, `private/${uid}/${id(pointId)}`), { ...point, receivedAt: serverTimestamp() })
    },
    async writeSlot(g: string, at: number, point: Point) {
      if (!Number.isSafeInteger(at) || at < 0) throw new Error('Neplatný termín.')
      await set(path(g, `slots/${at}/${uid}`), { ...point, at, receivedAt: serverTimestamp() })
    },
    async readSlot(g: string, at: number, target: string): Promise<unknown> {
      if (!Number.isSafeInteger(at) || at < 0) throw new Error('Neplatný termín.')
      return (await get(path(g, `slots/${at}/${id(target)}`))).val()
    },
  }
}

export async function connectFirebase(options: FirebaseOptions, emulator = false) {
  if (emulator && (!options.projectId?.startsWith('demo-') || !import.meta.env.DEV)) throw new Error('Emulátor vyžaduje vývoj a demo- projekt.')
  const existing = getApps().find(a => a.name === 'mvhunt')
  const app = existing ?? initializeApp(options, 'mvhunt')
  const auth = getAuth(app)
  const db = getDatabase(app)
  if (emulator && !existing) {
    const port = (value: string | undefined, fallback: number) => {
      const result = value ? Number(value) : fallback
      if (!Number.isInteger(result) || result<1 || result>65535) throw new Error('Neplatný port emulátoru.')
      return result
    }
    connectAuthEmulator(auth, `http://127.0.0.1:${port(import.meta.env.VITE_AUTH_EMULATOR_PORT,9099)}`, { disableWarnings: true })
    connectDatabaseEmulator(db, '127.0.0.1', port(import.meta.env.VITE_DATABASE_EMULATOR_PORT,9000))
  }
  goOnline(db)
  await setPersistence(auth, browserLocalPersistence)
  await auth.authStateReady()
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  const clock = new ServerClock({ now: () => Date.now() })
  const stopClock = onValue(ref(db, '.info/serverTimeOffset'), s => clock.update(s.val()))
  return { adapter: createFirebaseAdapter(db, user.uid), clock, db, auth, stopClock }
}
