import { describe, expect, it, vi } from 'vitest'
import { createPositionStream } from './stream'
import { eligiblePoint, latestTrack } from '../game/tracks'
describe('GPS proud a poslední stopa – simulované měření', () => {
  it('dva odběratelé mají jeden watch, chyba nemaže poslední měření a poslední odchod uklidí GPS', () => {
    let success!: PositionCallback, failure!: PositionErrorCallback
    const gps = { watchPosition:vi.fn((ok:PositionCallback,err:PositionErrorCallback) => {success=ok;failure=err;return 42}),clearWatch:vi.fn() } as unknown as Geolocation
    const stream=createPositionStream(gps), a=vi.fn(), b=vi.fn()
    const stopA=stream.subscribe(a), stopB=stream.subscribe(b)
    expect(gps.watchPosition).toHaveBeenCalledTimes(1)
    success({timestamp:1000,coords:{latitude:50,longitude:14,accuracy:150}} as GeolocationPosition)
    failure({code:1} as GeolocationPositionError)
    expect(b).toHaveBeenLastCalledWith({lat:50,lng:14,accuracy:150,measuredAt:1000},'denied')
    stopA(); expect(gps.clearWatch).not.toHaveBeenCalled()
    stopB(); expect(gps.clearWatch).toHaveBeenCalledWith(42)
  })
  it('timeout, nepodporovaná GPS a opožděný callback nepřeznačí čas', () => {
    let success!: PositionCallback, failure!: PositionErrorCallback
    const gps={watchPosition:(ok:PositionCallback,err:PositionErrorCallback)=>{success=ok;failure=err;return 1},clearWatch:vi.fn()} as unknown as Geolocation
    const cb=vi.fn(), stop=createPositionStream(gps).subscribe(cb)
    success({timestamp:2000,coords:{latitude:50,longitude:14,accuracy:5}} as GeolocationPosition)
    success({timestamp:1000,coords:{latitude:51,longitude:15,accuracy:10}} as GeolocationPosition)
    expect(cb.mock.lastCall?.[0].measuredAt).toBe(2000)
    failure({code:3} as GeolocationPositionError); expect(cb.mock.lastCall?.[1]).toBe('timeout')
    stop()
    createPositionStream(undefined).subscribe(cb)(); expect(cb).toHaveBeenLastCalledWith(null,'unavailable')
  })
  it('vynechání a pozdní odpověď nevrátí stopu zpět; čas měření a doručení zůstává původní', () => {
    const old={lat:50,lng:14,accuracy:10,measuredAt:1000,receivedAt:2100,at:2000}
    const next={...old,measuredAt:3000,receivedAt:4100,at:4000}
    expect(latestTrack(next,old)).toBe(next)
    expect(latestTrack(old,next)).toEqual(next)
    expect(eligiblePoint(old,31000,30000)).toBe(true)
    expect(eligiblePoint(old,31001,30000)).toBe(false)
    expect(eligiblePoint(next,2000,30000)).toBe(false)
    expect(eligiblePoint(null,2000,30000)).toBe(false)
  })
})
