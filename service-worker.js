const cacheName = "cacheAssets-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        cache.addAll([
          "/",
          "/index.html",
          "/css/styles.css",
          "css/onsenui/onsenui.css",
          "css/onsenui/onsen-css-components.css",
          "/pages/register.html",
          "js/onsenui/onsenui.min.js",
          "/images/logo.png",
          "/manifest.json",
          "/js/script.js",
          "icons/favicon-196.png",
          "icons/manifest-icon-192.maskable.png",
          "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js",
          "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js",
          "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"
        ]);
      })
      .catch((_error) => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter((item) => item !== cacheName)
          .map((item) => caches.delete(item))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          return caches.open(cacheName).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
        });
      })
    );
  }
});