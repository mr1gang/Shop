/* ============================================================
   Service Worker — کارکرد آفلاین و نصب روی موبایل (PWA)
   استراتژی: HTML → شبکه‌اول (با نسخه‌ی ذخیره‌شده در نبود اینترنت)
            سایر فایل‌ها → کش‌اول (سرعت بالا و آفلاین)
   ============================================================ */
var CACHE = 'shop-manager-v1';
var SHELL = [
  './',
  './index.html',
  './admin.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/util.js',
  './assets/js/barcode.js',
  './assets/js/vision.js',
  './assets/js/store.js',
  './assets/js/notify.js',
  './assets/js/nlp.js',
  './assets/js/ui.js',
  './assets/js/app.js',
  './assets/js/dash.js',
  './assets/img/icon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { /* فایل نبود، مهم نیست */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* منابع بیرونی دست‌نخورده */

  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1;
  if (isHTML) {
    /* شبکه‌اول تا تغییرات سایت زود دیده شود */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  /* کش‌اول برای دارایی‌ها */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(req, res); });
        }).catch(function () { });
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok && (url.pathname.indexOf('/assets/') > -1)) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* پیام از صفحه: به‌روزرسانی فوری کش */
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/* برنامه‌ریزی یادآوری: وقتی صفحه پیام می‌دهد، پس از N میلی‌ثانیه نوتیفیکیشن بده */
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'remind') return;
  var title = e.data.title || 'یادآوری فروشگاه';
  var body = e.data.body || 'گزارش روزانه‌ی فروشگاه را ببینید.';
  setTimeout(function () {
    self.registration.showNotification(title, {
      body: body,
      icon: './assets/img/icon-192.png',
      badge: './assets/img/favicon-64.png',
      dir: 'rtl', lang: 'fa'
    });
  }, Math.max(1000, Math.min(e.data.delay || 60000, 12 * 3600 * 1000)));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('admin.html') > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./admin.html');
    })
  );
});
