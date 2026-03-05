/* 
  Anonymous Chat PWA Service Worker
  Optimized for React + Vercel + Realtime Apps
*/

const CACHE_VERSION = "anonchat-v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

/* Files to precache */
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico"
];

/* INSTALL */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/* ACTIVATE */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

/* FETCH STRATEGY */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* Ignore socket, api, or non-GET */
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/socket") ||
    url.pathname.startsWith("/api")
  ) {
    return;
  }

  /* HTML -> Network first */
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("/index.html")))
    );
    return;
  }

  /* Static assets -> Cache first */
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

/* BACKGROUND SYNC (Optional future use) */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-chat-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Placeholder for offline message queue
  return Promise.resolve();
}

/* PUSH NOTIFICATIONS (Optional) */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const title = data.title || "Anonymous Chat";
  const options = {
    body: data.body || "New message received",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* NOTIFICATION CLICK */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});