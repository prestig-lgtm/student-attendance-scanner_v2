const CACHE_NAME = 'psabe-ppg-attendance-v8';

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

/* =====================================================
   INSTALL
===================================================== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
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


/* =====================================================
   ACTIVATE
===================================================== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});


/* =====================================================
   FETCH
===================================================== */
self.addEventListener('fetch', event => {
  const request = event.request;

  /*
    Only handle GET requests.
    POST requests to Google Apps Script must go
    directly to the network.
  */
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);


  /* ===================================================
     HTML / NAVIGATION REQUESTS

     Always prefer the cached app shell for offline use,
     while refreshing index.html from the network when
     internet is available.
  =================================================== */

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


          /*
            Use cached version immediately when available.
            If there is no cache, use the network response.
          */
          return cached || networkRefresh.then(response => {
            return response || caches.match('./index.html');
          });

        })
    );

    return;
  }


  /* ===================================================
     OTHER GET REQUESTS

     Use cached resources first.
     If not cached, request from network and cache
     same-origin resources for future offline use.
  =================================================== */

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
