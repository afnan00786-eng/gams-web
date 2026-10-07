'use client';

/**
 * OnlineBanner.tsx
 *
 * Shows a small status banner when the user goes offline or comes back online.
 * Also shows how many actions are pending sync.
 * Purely additive UI - does not affect any business logic.
 */

import { useEffect, useState } from 'react';
import { getPendingCount } from '@/lib/offlineQueue';
import { syncPendingQueue } from '@/lib/syncManager';

export function OnlineBanner() {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSyncDone, setShowSyncDone] = useState(false);
    const [isManualSyncing, setIsManualSyncing] = useState(false);

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        const handleOnline = async () => {
            setIsOnline(true);
            const count = await getPendingCount();
            setPendingCount(count);
        };

        const handleOffline = async () => {
            setIsOnline(false);
            const count = await getPendingCount();
            setPendingCount(count);
        };

        const handleOfflineAction = async () => {
            const count = await getPendingCount();
            setPendingCount(count);
        };

        const handleSyncComplete = async () => {
            const count = await getPendingCount();
            setPendingCount(count);
            setShowSyncDone(true);
            setTimeout(() => setShowSyncDone(false), 3000);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('gams-offline-action', handleOfflineAction);
        window.addEventListener('gams-sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('gams-offline-action', handleOfflineAction);
            window.removeEventListener('gams-sync-complete', handleSyncComplete);
        };
    }, []);

    const handleManualSync = async () => {
        setIsManualSyncing(true);
        await syncPendingQueue();
        setIsManualSyncing(false);
    };

    if (isOnline && !showSyncDone && pendingCount === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                background: showSyncDone
                    ? '#16a34a'     // Green when sync done
                    : !isOnline
                        ? '#dc2626'      // Red when offline
                        : '#f97316',     // Orange when pending sync
                transition: 'background 0.3s ease',
                whiteSpace: 'nowrap',
            }}
        >
            {showSyncDone ? (
                <>✅ Data synced successfully!</>
            ) : !isOnline ? (
                <>
                    📴 Offline mode
                    {pendingCount > 0 && <span style={{ opacity: 0.8 }}> — {pendingCount} action{pendingCount > 1 ? 's' : ''} pending</span>}
                </>
            ) : (
                <>
                    🔄 Syncing {pendingCount} action{pendingCount > 1 ? 's' : ''}...
                    <button
                        onClick={handleManualSync}
                        disabled={isManualSyncing}
                        style={{
                            marginLeft: '8px',
                            background: '#fff',
                            color: '#c2410c',
                            border: 'none',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {isManualSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </>
            )}
        </div>
    );
}
