import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { createLobbyService } from '../server/lobby.mjs'
const databaseHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
let env, app, db, execute, now
const settings = { headStartMs:10000,huntIntervalMs:5000,huntDurationMs:60000,headIntervalMs:5000,maxAgeMs:30000,lateArrivalMs:10000 }
const client = uid => env.authenticatedContext(uid).database()
const create = () => execute('host','create',{ nickname:'Alex',team:'hunter',settings })
async function join(gameId, uid, extra = {}) {
  await execute(uid,'request',{ gameId,nickname:'Alex',team:'fugitive',...extra })
  await execute('host','approve',{ gameId,uid })
}
async function ready(gameId, uid) {
  await client(uid).ref(`games/${gameId}/presence/${uid}`).set({ online:true,at:{ '.sv':'timestamp' } })
  await execute(uid,'ready',{ gameId,measuredAt:now })
}
beforeAll(async () => {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = databaseHost
  app = initializeApp({ projectId:'demo-mvhunt',databaseURL:'https://demo-mvhunt.firebaseio.com' },'lobby-tests')
  db = getDatabase(app)
  env = await initializeTestEnvironment({ projectId:'demo-mvhunt',database:{ host:'127.0.0.1',port:Number(databaseHost.split(':')[1]),rules:readFileSync('database.rules.json','utf8') } })
})
beforeEach(async () => { await db.ref().set(null); now = Date.now(); execute = createLobbyService(db,{ now:() => now }) })
afterAll(async () => { await env?.cleanup(); await deleteApp(app) })

