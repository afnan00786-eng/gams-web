/**
 * syncManager.ts
 * 
 * Flushes the offline action queue when internet connection is restored.
 * Purely additive - does NOT modify existing stores or API logic.
 * 
 * Usage: call initSyncManager() once on app start (in RealtimeProvider).
 */

import { getPendingActions, removeAction } from './offlineQueue';
import { useTripStore } from '@/store/useTripStore';
import { useStockStore } from '@/store/useStockStore';

let isSyncing = false;

/** Send all pending offline actions to the server */
export async function syncPendingQueue(): Promise<number> {
    if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return 0;

    const pending = await getPendingActions();
    if (pending.length === 0) return 0;

    isSyncing = true;
    console.log(`[SyncManager] Syncing ${pending.length} pending action(s)...`);

    let syncedCount = 0;

    for (const action of pending) {
        try {
            const res = await fetch(action.url, {
                method: action.method,
                headers: { 'Content-Type': 'application/json' },
                body: action.body,
            });

            if (res.ok) {
                if (action.id !== undefined) {
                    await removeAction(action.id);
                }
                syncedCount++;
                console.log(`[SyncManager] Synced: ${action.method} ${action.url}`);
            } else if (res.status >= 400 && res.status < 500) {
                // Client error (e.g. 400 Bad Request, 404 Not Found) - discard to avoid permanent queue clog
                console.warn(`[SyncManager] Discarding non-retryable action (${res.status}): ${action.method} ${action.url}`);
                if (action.id !== undefined) {
                    await removeAction(action.id);
                }
            } else {
                const errText = await res.text().catch(() => '');
                console.warn(`[SyncManager] Server rejected: ${action.method} ${action.url} (${res.status}):`, errText);
                // Keep 500s in queue for next retry
            }
        } catch (e) {
            console.error(`[SyncManager] Network error syncing action:`, e);
            // Break loop if connection dropped during flush
            break;
        }
    }

    isSyncing = false;

    if (syncedCount > 0) {
        // 1. Immediately refresh stores directly
        try {
            useTripStore.getState().fetchTrips();
            useStockStore.getState().fetchStock();
        } catch (e) { }

        // 2. Dispatch a custom event so UI components can update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gams-sync-complete', { detail: { syncedCount } }));
        }
    }

    return syncedCount;
}

/** Initialize sync listeners - call once on app start */
export function initSyncManager(): () => void {
    const triggerSync = async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            await syncPendingQueue();
        }
    };

    const handleOnline = () => {
        console.log('[SyncManager] Online event detected! Syncing queue...');
        triggerSync();
    };

    const handleVisibility = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            console.log('[SyncManager] Page visible, checking pending sync...');
            triggerSync();
        }
    };

    const handleFocus = () => {
        triggerSync();
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
    }

    // Periodic check every 15s in case online event didn't fire (common on mobile PWAs)
    const intervalId = setInterval(() => {
        triggerSync();
    }, 15000);

    // Initial sync check
    triggerSync();

    // Cleanup
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        }
        clearInterval(intervalId);
    };
}
