// このファイルはnext-pwaによって自動的に生成されるService Workerに結合されます

// キャッシュするリソースの定義
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192x192.svg',
        '/icons/icon-512x512.svg'
      ]);
    })
  );
});

// オフライン時のフェッチハンドリング
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // オフラインフォールバックページ
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('オフラインです', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          });
      })
  );
});