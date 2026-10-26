import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

function worker() {
  const listeners:Record<string,(event:unknown)=>void>={}
  const cache={addAll:vi.fn(async()=>{}),match:vi.fn(async()=>new Response('shell'))}
  const caches={open:vi.fn(async()=>cache),keys:vi.fn(async()=>['other-app','mvhunt:/MVHunt/:old','mvhunt:/:old','mvhunt:/MVHunt/:new']),delete:vi.fn(async()=>true)}
  const fetch=vi.fn()
  runInNewContext(`const SHELL='/MVHunt/index.html',CACHE='mvhunt:/MVHunt/:new',PREFIX='mvhunt:/MVHunt/:',URLS=['/MVHunt/index.html','/MVHunt/assets/app.js'];`+readFileSync('src/pwa/worker.js','utf8'),{self:{location:{origin:'https://example.test'},registration:{scope:'https://example.test/MVHunt/'},addEventListener:(type:string,fn:(e:unknown)=>void)=>{listeners[type]=fn}},caches,fetch,URL})
  return {listeners,cache,caches,fetch}
}
it('never intercepts API, tokens, Firebase, map tiles, unknown paths, POST or query assets',()=>{
  const {listeners}=worker()
  for(const [path,method,mode] of [
    ['/api/lobby','GET','cors'],['/MVHunt/api/lobby','GET','navigate'],['https://db.firebaseio.com/games.json','GET','cors'],['https://tile.openstreetmap.org/1/2/3.png','GET','cors'],['/MVHunt/private','GET','navigate'],['/MVHunt/assets/app.js?token=secret','GET','cors'],['/MVHunt/','POST','navigate'],
  ]) {
    const respondWith=vi.fn()
    listeners.fetch({request:{url:new URL(path,'https://example.test').href,method,mode},respondWith})
    expect(respondWith,path).not.toHaveBeenCalled()
  }
})
it('serves the installed version of shell for offline reload including join query; caches no query',async()=>{
  const {listeners,cache,fetch}=worker()
  for(const path of ['/MVHunt/','/MVHunt/?game=synthetic','/MVHunt/index.html']) {
    let response!:Promise<Response>
    listeners.fetch({request:{url:'https://example.test'+path,method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>{response=p}})
    expect(await (await response).text()).toBe('shell');expect(cache.match).toHaveBeenLastCalledWith('/MVHunt/index.html')
  }
  expect(fetch).not.toHaveBeenCalled()
})
it('activation only removes older caches in its own scope',async()=>{
  const {listeners,caches}=worker()
  let done!:Promise<unknown>
  listeners.activate({waitUntil:(p:Promise<unknown>)=>{done=p}});await done
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith('mvhunt:/MVHunt/:old')
})
it('install failure is propagated so an incomplete shell cannot replace a working version',async()=>{
  const {listeners,cache}=worker()
  cache.addAll.mockRejectedValueOnce(new Error('offline'))
  let done!:Promise<unknown>
  listeners.install({waitUntil:(p:Promise<unknown>)=>{done=p}})
  await expect(done).rejects.toThrow('offline')
})
