import { describe, expect, it } from 'vitest'
import { parseGame, ServerClock } from './firebase'
const raw = { schemaVersion: 1, settings: { headStartMs: 0, huntDurationMs: 10000, huntIntervalMs: 1000, headIntervalMs: 0, maxAgeMs: 30000, lateArrivalMs: 10000 }, startedAt: 1234 }
describe('nedůvěryhodné snapshoty a UI čas', () => {
  it('odmítá neznámé schéma, chybějící data, neplatná nastavení a start', () => {
    for (const value of [null, {}, { ...raw, schemaVersion: 2 }, { ...raw, startedAt: '1234' }, { ...raw, settings: { ...raw.settings, huntIntervalMs: 0 } }]) expect(() => parseGame('a', value)).toThrow()
    expect(parseGame('a', raw).startedAt).toBe(1234)
    expect(parseGame('a', { ...raw, startedAt: null }).startedAt).toBeNull()
  })
  it('čeká na korekci a zohledňuje změny odchylky', () => {
    const clock = new ServerClock({ now: () => 10000 })
    expect(() => clock.now()).toThrow()
    clock.update(-5000); expect(clock.now()).toBe(5000)
    clock.update(2000); expect(clock.now()).toBe(12000)
    expect(() => clock.update(NaN)).toThrow()
  })
})
