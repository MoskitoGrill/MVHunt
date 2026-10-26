import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { get, onValue, ref, serverTimestamp, set, update, type Database } from 'firebase/database'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import { connectDatabaseEmulator, getDatabase, goOffline, goOnline } from 'firebase/database'
import { createFirebaseAdapter, ServerClock } from '../src/data/firebase'

const databaseHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const databasePort = Number(databaseHost.split(':')[1])
let env: RulesTestEnvironment
const settings = { headStartMs: 4000, huntIntervalMs: 4000, huntDurationMs: 20000, headIntervalMs: 4000, maxAgeMs: 30000, lateArrivalMs: 10000 }
// Rules harness vrací compat API; modulární SDK jeho wrapper automaticky rozbalí.
const db = (uid: string) => env.authenticatedContext(uid).database() as unknown as Database
const node = (uid: string, p: string) => ref(db(uid), `games/a/${p}`)
const point = (at = Date.now()) => ({ lat: 50, lng: 14, accuracy: 5, measuredAt: at, receivedAt: serverTimestamp() })
// Legacy E3 fixture; veřejné zakládání od E4 poskytuje pouze server čekárny.
async function legacyCreate(uid: string, settings: Parameters<ReturnType<typeof createFirebaseAdapter>['create']>[0], policy: Parameters<ReturnType<typeof createFirebaseAdapter>['create']>[1]) {
  let g = ''
  await env.withSecurityRulesDisabled(async c => { g = await createFirebaseAdapter(c.database() as unknown as Database,uid).create(settings,policy) })
  return g
}
async function seed(start = Date.now() - 1000) {
  await env.withSecurityRulesDisabled(async c => set(ref(c.database(), 'games/a'), {
    schemaVersion: 1, ownerUid: 'host', settings, startedAt: start,
    members: { host: { role: 'host' }, deputy: { role: 'deputy' }, hunter: { role: 'hunter' }, fugitive: { role: 'fugitive' } },
  }))
  return start
}
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-mvhunt', database: { host: '127.0.0.1', port: databasePort, rules: readFileSync('database.rules.json', 'utf8') } })
})
beforeEach(async () => { await env.clearDatabase() })
afterAll(async () => { await env?.cleanup() })

describe('E5 – syntetické souřadnice dvou klientů', () => {
  it('stabilní playerId zachová stopu po převodu; nový slot ji nahradí, starý nelze přepsat', async () => {
    const start=await seed(Date.now()-9000)
    await env.withSecurityRulesDisabled(async c => update(ref(c.database(),'games/a'), {
      lobbyVersion:2, 'members/fugitive':{role:'fugitive',team:'fugitive',playerId:'runner'},
      'members/hunter':{role:'hunter',team:'hunter',playerId:'chaser'},
    }))
    const first=start+4000, second=start+8000
    await assertSucceeds(set(node('fugitive',`slots/${first}/runner`),{...point(first),at:first}))
    expect((await get(node('hunter',`slots/${first}/runner`))).val().measuredAt).toBe(first)
    await assertFails(set(node('fugitive',`slots/${first}/runner`),{...point(first),at:first}))
    await assertFails(set(node('hunter',`slots/${second}/runner`),{...point(second),at:second}))
    await env.withSecurityRulesDisabled(async c => update(ref(c.database(),'games/a/members'), {
      fugitive:null, replacement:{role:'fugitive',team:'fugitive',playerId:'runner'},
    }))
    await assertFails(set(node('fugitive',`slots/${second}/runner`),{...point(second),at:second}))
    await assertSucceeds(set(node('replacement',`slots/${second}/runner`),{...point(second),lat:51,at:second}))
    const old=(await get(node('hunter',`slots/${first}/runner`))).val()
    const next=(await get(node('hunter',`slots/${second}/runner`))).val()
    expect(old.lat).toBe(50);expect(next.lat).toBe(51)
    expect(next.receivedAt).toBeGreaterThanOrEqual(next.measuredAt)
    await assertFails(get(node('fugitive',`slots/${first}/runner`)))
    await assertFails(get(node('hunter','slots')))
  })
  it('průběžné polohy lovců čtou jen lovci; uprchlík nezapíše spoluhráče ani neunikne touto větví', async () => {
    await seed()
    await env.withSecurityRulesDisabled(async c => update(ref(c.database(),'games/a'), {
      lobbyVersion:2, 'members/fugitive':{role:'fugitive',team:'fugitive',playerId:'runner'},
      'members/hunter':{role:'hunter',team:'hunter',playerId:'chaser'},
      'members/host':{role:'host',team:'hunter',playerId:'leader'},
    }))
    await assertSucceeds(set(node('hunter','allies/chaser'),point()))
    await assertSucceeds(get(node('host','allies')))
    await assertFails(get(node('fugitive','allies')))
    await assertFails(get(node('outsider','allies/chaser')))
    await assertFails(set(node('fugitive','allies/runner'),point()))
    await assertFails(set(node('hunter','allies/leader'),point()))
    await assertFails(set(node('hunter','allies/chaser'),point(Date.now()-61000)))
    await assertFails(set(node('hunter','allies/chaser'),{...point(),receivedAt:1}))
  })
})

