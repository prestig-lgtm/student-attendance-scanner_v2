const CACHE_NAME = 'psabe-ppg-attendance-v6';

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


/* =========================================================
   INSTALL
   ========================================================= */

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


/* =========================================================
   ACTIVATE
   ========================================================= */

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


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener('fetch', event => {

  const request = event.request;

  // Only handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);


  /* =======================================================
     PAGE NAVIGATION
     ======================================================= */

  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {

    event.respondWith(

      caches.match(request)
        .then(cached => {

          /*
           * Refresh the cached index.html in the background
           * whenever internet is available.
           */

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
           * Use cached version immediately when available.
           * This allows the app to open offline.
           */

          return cached ||
            networkRefresh.then(response => {

              return response ||
                caches.match('./index.html');

            });

        })

    );

    return;
  }


  /* =======================================================
     STATIC FILES / ASSETS
     ======================================================= */

  event.respondWith(

    caches.match(request)
      .then(cached => {

        if (cached) {
          return cached;
        }


        /*
         * If the file isn't cached yet, try the network.
         */

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
