import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'
import assert from 'node:assert/strict'

async function availablePort() {
  const socket=createServer()
  socket.listen(0,'127.0.0.1');await once(socket,'listening')
  const port=socket.address().port
  await new Promise(resolve=>socket.close(resolve))
  return port
}
for (const local of [true,false]) test(`HTTP liveness and access boundaries (${local ? 'loopback emulators' : 'public host'})`,async()=>{
  const port=await availablePort()
  const env={...process.env,PORT:String(port),LOBBY_EMULATORS:String(local),GOOGLE_CLOUD_PROJECT:'demo-mvhunt',LOBBY_DATABASE_URL:'https://demo-mvhunt.firebaseio.com',LOBBY_ORIGIN:local?'http://localhost:5173':'https://example.test'}
  // No real credentials or external Firebase connections in this liveness test.
  delete env.GOOGLE_APPLICATION_CREDENTIALS
  delete env.FIREBASE_AUTH_EMULATOR_HOST
  delete env.FIREBASE_DATABASE_EMULATOR_HOST
  const child=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']})
  let timer
  try {
    const [output]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(()=>{throw new Error('Server skončil před spuštěním.')}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timeout spuštění serveru.')),8000)}),
    ])
    clearTimeout(timer)
    assert.match(String(output),new RegExp(`${local?'127\\.0\\.0\\.1':'0\\.0\\.0\\.0'}:${port}`))
    const base=`http://127.0.0.1:${port}`
    const health=await fetch(base+'/healthz')
    assert.equal(health.status,200)
    assert.equal(health.headers.get('cache-control'),'no-store')
    assert.deepEqual(await health.json(),{status:'ok'})
    const head=await fetch(base+'/healthz',{method:'HEAD'})
    assert.equal(head.status,200);assert.equal(await head.text(),'')
    assert.equal((await fetch(base+'/healthz',{method:'POST'})).status,403)
    assert.equal((await fetch(base+'/')).status,403)
    assert.equal((await fetch(base+'/api/lobby/create',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400)
    const preflight=await fetch(base+'/api/lobby/create',{method:'OPTIONS',headers:{Origin:env.LOBBY_ORIGIN}})
    assert.equal(preflight.status,204)
    assert.equal(preflight.headers.get('access-control-allow-origin'),env.LOBBY_ORIGIN)
    const foreign=await fetch(base+'/api/lobby/create',{method:'OPTIONS',headers:{Origin:'https://foreign.test'}})
    assert.equal(foreign.status,403)
    assert.equal(foreign.headers.get('access-control-allow-origin'),null)
  } finally {
    clearTimeout(timer)
    const stopped=once(child,'exit');child.kill();if(child.exitCode===null)await stopped
  }
})
