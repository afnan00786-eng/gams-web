/**
 * syncManager.ts
 * 
 * Flushes the offline action queue when internet connection is restored.
 * Purely additive - does NOT modify existing stores or API logic.
 * 
 * Usage: call initSyncManager() once on app start (in RealtimeProvider).
 */

import { getPendingActions, removeAction } from './offlineQueue';

let isSyncing = false;

/** Send all pending offline actions to the server */
export async function syncPendingQueue(): Promise<number> {
    if (isSyncing || !navigator.onLine) return 0;

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
            } else {
                console.warn(`[SyncManager] Server rejected: ${action.method} ${action.url} (${res.status})`);
                // Keep it in queue for next sync attempt
            }
        } catch (e) {
            console.error(`[SyncManager] Network error syncing action:`, e);
            // Keep in queue - will retry next time
            break;
        }
    }

    isSyncing = false;

    if (syncedCount > 0) {
        // Dispatch a custom event so UI can refresh data
        window.dispatchEvent(new CustomEvent('gams-sync-complete', { detail: { syncedCount } }));
    }

    return syncedCount;
}

/** Initialize sync listeners - call once on app start */
export function initSyncManager(): () => void {
    const handleOnline = async () => {
        console.log('[SyncManager] Back online! Attempting sync...');
        const count = await syncPendingQueue();
        if (count > 0) {
            console.log(`[SyncManager] Successfully synced ${count} pending action(s).`);
        }
    };

    window.addEventListener('online', handleOnline);

    // Also attempt sync immediately in case we just loaded while online
    if (navigator.onLine) {
        syncPendingQueue();
    }

    // Cleanup
    return () => {
        window.removeEventListener('online', handleOnline);
    };
}
