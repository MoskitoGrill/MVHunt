import { useState } from 'react'
import { resolveDataState } from '../data/adapter'
import { MapPlaceholder } from '../map/MapPlaceholder'
import { Simulation } from './Simulation'
import { Connection } from './Connection'
import { Pocket } from './Pocket'

export function App() {
  const [demo, setDemo] = useState(false)
  const state = resolveDataState(import.meta.env, demo)
  return <main>
    <h1>MVHunt</h1>
    <p>PWA a kapesní režim · E7</p>
    <Pocket />
    <section aria-labelledby="connection-title" aria-live="polite">
      <h2 id="connection-title">Stav aplikace</h2>
      {state.kind === 'unconfigured' && <>
        <p>Online hra není nakonfigurována. Chybí veřejná konfigurace:</p>
        <ul>{state.missing.map(key => <li key={key}><code>{key}</code></li>)}</ul>
        <p>Připojení vyžaduje vlastní projekt nebo místní emulátory.</p>
      </>}
      {state.kind === 'configured' && <Connection />}
      {state.kind === 'invalid-mode' && <p>Neplatný VITE_DATA_MODE: {state.value}. Použijte production nebo demo.</p>}
      {state.kind === 'demo' && <>
        <p><strong>DEMONSTRACE – pouze místní ukázka, bez připojení a bez hráčů.</strong></p>
        <p>ID ukázky: <code>{state.snapshot.gameId}</code></p>
        <MapPlaceholder />
        <Simulation />
      </>}
    </section>
    {state.kind !== 'demo' && <button onClick={() => setDemo(true)}>Otevřít místní demonstraci</button>}
    {demo && <button onClick={() => setDemo(false)}>Zavřít demonstraci</button>}
    <p>Hra používá vlastní Firebase a důvěryhodné API. Fyzická GPS přes HTTPS zatím čeká na ověření.</p>
  </main>
}
