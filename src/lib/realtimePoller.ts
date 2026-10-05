/**
 * realtimePoller.ts
 *
 * Polls the server every 30 seconds when online and tab is visible,
 * dispatching a 'gams-data-refresh' event so stores can re-fetch.
 *
 * Purely additive - no existing store logic is changed.
 */

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollerTimer: ReturnType<typeof setTimeout> | null = null;

function shouldPoll(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        navigator.onLine &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
    );
}

function dispatchRefresh() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gams-data-refresh'));
    }
}

function scheduleNextPoll() {
    pollerTimer = setTimeout(async () => {
        if (shouldPoll()) {
            dispatchRefresh();
        }
        scheduleNextPoll(); // Always reschedule
    }, POLL_INTERVAL_MS);
}

/** Start the real-time poller. Returns a cleanup function. */
export function startRealtimePoller(): () => void {
    // Poll when tab becomes visible again
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            dispatchRefresh();
        }
    };

    // Poll when coming back online
    const handleOnline = () => {
        dispatchRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Start the interval loop
    scheduleNextPoll();

    // Cleanup function
    return () => {
        if (pollerTimer !== null) {
            clearTimeout(pollerTimer);
            pollerTimer = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
    };
}
