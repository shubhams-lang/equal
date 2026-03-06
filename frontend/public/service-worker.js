/* 
  Anonymous Chat PWA Service Worker
  Optimized for React + Vercel + Realtime Apps
*/

const CACHE_VERSION = "anonchat-v2";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

/* Files to precache */
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

/* ---------------- INSTALL ---------------- */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/* ---------------- ACTIVATE ---------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      /* Clear old caches */
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        );
      }),

      /* Enable faster navigation */
      self.registration.navigationPreload?.enable()
    ])
  );

  self.clients.claim();
});

/* ---------------- FETCH STRATEGY ---------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* Ignore sockets, APIs, Vercel internals */
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/socket") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes("vercel")
  ) {
    return;
  }

  /* ---------------- HTML -> Network First ---------------- */
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();

          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(req, copy);
          });

          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/index.html");
        })
    );
    return;
  }

  /* ---------------- Static Assets -> Cache First ---------------- */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200) return res;

          const copy = res.clone();

          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(req, copy);
          });

          return res;
        })
        .catch(() => caches.match(req));
    })
  );
});

/* ---------------- BACKGROUND SYNC (Future Chat Queue) ---------------- */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-chat-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  /* Placeholder for offline message sending */
  return Promise.resolve();
}

/* ---------------- PUSH NOTIFICATIONS ---------------- */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const title = data.title || "Anonymous Chat";

  const options = {
    body: data.body || "New message received",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ---------------- NOTIFICATION CLICK ---------------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});