async function runningRound() {
  const {gameId} = await create()
  await join(gameId,'a'); await join(gameId,'b')
  for (const uid of ['host','a','b']) await ready(gameId,uid)
  await execute('host','start',{gameId})
  now += settings.headStartMs
  const game = (await db.ref(`games/${gameId}`).get()).val()
  return {gameId,a:game.members.a.playerId,b:game.members.b.playerId}
}
it('E6 opakované chycení, oprava a stará opakovaná akce nezpůsobí nové chycení',async()=>{
  const {gameId,a} = await runningRound()
  const capture = {gameId,playerId:a,operationId:'capture-1'}
  await Promise.all([execute('a','capture',capture),execute('a','capture',capture)])
  let round = (await db.ref(`games/${gameId}/round`).get()).val()
  expect(Object.keys(round.operations)).toHaveLength(1)
  const at=round.captures[a].at
  now+=1000
  const correction={gameId,playerId:a,operationId:'fix-1',captureId:'capture-1'}
  await execute('a','correct-capture',correction)
  await execute('a','correct-capture',correction)
  await execute('a','capture',capture)
  round=(await db.ref(`games/${gameId}/round`).get()).val()
  expect(round.captures[a]).toMatchObject({at,correctedAt:now})
  expect(round.endedAt).toBeUndefined()
  await execute('a','capture',{...capture,operationId:'capture-2'})
  await expect(execute('a','correct-capture',{...correction,operationId:'stale-fix'})).rejects.toThrow('změnilo')
})
it('E6 poslední chycení a konec jsou atomické; oprava výsledku hru neotevře',async()=>{
  const {gameId,a,b}=await runningRound()
  await execute('a','capture',{gameId,playerId:a,operationId:'first'})
  await Promise.allSettled([
    execute('b','capture',{gameId,playerId:b,operationId:'last'}),
    execute('host','end-round',{gameId,operationId:'end'}),
  ])
  const before=(await db.ref(`games/${gameId}/round`).get()).val()
  expect(before.endedAt).toBe(now)
  expect(['all-captured','manager']).toContain(before.reason)
  await expect(execute('a','correct-capture',{gameId,playerId:a,captureId:'first',operationId:'self-fix'})).rejects.toThrow('vedoucí')
  await execute('host','correct-capture',{gameId,playerId:a,captureId:'first',operationId:'manager-fix'})
  const after=(await db.ref(`games/${gameId}/round`).get()).val()
  expect(after.endedAt).toBe(before.endedAt); expect(after.reason).toBe(before.reason)
  await expect(execute('a','capture',{gameId,operationId:'too-late'})).rejects.toThrow('skončila')
})
it('E6 všichni chyceni končí, nový gameId zachová výsledky a staré akce jsou izolované',async()=>{
  const {gameId,a,b}=await runningRound()
  await Promise.all([
    execute('a','capture',{gameId,playerId:a,operationId:'ca'}),
    execute('b','capture',{gameId,playerId:b,operationId:'cb'}),
  ])
  const old=(await db.ref(`games/${gameId}`).get()).val()
  expect(old.round.reason).toBe('all-captured')
  const next=await create()
  expect(next.gameId).not.toBe(gameId)
  await execute('a','capture',{gameId,playerId:a,operationId:'ca'})
  expect((await db.ref(`games/${gameId}`).get()).val()).toEqual(old)
  expect((await db.ref(`games/${next.gameId}/round`).get()).exists()).toBe(false)
})
it('E6 odchod hosta a restart služby nemění limit; na hranici má konec přednost',async()=>{
  const {gameId}=await runningRound()
  await db.ref(`games/${gameId}/presence/host`).set({online:false,at:now})
  now+=settings.huntDurationMs
  execute=createLobbyService(db,{now:()=>now})
  await expect(execute('a','capture',{gameId,operationId:'at-deadline'})).rejects.toThrow('skončila')
  await execute('a','sync-round',{gameId})
  const before=(await client('a').ref(`games/${gameId}/round`).get()).val()
  expect(before.reason).toBe('time-limit'); expect(before.endedAt).toBe(now)
  now+=60000
  await execute('b','sync-round',{gameId})
  expect((await client('b').ref(`games/${gameId}/round`).get()).val()).toEqual(before)
})
it('E6 rules vynutí zastavení GPS, oprava práva vrací jen před koncem',async()=>{
  const {gameId,a}=await runningRound()
  // Použít skutečné serverové now pro polohová pravidla, nezávisle na testovacích hodinách API.
  await db.ref(`games/${gameId}/startedAt`).set(Date.now()-settings.headStartMs-100)
  const point={lat:50,lng:14,accuracy:5,measuredAt:Date.now(),receivedAt:{'.sv':'timestamp'}}
  await assertSucceeds(client('a').ref(`games/${gameId}/private/a/p1`).set(point))
  await execute('a','capture',{gameId,operationId:'caught'})
  await assertFails(client('a').ref(`games/${gameId}/private/a/p2`).set(point))
  await assertFails(client('host').ref(`games/${gameId}/round`).set({}))
  await assertFails(client('outsider').ref(`games/${gameId}/round`).get())
  await expect(execute('b','correct-capture',{gameId,playerId:a,captureId:'caught',operationId:'wrong'})).rejects.toThrow()
  await execute('a','correct-capture',{gameId,captureId:'caught',operationId:'fixed'})
  await assertSucceeds(client('a').ref(`games/${gameId}/private/a/p3`).set({...point,measuredAt:Date.now()}))
  await execute('host','end-round',{gameId,operationId:'end'})
  await assertFails(client('host').ref(`games/${gameId}/allies/${(await db.ref(`games/${gameId}/members/host/playerId`).get()).val()}`).set({...point,measuredAt:Date.now()}))
  await assertFails(client('a').ref(`games/${gameId}/private/a/p4`).set(point))
})
it('E6 offline fronta není potvrzení a po konci je zamítnuta; návrat načte konec',async()=>{
  const {gameId}=await runningRound()
  await db.ref(`games/${gameId}/startedAt`).set(Date.now()-settings.headStartMs-100)
  const offlineClient=client('a')
  await offlineClient.ref(`games/${gameId}/startedAt`).get()
  offlineClient.goOffline()
  let acknowledged=false
  const queued=offlineClient.ref(`games/${gameId}/private/a/offline`).set({lat:50,lng:14,accuracy:5,measuredAt:Date.now(),receivedAt:{'.sv':'timestamp'}}).then(()=>{acknowledged=true;return 'accepted'},()=> 'denied')
  await execute('host','end-round',{gameId,operationId:'end-offline'})
  expect(acknowledged).toBe(false)
  offlineClient.goOnline()
  expect(await queued).toBe('denied')
  const restored=(await offlineClient.ref(`games/${gameId}/round`).get()).val()
  expect(restored.reason).toBe('manager')
  expect((await client('b').ref(`games/${gameId}/round`).get()).val()).toEqual(restored)
})
it('E6 předčasný konec neodhalí předem zapsaný budoucí slot',async()=>{
  const {gameId,a}=await runningRound()
  const start=Date.now()-100
  await db.ref(`games/${gameId}/startedAt`).set(start)
  const at=start+settings.headStartMs
  await assertSucceeds(client('a').ref(`games/${gameId}/slots/${at}/${a}`).set({lat:50,lng:14,accuracy:5,measuredAt:Date.now(),at,receivedAt:{'.sv':'timestamp'}}))
  await execute('host','end-round',{gameId,operationId:'early-end'})
  // Server now přes termín posuneme syntetickou fixturou zachovávající platný rozvrh.
  const past=Date.now()-settings.headStartMs-100
  const pastAt=past+settings.headStartMs
  await db.ref(`games/${gameId}/startedAt`).set(past)
  await db.ref(`games/${gameId}/round/endedAt`).set(pastAt-1)
  await db.ref(`games/${gameId}/slots/${pastAt}/${a}`).set({lat:50,lng:14,accuracy:5,measuredAt:pastAt,at:pastAt,receivedAt:pastAt})
  await assertFails(client('host').ref(`games/${gameId}/slots/${pastAt}/${a}`).get())
})
it('E6 chycení skryje předem zapsané pozdější odhalení; oprava před koncem právo obnoví',async()=>{
  const {gameId,a}=await runningRound()
  const start=Date.now()-settings.headStartMs-100
  const at=start+settings.headStartMs
  await db.ref(`games/${gameId}/startedAt`).set(start)
  await db.ref(`games/${gameId}/slots/${at}/${a}`).set({lat:50,lng:14,accuracy:5,measuredAt:at,at,receivedAt:at})
  await assertSucceeds(client('host').ref(`games/${gameId}/slots/${at}/${a}`).get())
  now=at-1
  // Chycení v syntetickém scénáři po vypuštění a před tímto slotem.
  const release=start+settings.headStartMs-settings.huntIntervalMs
  await db.ref(`games/${gameId}/startedAt`).set(release-settings.headStartMs)
  await execute('a','capture',{gameId,operationId:'caught-before-slot'})
  await assertFails(client('host').ref(`games/${gameId}/slots/${at}/${a}`).get())
  now=at+1
  await execute('a','correct-capture',{gameId,captureId:'caught-before-slot',operationId:'fix-before-end'})
  await assertSucceeds(client('host').ref(`games/${gameId}/slots/${at}/${a}`).get())
})

