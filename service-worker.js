const CACHE_NAME = 'psabe-ppg-attendance-v5';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './html5-qrcode.min.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/psabe-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // Cache each asset independently.
        // If an optional asset is missing from the deployment,
        // the service worker will still install successfully.
        await Promise.all(
          APP_SHELL.map(async asset => {
            try {
              const response = await fetch(asset, {
                cache: 'no-store'
              });

              if (response && response.ok) {
                await cache.put(asset, response);
              }
            } catch (error) {
              console.warn(
                'Offline cache skipped:',
                asset,
                error
              );
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});


self.addEventListener('activate', event => {
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


self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);


  /*
   * APP NAVIGATION
   *
   * Cache-first strategy:
   * - If the app is already cached, open it immediately offline.
   * - When internet is available, refresh the cached index.html
   *   in the background.
   */
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      caches.match(request)
        .then(cached => {

          const networkRefresh = fetch(request, {
            cache: 'no-store'
          })
            .then(response => {

              if (response && response.ok) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(
                      './index.html',
                      response.clone()
                    );
                  });
              }

              return response;
            })
            .catch(() => null);


          // Return cached app immediately if available.
          return cached || networkRefresh.then(response =>
            response || caches.match('./index.html')
          );
        })
    );

    return;
  }


  /*
   * STATIC APP ASSETS
   *
   * Cache-first:
   * - Use the cached version when available.
   * - If not cached, request it from the network.
   * - Successfully downloaded same-origin assets are then cached.
   */
  event.respondWith(
    caches.match(request)
      .then(cached => {

        if (cached) {
          return cached;
        }


        return fetch(request)
          .then(response => {

            if (
              response &&
              response.ok &&
              new URL(request.url).origin === self.location.origin
            ) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(
                    request,
                    response.clone()
                  );
                });
            }

            return response;
          });
      })
  );
});
