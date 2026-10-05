/**
 * offlineFetch.ts
 *
 * A drop-in replacement for fetch() that:
 * - For GET: tries network, falls back to cache on failure (existing data shown)
 * - For POST/PATCH/PUT/DELETE: if offline, queues the action for later sync
 *
 * IMPORTANT: This does NOT change how data is processed — only whether it's
 * sent now or queued for later. All existing store logic remains unchanged.
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
    try {
        const res = await fetch(url, options);
        if (res.ok) {
            // Cache the successful response for offline use
            cacheResponse(url, res.clone());
        }
        return res;
    } catch (e) {
        // Offline - try to return cached data
        const cached = await getCachedResponse(url);
        if (cached) {
            console.log('[OfflineFetch] Offline - serving cached data for:', url);
            return cached;
        }
        throw e; // Let the store handle the error naturally
    }
}

/** For mutations: if offline, queue them; if online, send normally */
async function mutateWithQueue(
    url: string,
    options?: RequestInit,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST'
): Promise<Response> {
    if (!navigator.onLine) {
        // Queue for later sync
        await enqueueAction({
            method,
            url,
            body: typeof options?.body === 'string' ? options.body : JSON.stringify(options?.body || {}),
            timestamp: Date.now(),
        });

        // Return a fake success response so the store's optimistic path runs
        console.log(`[OfflineFetch] Queued offline action: ${method} ${url}`);

        // Dispatch event so UI can show "saved offline" feedback
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gams-offline-action', { detail: { method, url } }));
        }

        return new Response(JSON.stringify({ ok: true, offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Online - send normally, no change to behavior
    return fetch(url, options);
}

/** Cache a GET response in Cache API */
async function cacheResponse(url: string, res: Response): Promise<void> {
    try {
        if (typeof caches === 'undefined') return;
        const cache = await caches.open(API_CACHE_KEY);
        await cache.put(url, res);
    } catch (e) {
        // Cache API not available (e.g., in non-secure context), silently ignore
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
