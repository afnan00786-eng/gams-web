'use client';

/**
 * RealtimeProvider.tsx
 *
 * Client-side provider that:
 * 1. Starts the offline sync manager (flushes queue when online)
 * 2. Starts the real-time poller (fires refresh events every 30s)
 * 3. Listens for sync/offline events and triggers store refreshes
 *
 * Wrap this around app in layout.tsx. Purely additive.
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
        // Initialize sync manager (handles flushing offline queue on reconnect)
        const cleanupSync = initSyncManager();

        // Start real-time poller (dispatches 'gams-data-refresh' every 30s)
        const cleanupPoller = startRealtimePoller();

        // Listen for refresh event and re-fetch data from stores
        const handleRefresh = () => {
            if (navigator.onLine) {
                fetchTrips();
                fetchStock();
            }
        };

        // After sync completes, also refresh UI
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
