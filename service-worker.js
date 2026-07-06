const CACHE_NAME = "groovinator-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

// Install Service Worker and cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching initial static assets and external libraries");
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("[Service Worker] Pre-caching failed; some assets might be fetched dynamically:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up older cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing deprecated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interceptor: cache-first approach
self.addEventListener("fetch", (event) => {
  // Only handle HTTP/HTTPS (ignore chrome-extension://, file://, etc.)
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // If it's a valid response, cache external assets like FontAwesome's webfonts dynamically
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes("cdnjs.cloudflare.com") ||
            event.request.url.includes("tailwindcss") ||
            event.request.url.includes("jszip"))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.error("[Service Worker] Fetch failed for:", event.request.url, error);
        // Fallback or simply fail gracefully for network requests
      });
    })
  );
});
