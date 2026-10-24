import { useState } from 'react'
import { resolveDataState } from '../data/adapter'
import { MapPlaceholder } from '../map/MapPlaceholder'

export function App() {
  const [demo, setDemo] = useState(false)
  const state = resolveDataState(import.meta.env, demo)
  return <main>
    <h1>MVHunt</h1>
    <p>Základ projektu · E1</p>
    <section aria-labelledby="connection-title" aria-live="polite">
      <h2 id="connection-title">Stav aplikace</h2>
      {state.kind === 'unconfigured' && <>
        <p>Online hra není nakonfigurována. Chybí veřejná konfigurace:</p>
        <ul>{state.missing.map(key => <li key={key}><code>{key}</code></li>)}</ul>
        <p>Skutečný datový adaptér bude implementován v E3.</p>
      </>}
      {state.kind === 'unavailable' && <p>Konfigurace je vyplněná, ale skutečný datový adaptér ještě není implementován (E3). Připojení nebylo navázáno.</p>}
      {state.kind === 'invalid-mode' && <p>Neplatný VITE_DATA_MODE: {state.value}. Použijte production nebo demo.</p>}
      {state.kind === 'demo' && <>
        <p><strong>DEMONSTRACE – pouze místní ukázka, bez připojení a bez hráčů.</strong></p>
        <p>ID ukázky: <code>{state.snapshot.gameId}</code></p>
        <MapPlaceholder />
      </>}
    </section>
    {state.kind !== 'demo' && <button onClick={() => setDemo(true)}>Otevřít místní demonstraci</button>}
    {demo && <button onClick={() => setDemo(false)}>Zavřít demonstraci</button>}
    <p>Herní pravidla, GPS a sdílení polohy zatím nejsou implementované.</p>
  </main>
}
