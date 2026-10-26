import { useEffect, useRef, useState } from 'react'
import { HoldToUnlock, ScreenWake, type WakeState } from '../pwa/wake'
import { registerPwa } from '../pwa/register'

const labels: Record<WakeState,string> = {off:'vypnutý',requesting:'žádám systém',active:'aktivní',lost:'ztracen – displej se může vypnout',denied:'zamítnutý – systém displej neudržuje',unsupported:'nepodporovaný nebo chybí HTTPS'}
const monotonicNow = () => performance.now()
function PocketLock({wake,online,onUnlock,onRetry}:{wake:WakeState;online:boolean;onUnlock:()=>void;onRetry:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const hold = useRef(new HoldToUnlock(monotonicNow))
  const [confirm,setConfirm] = useState(false)
  const [holding,setHolding] = useState(false)
  const cancel = () => {hold.current.cancel();setHolding(false)}
  useEffect(()=>{
    dialog.current?.showModal()
    const reset = () => { hold.current.cancel(); setHolding(false); setConfirm(false) }
    document.addEventListener('visibilitychange',reset); window.addEventListener('blur',reset)
    return ()=>{document.removeEventListener('visibilitychange',reset);window.removeEventListener('blur',reset)}
  },[])
  useEffect(()=>{
    if (!holding) return
    const timer = window.setInterval(()=>{if(hold.current.ready()){hold.current.cancel();setHolding(false);setConfirm(true)}},50)
    return ()=>window.clearInterval(timer)
  },[holding])
  return <dialog className="pocket" ref={dialog} aria-labelledby="pocket-title" onCancel={e=>{e.preventDefault();cancel();setConfirm(false)}}>
    <h2 id="pocket-title">Kapesní zámek</h2>
    <p>Displej: {labels[wake]}</p><p>{online ? 'Síť zařízení dostupná; doručení ověřuje hra.' : 'Zařízení je offline. Nová data nejsou potvrzená.'}</p>
    <p>Systémové zamčení může přerušit GPS. Jas snižte ručně.</p>
    {confirm ? <><p>Odemknout ovládání hry?</p><button autoFocus onClick={()=>setConfirm(false)}>Zůstat zamčeno</button><button onClick={onUnlock}>Potvrdit odemknutí</button>{wake!=='active' && <button onClick={onRetry}>Znovu požádat o Wake Lock</button>}</> : <button className="hold-unlock" aria-label="Podržte dvě sekundy pro odemknutí" onContextMenu={e=>e.preventDefault()}
      onPointerDown={e=>{if(!e.isPrimary || e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);hold.current.start();setHolding(true)}}
      onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onPointerLeave={cancel}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();hold.current.start();setHolding(true)}}}
      onKeyUp={e=>{if(e.key===' '||e.key==='Enter')cancel()}} onBlur={cancel}>{holding ? 'Držte…' : 'Podržet zámeček 2 s'}</button>}
  </dialog>
}
export function Pocket() {
  const [locked,setLocked] = useState(()=>{try{return sessionStorage.getItem('mvhunt-pocket')==='locked'}catch{return false}})
  const [wanted,setWanted] = useState(false)
  const [wake,setWake] = useState<WakeState>('off')
  const [online,setOnline] = useState(navigator.onLine)
  const [pwa,setPwa] = useState('')
  const manager = useRef<ScreenWake|null>(null)
  useEffect(()=>{
    const controller = new ScreenWake(window.isSecureContext && 'wakeLock' in navigator ? ()=>navigator.wakeLock.request('screen') : undefined,()=>document.visibilityState==='visible',setWake)
    manager.current = controller
    const resume = ()=>controller.resume()
    document.addEventListener('visibilitychange',resume); window.addEventListener('pageshow',resume)
    return ()=>{controller.disable();manager.current=null;document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume)}
  },[])
  useEffect(()=>{if(wanted||locked)manager.current?.enable();else manager.current?.disable()},[wanted,locked])
  useEffect(()=>{
    const update = ()=>setOnline(navigator.onLine)
    window.addEventListener('online',update);window.addEventListener('offline',update)
    let disposed=false,cleanup=()=>{}
    void registerPwa(text=>{if(!disposed)setPwa(text)}).then(fn=>{if(disposed)fn();else cleanup=fn})
    return ()=>{disposed=true;cleanup();window.removeEventListener('online',update);window.removeEventListener('offline',update)}
  },[])
  function lock(value:boolean) {try{sessionStorage.setItem('mvhunt-pocket',value?'locked':'unlocked')}catch{/* Bez úložiště zámek platí do reloadu. */}setLocked(value)}
  return <section aria-label="PWA a kapesní režim">
    <h2>Telefon a kapesní režim</h2>
    <p role="status">{pwa}</p>
    {!online && <p role="alert">Offline – zobrazují se poslední načtené údaje. Čerstvost bodů a skutečné spojení ukazuje hra. Nové akce vyžadují potvrzení serveru.</p>}
    <p>Instalace: Android / Chrome → nabídka → Instalovat aplikaci. iPhone / Safari → Sdílet → Přidat na plochu. Nabídka závisí na podpoře zařízení.</p>
    <label><input type="checkbox" checked={wanted} onChange={e=>setWanted(e.target.checked)}/>Udržovat displej vzhůru i mimo kapesní zámek</label>
    <p role="status">Screen Wake Lock: {labels[wake]}</p>
    {wanted && wake!=='active' && <button onClick={()=>manager.current?.resume()}>Znovu požádat o Wake Lock</button>}
    <button onClick={()=>lock(true)}>Zapnout kapesní zámek</button>
    <p>Zámek blokuje dotyky hry. Neblokuje vypínací tlačítko ani systémová gesta. Wake Lock je best effort; GPS při systémovém zamčení není zaručená.</p>
    {locked && <PocketLock wake={wake} online={online} onUnlock={()=>lock(false)} onRetry={()=>manager.current?.resume()}/>}
  </section>
}
