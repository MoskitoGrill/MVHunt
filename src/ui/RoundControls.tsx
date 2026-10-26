import { useEffect, useRef, useState } from 'react'
import { lobbyCommand, type Member, type Round } from '../data/lobby'
import type { connectFirebase } from '../data/firebase'
type Session = Awaited<ReturnType<typeof connectFirebase>>
function ConfirmRoundAction({action,onConfirm,onCancel}:{action:string;onConfirm:()=>void;onCancel:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal()},[])
  return <dialog ref={dialog} onCancel={onCancel} aria-labelledby="round-confirm-title"><h3 id="round-confirm-title">Potvrzení akce</h3>
    <p>{action==='capture' ? 'Potvrdit chycení? Přestanete sdílet polohu.' : action==='end-round' ? 'Ukončit hru pro všechny?' : 'Opravit chycení jako omyl? Ukončená hra se znovu neotevře.'}</p>
    <button autoFocus onClick={onCancel}>Zrušit</button><button onClick={onConfirm}>Potvrdit akci</button>
  </dialog>
}
export function RoundControls({session,gameId,members,round,ended,connected}:{session:Session;gameId:string;members:Record<string,Member>;round:Round;ended:boolean;connected:boolean}) {
  const me = members[session.adapter.uid]
  const manager = ['host','deputy'].includes(me.role)
  const [status,setStatus] = useState('')
  const [busy,setBusy] = useState(false)
  const [proposal,setProposal]=useState<Record<string,unknown>|null>(null)
  const lock = useRef(false)
  const alive = useRef(true)
  useEffect(()=>{ alive.current=true; return ()=>{alive.current=false} },[])
  // Odpojený požadavek může být potvrzen serverem. Opakování používá stejné ID.
  const storageKey = `mvhunt-action:${gameId}:${session.adapter.uid}`
  const [pending,setPending] = useState<Record<string,unknown>|null>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') } catch { return null }
  })
  async function send(body:Record<string,unknown>) {
    if (lock.current || !connected) return
    lock.current = true; setBusy(true)
    setPending(body)
    try { sessionStorage.setItem(storageKey,JSON.stringify(body)) } catch { /* Retry zůstává v paměti. */ }
    setStatus('Čekám na potvrzení serverem…')
    try {
      await lobbyCommand(session.auth,String(body.action),{...body,gameId})
      try { sessionStorage.removeItem(storageKey) } catch { /* Není dostupné úložiště. */ }
      if (alive.current) { setPending(null); setStatus('Server operaci potvrdil.') }
    } catch (e) { if (alive.current) setStatus(`${e instanceof Error ? e.message : String(e)} Výsledek může být nejistý; obnovte stav nebo opakujte stejnou akci.`) }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  function action(action:string,playerId:string,captureId?:string) {
    setProposal({action,playerId,...(captureId ? {captureId} : {}),operationId:crypto.randomUUID()})
  }
  return <section><h3>{ended ? 'Výsledky kola' : 'Chycení a konec'}</h3>
    {proposal && <ConfirmRoundAction action={String(proposal.action)} onCancel={()=>setProposal(null)} onConfirm={()=>{setProposal(null);void send(proposal)}}/>}
    <p>Vlastní chycení lze opravit do konce hry. Vedoucí může opravit výsledek i po konci; hra zůstane ukončená.</p>
    {round.endedAt && <p>Konec {new Date(round.endedAt).toLocaleString('cs')} · {({manager:'ukončeno vedoucím','all-captured':'všichni chyceni','time-limit':'časový limit'} as Record<string,string>)[round.reason ?? '']}</p>}
    <fieldset disabled={!connected||busy||!!pending}>
      {me.team==='fugitive' && !ended && !round.captures?.[me.playerId]?.at && <button onClick={()=>action('capture',me.playerId)}>Byl/a jsem chycen/a</button>}
      {me.team==='fugitive' && !ended && round.captures?.[me.playerId]?.correctedAt && <button onClick={()=>action('capture',me.playerId)}>Znovu potvrdit chycení</button>}
      {manager && !ended && <button onClick={()=>action('end-round',me.playerId)}>Ukončit hru</button>}
      <ul>{Object.values(members).filter(m=>m.team==='fugitive').map(m=>{
        const c = round.captures?.[m.playerId]
        return <li key={m.playerId}>{m.nickname}: {c && !c.correctedAt ? `chycen/a ${new Date(c.at).toLocaleTimeString('cs')}` : c?.correctedAt ? 'chycení opraveno' : ended ? 'nechycen/a' : 've hře'}
          {c && !c.correctedAt && (manager || (!ended && m.playerId===me.playerId)) && <button onClick={()=>action('correct-capture',m.playerId,c.operationId)}>Opravit chycení: {m.nickname}</button>}
        </li>
      })}</ul>
    </fieldset>
    <p role="status">{status}{!connected && ' Offline – akce nejsou potvrzené a nové se neodesílají.'}</p>
    {pending && <><button disabled={!connected||busy} onClick={()=>void send(pending)}>Ověřit / opakovat nedokončenou akci</button><button disabled={busy} onClick={()=>{setPending(null); try {sessionStorage.removeItem(storageKey)} catch { /* Úložiště není dostupné. */ }}}>Zavřít nejistou akci a posoudit aktuální stav</button></>}
    {ended && <p>Další kolo založte jako novou hru v ovládání správy. Toto ID a výsledky zůstávají zachované.</p>}
  </section>
}
