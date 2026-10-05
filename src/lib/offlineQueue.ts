/**
 * offlineQueue.ts
 * 
 * Uses IndexedDB (via idb) to store pending API actions when offline.
 * Does NOT touch any existing app logic - purely additive.
 */

import { openDB, IDBPDatabase } from 'idb';

export interface PendingAction {
    id?: number;
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    url: string;
    body: string;
    timestamp: number;
}

const DB_NAME = 'gams-offline-db';
const STORE_NAME = 'pending-actions';
const DB_VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('timestamp', 'timestamp');
            }
        },
    });
}

/** Add a failed/offline action to the queue */
export async function enqueueAction(action: Omit<PendingAction, 'id'>): Promise<void> {
    try {
        const db = await getDB();
        await db.add(STORE_NAME, action);
        console.log('[OfflineQueue] Action queued:', action.method, action.url);
    } catch (e) {
        console.error('[OfflineQueue] Failed to enqueue action:', e);
    }
}

/** Get all pending actions sorted by timestamp */
export async function getPendingActions(): Promise<PendingAction[]> {
    try {
        const db = await getDB();
        return (await db.getAllFromIndex(STORE_NAME, 'timestamp')) as PendingAction[];
    } catch (e) {
        console.error('[OfflineQueue] Failed to get pending actions:', e);
        return [];
    }
}

/** Remove a successfully synced action from the queue */
export async function removeAction(id: number): Promise<void> {
    try {
        const db = await getDB();
        await db.delete(STORE_NAME, id);
    } catch (e) {
        console.error('[OfflineQueue] Failed to remove action:', e);
    }
}

/** Get count of pending offline actions */
export async function getPendingCount(): Promise<number> {
    try {
        const db = await getDB();
        return await db.count(STORE_NAME);
    } catch (e) {
        return 0;
    }
}
