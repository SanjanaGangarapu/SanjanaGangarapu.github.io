/* Family Recipe Book — offline cache.
   Bump CACHE when any precached file changes, so phones pick up the new copy. */
var CACHE = 'frb-v4';

var SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/capture.js',
  'data/recipes.json',
  'data/photo-credits.json',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

var PHOTOS = [
  'assets/photos/akki-rotti.jpg',
  'assets/photos/atta-masala-dosa-batter.jpg',
  'assets/photos/bean-corn-tacos.jpg',
  'assets/photos/beerkaya-nichadkaya.jpg',
  'assets/photos/bisi-bele-bath-powder.jpg',
  'assets/photos/chirmuri.jpg',
  'assets/photos/corn-pulav.jpg',
  'assets/photos/dal-and-rice.jpg',
  'assets/photos/dhokla.jpg',
  'assets/photos/dosakayi-sasuva.jpg',
  'assets/photos/fried-rice.jpg',
  'assets/photos/ghee-rice.jpg',
  'assets/photos/idli-sambar.jpg',
  'assets/photos/overnight-oats.jpg',
  'assets/photos/palak-pappu.jpg',
  'assets/photos/pesarattu.jpg',
  'assets/photos/pesarubal-pappu-dry.jpg',
  'assets/photos/pesarubal-pappu-rice.jpg',
  'assets/photos/pitaka-pappu.jpg',
  'assets/photos/poppu.jpg',
  'assets/photos/potato-palya.jpg',
  'assets/photos/potato-vapudu.jpg',
  'assets/photos/pudina-chutney.jpg',
  'assets/photos/pulusu.jpg',
  'assets/photos/ragi-dosa.jpg',
  'assets/photos/rasam.jpg',
  'assets/photos/rava-dosa.jpg',
  'assets/photos/rava-pulav.jpg',
  'assets/photos/sabakki-uppittu.jpg',
  'assets/photos/sorekay-chapatti.jpg',
  'assets/photos/ujjo-rotti.jpg',
  'assets/photos/veg-pulav.jpg',
  'assets/photos/vegetable-fry.jpg',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        // Photos are best effort: one 404 must not fail the whole install.
        c.addAll(PHOTOS.map(function (p) { return new Request(p, {cache:'reload'}); }))
         .catch(function () {});
        return c.addAll(SHELL);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Cross-origin (fonts, YouTube thumbnails): cache what succeeds, fall back to
  // whatever we already hold. Never let a failure break the page.
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  // Same origin: network first so edits show up, cache as the safety net.
  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('index.html');
        });
      })
  );
});
