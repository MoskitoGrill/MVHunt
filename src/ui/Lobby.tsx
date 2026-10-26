import { useEffect, useMemo, useRef, useState } from 'react'
import { createPositionStream, gpsLabels, type GpsState } from '../location/stream'
import type { Point } from '../data/firebase'
import { Hunt } from './Hunt'
import { get, onDisconnect, onValue, ref, serverTimestamp, set } from 'firebase/database'
import type { connectFirebase } from '../data/firebase'
import { lobbyCommand, type Member, type JoinRequest, type Round } from '../data/lobby'
import { RoundControls } from './RoundControls'

type Session = Awaited<ReturnType<typeof connectFirebase>>
const initial = { headStartMs:600000, huntIntervalMs:300000, huntDurationMs:3600000, headIntervalMs:300000, maxAgeMs:30000, lateArrivalMs:10000 }
export function Lobby({ session, connected }: { session: Session; connected: boolean }) {
  const [gameId,setGameId] = useState(() => { try { return localStorage.getItem(`mvhunt-game:${session.adapter.uid}`) ?? '' } catch { return '' } })
  const [nickname,setNickname] = useState('')
  const [team,setTeam] = useState('hunter')
  const [target,setTarget] = useState('')
  const [members,setMembers] = useState<Record<string,Member>>({})
  const [requests,setRequests] = useState<Record<string,JoinRequest>>({})
  const [settings,setSettings] = useState(initial)
  const [policyConfirmed,setPolicyConfirmed] = useState(false)
  const [startedAt,setStartedAt] = useState<number | null>(null)
  const [round,setRound] = useState<Round>({})
  const [now,setNow] = useState(0)
  const currentGame = useRef(gameId)
  useEffect(()=>{currentGame.current=gameId},[gameId])
  const [status,setStatus] = useState('')
  const [busy,setBusy] = useState(false)
  const [secret,setSecret] = useState('')
  const [recovery,setRecovery] = useState('')
  const [audit,setAudit] = useState('')
  const me = members[session.adapter.uid]
  const isMember = !!me
  const ended = !!round.endedAt || (!!startedAt && now>=startedAt+settings.headStartMs+settings.huntDurationMs)
  const captured = !!me && !!round.captures?.[me.playerId] && !round.captures[me.playerId].correctedAt
  const manager = me?.role === 'host' || me?.role === 'deputy'
  const stream = useMemo(() => createPositionStream(navigator.geolocation),[])
  const [point,setPoint] = useState<Point|null>(null)
  const [gps,setGps] = useState<GpsState>('waiting')
  const [gpsEnabled,setGpsEnabled] = useState(false)
  const [gpsAttempt,setGpsAttempt] = useState(0)
  useEffect(() => {
    if (!isMember || !gpsEnabled || ended || captured) return
    return stream.subscribe((p,s) => { setPoint(p); setGps(s) })
  },[stream,isMember,gpsEnabled,gpsAttempt,ended,captured])
  useEffect(()=>{
    const tick=()=>{try {setNow(session.clock.now())} catch { /* Čeká na čas. */ }}
    tick(); const timer=window.setInterval(tick,1000)
    window.addEventListener('focus',tick); document.addEventListener('visibilitychange',tick)
    return ()=>{window.clearInterval(timer); window.removeEventListener('focus',tick); document.removeEventListener('visibilitychange',tick)}
  },[session])
  useEffect(()=>{
    if (!isMember) return
    let active=true
    const path=ref(session.db,`games/${gameId}/round`)
    const stop=onValue(path,s=>{if(active)setRound(s.val() ?? {})},e=>{if(active)setStatus(e.message)})
    const refresh=()=>{if(connected)void get(path).then(s=>{if(active)setRound(s.val() ?? {})}).catch(()=>{})}
    window.addEventListener('focus',refresh); document.addEventListener('visibilitychange',refresh)
    return ()=>{active=false; stop(); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh)}
  },[session,gameId,isMember,connected])
  useEffect(()=>{
    if (!connected || !isMember || !ended || round.endedAt) return
    let active=true
    const sync=()=>void lobbyCommand(session.auth,'sync-round',{gameId}).catch(e=>{if(active)setStatus(e.message)})
    sync(); const timer=window.setInterval(sync,15000)
    return ()=>{active=false; window.clearInterval(timer)}
  },[session,gameId,connected,isMember,ended,round.endedAt])
  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(gameId)) return
    try { localStorage.setItem(`mvhunt-game:${session.adapter.uid}`,gameId) } catch { /* ID lze vložit ručně; identitu stále ověřuje Auth. */ }
    let active = true
    const stops = [
      onValue(ref(session.db,`games/${gameId}/members`),s => {if(active){setMembers(old => JSON.stringify(old) === JSON.stringify(s.val() ?? {}) ? old : s.val() ?? {});if(s.child(session.adapter.uid).exists())setStatus(old=>old.startsWith('Členství není') ? '' : old)}},() => { if(active){setMembers({}); setStatus('Členství není potvrzené. Odešlete žádost, nebo vyčkejte schválení.')} }),
      onValue(ref(session.db,`games/${gameId}/requests/${session.adapter.uid}`),s => { if (active && s.exists()) setStatus('Žádost čeká na schválení vedoucím.') },() => {}),
    ]
    // Po schválení nového UID zamítnutý members odběr znovu otevřeme.
    const timer = window.setInterval(() => {
      void get(ref(session.db,`games/${gameId}/members`)).then(s => { if (active) setMembers(old => JSON.stringify(old) === JSON.stringify(s.val() ?? {}) ? old : s.val() ?? {}) }).catch(() => { if (active) setMembers({}) })
    },5000)
    return () => { active = false; window.clearInterval(timer); stops.forEach(stop => stop()) }
  },[gameId,session])
  useEffect(() => {
    if (!isMember) return
    let active=true
    const error = (e: Error) => {if(active)setStatus(e.message)}
    const stops = [onValue(ref(session.db,`games/${gameId}/settings`),s => {if(active)setSettings(s.val())},error),
      onValue(ref(session.db,`games/${gameId}/startedAt`),s => {if(active)setStartedAt(s.val())},error)]
    if (manager) {
      stops.push(onValue(ref(session.db,`games/${gameId}/requests`),s => {if(active)setRequests(s.val() ?? {})},error))
      stops.push(onValue(ref(session.db,`games/${gameId}/audit`),s => {if(active)setAudit(JSON.stringify(s.val() ?? {}))},error))
    }
    return () => {active=false;stops.forEach(stop => stop())}
  },[gameId,isMember,manager,session])
  useEffect(() => {
    if (!isMember || !connected) return
    const presence = ref(session.db,`games/${gameId}/presence/${session.adapter.uid}`)
    let cancelled = false
    const heartbeat = () => void set(presence,{ online:true,at:serverTimestamp() }).catch(e => {if(!cancelled)setStatus(e.message)})
    void onDisconnect(presence).set({ online:false,at:serverTimestamp() }).then(() => { if (!cancelled) heartbeat() }).catch(e => {if(!cancelled)setStatus(e.message)})
    const timer = window.setInterval(heartbeat,10000)
    return () => { cancelled = true; window.clearInterval(timer); void set(presence,{ online:false,at:serverTimestamp() }).catch(() => {}); void onDisconnect(presence).cancel() }
  },[gameId,isMember,connected,session])
  async function command(action: string, extra: Record<string,unknown> = {}) {
    if (!connected || busy) return
    if (['create','settings'].includes(action) && !policyConfirmed) { setStatus('Potvrďte výslovně zvolené testovací GPS hodnoty. E5 je musí uzavřít pro terénní provoz.'); return }
    setBusy(true); setStatus('Čekám na potvrzení serverem…')
    try {
      const result = await lobbyCommand(session.auth,action,{ gameId,nickname,team,settings,...extra })
      if (currentGame.current!==gameId) return
      if (result.gameId!==gameId) {setMembers({});setStartedAt(null);setRound({});setPoint(null);setGpsEnabled(false);setSecret('');setRequests({});setAudit('')}
      setGameId(result.gameId)
      if (result.code) setSecret(result.code)
      if (action === 'rotate' && extra.revoke) setSecret('')
      if (action === 'recover') setRecovery('')
      setStatus('Server operaci potvrdil.')
    } catch (e) { if(currentGame.current===gameId)setStatus(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  async function ready() {
    setGpsEnabled(true)
    if (!point || session.clock.now()-point.measuredAt>30000 || gps!=='active') { setStatus('GPS se zapíná. Po čerstvém měření potvrďte připravenost znovu.'); return }
    try {
      await command('ready',{ measuredAt:point.measuredAt })
    } catch (e) { setStatus(`GPS: ${e instanceof Error ? e.message : 'měření není dostupné'}`) }
  }
  const settingsFields = <>
    <p>GPS okna 30/10 s jsou dosavadní testovací návrh, nikoli schválené terénní hodnoty. Pro tuto hru je zvolte výslovně.</p>
    {Object.entries(settings).map(([k,v]) => <label key={k}>{({headStartMs:'Předstih',huntIntervalMs:'Interval lovu',huntDurationMs:'Délka lovu',headIntervalMs:'Interval předstihu (0 = vypnuto)',maxAgeMs:'Maximální stáří GPS – návrh E5',lateArrivalMs:'Pozdní doručení – návrh E5'} as Record<string,string>)[k]} <input type="number" value={v/1000} onChange={e => { setPolicyConfirmed(false); setSettings({ ...settings,[k]:Number(e.target.value)*1000 }) }} /></label>)}
    <button onClick={() => setSettings({ ...settings,headIntervalMs:settings.huntIntervalMs })}>Nastavit interval předstihu stejně jako lov</button>
    <label><input type="checkbox" checked={policyConfirmed} onChange={e => setPolicyConfirmed(e.target.checked)} />Pro tuto testovací hru výslovně volím uvedená GPS okna.</label>
  </>
  return <section>
    <h2>Čekárna a správa hry</h2>
    <p role="status">{status}</p>
    {me && !ended && !captured && <button onClick={() => { setGpsEnabled(true); setGpsAttempt(a=>a+1) }}>Zapnout / obnovit GPS</button>}
    {me && startedAt && <><RoundControls key={`round:${gameId}:${me.playerId}`} session={session} gameId={gameId} members={members} round={round} ended={ended} connected={connected}/><Hunt key={`${gameId}:${me.playerId}`} session={session} gameId={gameId} members={members} settings={settings} startedAt={startedAt} connected={connected} point={ended||captured ? null : point} gps={gps} round={round} ended={ended} captured={captured} /></>}
    <details open={!startedAt}><summary>Čekárna a ovládání správy</summary>
    <fieldset disabled={busy || !connected}>
      <label>Přezdívka <input maxLength={32} value={nickname} onChange={e => setNickname(e.target.value)} /></label>
      <label>Herní role <select value={team} onChange={e => setTeam(e.target.value)}><option value="hunter">Lovec</option><option value="fugitive">Uprchlík</option></select></label>
      {!me && <fieldset><legend>Nastavení nové hry (sekundy)</legend>{settingsFields}</fieldset>}
      {me && ended && <><p>Další kolo převezme uvedené nastavení; hráči požádají o vstup do nového ID. Předchozí výsledky zůstanou pod původním ID.</p><label><input type="checkbox" checked={policyConfirmed} onChange={e=>setPolicyConfirmed(e.target.checked)}/>Pro další testovací kolo potvrzuji stejná GPS okna.</label></>}
      <button onClick={() => void command('create',{nickname:nickname||me?.nickname,team:me?.team ?? team})}>{ended ? 'Založit další kolo (nová hra)' : 'Založit novou hru'}</button>
      <label>ID aktuální hry <input value={gameId} onChange={e => { setMembers({}); setStartedAt(null); setRound({}); setPoint(null); setGpsEnabled(false); setSecret(''); setGameId(e.target.value) }} /></label>
      {!me && <>
        <label>UID původního hráče při změně zařízení (jinak prázdné) <input value={target} onChange={e => setTarget(e.target.value)} /></label>
        <button onClick={() => void command('request',{ target })}>Požádat o vstup / obnovu hráče</button>
        <label>Obnovovací kód vedoucího <input type="password" autoComplete="off" value={recovery} onChange={e => setRecovery(e.target.value)} /></label>
        <button onClick={() => void command('recover',{ code:recovery })}>Obnovit vedoucího na tomto zařízení</button>
      </>}
      {me && <>
        <p>Vaše postava: {me.nickname} · {me.playerId}. {startedAt ? `Společný start: ${new Date(startedAt).toLocaleString('cs')}` : 'Čeká se na start.'}</p>
        <p>GPS: {gpsLabels[gps]}; {point ? `přesnost ±${Math.round(point.accuracy)} m` : 'zatím bez měření'}. Připravenost platí 30 sekund.</p>
        {!startedAt && <><button onClick={() => void ready()}>Povolit GPS a potvrdit připravenost</button><button onClick={() => void command('ready',{ ready:false })}>Zrušit připravenost</button></>}
        <ul>{Object.entries(members).map(([uid,m]) => <li key={uid}>
          {m.nickname} · {m.team} · {m.role} · připravenost: {m.readyAt ? new Date(m.readyAt).toLocaleTimeString('cs') : 'nepotvrzena'} <code>{uid}</code>
          {manager && !startedAt && <>
            <button onClick={() => void command('role',{ uid,team:m.team === 'hunter' ? 'fugitive' : 'hunter' })}>Změnit tým hráče {m.nickname}</button>
            {me.role === 'host' && m.role !== 'host' && <button onClick={() => void command('role',{ uid,deputy:m.role !== 'deputy' })}>{m.role === 'deputy' ? 'Odvolat zástupce' : 'Jmenovat zástupce'} {m.nickname}</button>}
          </>}
        </li>)}</ul>
        {manager && <>
          <fieldset disabled={!!startedAt}>
            <legend>Nastavení (doby v sekundách)</legend>
            {settingsFields}
            <button onClick={() => void command('settings')}>Uložit nastavení a zrušit připravenost všech</button>
            <button onClick={() => { if (window.confirm('Zahájit společnou hru pro všechny připravené hráče?')) void command('start') }}>Potvrdit společný start</button>
          </fieldset>
          <h3>Žádosti – identitu ověřte osobně</h3>
          {Object.entries(requests).map(([uid,r]) => <p key={uid}>{r.nickname} · {uid} · {r.target ? `převzít UID ${r.target}` : 'nový hráč'} <button onClick={() => void command('approve',{ uid })}>Schválit {r.nickname}</button><button onClick={() => void command('reject',{ uid })}>Odmítnout {r.nickname}</button></p>)}
          <details><summary>Audit správy</summary><pre>{audit}</pre></details>
        </>}
        {me.role === 'host' && <><button onClick={() => void command('rotate')}>Vydat nový obnovovací kód</button><button onClick={() => void command('rotate',{ revoke:true })}>Odvolat obnovovací kód</button></>}
      </>}
    </fieldset>
    </details>
    {secret && <aside><p>Uložte obnovovací kód soukromě. Ukazuje se pouze nyní; po použití se zneplatní.</p><code>{secret}</code><button onClick={() => setSecret('')}>Skrýt kód</button></aside>}
  </section>
}
