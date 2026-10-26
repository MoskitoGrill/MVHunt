/* Build injects immutable static allowlist. No runtime data cache, no forced activation. */
/* global SHELL, CACHE, PREFIX, URLS */
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Only exact app root/index navigation: never turn API errors into HTML.
  const root = new URL('./', self.registration.scope).pathname
  const navigation = request.mode === 'navigate' && (url.pathname === root || url.pathname === SHELL)
  const staticFile = !url.search && URLS.includes(url.pathname)
  if (!navigation && !staticFile) return
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(navigation ? SHELL : url.pathname)
    return cached || fetch(request)
  }))
})
