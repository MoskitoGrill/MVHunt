import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const base = process.env.MVHUNT_BASE || '/'
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('MVHUNT_BASE musí být absolutní podcesta s koncovým /')
export default defineConfig({ base, plugins: [react(), {
  name: 'mvhunt-static-pwa', apply: 'build', enforce: 'post',
  generateBundle: { order: 'post', handler(_options, bundle) {
    const files = Object.keys(bundle).filter(name => name === 'index.html' || /^assets\/.*\.(js|css)$/.test(name))
    if (!files.includes('index.html')) throw new Error('PWA build neobsahuje index.html; nelze připravit úplný offline shell')
    const manifest = { id: base, name: 'MVHunt', short_name: 'MVHunt', lang: 'cs', start_url: base, scope: base, display: 'standalone', background_color: '#080c10', theme_color: '#080c10', icons: [192,512].map(size => ({src: `${base}icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable'})) }
    const version = createHash('sha256').update(files.map(name => {
      const item = bundle[name]
      return item.type === 'chunk' ? item.code : String(item.source)
    }).join('')).update(readFileSync('src/pwa/worker.js')).update(readFileSync('public/icon-192.png')).update(readFileSync('public/icon-512.png')).update(JSON.stringify(manifest)).digest('hex').slice(0,16)
    this.emitFile({type:'asset',fileName:'manifest.webmanifest',source:JSON.stringify(manifest)})
    const urls = [...files,'manifest.webmanifest','icon-192.png','icon-512.png'].map(name => base+name)
    const source = `const SHELL = ${JSON.stringify(base+'index.html')};\nconst CACHE = ${JSON.stringify('mvhunt:'+base+':'+version)};\nconst PREFIX = ${JSON.stringify('mvhunt:'+base+':')};\nconst URLS = ${JSON.stringify(urls)};\n` + readFileSync('src/pwa/worker.js','utf8')
    this.emitFile({type:'asset',fileName:'sw.js',source})
  } },
}], server: { proxy: { '/api/lobby': process.env.MVHUNT_LOBBY_PROXY || 'http://127.0.0.1:8787' } } })
