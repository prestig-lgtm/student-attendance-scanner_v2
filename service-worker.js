const CACHE_NAME = 'psabe-ppg-attendance-v3';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /*
   * Always try the network for index.html.
   * This makes sure updates to the attendance system,
   * including the Philippine clock, are picked up.
   */
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() =>
          caches.match(request).then(
            response =>
              response || caches.match('./index.html')
          )
        )
    );

    return;
  }

  /*
   * For other files:
   * Use the cached version when available.
   * If not cached, download it and save it.
   */
  event.respondWith(
    caches.match(request).then(cached =>
      cached ||
      fetch(request).then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, copy);
        });

        return response;
      })
    )
  );
});
