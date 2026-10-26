import { useMemo, useState } from 'react'
import { useHuntSync } from '../data/useHuntSync'
import type { connectFirebase, Point } from '../data/firebase'
import { parseGame } from '../data/firebase'
import type { Member, Round } from '../data/lobby'
import { gameView, schedule } from '../game/model'
import type { Track } from '../game/tracks'
import { GameMap } from '../map/GameMap'
import { gpsLabels, type GpsState } from '../location/stream'
type Session = Awaited<ReturnType<typeof connectFirebase>>
export function Hunt({session,gameId,members,settings,startedAt,connected,point,gps,round,ended,captured}: {session:Session;gameId:string;members:Record<string,Member>;settings:Record<string,number>;startedAt:number;connected:boolean;point:Point|null;gps:GpsState;round:Round;ended:boolean;captured:boolean}) {
  const me = members[session.adapter.uid]
  const game = useMemo(() => parseGame(gameId,{schemaVersion:1,settings,startedAt}),[gameId,settings,startedAt])
  const events = useMemo(() => schedule(game).filter(e => e.kind==='reveal'),[game])
  const [showMap,setShowMap] = useState(false)
  const [preview,setPreview] = useState(false)
  const [hideNames,setHideNames] = useState(false)
  const {now,tracks,allies,status} = useHuntSync({session,gameId,members,settings,startedAt,connected,point,game,events,ended,captured,endedAt:round.endedAt})
  const view = gameView(game,{now:()=>now})
  const label = (id:string) => hideNames ? 'Uprchlík' : Object.values(members).find(m=>m.playerId===id)?.nickname ?? 'Hráč'
  const visible = me.team==='hunter' || preview ? tracks : {}
  const mapPoints = [
    ...(point ? [{id:'me',label:'Moje poloha',point,color:'blue'}] : []),
    ...Object.entries(me.team==='hunter' ? allies : {}).filter(([id])=>id!==me.playerId).map(([id,p])=>({id,label:Object.values(members).find(m=>m.playerId===id)?.nickname ?? 'Lovec',point:p,color:'green'})),
    ...Object.entries(visible).filter(([id])=>me.team==='hunter'||id===me.playerId).map(([id,p])=>({id,label:label(id),point:p,color:'red'})),
  ]
  const describe = (p:Track|Point) => `měřeno ${new Date(p.measuredAt).toLocaleTimeString('cs')}, stáří ${Math.max(0,Math.floor((now-p.measuredAt)/1000))} s, přesnost ±${Math.round(p.accuracy)} m${'receivedAt' in p ? `, doručeno ${new Date(p.receivedAt).toLocaleTimeString('cs')}` : ''}`
  return <section><h2>{me.team==='hunter' ? 'Mapa lovce' : 'Přehled uprchlíka'}</h2>
    <p>Fáze: {ended ? 'ukončeno' : captured ? 'chycen/a' : view.phase} · Lovci {Object.values(members).filter(m=>m.team==='hunter').length} · {ended ? 'Nechycení uprchlíci' : 'Uprchlíci ve hře'} {Object.values(members).filter(m=>m.team==='fugitive' && (!round.captures?.[m.playerId] || round.captures[m.playerId].correctedAt)).length}</p>
    <p>{!ended && view.nextReveal ? `Další odhalení za ${Math.max(0,Math.ceil((view.nextReveal.at-now)/1000))} s` : 'Žádné další odhalení.'}</p>
    <p role="status">GPS: {ended||captured ? 'sledování zastaveno' : gpsLabels[gps]}. {connected ? 'Databáze připojena.' : 'Offline – nová doručení nejsou potvrzená.'}</p>
    {point && point.measuredAt>now && <p>Čas měření je vůči serveru v budoucnosti. Zkontrolujte hodiny zařízení; bod se zatím neodesílá.</p>}
    <p>{point ? describe(point) : 'Vlastní poloha zatím chybí.'} {point && point.accuracy>100 && 'Nepřesná poloha – kruh ukazuje nejistotu; nejde o přesné místo.'}</p>
    <p>{status}</p>
    <details><summary>Nastavení zobrazení</summary><label><input type="checkbox" checked={hideNames} onChange={e=>setHideNames(e.target.checked)} />Skrýt popisky uprchlíků (data tím nejsou anonymizována)</label>{me.team==='fugitive' && <><label><input type="checkbox" checked={showMap} onChange={e=>setShowMap(e.target.checked)} />Zobrazit mapu</label><label><input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)} />Co o mně vidí lovci</label></>}</details>
    {(me.team==='hunter'||showMap) && <GameMap points={mapPoints} />}
    <p>Vynechané odhalení nesmaže poslední stopu. Staré body zůstávají se skutečným časem; offline mapa nemusí mít dlaždice.</p>
    <ul>{Object.entries(visible).filter(([id])=>me.team==='hunter'||id===me.playerId).map(([id,p])=><li key={id}>{label(id)}: {p.lat}, {p.lng}; {describe(p)}; odhalení {new Date(p.at!).toLocaleTimeString('cs')}{view.lastReveal && p.at!<view.lastReveal.at && ' – poslední odhalení vynecháno'}</li>)}</ul>
    {me.team==='hunter' && <ul>{Object.entries(allies).filter(([id])=>id!==me.playerId).map(([id,p])=><li key={id}>Lovec {Object.values(members).find(m=>m.playerId===id)?.nickname}: {p.lat}, {p.lng}; {describe(p)}</li>)}</ul>}
  </section>
}
