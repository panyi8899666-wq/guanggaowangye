/* 正鑫越文化传播个人工作室 — Service Worker
   缓存应用外壳与核心资源，支持离线访问；图片走缓存优先策略。
   改版时递增 VERSION，页面会提示用户刷新到新版本。 */
var VERSION = 'zxy-pwa-v4';
var CORE_CACHE = VERSION + '-core';
var RUNTIME_CACHE = VERSION + '-runtime';

/* 本文件位于 assets/ 下，站点根目录为其上一级 */
var ROOT = new URL('../', self.location.href).href;

var CORE_ASSETS = [
  ROOT,
  ROOT + 'index.html',
  new URL('manifest.json', self.location.href).href,
  new URL('icon-192.png', self.location.href).href,
  new URL('icon-512.png', self.location.href).href,
  new URL('icon-maskable-512.png', self.location.href).href,
  new URL('apple-touch-icon.png', self.location.href).href,
  new URL('p01-sparkling-water-render.webp', self.location.href).href,
  new URL('assistant-avatar-wave.webp', self.location.href).href,
  new URL('three.min.js', self.location.href).href
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

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* 页面导航：网络优先，断网时回退到缓存的外壳 */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        return putInCache(CORE_CACHE, ROOT + 'index.html', response);
      }).catch(function () {
        return caches.match(ROOT + 'index.html', { ignoreSearch: true })
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
  /* 跨域请求（如在线客服脚本）不拦截，走浏览器默认网络 */
});
