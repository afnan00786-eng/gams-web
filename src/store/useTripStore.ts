import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { offlineFetch } from '@/lib/offlineFetch';

export interface TripStockItem {
    type: string;
    quantity: number; // cylinders out
    inFull: number;
    inEmpty: number;
    inDefective: number;
}

export interface Trip {
    id: string;
    vehicleNo: string;
    driverName: string;
    destination: string;
    stockItems: string; // JSON stringification of TripStockItem[]
    expenses?: string;  // JSON stringification of expense entries (only on completed trips)
    status: 'OUT' | 'COMPLETED';
    timeOut: string;
    timeIn?: string;
}

interface TripState {
    trips: Trip[];
    activeTrips: number;
    fetchTrips: (date?: Date) => Promise<void>;
    startTrip: (trip: Omit<Trip, 'id' | 'status' | 'timeOut'>) => Promise<void>;
    completeTrip: (id: string, returnedItems: any[], expenses: any[]) => Promise<void>;
    updateTrip: (id: string, tripData: Partial<Trip>) => Promise<void>;
    deleteTrip: (id: string) => Promise<void>;
}

export const useTripStore = create<TripState>()(
    persist(
        (set, get) => ({
            trips: [],
            activeTrips: 0,

            fetchTrips: async (date?: Date) => {
                try {
                    let url = '/api/trips';
                    if (date) {
                        url += `?date=${date.toISOString()}`;
                    }
                    const res = await offlineFetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            set({
                                trips: data,
                                activeTrips: data.filter((t: Trip) => t.status === 'OUT').length
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch trips, keeping offline cache:", e);
                }
            },

            startTrip: async (tripData) => {
                // 1. Optimistically create new trip in state immediately!
                const tempTrip: Trip = {
                    id: 'trip_' + Date.now().toString(36),
                    ...tripData,
                    status: 'OUT',
                    timeOut: new Date().toISOString()
                };

                set((state) => ({
                    trips: [tempTrip, ...state.trips],
                    activeTrips: state.activeTrips + 1
                }));

                // 2. Send or queue for background sync
                try {
                    const res = await offlineFetch('/api/trips', {
                        method: 'POST',
                        body: JSON.stringify(tripData),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (res.ok && navigator.onLine) {
                        get().fetchTrips();
                    }
                } catch (e) {
                    console.error("Offline trip start queued:", e);
                }
            },

            completeTrip: async (id, returnedItems, expenses) => {
                // 1. Optimistically update trip status to COMPLETED immediately!
                set((state) => {
                    const updatedTrips = state.trips.map((t) => {
                        if (t.id !== id) return t;
                        return {
                            ...t,
                            status: 'COMPLETED' as const,
                            timeIn: new Date().toISOString(),
                            expenses: JSON.stringify(expenses)
                        };
                    });
                    return {
                        trips: updatedTrips,
                        activeTrips: Math.max(0, state.activeTrips - 1)
                    };
                });

                // 2. Send or queue for sync
                try {
                    const res = await offlineFetch('/api/trips', {
                        method: 'PATCH',
                        body: JSON.stringify({ id, returnedItems, expenses }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (res.ok && navigator.onLine) {
                        get().fetchTrips();
                    }
                } catch (e) {
                    console.error("Offline trip complete queued:", e);
                }
            },

            deleteTrip: async (id) => {
                set((state) => {
                    const remaining = state.trips.filter((t) => t.id !== id);
                    return {
                        trips: remaining,
                        activeTrips: remaining.filter((t) => t.status === 'OUT').length
                    };
                });

                try {
                    await offlineFetch(`/api/trips?id=${id}`, {
                        method: 'DELETE'
                    });
                } catch (e) {
                    console.error("Offline trip delete queued:", e);
                }
            },

            updateTrip: async (id, tripData) => {
                set((state) => ({
                    trips: state.trips.map((t) => t.id === id ? { ...t, ...tripData } : t)
                }));

                try {
                    await offlineFetch('/api/trips', {
                        method: 'PUT',
                        body: JSON.stringify({ id, ...tripData }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error("Offline trip update queued:", e);
                }
            },
        }),
        {
            name: 'gams-trip-storage',
            partialize: (state) => ({
                trips: state.trips,
                activeTrips: state.activeTrips
            }),
        }
    )
);
