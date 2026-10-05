import { create } from 'zustand';

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

export const useVehicleStore = create<VehicleState>((set, get) => ({
    vehicles: [],
    isLoading: false,
    error: null,

    fetchVehicles: async () => {
        set({ isLoading: true });
        try {
            const response = await fetch('/api/vehicles');
            if (response.ok) {
                const data = await response.json();
                set({ vehicles: data, error: null });
            } else {
                set({ error: 'Failed to fetch vehicles' });
            }
        } catch (error) {
            set({ error: 'An error occurred' });
        } finally {
            set({ isLoading: false });
        }
    },

    addVehicle: async (data) => {
        try {
            const response = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                await get().fetchVehicles();
            } else {
                const errData = await response.json();
                alert(errData.error || 'Failed to add vehicle');
            }
        } catch (error) {
            console.error('Error adding vehicle', error);
        }
    },

    removeVehicle: async (id: string) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        try {
            const response = await fetch(`/api/vehicles/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await get().fetchVehicles();
            }
        } catch (error) {
            console.error('Error deleting vehicle', error);
        }
    }
}));
