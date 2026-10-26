import { writeFileSync } from 'node:fs'
const game = "root.child('games').child($g)"
const member = `auth != null && ${game}.child('members').child(auth.uid).exists()`
const manager = `${member} && (${game}.child('members').child(auth.uid).child('role').val() === 'host' || ${game}.child('members').child(auth.uid).child('role').val() === 'deputy')`
const start = `${game}.child('startedAt').val()`
const settings = `${game}.child('settings')`
const head = `${settings}.child('headStartMs').val()`
const interval = `${settings}.child('huntIntervalMs').val()`
const hi = `${settings}.child('headIntervalMs').val()`
const end = `(${start} + ${head} + ${settings}.child('huntDurationMs').val())`
const at = 'newData.child(\'at\').val()'
const due = `${game}.child('startedAt').exists() && ${at} > ${start} && ${at} < ${end} && ((${at} === ${start} + ${head}) || (${at} > ${start} + ${head} && (${at} - ${start} - ${head}) % ${interval} === 0) || (${hi} > 0 && ${at} < ${start} + ${head} && (${at} - ${start}) % ${hi} === 0))`
const number = (min, max) => ({ '.validate': `newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= ${min} && newData.val() <= ${max}` })
const point = {
  '.validate': "newData.hasChildren(['lat','lng','accuracy','measuredAt','receivedAt']) && newData.child('measuredAt').val() <= now && newData.child('receivedAt').val() === now",
  lat: { '.validate': 'newData.isNumber() && newData.val() >= -90 && newData.val() <= 90' },
  lng: { '.validate': 'newData.isNumber() && newData.val() >= -180 && newData.val() <= 180' },
  accuracy: { '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000' },
  measuredAt: number(0, 9007199254740991), receivedAt: number(0, 9007199254740991), '$other': { '.validate': false },
}
const rules = { rules: { '.read': false, '.write': false, games: { '$g': {
  '.write': "auth != null && !data.exists() && newData.child('ownerUid').val() === auth.uid && newData.child('members').child(auth.uid).child('role').val() === 'host' && !newData.child('startedAt').exists() && !newData.child('slots').exists() && !newData.child('private').exists()",
  '.validate': "newData.hasChildren(['schemaVersion','ownerUid','settings','members'])",
  schemaVersion: { '.read': member, '.validate': 'newData.val() === 1' },
  ownerUid: { '.read': member, '.validate': 'newData.isString() && (!data.exists() || newData.val() === data.val())' },
  settings: { '.read': member, '.write': `${manager} && !${game}.child('startedAt').exists() && newData.exists()`,
    '.validate': "newData.hasChildren(['headStartMs','huntIntervalMs','huntDurationMs','headIntervalMs','maxAgeMs','lateArrivalMs'])",
    headStartMs: number(0,86400000), huntIntervalMs: number(1000,86400000), huntDurationMs: number(1,86400000), headIntervalMs: { '.validate': 'newData.isNumber() && newData.val() % 1 === 0 && (newData.val() === 0 || (newData.val() >= 1000 && newData.val() <= 86400000))' }, maxAgeMs: number(0,60000), lateArrivalMs: number(0,30000), '$other': { '.validate': false } },
  members: { '.read': member, '$uid': { '.write': `${manager} && !${game}.child('startedAt').exists() && $uid !== ${game}.child('ownerUid').val() && newData.exists()`,
    '.validate': "newData.hasChildren(['role']) && (root.child('games').child($g).exists() || ($uid === auth.uid && newData.child('role').val() === 'host'))", role: { '.validate': "newData.val() === 'hunter' || newData.val() === 'fugitive' || newData.val() === 'deputy' || (newData.val() === 'host' && $uid === newData.parent().parent().parent().child('ownerUid').val())" }, '$other': { '.validate': false } } },
  startedAt: { '.read': member, '.write': `${manager} && !data.exists() && newData.exists()`, '.validate': 'newData.isNumber() && newData.val() === now' },
  private: { '$uid': { '.read': `${member} && auth.uid === $uid`, '$id': { '.write': `${member} && auth.uid === $uid && !data.exists() && newData.exists() && ${game}.child('startedAt').exists() && now >= ${start} && now < ${end}`, ...point } } },
  slots: { '$at': { '$uid': {
    '.read': `${member} && ${due.replaceAll("newData", "data")} && now >= data.child('at').val()`,
    '.write': `${member} && auth.uid === $uid && ${game}.child('members').child(auth.uid).child('role').val() === 'fugitive' && !data.exists() && newData.exists() && ${due} && now >= ${at} - ${settings}.child('maxAgeMs').val() && now <= ${at} + ${settings}.child('lateArrivalMs').val() && now < ${end}`,
    ...point, at: number(0,9007199254740991),
    '.validate': `${point['.validate']} && $at === newData.child('at').val() + '' && newData.child('measuredAt').val() >= ${at} - ${settings}.child('maxAgeMs').val() && newData.child('measuredAt').val() <= ${at}`,
  } } }, '$other': { '.validate': false },
} } } }
const room = rules.rules.games.$g
// Založení je od E4 výhradně přes ověřené a limitované serverové API.
room['.write'] = false
const legacy = `!${game}.child('lobbyVersion').exists()`
for (const node of [room.settings, room.members.$uid, room.startedAt]) node['.write'] = `(${node['.write']}) && ${legacy}`
room.lobbyVersion = { '.read': member, '.validate': false }
room.requests = { '.read': manager, '$uid': { '.read': 'auth != null && auth.uid === $uid' } }
room.audit = { '.read': manager }
room.presence = { '.read': member, '$uid': {
  '.write': `${member} && auth.uid === $uid && newData.exists()`,
  '.validate': "newData.hasChildren(['online','at'])",
  online: { '.validate': 'newData.isBoolean()' },
  at: { '.validate': 'newData.isNumber() && newData.val() === now' },
  '$other': { '.validate': false },
} }
room.slots.$at.$uid['.write'] = room.slots.$at.$uid['.write'].replace(`${game}.child('members').child(auth.uid).child('role').val() === 'fugitive'`, `(${game}.child('members').child(auth.uid).child('role').val() === 'fugitive' || ${game}.child('members').child(auth.uid).child('team').val() === 'fugitive')`)
const ownPlayer = "auth != null && " + game + ".child('members').child(auth.uid).child('playerId').val() === $uid";
room.slots.$at.$uid['.write'] = room.slots.$at.$uid['.write'].replace('auth.uid === $uid', '(' + ownPlayer + ' || (!' + game + ".child('lobbyVersion').exists() && auth.uid === $uid))");
const hunter = game + ".child('members').child(auth.uid).child('team').val() === 'hunter'";
room.allies = { '.read': member + ' && ' + hunter, '$uid': {
  '.write': member + ' && ' + ownPlayer + ' && ' + hunter + ' && ' + game + ".child('startedAt').exists() && now >= " + start + ' && now < ' + end + ' && newData.exists()',
  ...point,
  '.validate': point['.validate'] + ' && newData.child("measuredAt").val() >= now - 60000 && (!data.exists() || newData.child("measuredAt").val() >= data.child("measuredAt").val())',
} };
room.round = { '.read': member }
const open = `!${game}.child('round').child('endedAt').exists()`
const playerId = `${game}.child('members').child(auth.uid).child('playerId').val()`
const capture = `${game}.child('round').child('captures').child(${playerId})`
const playing = `(${legacy} || !${capture}.exists() || ${capture}.child('correctedAt').exists())`
for (const node of [room.slots.$at.$uid, room.allies.$uid, room.private.$uid.$id]) node['.write'] += ` && ${open} && ${playing}`
// Ani předem zapsaný slot nesmí po předčasném konci odhalit budoucí bod.
room.slots.$at.$uid['.read'] += ` && (${open} || data.child('at').val() < ${game}.child('round').child('endedAt').val())`
const targetCapture = `${game}.child('round').child('captures').child($uid)`
room.slots.$at.$uid['.read'] += ` && (!${targetCapture}.exists() || ${targetCapture}.child('correctedAt').exists() || data.child('at').val() < ${targetCapture}.child('at').val())`
writeFileSync('database.rules.json', JSON.stringify(rules, null, 2) + '\n')

