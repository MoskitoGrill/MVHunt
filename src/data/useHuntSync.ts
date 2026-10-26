import { useEffect, useRef, useState } from 'react'
import { get, onValue, ref, serverTimestamp, set } from 'firebase/database'
import type { connectFirebase, Point } from './firebase'
import type { Member } from './lobby'
import { gameView, type Game, type GameEvent } from '../game/model'
import { eligiblePoint, latestTrack, type Track } from '../game/tracks'
type Session = Awaited<ReturnType<typeof connectFirebase>>
/** Synchronizace čte jen splatné sloty; nikdy kořen hry ani soukromé body. */
export function useHuntSync({session,gameId,members,settings,startedAt,connected,point,game,events,ended,captured,endedAt}: {session:Session;gameId:string;members:Record<string,Member>;settings:Record<string,number>;startedAt:number;connected:boolean;point:Point|null;game:Game;events:GameEvent[];ended:boolean;captured:boolean;endedAt?:number}) {
  const me = members[session.adapter.uid]
  const [now,setNow] = useState(startedAt)
  const [tracks,setTracks] = useState<Record<string,Track>>({})
  const [allies,setAllies] = useState<Record<string,Track>>({})
  const [status,setStatus] = useState('Žádné potvrzené doručení polohy.')
  const history = useRef<Point[]>([])
  useEffect(() => { if (point) { history.current.push(point); while (history.current.length>120 || (history.current[0] && history.current[0].measuredAt<point.measuredAt-60000)) history.current.shift() } },[point])
  useEffect(() => {
    const timer = window.setInterval(() => { try { setNow(session.clock.now()) } catch { /* Čeká na serverový čas. */ } },1000)
    return () => window.clearInterval(timer)
  },[session])
  useEffect(() => {
    if (me.team!=='hunter' || ended) return
    return onValue(ref(session.db,`games/${gameId}/allies`),s => setAllies(s.val() ?? {}),e => setStatus(`Spoluhráči: ${e.message}`))
  },[session,gameId,me.team,ended])
  useEffect(() => {
    if (!connected) return
    let active = true, running = false
    const done = new Set<string>()
    let lastSent = 0
    const foundAt = new Map<string,number>()
    async function sync() {
      if (running || !active) return
      running = true
      try {
        const time = session.clock.now()
        const point = history.current.at(-1)
        const view = gameView(game,{now:()=>time})
        if (!ended && !captured && view.phase!=='ended' && point && eligiblePoint(point,time,settings.maxAgeMs) && point.measuredAt>lastSent && time-lastSent>=5000 && me.team==='hunter') {
          await set(ref(session.db,`games/${gameId}/allies/${me.playerId}`),{...point,receivedAt:serverTimestamp()})
          lastSent = point.measuredAt
          if (active) setStatus(`Doručení potvrzeno; měření ${new Date(point.measuredAt).toLocaleTimeString('cs')}.`)
        }
        for (const event of events.filter(e => e.at<=time && (!endedAt || e.at<endedAt)).reverse()) {
          if (!active) break
          if (!ended && !captured && me.team==='fugitive' && time<=event.at+settings.lateArrivalMs && view.phase!=='ended') {
            const key = `write:${event.at}`
            const candidate = history.current.filter(p => eligiblePoint(p,event.at,settings.maxAgeMs)).at(-1)
            if (candidate && !done.has(key)) {
              const target = ref(session.db,`games/${gameId}/slots/${event.at}/${me.playerId}`)
              try { await set(target,{...candidate,at:event.at,receivedAt:serverTimestamp()}) }
              catch (error) { if (!(await get(target)).exists()) throw error }
              done.add(key)
              if (active) setStatus(`Odhalení ${new Date(event.at).toLocaleTimeString('cs')}: server potvrdil bod.`)
            }
          }
          for (const player of Object.values(members).filter(m => m.team==='fugitive')) {
            const key = `${event.at}:${player.playerId}`
            if (done.has(key) || (foundAt.get(player.playerId) ?? -1)>event.at) continue
            try {
              const snapshot = await get(ref(session.db,`games/${gameId}/slots/${event.at}/${player.playerId}`))
              if (snapshot.exists()) {
                const next = snapshot.val() as Track
                foundAt.set(player.playerId,event.at)
                if (active) setTracks(old => ({...old,[player.playerId]:latestTrack(old[player.playerId],next)}))
                done.add(key)
              }
            } catch (error) {
              if (!(error instanceof Error) || !/permission.denied/i.test(error.message)) throw error
              // Rules záměrně odmítají i prázdný slot; do konce okna opakujeme.
              if (time>event.at+settings.lateArrivalMs) done.add(key)
            }
          }
        }
      } catch (e) {
        if (active) setStatus(`Synchronizace: ${e instanceof Error ? e.message : String(e)}. Chybějící stopa může znamenat vynechané odhalení; poslední zůstává.`)
      } finally { running = false }
    }
    void sync()
    const resume = () => void sync()
    window.addEventListener('focus',resume); document.addEventListener('visibilitychange',resume)
    const timer = ended ? undefined : window.setInterval(resume,3000)
    return () => { active=false; window.clearInterval(timer); window.removeEventListener('focus',resume); document.removeEventListener('visibilitychange',resume) }
  },[session,gameId,game,events,members,settings,connected,me.team,me.playerId,history,ended,captured,endedAt])
  return {now,tracks,allies,status}
}
