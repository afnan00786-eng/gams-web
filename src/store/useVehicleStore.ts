import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { offlineFetch } from '@/lib/offlineFetch';

export interface Vehicle {
    id: string;
    number: string;
    type?: string | null;
    createdAt: string;
}

interface VehicleState {
    vehicles: Vehicle[];
    isLoading: boolean;
    error: string | null;
    fetchVehicles: () => Promise<void>;
    addVehicle: (data: { number: string; type?: string }) => Promise<void>;
    removeVehicle: (id: string) => Promise<void>;
}

export const useVehicleStore = create<VehicleState>()(
    persist(
        (set, get) => ({
            vehicles: [],
            isLoading: false,
            error: null,

            fetchVehicles: async () => {
                set({ isLoading: true });
                try {
                    const response = await offlineFetch('/api/vehicles');
                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data) && data.length > 0) {
                            set({ vehicles: data, error: null });
                        }
                    } else {
                        set({ error: 'Failed to fetch vehicles' });
                    }
                } catch (error) {
                    console.warn("fetchVehicles offline fallback:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            addVehicle: async (data) => {
                const tempVehicle: Vehicle = {
                    id: 'veh_' + Date.now().toString(36),
                    number: data.number,
                    type: data.type || null,
                    createdAt: new Date().toISOString()
                };

                set((state) => ({
                    vehicles: [...state.vehicles, tempVehicle]
                }));

                try {
                    const response = await offlineFetch('/api/vehicles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (response.ok && navigator.onLine) {
                        await get().fetchVehicles();
                    }
                } catch (error) {
                    console.error('Offline vehicle add queued:', error);
                }
            },

            removeVehicle: async (id: string) => {
                if (!confirm('Are you sure you want to delete this vehicle?')) return;
                set((state) => ({
                    vehicles: state.vehicles.filter(v => v.id !== id)
                }));
                try {
                    await offlineFetch(`/api/vehicles/${id}`, {
                        method: 'DELETE',
                    });
                } catch (error) {
                    console.error('Offline vehicle delete queued:', error);
                }
            }
        }),
        {
            name: 'gams-vehicle-storage',
            partialize: (state) => ({
                vehicles: state.vehicles
            }),
        }
    )
);
