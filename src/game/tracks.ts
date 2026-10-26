import type { Point } from '../data/firebase'
export interface Track extends Point { receivedAt: number; at?: number }
export function latestTrack(previous: Track | undefined, next: Track): Track {
  return !previous || (next.at ?? next.measuredAt) > (previous.at ?? previous.measuredAt) ? next : previous
}
export function eligiblePoint(point: Point | null, at: number, maxAgeMs: number) {
  return point !== null && point.measuredAt <= at && point.measuredAt >= at-maxAgeMs
}