describe('skutečná RTDB pravidla', () => {
  it('dva klienti vytvoří hru a souběžně potvrdí jediný serverový start', async () => {
    const host = createFirebaseAdapter(db('host'), 'host')
    const g = await legacyCreate('host', { headStartMs: 4000, huntIntervalMs: 4000, huntDurationMs: 20000, headReveals: { mode: 'same' } }, { maxAgeMs: 30000, lateArrivalMs: 10000 })
    await host.assignMember(g, 'deputy', 'deputy')
    const deputy = createFirebaseAdapter(db('deputy'), 'deputy')
    const observed = new Promise<number>(resolve => {
      const stop = deputy.watchStart(g, at => { if (at !== null) { stop(); resolve(at) } }, e => { throw e })
    })
    const [a,b] = await Promise.all([host.start(g), deputy.start(g)])
    expect(a).toBe(b)
    expect(await observed).toBe(a)
    expect(Math.abs(a - Date.now())).toBeLessThan(3000)
    expect((await deputy.readGame(g)).startedAt).toBe(a)
    expect(await host.start(g)).toBe(a)
  })
  it('zamítá neautentizované, cizí, nadřazené i REST čtení', async () => {
    await seed()
    for (const p of ['', 'games', 'games/a', 'games/a/slots', 'games/a/private']) {
      await assertFails(get(p ? ref(db('hunter'), p) : ref(db('hunter'))))
    }
    await assertFails(get(node('outsider', 'settings')))
    await assertFails(get(ref(env.unauthenticatedContext().database(), 'games/a/settings')))
    const response = await fetch(`http://${databaseHost}/games/a/private.json?ns=demo-mvhunt`)
    expect(response.ok).toBe(false)
  })
  it('lovec ani vedoucí nečtou cizí soukromé body; pouze vlastní zápisy', async () => {
    await seed()
    await assertSucceeds(set(node('fugitive', 'private/fugitive/p1'), point()))
    await assertSucceeds(get(node('fugitive', 'private/fugitive')))
    for (const uid of ['hunter','host','deputy','outsider']) await assertFails(get(node(uid, 'private/fugitive/p1')))
    await assertFails(set(node('hunter', 'private/fugitive/p2'), point()))
    await assertFails(set(node('fugitive', 'private/fugitive/p1'), point()))
    await assertFails(set(node('fugitive', 'private/fugitive/p1'), null))
  })
  it('budoucí slot je nečitelný i autorovi a realtime odběru; po termínu stejný bod', async () => {
    const start = await seed(Date.now() - 3000)
    const at = start + 4000
    await assertSucceeds(set(node('fugitive', `slots/${at}/fugitive`), { ...point(), at }))
    for (const uid of ['hunter','host','fugitive']) await assertFails(get(node(uid, `slots/${at}/fugitive`)))
    const denied = new Promise<string>(resolve => {
      onValue(node('hunter', `slots/${at}/fugitive`), () => resolve('LEAK'), e => resolve(e.message))
    })
    expect(await denied).not.toBe('LEAK')
    await new Promise(resolve => setTimeout(resolve, Math.max(0, at - Date.now()) + 30))
    const snapshot = await assertSucceeds(get(node('hunter', `slots/${at}/fugitive`)))
    expect(snapshot.val().lat).toBe(50)
    await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at), at }))
    await assertFails(set(node('fugitive', `slots/${at}/fugitive`), null))
  })
  it('odmítá falešný termín, bod po termínu, starý bod, čas přijetí a cizí zápis', async () => {
    const start = await seed(Date.now() - 5000)
    const at = start + 4000
    await assertFails(set(node('fugitive', `slots/${at+1}/fugitive`), { ...point(at), at }))
    await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at+1), at }))
    await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at-30001), at }))
    await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at), at, receivedAt: 1 }))
    await assertFails(set(node('hunter', `slots/${at}/fugitive`), { ...point(at), at }))
    await assertSucceeds(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at), at }))
    await assertFails(get(node('outsider', `slots/${at}/fugitive`)))
  })
  it('zakazuje pozdní doplnění, odhalení v nule, na konci a změny nastavení/rolí', async () => {
    const start = await seed(Date.now() - 16000)
    for (const at of [start, start+4000, start+24000]) await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(at), at }))
    for (const uid of ['hunter','fugitive','host','deputy']) {
      await assertFails(set(node(uid, 'settings/headStartMs'), 5000))
      await assertFails(set(node(uid, 'members/hunter/role'), 'deputy'))
      await assertFails(set(node(uid, 'startedAt'), serverTimestamp()))
    }
    await assertFails(update(ref(db('hunter')), { 'games/a/members/hunter/role': 'host', 'games/a/settings/headStartMs': 1 }))
  })
  it('validuje formát a neumožní obejití mazáním, extra poli či vytvořením cizí hry', async () => {
    await seed()
    for (const extra of [{ lat: 91 }, { lng: -181 }, { accuracy: -1 }, { secret: 'x' }]) {
      await assertFails(set(node('fugitive', 'private/fugitive/p'), { ...point(), ...extra }))
    }
    await assertFails(set(ref(db('host'), 'games/a'), null))
    await assertFails(set(ref(db('hunter'), 'games/b'), { schemaVersion: 1, ownerUid: 'host', settings, members: { hunter: { role: 'host' } } }))
    await assertFails(get(ref(db('hunter'), 'games/b/settings')))
  })
  it('host a zástupce spravují čekárnu, běžný hráč nikoli', async () => {
    await seed()
    await env.withSecurityRulesDisabled(c => set(ref(c.database(), 'games/a/startedAt'), null))
    await assertSucceeds(set(node('deputy', 'settings/headStartMs'), 2000))
    await assertSucceeds(set(node('host', 'members/new'), { role: 'hunter' }))
    await assertFails(set(node('hunter', 'members/evil'), { role: 'deputy' }))
    await assertFails(set(node('hunter', 'startedAt'), serverTimestamp()))
    await assertFails(set(node('host', 'startedAt'), Date.now() + 3600000))
    await assertFails(set(node('host', 'settings/huntIntervalMs'), 0))
    await assertFails(set(node('host', 'settings'), null))
    await assertFails(set(node('host', 'members/host'), null))
  })
  it('rozhozené klientské hodiny nemění serverový start ani čas UI po korekci', async () => {
    const now = Date.now()
    const fast = new ServerClock({ now: () => now + 3600000 })
    const slow = new ServerClock({ now: () => now - 3600000 })
    expect(() => fast.now()).toThrow()
    fast.update(-3600000); slow.update(3600000)
    expect(fast.now()).toBe(slow.now())
    await seed()
    await assertFails(set(node('host', 'startedAt'), now + 3600000))
  })
  it('tři hry mají izolovaná členství a metadata', async () => {
    const games = await Promise.all(['one','two','three'].map(async uid => {
      return { uid, g: await legacyCreate(uid, { headStartMs: 0, huntDurationMs: 10000, huntIntervalMs: 1000, headReveals: { mode: 'off' } }, { maxAgeMs: 0, lateArrivalMs: 0 }) }
    }))
    for (const a of games) for (const b of games) {
      const request = get(ref(db(a.uid), `games/${b.g}/settings`))
      if (a.uid === b.uid) await assertSucceeds(request)
      else await assertFails(request)
    }
  })
  it('anonymní Auth vydá různé identity; návrat po výpadku načte uložený start', async () => {
    const apps = ['auth-a','auth-b'].map(name => initializeApp({ apiKey: 'fake-api-key', projectId: 'demo-mvhunt', databaseURL: 'https://demo-mvhunt.firebaseio.com' }, name))
    try {
      const users = await Promise.all(apps.map(async app => {
        const auth = getAuth(app)
        connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
        return (await signInAnonymously(auth)).user
      }))
      expect(users[0].uid).not.toBe(users[1].uid)
      const database = getDatabase(apps[0])
      connectDatabaseEmulator(database, '127.0.0.1', databasePort)
      const adapter = createFirebaseAdapter(database, users[0].uid)
      const g = await legacyCreate(users[0].uid, { headStartMs: 0, huntDurationMs: 10000, huntIntervalMs: 1000, headReveals: { mode: 'off' } }, { maxAgeMs: 0, lateArrivalMs: 0 })
      const start = await adapter.start(g)
      const token = await users[0].getIdToken()
      const allowed = await fetch(`http://${databaseHost}/games/${g}/settings.json?ns=demo-mvhunt&auth=${encodeURIComponent(token)}`)
      expect(allowed.ok).toBe(true)
      const denied = await fetch(`http://${databaseHost}/games/${g}/private.json?ns=demo-mvhunt&auth=${encodeURIComponent(token)}`)
      expect(denied.ok).toBe(false)
      goOffline(database); goOnline(database)
      expect((await adapter.readGame(g)).startedAt).toBe(start)
    } finally { await Promise.all(apps.map(app => deleteApp(app))) }
  })
  it('pravidla respektují vlastní/vypnutý předstih a nulový předstih', async () => {
    const start = await seed(Date.now() - 500)
    for (const [headStartMs, headIntervalMs, allowed, denied] of [
      [10000, 3000, [3000,6000,9000,10000,14000], [4000,12000,30000]],
      [10000, 0, [10000,14000], [3000,6000,1000,30000]],
      [0, 0, [4000,8000], [0,1000,20000]],
    ] as const) {
      await env.withSecurityRulesDisabled(c => set(ref(c.database(), 'games/a/settings'), { ...settings, headStartMs, headIntervalMs }))
      for (const offset of allowed) {
        const at = start + offset
        // Každá varianta má prázdný slot, aby se zde netestoval zákaz přepisu.
        await env.withSecurityRulesDisabled(c => set(ref(c.database(), `games/a/slots/${at}`), null))
        await assertSucceeds(set(node('fugitive', `slots/${at}/fugitive`), { ...point(Math.min(at, Date.now())), at }))
      }
      for (const offset of denied) {
        const at = start + offset
        await assertFails(set(node('fugitive', `slots/${at}/fugitive`), { ...point(Math.min(at, Date.now())), at }))
      }
    }
  })
})


