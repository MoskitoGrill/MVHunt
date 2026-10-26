/** Místní demonstrace není autoritativní online hra. */
export interface DemoSnapshot {
  gameId: string
  source: 'demo'
}

/** Unix timestamp v milisekundách. Hodiny lze v E2 nahradit simulací. */
export interface Clock {
  now(): number
}

export interface GameSettings {
  headStartMs: number
  huntIntervalMs: number
  huntDurationMs: number
  headReveals: { mode: 'same' } | { mode: 'off' } | { mode: 'custom'; intervalMs: number }
}

/** Technický limit rozvrhu, nikoli ověřená kapacita backendu. */
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000
export const MIN_INTERVAL_MS = 1000

export function validateSettings(settings: GameSettings): string[] {
  const errors: string[] = []
  const duration = (value: number, min: number) => Number.isSafeInteger(value) && value >= min && value <= MAX_DURATION_MS
  if (!duration(settings.headStartMs, 0)) errors.push('Předstih musí být celé ms v rozsahu 0 až 24 hodin.')
  if (!duration(settings.huntDurationMs, 1)) errors.push('Délka lovu musí být celé ms v rozsahu 1 ms až 24 hodin.')
  if (!duration(settings.huntIntervalMs, MIN_INTERVAL_MS)) errors.push('Interval lovu musí být celé ms v rozsahu 1 sekunda až 24 hodin.')
  if (!settings.headReveals || !['same', 'off', 'custom'].includes(settings.headReveals.mode)) errors.push('Neplatný režim odhalování při předstihu.')
  if (settings.headReveals?.mode === 'custom' && !duration(settings.headReveals.intervalMs, MIN_INTERVAL_MS)) errors.push('Vlastní interval musí být celé ms v rozsahu 1 sekunda až 24 hodin.')
  return errors
}

export interface Game {
  schemaVersion: 1
  gameId: string
  settings: GameSettings
  /** null = čekárna; potvrzený start v E3 ukládá důvěryhodná vrstva. */
  startedAt: number | null
}

function timestamp(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Neplatný Unix čas v ms.')
}

export function createGame(gameId: string, settings: GameSettings): Game {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(gameId)) throw new Error('Neplatné ID hry.')
  const errors = validateSettings(settings)
  if (errors.length) throw new Error(errors.join(' '))
  return { schemaVersion: 1, gameId, settings: structuredClone(settings), startedAt: null }
}

/** Opakovaný start nemění první potvrzený čas. Souběh klientů musí E3 řešit transakcí. */
export function startGame(game: Game, clock: Clock): Game {
  if (game.startedAt !== null) return game
  const startedAt = clock.now()
  timestamp(startedAt)
  timestamp(startedAt + game.settings.headStartMs + game.settings.huntDurationMs)
  return { ...game, startedAt }
}

export interface GameEvent {
  id: string
  kind: 'start' | 'release' | 'reveal' | 'end'
  at: number
}

export type GamePhase = 'lobby' | 'scheduled' | 'head-start' | 'hunt' | 'ended'

/** Čistý rozvrh: konec má přednost před odhalením, čas 0 nikdy neodhaluje. */
export function schedule(game: Game): GameEvent[] {
  if (game.startedAt === null) return []
  const start = game.startedAt
  const release = start + game.settings.headStartMs
  const end = release + game.settings.huntDurationMs
  const events: GameEvent[] = []
  const add = (kind: GameEvent['kind'], at: number) => events.push({ id: `${game.gameId}:${kind}:${at}`, kind, at })
  add('start', start)
  add('release', release)
  const reveals = new Set<number>()
  const head = game.settings.headReveals
  if (head.mode !== 'off') {
    const interval = head.mode === 'same' ? game.settings.huntIntervalMs : head.intervalMs
    for (let at = start + interval; at < release; at += interval) reveals.add(at)
  }
  if (release > start) reveals.add(release)
  for (let at = release + game.settings.huntIntervalMs; at < end; at += game.settings.huntIntervalMs) reveals.add(at)
  for (const at of reveals) add('reveal', at)
  add('end', end)
  const order = { start: 0, release: 1, reveal: 2, end: 3 }
  return events.sort((a, b) => a.at - b.at || order[a.kind] - order[b.kind])
}

export function gameView(game: Game, clock: Clock) {
  const now = clock.now()
  timestamp(now)
  const events = schedule(game)
  const releaseAt = game.startedAt === null ? null : game.startedAt + game.settings.headStartMs
  const endAt = releaseAt === null ? null : releaseAt + game.settings.huntDurationMs
  const phase: GamePhase = game.startedAt === null ? 'lobby' : now < game.startedAt ? 'scheduled' : now >= endAt! ? 'ended' : now < releaseAt! ? 'head-start' : 'hunt'
  const dueEvents = events.filter(event => event.at <= now)
  const nextReveal = events.find(event => event.kind === 'reveal' && event.at > now) ?? null
  const lastReveal = dueEvents.filter(event => event.kind === 'reveal').at(-1) ?? null
  return { phase, releaseAt, endAt, dueEvents, nextReveal, lastReveal }
}

/** Interval (after, now], vhodný pro obnovu po uspání; ID umožňují deduplikaci. */
export function eventsSince(game: Game, after: number, clock: Clock): GameEvent[] {
  timestamp(after)
  const now = clock.now()
  timestamp(now)
  return schedule(game).filter(event => event.at > after && event.at <= now)
}
