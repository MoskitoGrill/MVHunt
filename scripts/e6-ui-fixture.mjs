// Výhradně syntetická UI fixture na izolovaných emulátorech. Nikdy produkce.
import { initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
const uid=process.argv[2]
if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid ?? '') || process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9001') throw new Error('Vyžaduje testovací UID a izolovaný emulátor 127.0.0.1:9001.')
const app=initializeApp({projectId:'demo-mvhunt',databaseURL:'https://demo-mvhunt.firebaseio.com'})
const start=Date.now()-20000
await getDatabase(app).ref('games/e6-ui-synthetic').set({schemaVersion:1,lobbyVersion:2,ownerUid:uid,createdAt:start,
  settings:{headStartMs:1000,huntIntervalMs:5000,huntDurationMs:600000,headIntervalMs:0,maxAgeMs:30000,lateArrivalMs:10000},startedAt:start,
  members:{[uid]:{role:'host',team:'fugitive',nickname:'Testovací uprchlík',playerId:'runner'},synthetic:{role:'fugitive',team:'fugitive',nickname:'Druhý uprchlík',playerId:'runner2'},hunter:{role:'hunter',team:'hunter',nickname:'Testovací lovec',playerId:'hunter'}},
})
console.log('Syntetická hra e6-ui-synthetic připravena; bez poloh a obnovovacího kódu.')
await app.delete()
