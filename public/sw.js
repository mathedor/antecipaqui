/* Antecipaqui PWA service worker
 *
 * Estratégia:
 *  - Páginas (navigate): network-first com fallback offline
 *  - Assets estáticos (/_next/static, /brand, /icon-*.png): cache-first
 *  - APIs (/api/*) e auth: bypass (sempre network)
 *
 * Versionamento: bump CACHE_VERSION quando quebrar layout/assets.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `antecipaqui-static-${CACHE_VERSION}`;
const PAGES_CACHE = `antecipaqui-pages-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function shouldBypass(url) {
  // APIs, auth, server actions, webhooks — sempre rede
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/entrar") ||
    url.pathname.startsWith("/cadastre-se") ||
    url.pathname.startsWith("/clerk") ||
    url.pathname.includes("__clerk")
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return; // bypass cross-origin
  if (shouldBypass(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok)
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(req, res.clone()));
          return res;
        });
      }),
    );
    return;
  }

  // Navigate / HTML — network first, fallback cache, fallback offline
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok)
            caches.open(PAGES_CACHE).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)),
        ),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
