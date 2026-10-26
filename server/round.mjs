const fail = message => { throw new Error(message) }
export function deadline(game) {
  return game.startedAt + game.settings.headStartMs + game.settings.huntDurationMs
}
export function finish(game, at, reason) {
  if (game.round?.endedAt) return
  game.round ??= {}
  game.round.endedAt = at
  game.round.reason = reason
}
/** Uložený limit je autoritativní i bez připojených klientů či scheduleru. */
export function settle(game, now) {
  if (game.startedAt && now >= deadline(game)) finish(game, deadline(game), 'time-limit')
}
export function roundCommand(game, uid, action, body, now) {
  const me = game.members?.[uid]
  if (!me) fail('Nejste členem hry.')
  if (!game.startedAt) fail('Hra ještě nezačala.')
  settle(game, now)
  if (action === 'sync-round') return
  const manager = ['host','deputy'].includes(me.role)
  const id = body.operationId
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) fail('Chybí ID operace.')
  game.round ??= {}
  const round = game.round
  round.operations ??= {}
  const prior = round.operations[id]
  const target = body.playerId ?? me.playerId
  if (prior) {
    if (prior.uid !== uid || prior.action !== action || prior.target !== target || (prior.captureId ?? null)!==(body.captureId ?? null)) fail('ID operace již bylo použito.')
    return
  }
  if (Object.keys(round.operations).length >= 2000) fail('Limit akcí kola byl vyčerpán.')
  const player = Object.values(game.members).find(m => m.playerId === target)
  if (action === 'end-round') {
    if (!manager) fail('Konec potvrzuje vedoucí nebo zástupce.')
    finish(game, now, 'manager')
  } else {
    if (!player || player.team !== 'fugitive') fail('Chycení se týká uprchlíka.')
    if (!manager && target !== me.playerId) fail('Můžete potvrdit pouze vlastní chycení.')
    round.captures ??= {}
    const capture = round.captures[target]
    if (action === 'capture') {
      if (round.endedAt) fail('Hra již skončila; nové chycení nelze zapsat.')
      if (now < game.startedAt + game.settings.headStartMs) fail('Lov ještě nezačal.')
      if (!capture || capture.correctedAt) round.captures[target] = { at:now, uid, operationId:id }
      const fugitives = Object.values(game.members).filter(m => m.team === 'fugitive')
      if (fugitives.length && fugitives.every(m => round.captures[m.playerId] && !round.captures[m.playerId].correctedAt)) finish(game, now, 'all-captured')
    } else if (action === 'correct-capture') {
      if (!capture || capture.correctedAt) fail('Aktivní chycení již neexistuje.')
      if (body.captureId !== capture.operationId) fail('Chycení se změnilo; obnovte stav.')
      if (round.endedAt && !manager) fail('Po konci opravuje výsledek pouze vedoucí.')
      capture.correctedAt = now; capture.correctedBy = uid
    } else fail('Neznámá operace kola.')
  }
  round.operations[id] = { uid, action, target, at:now, ...(body.captureId ? {captureId:body.captureId} : {}) }
}
