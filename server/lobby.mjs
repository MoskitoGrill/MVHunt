import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { roundCommand, settle } from './round.mjs'
const fail = message => { throw new Error(message) }
const hash = code => createHash('sha256').update(code).digest('hex')
const key = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : fail('Neplatné ID.')
const nickname = v => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 32 ? v.trim() : fail('Přezdívka musí mít 1–32 znaků.')
const team = v => ['hunter','fugitive'].includes(v) ? v : fail('Neplatná role.')
function settings(v) {
  const limits = { headStartMs:[0,86400000], huntIntervalMs:[1000,86400000], huntDurationMs:[1,86400000], headIntervalMs:[0,86400000], maxAgeMs:[0,60000], lateArrivalMs:[0,30000] }
  if (!v || Object.keys(v).length !== 6) fail('Neplatné nastavení.')
  for (const [k,[min,max]] of Object.entries(limits)) if (!Number.isSafeInteger(v[k]) || v[k] < min || v[k] > max) fail(`Neplatné nastavení ${k}.`)
  if (v.headIntervalMs > 0 && v.headIntervalMs < 1000) fail('Příliš krátký interval.')
  return structuredClone(v)
}
export function createLobbyService(db, clock = { now: () => Date.now() }) {
  async function mutate(g, fn) {
    let failure
    const result = await db.ref(`games/${key(g)}`).transaction(current => {
      if (!current) return current
      try { failure = undefined; fn(current); return current } catch (e) { failure = e; return undefined }
    }, undefined, false)
    if (failure) throw failure
    if (!result.committed || !result.snapshot.exists()) fail('Hra neexistuje nebo operace nebyla potvrzena.')
    return result.snapshot.val()
  }
  const manager = (g, uid) => ['host','deputy'].includes(g.members?.[uid]?.role) || fail('Pouze vedoucí nebo zástupce.')
  const waiting = g => !g.startedAt || fail('Po startu je nastavení uzamčeno.')
  const audit = (g, uid, kind, now, target = '') => {
    g.audit ??= {}; g.audit[randomUUID()] = { uid, kind, at: now, target }
  }
  return async function execute(uid, action, body = {}) {
    key(uid)
    let now = clock.now()
    const rate = await db.ref(`lobbyLimits/${uid}`).transaction(v => {
      if (!v || now - v.since >= 60000) return { since: now, count: 1 }
      return v.count >= 30 ? undefined : { ...v, count: v.count + 1 }
    })
    if (!rate.committed) fail('Příliš mnoho požadavků. Počkejte minutu.')
    if (action === 'create') {
      const g = db.ref('games').push().key, code = randomBytes(32).toString('base64url')
      await db.ref(`games/${g}`).set({ schemaVersion:1, lobbyVersion:2, ownerUid:uid, settings:settings(body.settings),
        members:{ [uid]:{ role:'host', team:team(body.team), nickname:nickname(body.nickname), playerId:randomUUID() } },
        recovery:{ digest:hash(code), version:1 }, createdAt:now })
      return { gameId:g, code }
    }
    const g = key(body.gameId)
    const code = action === 'rotate' ? randomBytes(32).toString('base64url') : undefined
    const state = await mutate(g, game => {
      // Při opakování transakce znovu posoudit čerstvost a lockout v aktuálním čase.
      now = clock.now()
      if (game.lobbyVersion !== 2) fail('Starší hra nemá čekárnu E4; založte novou.')
      const me = game.members?.[uid]
      if (['sync-round','capture','correct-capture','end-round'].includes(action)) {
        roundCommand(game,uid,action,body,now); return
      }
      if (game.startedAt) settle(game,now)
      switch (action) {
        case 'request':
          if (me) return
          game.requests ??= {}
          if (Object.keys(game.requests).length >= 50 && !game.requests[uid]) fail('Čekárna žádostí je plná.')
          game.requests[uid] = { nickname:nickname(body.nickname), team:team(body.team), at:now, ...(body.target ? { target:key(body.target) } : {}) }
          break
        case 'approve': {
          manager(game,uid)
          const target = key(body.uid), request = game.requests?.[target]
          if (!request) fail('Žádost již není dostupná.')
          if (Object.keys(game.members).length >= 30 && !request.target) fail('Limit je 30 členů.')
          if (request.target) {
            const old = game.members[request.target]
            if (!old || !['hunter','fugitive'].includes(old.role)) fail('Převod vedoucího vyžaduje obnovovací kód.')
            game.members[target] = { ...old }; delete game.members[target].readyAt; delete game.members[target].measuredAt
            delete game.members[request.target]
          } else {
            if (game.round?.endedAt) fail('Do ukončené hry nelze přijmout nového hráče.')
            game.members[target] = { role:request.team, team:request.team, nickname:request.nickname, playerId:randomUUID() }
          }
          delete game.requests[target]
          audit(game,uid,request.target ? 'player-transfer' : 'join-approved',now,target)
          break
        }
        case 'reject': manager(game,uid); delete game.requests?.[key(body.uid)]; break
        case 'settings':
          manager(game,uid); waiting(game); game.settings = settings(body.settings)
          for (const m of Object.values(game.members)) { delete m.readyAt; delete m.measuredAt }
          break
        case 'role': {
          manager(game,uid); waiting(game)
          const target = key(body.uid), m = game.members[target]
          if (!m) fail('Hráč neexistuje.')
          if (body.deputy !== undefined) {
            if (me.role !== 'host' || m.role === 'host' || typeof body.deputy !== 'boolean') fail('Zástupce určuje organizátor.')
            m.role = body.deputy ? 'deputy' : m.team
          }
          if (body.team) { m.team = team(body.team); if (!['host','deputy'].includes(m.role)) m.role = m.team }
          delete m.readyAt; delete m.measuredAt; audit(game,uid,'role',now,target)
          break
        }
        case 'ready':
          if (!me) fail('Nejste členem hry.')
          waiting(game)
          if (body.ready === false) { delete me.readyAt; delete me.measuredAt; break }
          if (!Number.isSafeInteger(body.measuredAt) || body.measuredAt > now || now-body.measuredAt > 30000) fail('Je potřeba GPS měření nejvýše 30 s staré.')
          me.readyAt = now; me.measuredAt = body.measuredAt; break
        case 'start': {
          manager(game,uid)
          if (game.startedAt) break
          const members = Object.values(game.members)
          if (!members.some(m => m.team === 'hunter') || !members.some(m => m.team === 'fugitive')) fail('Je potřeba lovec i uprchlík.')
          if (Object.entries(game.members).some(([id,m]) => !m.readyAt || now-m.readyAt > 30000 || now-m.measuredAt > 30000 || !game.presence?.[id]?.online || now-game.presence[id].at > 30000)) fail('Všichni musí být připojení a mít čerstvou připravenost a GPS (30 s).')
          game.startedAt = now; audit(game,uid,'start',now); break
        }
        case 'rotate':
          if (me?.role !== 'host') fail('Kód spravuje organizátor.')
          game.recovery = { version:(game.recovery?.version ?? 0)+1, ...(body.revoke ? {} : { digest:hash(code) }) }
          audit(game,uid,body.revoke ? 'code-revoked' : 'code-rotated',now); break
        case 'recover': {
          if (me) fail('Použijte nové zařízení bez členství v této hře.')
          const r = game.recovery ?? { version:0 }
          if (now < (r.blockedUntil ?? 0)) fail('Obnova je dočasně uzamčena.')
          const candidate = hash(typeof body.code === 'string' ? body.code : '')
          if (!r.digest || !timingSafeEqual(Buffer.from(candidate),Buffer.from(r.digest))) {
            r.failures = (r.failures ?? 0)+1
            if (r.failures >= 5) { r.blockedUntil = now+300000; r.failures = 0 }
            game.recovery = r; return
          }
          game.members[uid] = { ...game.members[game.ownerUid] }
          delete game.members[uid].readyAt; delete game.members[uid].measuredAt
          delete game.members[game.ownerUid]; game.ownerUid = uid
          game.recovery = { version:r.version+1 }
          audit(game,uid,'host-recovered',now); break
        }
        default: fail('Neznámá operace.')
      }
    })
    if (action === 'recover' && state.ownerUid !== uid) fail('Neplatný nebo odvolaný obnovovací kód.')
    return { gameId:g, ...(action === 'rotate' && !body.revoke ? { code } : {}), startedAt:state.startedAt ?? null }
  }
}
