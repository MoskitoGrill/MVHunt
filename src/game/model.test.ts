import { describe, expect, it } from 'vitest'
import { createGame, eventsSince, gameView, schedule, startGame, validateSettings, MAX_DURATION_MS, type GameSettings } from './model'

const m = 60_000
const epoch = 1_800_000_000_000
const settings: GameSettings = { headStartMs: 10 * m, huntIntervalMs: 5 * m, huntDurationMs: 20 * m, headReveals: { mode: 'same' } }
const clock = (offset: number) => ({ now: () => epoch + offset })
const game = (changes: Partial<GameSettings> = {}) => startGame(createGame('test', { ...settings, ...changes }), clock(0))
const reveals = (changes: Partial<GameSettings> = {}) => schedule(game(changes)).filter(e => e.kind === 'reveal').map(e => (e.at - epoch) / m)

describe('společný rozvrh', () => {
  it('10/5 → 5,10,15 a jedna událost při překryvu', () => {
    expect(reveals()).toEqual([5, 10, 15, 20, 25])
    const events = schedule(game())
    expect(new Set(events.map(e => e.id)).size).toBe(events.length)
    expect(events.filter(e => e.at === epoch + 10 * m).map(e => e.kind)).toEqual(['release', 'reveal'])
  })
  it('10/3/5 → 3,6,9,10,15; interval lovu má nový počátek', () => {
    expect(reveals({ headReveals: { mode: 'custom', intervalMs: 3 * m } })).toEqual([3, 6, 9, 10, 15, 20, 25])
  })
  it('vypnutá odhalení předstihu stále odhalí při vypuštění', () => {
    expect(reveals({ headReveals: { mode: 'off' } })).toEqual([10, 15, 20, 25])
  })
  it('nulový předstih: vypuštění v 0, žádné odhalení v 0', () => {
    expect(reveals({ headStartMs: 0 })).toEqual([5, 10, 15])
    expect(gameView(game({ headStartMs: 0 }), clock(0)).phase).toBe('hunt')
    expect(schedule(game({ headStartMs: 0 })).slice(0, 2).map(e => e.kind)).toEqual(['start', 'release'])
  })
  it('předstih kratší než interval; krátký lov; nic přesně na konci ani po něm', () => {
    expect(reveals({ headStartMs: 2 * m, huntDurationMs: 1 })).toEqual([2])
    expect(reveals({ headStartMs: 0, huntDurationMs: 5 * m })).toEqual([])
    expect(gameView(game(), clock(30 * m)).nextReveal).toBeNull()
    expect(eventsSince(game(), epoch + 30 * m, clock(100 * m))).toEqual([])
  })
  it.each([
    [-1, 'scheduled'], [0, 'head-start'], [10 * m - 1, 'head-start'],
    [10 * m, 'hunt'], [30 * m - 1, 'hunt'], [30 * m, 'ended'], [60 * m, 'ended'],
  ])('čas %s určuje fázi %s', (offset, phase) => {
    expect(gameView(game(), clock(offset)).phase).toBe(phase)
  })
  it('hranice odhalení a odpočtu', () => {
    expect(gameView(game(), clock(5 * m - 1)).lastReveal).toBeNull()
    expect(gameView(game(), clock(5 * m)).lastReveal?.at).toBe(epoch + 5 * m)
    expect(gameView(game(), clock(5 * m)).nextReveal?.at).toBe(epoch + 10 * m)
  })
  it('návrat po skoku přes intervaly a serializaci nemění fázi, ID ani termíny', () => {
    const saved = JSON.parse(JSON.stringify(game()))
    expect(gameView(saved, clock(21 * m))).toEqual(gameView(game(), clock(21 * m)))
    expect(eventsSince(saved, epoch + 4 * m, clock(21 * m)).filter(e => e.kind === 'reveal').map(e => (e.at - epoch) / m)).toEqual([5, 10, 15, 20])
    expect(eventsSince(saved, epoch + 21 * m, clock(21 * m))).toEqual([])
    expect(gameView(saved, clock(21 * m)).nextReveal?.at).toBe(epoch + 25 * m)
    expect(gameView(saved, clock(21 * m)).lastReveal?.at).toBe(epoch + 20 * m)
  })
  it('čekárna nic neplánuje, první potvrzený start je neměnný', () => {
    const lobby = createGame('stable-id', settings)
    expect(gameView(lobby, clock(0)).phase).toBe('lobby')
    expect(schedule(lobby)).toEqual([])
    const started = startGame(lobby, clock(0))
    expect(startGame(started, clock(m))).toBe(started)
    expect(started.gameId).toBe(lobby.gameId)
    settings.headReveals.mode = 'off'
    expect(started.settings.headReveals.mode).toBe('same')
    settings.headReveals.mode = 'same'
    expect(schedule(game({ headStartMs: m }))[0].id).not.toBe(schedule(startGame(createGame('other', settings), clock(0)))[0].id)
  })
})

describe('validace', () => {
  it.each([-1, NaN, Infinity, 0.5, MAX_DURATION_MS + 1])('odmítne neplatný předstih %s', value => {
    expect(validateSettings({ ...settings, headStartMs: value }).length).toBeGreaterThan(0)
  })
  it.each([0, -1, NaN, Infinity, 999, 1000.5, MAX_DURATION_MS + 1])('odmítne interval %s v obou fázích', value => {
    expect(validateSettings({ ...settings, huntIntervalMs: value }).length).toBeGreaterThan(0)
    expect(validateSettings({ ...settings, headReveals: { mode: 'custom', intervalMs: value } }).length).toBeGreaterThan(0)
  })
  it.each([0, -1, NaN, Infinity, 0.5, MAX_DURATION_MS + 1])('odmítne délku %s', value => {
    expect(() => createGame('test', { ...settings, huntDurationMs: value })).toThrow()
  })
  it('přijme krajní hodnoty, odmítne režim a neplatné ID/čas i přetečení', () => {
    expect(validateSettings({ ...settings, headStartMs: 0, huntIntervalMs: 1000, huntDurationMs: 1 })).toEqual([])
    expect(validateSettings({ ...settings, headStartMs: MAX_DURATION_MS, huntDurationMs: MAX_DURATION_MS })).toEqual([])
    expect(validateSettings({ ...settings, headReveals: { mode: 'invalid' } } as unknown as GameSettings).length).toBeGreaterThan(0)
    expect(() => createGame('../bad', settings)).toThrow()
    for (const time of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER]) {
      expect(() => startGame(createGame('test', settings), { now: () => time })).toThrow()
    }
    expect(() => gameView(game(), { now: () => NaN })).toThrow()
  })
})
