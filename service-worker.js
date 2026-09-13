const CACHE_NAME = "student-attendance-v9";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./html5-qrcode.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
 * Navigation / index.html:
 * Always try the network first so GitHub Pages does not keep
 * serving an old cached index.html after deployment.
 */
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Network-first for page navigation and index.html
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/index.html")
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => {
            return cached || caches.match("./index.html");
          })
        )
    );

    return;
  }

  /*
   * Other files:
   * Try cache first, then network.
   */
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (
              response &&
              response.ok &&
              url.origin === self.location.origin
            ) {
              const copy = response.clone();

              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, copy);
              });
            }

            return response;
          });
      })
  );
});