it('stejná přezdívka nekrade identitu; žádost potřebuje schválení',async () => {
  const { gameId } = await create()
  await execute('child','request',{ gameId,nickname:'Alex',team:'fugitive' })
  await assertFails(client('child').ref(`games/${gameId}/members`).get())
  await execute('host','approve',{ gameId,uid:'child' })
  const members = (await client('child').ref(`games/${gameId}/members`).get()).val()
  expect(members.host.playerId).not.toBe(members.child.playerId)
  const repeated = (await client('child').ref(`games/${gameId}/members/child`).get()).val()
  expect(repeated.playerId).toBe(members.child.playerId)
  await assertFails(client('other').ref(`games/${gameId}/requests`).get())
})
it('běžný hráč nespravuje hru ani přes SDK, REST, či serverový příkaz',async () => {
  const { gameId } = await create(); await join(gameId,'child')
  for (const action of ['settings','role','approve','start','rotate']) await expect(execute('child',action,{ gameId,settings,uid:'child',deputy:true })).rejects.toThrow()
  for (const path of ['settings','members/child','startedAt','recovery','lobbyVersion']) await assertFails(client('host').ref(`games/${gameId}/${path}`).set(null))
  await assertFails(client('host').ref(`games/${gameId}/startedAt`).set({ '.sv':'timestamp' }))
  await assertFails(client('host').ref(`games/${gameId}/members/child/role`).set('deputy'))
  for (const uid of ['host','child','outsider']) await assertFails(client(uid).ref(`games/${gameId}/recovery`).get())
  const response = await fetch(`http://${databaseHost}/games/${gameId}/recovery.json?ns=demo-mvhunt`)
  expect(response.ok).toBe(false)
  await assertFails(client('host').ref('games/forged').set({ schemaVersion:1,ownerUid:'host',settings,members:{ host:{ role:'host' } } }))
})
it('více zástupců po odchodu hosta souběžně vytvoří jediný start a audit',async () => {
  const { gameId } = await create()
  for (const uid of ['d1','d2']) { await join(gameId,uid); await execute('host','role',{ gameId,uid,deputy:true }) }
  for (const uid of ['host','d1','d2']) await ready(gameId,uid)
  const [a,b] = await Promise.all(['d1','d2'].map(uid => execute(uid,'start',{ gameId })))
  expect(a.startedAt).toBe(b.startedAt); expect(a.startedAt).toBe(now)
  expect(Object.values((await db.ref(`games/${gameId}/audit`).get()).val()).filter(e => e.kind === 'start')).toHaveLength(1)
  await expect(execute('d1','settings',{ gameId,settings })).rejects.toThrow()
  await expect(execute('d1','role',{ gameId,uid:'d2',deputy:false })).rejects.toThrow()
})
it('start odmítá chybějící tým, starou GPS, nepřipravenost a offline',async () => {
  const { gameId } = await create()
  await expect(execute('host','start',{ gameId })).rejects.toThrow()
  await join(gameId,'child')
  await expect(execute('child','ready',{ gameId,measuredAt:now-30001 })).rejects.toThrow()
  await expect(execute('child','ready',{ gameId,measuredAt:now+1 })).rejects.toThrow()
  await ready(gameId,'host'); await ready(gameId,'child')
  await client('child').ref(`games/${gameId}/presence/child`).set({ online:false,at:{ '.sv':'timestamp' } })
  await expect(execute('host','start',{ gameId })).rejects.toThrow()
  await ready(gameId,'child'); now += 30001
  await expect(execute('host','start',{ gameId })).rejects.toThrow()
})
it('schválená obnova zachová playerId a atomicky odvolá staré UID, i po startu',async () => {
  const { gameId } = await create(); await join(gameId,'child')
  const old = (await db.ref(`games/${gameId}/members/child`).get()).val()
  await ready(gameId,'host'); await ready(gameId,'child'); await execute('host','start',{ gameId })
  await execute('replacement','request',{ gameId,nickname:'cizí jméno',team:'hunter',target:'child' })
  await assertFails(client('replacement').ref(`games/${gameId}/settings`).get())
  await execute('host','approve',{ gameId,uid:'replacement' })
  await assertFails(client('child').ref(`games/${gameId}/settings`).get())
  const current = (await client('replacement').ref(`games/${gameId}/members/replacement`).get()).val()
  expect(current.playerId).toBe(old.playerId); expect(current.team).toBe(old.team); expect(current.readyAt).toBeUndefined()
  await execute('late','request',{ gameId,nickname:'pozdní',team:'hunter' })
  await assertFails(client('late').ref(`games/${gameId}/settings`).get())
  await execute('host','approve',{ gameId,uid:'late' })
  await assertSucceeds(client('late').ref(`games/${gameId}/settings`).get())
})
it('rotace, odvolání, jednorázová obnova vedoucího a audit bez kódu',async () => {
  const { gameId,code } = await create()
  expect(code.length).toBe(43)
  const rotated = await execute('host','rotate',{ gameId })
  await expect(execute('newhost','recover',{ gameId,code })).rejects.toThrow()
  await execute('newhost','recover',{ gameId,code:rotated.code })
  await assertFails(client('host').ref(`games/${gameId}/settings`).get())
  await assertSucceeds(client('newhost').ref(`games/${gameId}/settings`).get())
  await expect(execute('attacker','recover',{ gameId,code:rotated.code })).rejects.toThrow()
  const next = await execute('newhost','rotate',{ gameId })
  await execute('newhost','rotate',{ gameId,revoke:true })
  await expect(execute('another','recover',{ gameId,code:next.code })).rejects.toThrow()
  const serialized = JSON.stringify((await db.ref(`games/${gameId}`).get()).val())
  expect(serialized).not.toContain(rotated.code); expect(serialized).not.toContain(code)
  expect(serialized).toContain('host-recovered')
})
it('pět chyb blokuje hru na pět minut, i přes různé UID a novou instanci',async () => {
  const { gameId,code } = await create()
  for (let i=0;i<5;i++) await expect(execute(`attacker${i}`,'recover',{ gameId,code:'bad' })).rejects.toThrow()
  execute = createLobbyService(db,{ now:() => now })
  await expect(execute('newhost','recover',{ gameId,code })).rejects.toThrow('uzamčena')
  now += 300000
  await execute('newhost','recover',{ gameId,code })
})
it('souběžné použití stejného kódu uspěje pouze na jednom zařízení',async () => {
  const { gameId,code } = await create()
  const outcomes = await Promise.allSettled(['new1','new2'].map(uid => execute(uid,'recover',{ gameId,code })))
  expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(Object.values((await db.ref(`games/${gameId}/audit`).get()).val()).filter(e => e.kind === 'host-recovered')).toHaveLength(1)
  expect(Object.keys((await db.ref(`games/${gameId}/members`).get()).val())).toHaveLength(1)
})
it('limity, validace a změna nastavení ruší připravenost',async () => {
  const { gameId } = await create(); await ready(gameId,'host')
  await execute('host','settings',{ gameId,settings })
  expect((await db.ref(`games/${gameId}/members/host/readyAt`).get()).exists()).toBe(false)
  await expect(execute('host','settings',{ gameId,settings:{ ...settings,huntIntervalMs:0 } })).rejects.toThrow()
  for (let i=0;i<30;i++) { try { await execute('spam','request',{ gameId,nickname:'x',team:'hunter' }) } catch { /* limit testovaný níže */ } }
  await expect(execute('spam','request',{ gameId,nickname:'x',team:'hunter' })).rejects.toThrow('mnoho')
})
it('HTTP API ověřuje skutečný Auth token; bez tokenu a s falešným UID neprojde',async () => {
  const processApi = spawn(process.execPath,['server/index.mjs'],{ env:{ ...process.env,LOBBY_EMULATORS:'true',PORT:'8788' },stdio:['ignore','pipe','pipe'] })
  try {
    await Promise.race([once(processApi.stdout,'data'),new Promise((_,reject) => setTimeout(() => reject(new Error('API se nespustilo')),8000))])
    const post = (token,body,action='create') => fetch(`http://127.0.0.1:8788/api/lobby/${action}`,{ method:'POST',headers:{ 'Content-Type':'application/json',...(token ? { Authorization:`Bearer ${token}` } : {}) },body:JSON.stringify(body) })
    expect((await post('',{})).ok).toBe(false)
    expect((await post('fake',{})).ok).toBe(false)
    const authResponse = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,{ method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify({ returnSecureToken:true }) })
    const user = await authResponse.json()
    const response = await post(user.idToken,{ nickname:'HTTP hráč',team:'hunter',settings,uid:'host' })
    expect(response.ok).toBe(true)
    const result = await response.json()
    expect((await db.ref(`games/${result.gameId}/ownerUid`).get()).val()).toBe(user.localId)
    await db.ref(`games/${result.gameId}/startedAt`).set(Date.now())
    const body={gameId:result.gameId,operationId:'http-end'}
    expect((await post(user.idToken,body,'end-round')).ok).toBe(true)
    expect((await post(user.idToken,body,'end-round')).ok).toBe(true)
    expect((await db.ref(`games/${result.gameId}/round/reason`).get()).val()).toBe('manager')
  } finally { processApi.kill(); await once(processApi,'exit') }
})
