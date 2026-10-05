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
            trips: [], // Initial empty
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
                        set({
                            trips: data,
                            activeTrips: data.filter((t: Trip) => t.status === 'OUT').length
                        });
                    }
                } catch (e) {
                    console.error("Failed to fetch trips", e);
                }
            },

            startTrip: async (tripData) => {
                try {
                    const res = await offlineFetch('/api/trips', {
                        method: 'POST',
                        body: JSON.stringify(tripData),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (res.ok) {
                        await get().fetchTrips(); // Refresh to get real ID and DB state immediately
                    } else {
                        console.error("Failed to start trip API");
                    }
                } catch (e) {
                    console.error("Error starting trip:", e);
                }
            },

            completeTrip: async (id, returnedItems, expenses) => {
                try {
                    const res = await offlineFetch('/api/trips', {
                        method: 'PATCH',
                        body: JSON.stringify({ id, returnedItems, expenses }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.ok) {
                        await get().fetchTrips();
                    } else {
                        console.error("Failed to complete trip API");
                    }
                } catch (e) {
                    console.error("Error completing trip:", e);
                }
            },

            deleteTrip: async (id) => {
                try {
                    const res = await offlineFetch(`/api/trips?id=${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        await get().fetchTrips();
                    } else {
                        console.error("Failed to delete trip API");
                    }
                } catch (e) {
                    console.error("Error deleting trip:", e);
                }
            },
            updateTrip: async (id, tripData) => {
                try {
                    const res = await offlineFetch('/api/trips', {
                        method: 'PUT',
                        body: JSON.stringify({ id, ...tripData }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.ok) {
                        await get().fetchTrips();
                    } else {
                        console.error("Failed to update trip API");
                    }
                } catch (e) {
                    console.error("Error updating trip:", e);
                }
            },
        }),
        {
            name: 'gams-trip-storage',
            partialize: (state) => ({ trips: [] }), // Don't persist, always fetch
        }
    )
);
