import { useState } from 'react'
import { createGame, gameView, schedule, startGame, validateSettings, type GameSettings } from '../game/model'

const minute = 60_000
const origin = 1_800_000_000_000
const initial: GameSettings = { headStartMs: 10 * minute, huntIntervalMs: 5 * minute, huntDurationMs: 20 * minute, headReveals: { mode: 'same' } }
const phases = { lobby: 'Čekárna', scheduled: 'Čekání na potvrzený čas startu', 'head-start': 'Předstih', hunt: 'Lov', ended: 'Ukončeno' }
const kinds = { start: 'Start', release: 'Vypuštění lovců', reveal: 'Odhalení', end: 'Časový konec' }

export function Simulation() {
  const [settings, setSettings] = useState(initial)
  const [game, setGame] = useState(() => createGame('simulation-local', initial))
  const [now, setNow] = useState(origin)
  const clock = { now: () => now }
  const view = gameView(game, clock)
  const errors = validateSettings(settings)
  const minutes = (at: number) => `${(at - origin) / minute} min`
  return <section aria-labelledby="simulation-title">
    <h2 id="simulation-title">Simulace pravidel · E2</h2>
    <p><strong>Pouze místní simulace bez backendu, GPS, hráčů a síťové synchronizace.</strong> Posun hodin není dostupný pro online hru.</p>
    <fieldset disabled={game.startedAt !== null}>
      <legend>Nastavení před startem</legend>
      <label>Předstih (min)<input type="number" min="0" max="1440" value={settings.headStartMs / minute} onChange={e => setSettings({ ...settings, headStartMs: e.target.valueAsNumber * minute })} /></label>
      <label>Interval lovu (min)<input type="number" min="0.016667" max="1440" step="any" value={settings.huntIntervalMs / minute} onChange={e => setSettings({ ...settings, huntIntervalMs: e.target.valueAsNumber * minute })} /></label>
      <label>Délka lovu (min)<input type="number" min="0.000017" max="1440" step="any" value={settings.huntDurationMs / minute} onChange={e => setSettings({ ...settings, huntDurationMs: e.target.valueAsNumber * minute })} /></label>
      <label>Odhalování při předstihu<select value={settings.headReveals.mode} onChange={e => setSettings({ ...settings, headReveals: e.target.value === 'custom' ? { mode: 'custom', intervalMs: 3 * minute } : { mode: e.target.value as 'same' | 'off' } })}>
        <option value="same">Stejné jako při lovu</option><option value="custom">Vlastní interval</option><option value="off">Vypnuto</option>
      </select></label>
      {settings.headReveals.mode === 'custom' && <label>Interval předstihu (min)<input type="number" min="0.016667" step="any" value={settings.headReveals.intervalMs / minute} onChange={e => setSettings({ ...settings, headReveals: { mode: 'custom', intervalMs: e.target.valueAsNumber * minute } })} /></label>}
    </fieldset>
    {errors.length > 0 && <ul role="alert">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
    <button disabled={errors.length > 0 || game.startedAt !== null} onClick={() => setGame(startGame(createGame('simulation-local', settings), clock))}>Potvrdit místní start</button>
    <button onClick={() => { setGame(createGame('simulation-local', initial)); setSettings(initial); setNow(origin) }}>Reset simulace</button>
    <p aria-live="polite">Fáze: <strong>{phases[view.phase]}</strong> · čas {minutes(now)}</p>
    <button onClick={() => setNow(now + 1000)}>+1 sekunda</button>
    <button onClick={() => setNow(now + minute)}>+1 minuta</button>
    <button onClick={() => setNow(now + 12 * minute)}>+12 minut (návrat po uspání)</button>
    <button disabled={!view.nextReveal} onClick={() => view.nextReveal && setNow(view.nextReveal.at)}>Na další odhalení</button>
    <p>Poslední odhalení: {view.lastReveal ? minutes(view.lastReveal.at) : 'žádné'}. Další: {view.nextReveal ? minutes(view.nextReveal.at) : 'žádné'}.</p>
    <p>Konec: {view.endAt === null ? 'nestanoven' : minutes(view.endAt)}. Přesně na konci se již neodhaluje.</p>
    <ol>{schedule(game).map(event => <li key={event.id}>{minutes(event.at)} · {kinds[event.kind]} · {event.at <= now ? 'nastalo' : 'plánováno'}</li>)}</ol>
    <p>Odhalení je pouze termín, nezaručuje nový GPS bod. Reset a reload neobnovují uloženou hru; simulace nemá persistenci.</p>
  </section>
}
