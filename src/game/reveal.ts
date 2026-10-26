import type { PositionMeasurement } from '../location/types'
import type { GameEvent } from './model'

/** Návrh kontraktu E3/E5. receivedAt přiděluje služba, measuredAt tvrdí zařízení. */
export interface RevealCandidate {
  gameId: string
  playerId: string
  slotId: string
  receivedAt: number
  measurement: PositionMeasurement
}

/** Bez schválených implicitních hodnot; testovací návrh je 30 s / 10 s. */
export interface RevealPolicy { maxAgeMs: number; lateArrivalMs: number }

export function candidateFitsSlot(candidate: RevealCandidate, slot: GameEvent, gameId: string, policy: RevealPolicy): boolean {
  const { measurement: point, receivedAt } = candidate
  return slot.kind === 'reveal' && candidate.slotId === slot.id && candidate.gameId === gameId &&
    candidate.playerId.trim().length > 0 &&
    [policy.maxAgeMs, policy.lateArrivalMs, point.measuredAt, receivedAt, slot.at].every(value => Number.isSafeInteger(value) && value >= 0) &&
    Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 &&
    Number.isFinite(point.accuracy) && point.accuracy >= 0 &&
    point.measuredAt <= slot.at && point.measuredAt >= slot.at - policy.maxAgeMs &&
    receivedAt >= point.measuredAt && receivedAt <= slot.at + policy.lateArrivalMs
}
