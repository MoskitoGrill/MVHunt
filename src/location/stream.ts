import type { Point } from '../data/firebase'

export type GpsState = 'waiting' | 'active' | 'denied' | 'timeout' | 'unavailable'
export const gpsLabels: Record<GpsState,string> = {
  waiting:'čeká na měření',active:'měří',denied:'oprávnění zamítnuto – povolte GPS v nastavení prohlížeče a obnovte měření',
  timeout:'vypršel čas měření',unavailable:'poloha není dostupná; vyžaduje HTTPS a podporu GPS',
}
/** Jediný vlastník watchPosition; všichni odběratelé používají tentýž proud. */
export function createPositionStream(gps: Geolocation | undefined) {
  let watch: number | undefined
  let point: Point | null = null
  let state: GpsState = 'waiting'
  const listeners = new Set<(p: Point | null, s: GpsState) => void>()
  const notify = () => listeners.forEach(fn => fn(point, state))
  return {
    subscribe(fn: (p: Point | null, s: GpsState) => void) {
      listeners.add(fn)
      fn(point, state)
      if (watch === undefined && gps) watch = gps.watchPosition(p => {
        const next = { lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy, measuredAt:Math.round(p.timestamp) }
        if (![next.lat,next.lng,next.accuracy,next.measuredAt].every(Number.isFinite) || Math.abs(next.lat)>90 || Math.abs(next.lng)>180 || next.accuracy<0) return
        if (!point || next.measuredAt >= point.measuredAt) point = next
        state = 'active'; notify()
      }, e => { state = e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable'; notify() }, { enableHighAccuracy:true, maximumAge:0, timeout:15000 })
      if (!gps) { state = 'unavailable'; notify() }
      return () => {
        listeners.delete(fn)
        if (!listeners.size) {
          if (watch !== undefined) gps?.clearWatch(watch)
          watch = undefined; point = null; state = 'waiting'
        }
      }
    },
  }
}
