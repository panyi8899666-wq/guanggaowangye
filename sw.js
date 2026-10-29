/* 正鑫越文化传播个人工作室 — Service Worker
   位于站点根目录，作用域覆盖 GitHub Pages 子路径 /guanggaowangye/。
   缓存应用外壳与核心资源，支持离线访问；图片走缓存优先策略。
   改版时递增 VERSION，页面会提示用户刷新到新版本。 */
var VERSION = 'zxy-pwa-v18';
var CORE_CACHE = VERSION + '-core';
var RUNTIME_CACHE = VERSION + '-runtime';

var ROOT = new URL('./', self.location.href).href;
var ASSET = new URL('assets/', self.location.href).href;

var CORE_ASSETS = [
  ROOT,
  new URL('index.html', self.location.href).href,
  ASSET + 'manifest.json',
  ASSET + 'icon-192.png',
  ASSET + 'icon-512.png',
  ASSET + 'icon-maskable-512.png',
  ASSET + 'apple-touch-icon.png',
  ASSET + 'p01-sparkling-water-render-800.webp',
  ASSET + 'assistant-avatar-wave.webp',
  ASSET + 'r/assistant-avatar-wave-w220.webp',
  new URL('assets/css/site.07003e82.css', self.location.href).href,
  new URL('assets/js/app.e58dbfb7.js', self.location.href).href
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CORE_CACHE).then(function (cache) {
      /* 逐个加入，单个资源失败不阻断整体安装 */
      return Promise.all(CORE_ASSETS.map(function (url) {
        return cache.add(url).catch(function () { /* 忽略单个失败 */ });
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CORE_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function putInCache(cacheName, request, response) {
  var copy = response.clone();
  caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
  return response;
}

function isThirdParty(url) {
  if (url.origin !== self.location.origin) return true;
  /* 客服 SDK 即使被拷到同源，也不要被外壳缓存改写 */
  if (url.hostname === 'trtc.io' || /(^|\.)trtc\.io$/i.test(url.hostname)) return true;
  if (url.pathname.indexOf('knocket-sdk') !== -1) return true;
  return false;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* 第三方请求（含 https://trtc.io 客服脚本及其资源）不拦截、不缓存 */
  if (isThirdParty(url)) return;

  /* 页面导航：网络优先，断网时回退到缓存的外壳 */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        return putInCache(CORE_CACHE, new URL('index.html', self.location.href).href, response);
      }).catch(function () {
        return caches.match(new URL('index.html', self.location.href).href, { ignoreSearch: true })
          .then(function (cached) { return cached || caches.match(ROOT, { ignoreSearch: true }); });
      })
    );
    return;
  }

  /* 图片：缓存优先，命中直接返回，未命中联网后回填缓存 */
  var isImage = request.destination === 'image' ||
    /\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?.*)?$/i.test(url.pathname);
  if (isImage) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            return putInCache(RUNTIME_CACHE, request, response);
          }
          return response;
        });
      })
    );
    return;
  }

  /* 其余同源资源（脚本、样式、清单）：先缓存后网络（stale-while-revalidate） */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(request).then(function (response) {
          if (response && response.status === 200) return putInCache(RUNTIME_CACHE, request, response);
          return response;
        }).catch(function () { return cached; });
        return cached || network;
      })
    );
  }
});
