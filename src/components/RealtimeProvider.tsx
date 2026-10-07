'use client';

/**
 * RealtimeProvider.tsx
 *
 * Client-side provider that:
 * 1. Registers Service Worker for offline PWA operation
 * 2. Background caches critical app pages into Cache Storage
 * 3. Starts the offline sync manager (flushes queue when online)
 * 4. Starts the real-time poller (fires refresh events every 30s)
 * 5. Listens for sync/offline events and triggers store refreshes
 */

import { useEffect } from 'react';
import { initSyncManager } from '@/lib/syncManager';
import { startRealtimePoller } from '@/lib/realtimePoller';
import { useTripStore } from '@/store/useTripStore';
import { useStockStore } from '@/store/useStockStore';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const fetchTrips = useTripStore((s) => s.fetchTrips);
    const fetchStock = useStockStore((s) => s.fetchStock);

    useEffect(() => {
        // 1. Explicit Service Worker registration for Next.js App Router
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    console.log('[PWA] Service Worker registered with scope:', reg.scope);
                })
                .catch((err) => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        }

        // 2. Pre-cache essential app routes in Cache Storage for offline use
        if (typeof window !== 'undefined' && 'caches' in window && navigator.onLine) {
            caches.open('gams-v3-cache').then((cache) => {
                const essentialRoutes = [
                    '/',
                    '/login',
                    '/dashboard',
                    '/dashboard/stock',
                    '/dashboard/trip-log',
                    '/dashboard/refill-booking',
                    '/dashboard/hawker-accounts',
                    '/dashboard/staff-accounts',
                    '/dashboard/employees',
                    '/offline.html'
                ];
                essentialRoutes.forEach((route) => {
                    cache.add(route).catch(() => {});
                });
            }).catch(() => {});
        }

        // 3. Initialize sync manager (handles flushing offline queue on reconnect)
        const cleanupSync = initSyncManager();

        // 4. Start real-time poller (dispatches 'gams-data-refresh' every 30s)
        const cleanupPoller = startRealtimePoller();

        // 5. Listen for refresh event and re-fetch data from stores
        const handleRefresh = () => {
            if (navigator.onLine) {
                fetchTrips();
                fetchStock();
            }
        };

        // 6. After sync completes, also refresh UI
        const handleSyncComplete = () => {
            fetchTrips();
            fetchStock();
        };

        window.addEventListener('gams-data-refresh', handleRefresh);
        window.addEventListener('gams-sync-complete', handleSyncComplete);

        return () => {
            cleanupSync();
            cleanupPoller();
            window.removeEventListener('gams-data-refresh', handleRefresh);
            window.removeEventListener('gams-sync-complete', handleSyncComplete);
        };
    }, [fetchTrips, fetchStock]);

    return <>{children}</>;
}
