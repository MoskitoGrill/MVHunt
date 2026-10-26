import { expect, it } from 'vitest'
import { candidateFitsSlot, type RevealCandidate } from './reveal'
import type { GameEvent } from './model'

const slot: GameEvent = { id: 'g:reveal:60000', kind: 'reveal', at: 60_000 }
const policy = { maxAgeMs: 30_000, lateArrivalMs: 10_000 }
const candidate: RevealCandidate = { gameId: 'g', playerId: 'p', slotId: slot.id, receivedAt: 60_000, measurement: { latitude: 0, longitude: 0, accuracy: 10, measuredAt: 60_000 } }

it('návrh okna: krajní stáří a doručení přijme beze změny skutečného času měření', () => {
  const old = { ...candidate, receivedAt: 70_000, measurement: { ...candidate.measurement, measuredAt: 30_000 } }
  expect(candidateFitsSlot(old, slot, 'g', policy)).toBe(true)
  expect(old.measurement.measuredAt).toBe(30_000)
})
it.each([29_999, 60_001, NaN])('odmítne staré, budoucí nebo neplatné měření %s', measuredAt => {
  expect(candidateFitsSlot({ ...candidate, measurement: { ...candidate.measurement, measuredAt } }, slot, 'g', policy)).toBe(false)
})
it.each([70_001, 59_999, NaN])('odmítne pozdní nebo nemožné přijetí %s', receivedAt => {
  expect(candidateFitsSlot({ ...candidate, receivedAt }, slot, 'g', policy)).toBe(false)
})
it('váže bod na hru, hráče a slot; odmítne nesmyslnou GPS a politiku', () => {
  for (const patch of [{ gameId: 'other' }, { playerId: '' }, { slotId: 'other' }]) {
    expect(candidateFitsSlot({ ...candidate, ...patch }, slot, 'g', policy)).toBe(false)
  }
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { accuracy: -1 }, { accuracy: Infinity }]) {
    expect(candidateFitsSlot({ ...candidate, measurement: { ...candidate.measurement, ...patch } }, slot, 'g', policy)).toBe(false)
  }
  expect(candidateFitsSlot(candidate, { ...slot, kind: 'end' }, 'g', policy)).toBe(false)
  expect(candidateFitsSlot(candidate, slot, 'g', { ...policy, maxAgeMs: -1 })).toBe(false)
})
