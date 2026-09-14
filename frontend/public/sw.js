/**
 * Digital Menu — production Service Worker
 * Cache versioning: bump CACHE_VERSION when SW logic/shell changes.
 * Menu snapshots live in IndexedDB (managed by the app) and are NOT wiped here.
 */
const CACHE_VERSION = "dm-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = ["/", "/offline", "/logo.png", "/manifest.webmanifest"];

const SENSITIVE_API =
  /\/api\/(auth|admin|orders|table-requests)(\/|$|\?)/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // Ignore individual precache failures (e.g. offline during install).
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith("dm-") && !key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(cacheUrls(data.urls.filter((u) => typeof u === "string")));
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(IMAGE_CACHE);
  const unique = [...new Set(urls)].slice(0, 80);
  await Promise.all(
    unique.map(async (url) => {
      try {
        if (await cache.match(url)) return;
        const res = await fetch(url, { mode: "no-cors", credentials: "omit" });
        // opaque (no-cors) or ok responses are cacheable
        if (res && (res.ok || res.type === "opaque")) {
          await cache.put(url, res);
        }
      } catch {
        // skip failed images
      }
    })
  );
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/logo.png" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/uploads/") ||
    /\.(?:js|css|woff2?|ttf|otf|eot|ico|svg|png|jpg|jpeg|webp|gif|avif)(?:\?|$)/i.test(
      url.pathname
    )
  );
}

function isMenuApi(url) {
  return url.pathname === "/api/menu";
}

function isImageRequest(request, url) {
  if (request.destination === "image") return true;
  if (/\.(?:png|jpg|jpeg|webp|gif|avif|svg)(?:\?|$)/i.test(url.pathname)) return true;
  if (url.hostname.includes("unsplash.com")) return true;
  if (url.hostname.includes("blob.vercel-storage.com")) return true;
  return false;
}

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) return fallback();
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && (fresh.ok || fresh.type === "opaque")) {
    await cache.put(request, fresh.clone());
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (fresh) => {
      if (fresh && (fresh.ok || fresh.type === "opaque")) {
        await cache.put(request, fresh.clone());
      }
      return fresh;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  throw new Error("Network and cache miss");
}

async function offlineDocumentFallback(url) {
  const offlineUrl = new URL("/offline", self.location.origin);
  offlineUrl.searchParams.set("from", url.pathname + url.search);
  // Redirect keeps ?from= in the address bar; /offline handler serves cached shell.
  return Response.redirect(offlineUrl.toString(), 302);
}

function hardcodedOfflineHtml() {
  return new Response(
    "<!doctype html><title>Offline</title><body style='font-family:system-ui;background:#1c1412;color:#f3e9dc;display:grid;place-items:center;min-height:100vh;margin:0'><main style='text-align:center;padding:2rem'><h1>You are offline</h1><p>Open this menu once while online to use it offline.</p></main></body>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache auth/admin/orders/table-requests
  if (isSameOrigin(url) && SENSITIVE_API.test(url.pathname)) {
    return; // default network
  }

  // Menu API — network first, fall back to cache
  if (isSameOrigin(url) && isMenuApi(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // App shell / Next static assets — cache first
  if (isSameOrigin(url) && isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images (local + remote CDN) — stale while revalidate
  if (isImageRequest(request, url)) {
    event.respondWith(
      staleWhileRevalidate(request, IMAGE_CACHE).catch(
        () => new Response("", { status: 404 })
      )
    );
    return;
  }

  // HTML navigations — network first, then page cache, then offline fallback
  const isDocument =
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isDocument && isSameOrigin(url)) {
    // Avoid redirect loops for the offline shell itself
    if (url.pathname === "/offline") {
      event.respondWith(
        (async () => {
          const cache = await caches.open(STATIC_CACHE);
          const cached =
            (await cache.match("/offline")) || (await caches.match("/offline"));
          if (cached) return cached;
          try {
            const fresh = await fetch("/offline");
            if (fresh.ok) await cache.put("/offline", fresh.clone());
            return fresh;
          } catch {
            return hardcodedOfflineHtml();
          }
        })()
      );
      return;
    }

    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            await cache.put(request, fresh.clone());
            // Also warm pathname without search for QR reloads
            if (url.search) {
              const cleanReq = new Request(url.origin + url.pathname);
              await cache.put(cleanReq, fresh.clone());
            }
          }
          return fresh;
        } catch {
          const cached =
            (await cache.match(request)) ||
            (await cache.match(new Request(url.origin + url.pathname))) ||
            (await cache.match(url.origin + url.pathname));
          if (cached) return cached;
          return offlineDocumentFallback(url);
        }
      })()
    );
  }
});
