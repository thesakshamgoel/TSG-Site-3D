/**
 * Minimal, safe service worker — just enough to make the site installable as
 * an app and resilient offline, without ever serving stale content.
 *
 * Strategy:
 *  • Navigations (HTML): network-first, fall back to the cached shell offline.
 *    → always fresh when online; still opens when the network is gone.
 *  • Hashed build assets (/assets/*): cache-first (content-hashed URLs, so a
 *    new deploy = new URLs and the cache can't go stale).
 *  • Unhashed files (images in /graphics, /stills, …): NETWORK-FIRST — these
 *    are editable in place without a new URL, so a cache-first policy would
 *    pin the old bytes (this is exactly the stale black-edged photo bug).
 *    The cached copy is only the offline fallback.
 *  • Everything cross-origin (YouTube, Firebase, fonts CDN): left to the network.
 */
const VERSION = 'sg-v3' // bump to force every device to drop its old cache
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const BASE = new URL('./', self.location).pathname
const SHELL_URLS = [BASE, BASE + 'index.html', BASE + 'favicon.svg', BASE + 'manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // only handle same-origin; let YouTube / Firebase / fonts hit the network
  if (url.origin !== self.location.origin) return

  // HTML navigations → network-first with offline shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put(BASE, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(BASE).then((r) => r || caches.match(BASE + 'index.html')))
    )
    return
  }

  // hashed build assets → cache-first (new deploys use new URLs)
  if (/\/assets\//.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(ASSETS).then((c) => c.put(request, copy)).catch(() => {})
            return res
          })
      )
    )
    return
  }

  // unhashed static files (photos, fonts, icons) → network-first with offline
  // fallback: always serve the current bytes, keep the cache only for offline
  if (/\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(ASSETS).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(request))
    )
  }
})
