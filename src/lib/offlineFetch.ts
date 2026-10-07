/**
 * offlineFetch.ts
 *
 * A drop-in replacement for fetch() that:
 * - For GET: tries network, falls back to cache on failure or if offline.
 * - For POST/PATCH/PUT/DELETE: if offline or if network fails, queues the action in IndexedDB.
 */

import { enqueueAction } from './offlineQueue';

const API_CACHE_KEY = 'gams-api-cache-v1';

/** Offline-aware fetch wrapper */
export async function offlineFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    const method = (options?.method || 'GET').toUpperCase();

    if (method === 'GET') {
        return fetchWithFallback(url, options);
    } else {
        return mutateWithQueue(url, options, method as 'POST' | 'PATCH' | 'PUT' | 'DELETE');
    }
}

/** Try network first, fall back to cache for GET requests */
async function fetchWithFallback(url: string, options?: RequestInit): Promise<Response> {
    // If offline, serve immediately from cache without delay
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await getCachedResponse(url);
        if (cached) {
            return cached;
        }
    }

    try {
        const res = await fetch(url, options);
        if (res.ok) {
            // Cache the successful response for offline use
            cacheResponse(url, res.clone());
        }
        return res;
    } catch (e) {
        // Offline or connection drop - return cached data
        const cached = await getCachedResponse(url);
        if (cached) {
            console.log('[OfflineFetch] Offline - serving cached data for:', url);
            return cached;
        }
        throw e;
    }
}

/** For mutations: if offline or network fails, queue them in IndexedDB for auto-sync */
async function mutateWithQueue(
    url: string,
    options?: RequestInit,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST'
): Promise<Response> {
    const bodyStr = typeof options?.body === 'string' ? options.body : JSON.stringify(options?.body || {});

    // If offline, queue directly
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueAction({
            method,
            url,
            body: bodyStr,
            timestamp: Date.now(),
        });

        console.log(`[OfflineFetch] Queued offline action: ${method} ${url}`);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gams-offline-action', { detail: { method, url } }));
        }

        return new Response(JSON.stringify({ ok: true, offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // If online, attempt network send, but if connection fails, queue for safety
    try {
        const res = await fetch(url, options);
        return res;
    } catch (netError) {
        console.warn(`[OfflineFetch] Network failed for ${method} ${url}, saving to offline queue:`, netError);

        await enqueueAction({
            method,
            url,
            body: bodyStr,
            timestamp: Date.now(),
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gams-offline-action', { detail: { method, url } }));
        }

        return new Response(JSON.stringify({ ok: true, offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/** Cache a GET response in Cache API */
async function cacheResponse(url: string, res: Response): Promise<void> {
    try {
        if (typeof caches === 'undefined') return;
        const cache = await caches.open(API_CACHE_KEY);
        await cache.put(url, res);
    } catch (e) {
        // Silently ignore if Cache API is unavailable
    }
}

/** Get a cached GET response */
async function getCachedResponse(url: string): Promise<Response | undefined> {
    try {
        if (typeof caches === 'undefined') return undefined;
        const cache = await caches.open(API_CACHE_KEY);
        return (await cache.match(url)) || undefined;
    } catch (e) {
        return undefined;
    }
}
