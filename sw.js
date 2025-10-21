// Service Worker für DreamSphere PWA
const CACHE_NAME = 'dreamsphere-v1.1.0';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/ui.js',
    '/storage.js',
    '/manifest.json'
];

// Dateien die immer frisch vom Netzwerk geladen werden sollen
const NETWORK_FIRST_URLS = [
    '/app.js',
    '/ui.js',
    '/storage.js',
    '/style.css'
];

// Installation des Service Workers
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('Service Worker: App Shell cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Aktivierung des Service Workers
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch Event - Cache First Strategy für statische Ressourcen
self.addEventListener('fetch', (event) => {
    // Nur GET-Requests cachen
    if (event.request.method !== 'GET') {
        return;
    }

    // API-Calls nicht cachen
    if (event.request.url.includes('/api.php') || event.request.url.includes('/transcribe.php')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Fallback für offline API-Calls
                    return new Response(
                        JSON.stringify({
                            error: 'Offline - API nicht verfügbar',
                            offline: true
                        }),
                        {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                })
        );
        return;
    }

    // Prüfe ob URL Network First verwenden soll
    const url = new URL(event.request.url);
    const useNetworkFirst = NETWORK_FIRST_URLS.some(path => url.pathname.endsWith(path));

    if (useNetworkFirst) {
        // Network First Strategy für JS/CSS - immer aktuelle Version laden
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Nur erfolgreiche Responses cachen
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch((error) => {
                    console.log('Service Worker: Network failed, trying cache', event.request.url);
                    // Fallback zu Cache wenn Netzwerk nicht verfügbar
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache First Strategy für statische Ressourcen (Icons, Manifest, etc.)
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('Service Worker: Serving from cache', event.request.url);
                        return cachedResponse;
                    }

                    console.log('Service Worker: Fetching from network', event.request.url);
                    return fetch(event.request)
                        .then((response) => {
                            // Nur erfolgreiche Responses cachen
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            // Response klonen für Cache
                            const responseToCache = response.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });

                            return response;
                        })
                        .catch((error) => {
                            console.error('Service Worker: Fetch failed', error);

                            // Fallback für HTML-Requests
                            if (event.request.headers.get('accept').includes('text/html')) {
                                return caches.match('/index.html');
                            }

                            throw error;
                        });
                })
        );
    }
});

// Background Sync für offline Funktionalität
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync-dreams') {
        event.waitUntil(syncDreams());
    }
});

// Push Notifications (für zukünftige Erweiterungen)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Neue Nachricht von DreamSphere',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Öffnen',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Schließen',
                icon: '/icons/icon-192x192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('DreamSphere', options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click received');
    
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Hilfsfunktion für Background Sync
async function syncDreams() {
    try {
        // Hier könnte später eine Synchronisation mit einem Server implementiert werden
        console.log('Service Worker: Syncing dreams...');
        
        // Placeholder für zukünftige Server-Synchronisation
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: Sync failed', error);
        throw error;
    }
}

// Message Handler für Kommunikation mit der App
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
});

// Error Handler
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error occurred', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});

