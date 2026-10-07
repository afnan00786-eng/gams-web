/**
 * GAMS Progressive Web App - Service Worker
 * Version: 3.0.0
 * 
 * Provides 100% offline access to all app routes, static assets, and cached API data.
 */

const CACHE_NAME = 'gams-v3-cache';

const PRECACHE_ASSETS = [
    '/',
    '/login',
    '/dashboard',
    '/dashboard/stock',
    '/dashboard/trip-log',
    '/dashboard/refill-booking',
    '/dashboard/hawker-accounts',
    '/dashboard/staff-accounts',
    '/dashboard/employees',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install: precache all core pages and assets immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching essential GAMS offline pages...');
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Precache partial fallback:', err);
            });
        })
    );
});

// Activate: clean up any legacy caches and take control immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting legacy cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: intercept all network requests for offline resilience
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Ignore non-http requests (e.g. chrome-extension://)
    if (!request.url.startsWith('http')) return;

    // 1. API Requests: Network First, fallback to cache
    if (request.url.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // 2. HTML Page Navigation: Network First, with immediate cache fallback and offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    // Try exact requested page from cache
                    const cachedPage = await caches.match(request);
                    if (cachedPage) return cachedPage;

                    // Try root or login
                    const loginPage = await caches.match('/login');
                    if (loginPage) return loginPage;

                    // Fallback to offline.html
                    const offlinePage = await caches.match('/offline.html');
                    if (offlinePage) return offlinePage;

                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // 3. Static Assets (CSS, JS, Fonts, Images): Cache First, fallback to network
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => {
                // If an image fails offline, try fallback or ignore
                return new Response('', { status: 404 });
            });
        })
    );
});
