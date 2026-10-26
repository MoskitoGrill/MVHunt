import { useCallback, useEffect, useRef, useState } from 'react'
import { goOffline, onValue, ref } from 'firebase/database'
import { connectFirebase } from '../data/firebase'
import { Lobby } from './Lobby'

export function Connection() {
  const connectionKey = `mvhunt-connect:${import.meta.env.VITE_FIREBASE_PROJECT_ID}`
  const [resume] = useState(() => { try { return localStorage.getItem(connectionKey) === 'true' } catch { return false } })
  const attempted = useRef(false)
  const [session, setSession] = useState<Awaited<ReturnType<typeof connectFirebase>> | null>(null)
  const [status, setStatus] = useState('Připojení nebylo navázáno.')
  const [connected, setConnected] = useState(false)
  const [gameId, setGameId] = useState('')
  const [snapshot, setSnapshot] = useState('')
  useEffect(() => {
    if (!session) return
    const stop = onValue(ref(session.db, '.info/connected'), s => setConnected(s.val() === true))
    return () => { stop(); session.stopClock(); goOffline(session.db) }
  }, [session])
  const connect = useCallback(async () => {
    setStatus('Připojuji…')
    try {
      const env = import.meta.env
      const result = await connectFirebase({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID, databaseURL: env.VITE_FIREBASE_DATABASE_URL, appId: env.VITE_FIREBASE_APP_ID }, env.VITE_USE_EMULATORS === 'true')
      try { localStorage.setItem(connectionKey,'true') } catch { /* Auth persistence má vlastní diagnostiku. */ }
      setSession(result); setStatus('Identita připravena.')
    } catch (e) { setStatus(`Chyba připojení: ${e instanceof Error ? e.message : String(e)}`) }
  },[connectionKey])
  useEffect(() => {
    if (resume && !attempted.current) { attempted.current = true; void Promise.resolve().then(connect) }
  },[resume,connect])
  return <section>
    <p>{status}</p>
    {!session && <button disabled={status === 'Připojuji…'} onClick={() => void connect()}>Připojit vlastní Firebase</button>}
    {session && <>
      <p>Identita: <code>{session.adapter.uid}</code>. {connected ? 'Databáze připojena.' : 'Bez spojení – zápisy nejsou potvrzené.'}</p>
      <label>ID hry pro diagnostiku <input value={gameId} onChange={e => setGameId(e.target.value)} /></label>
      <button onClick={() => void session.adapter.readGame(gameId).then(g => setSnapshot(JSON.stringify(g))).catch(e => setSnapshot(`Načtení selhalo: ${e.message}`))}>Načíst potvrzený stav</button>
      <p>{snapshot}</p>
      <Lobby session={session} connected={connected} />
    </>}
  </section>
}
