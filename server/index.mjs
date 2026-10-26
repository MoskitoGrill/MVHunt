import { createServer } from 'node:http'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { createLobbyService } from './lobby.mjs'

const local = process.env.LOBBY_EMULATORS === 'true'
if (local) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
  process.env.FIREBASE_DATABASE_EMULATOR_HOST ??= '127.0.0.1:9000'
} else if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_DATABASE_EMULATOR_HOST) throw new Error('Emulátory vyžadují LOBBY_EMULATORS=true.')
const projectId = local ? 'demo-mvhunt' : process.env.GOOGLE_CLOUD_PROJECT
if (!projectId || (!local && !process.env.LOBBY_ORIGIN?.startsWith('https://'))) throw new Error('Chybí serverový projekt nebo HTTPS LOBBY_ORIGIN.')
const app = initializeApp({ projectId, databaseURL: local ? 'https://demo-mvhunt.firebaseio.com' : process.env.LOBBY_DATABASE_URL,
  ...(!local ? { credential: applicationDefault() } : {}) })
const execute = createLobbyService(getDatabase(app))
const origin = local ? (process.env.LOBBY_ORIGIN ?? 'http://localhost:5173') : process.env.LOBBY_ORIGIN
const server = createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Vary','Origin')
  const allowed = req.headers.origin === origin
  if (allowed) res.setHeader('Access-Control-Allow-Origin',origin)
  if (req.method === 'OPTIONS' && allowed) {
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods','POST'); res.writeHead(204).end(); return
  }
  if (req.method !== 'POST' || !/^\/api\/lobby\/[a-z-]+$/.test(req.url ?? '') || (req.headers.origin && !allowed)) { res.writeHead(403).end(); return }
  res.setHeader('Content-Type','application/json; charset=utf-8')
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!token) throw new Error('Chybí přihlášení.')
    const user = await getAuth(app).verifyIdToken(token,true)
    let raw = ''
    for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) throw new Error('Příliš velký požadavek.') }
    const result = await execute(user.uid,req.url.split('/').at(-1),JSON.parse(raw))
    res.writeHead(200).end(JSON.stringify(result))
  } catch (e) { res.writeHead(400).end(JSON.stringify({ error: e instanceof Error ? e.message : 'Operace selhala.' })) }
})
server.requestTimeout = 15000
server.listen(Number(process.env.PORT ?? 8787),'127.0.0.1',() => console.log('Lobby API připraveno na loopback portu 8787.'))
