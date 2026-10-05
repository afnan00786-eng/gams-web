import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { offlineFetch } from '@/lib/offlineFetch';

export type UserRole = 'MASTER' | 'MANAGER' | 'GODOWN' | 'HAWKER' | 'ACCOUNTANT' | 'OFFICE_STAFF';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    email?: string;
    mobile?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    employees: User[];
    login: (user: User) => Promise<boolean>; // Changed to Async
    logout: () => void;
    fetchEmployees: () => Promise<void>;
    addEmployee: (employee: Omit<User, 'id'>) => Promise<void>;
    removeEmployee: (id: string) => Promise<void>;
    updateEmployee: (id: string, updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            employees: [], // Initial state is empty, fetched from API

            login: async (credentials) => {
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(credentials),
                    });

                    if (res.ok) {
                        const user = await res.json();
                        set({ user, isAuthenticated: true });
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.error("Login Error", e);
                    return false;
                }
            },

            logout: () => set({ user: null, isAuthenticated: false }),

            fetchEmployees: async () => {
                try {
                    const res = await offlineFetch('/api/employees');
                    if (res.ok) {
                        const employees = await res.json();
                        set({ employees });
                    }
                } catch (e) { console.error(e) }
            },

            addEmployee: async (employee) => {
                try {
                    const res = await offlineFetch('/api/employees', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(employee),
                    });
                    if (res.ok) {
                        // Refresh list
                        get().fetchEmployees();
                    }
                } catch (e) { console.error(e) }
            },

            removeEmployee: async (id) => {
                try {
                    const res = await offlineFetch(`/api/employees?id=${id}`, {
                        method: 'DELETE',
                    });
                    if (res.ok) {
                        // Refresh list
                        get().fetchEmployees();
                    }
                } catch (e) { console.error(e) }
            },

            updateEmployee: async (id, updates) => {
                // For now relying on local update or strictly speaking should have PUT API
                // Let's implement Optimistic update or just ignore for this step if API not ready
                set((state) => ({
                    employees: state.employees.map((e) => e.id === id ? { ...e, ...updates } : e)
                }));
            },
        }),
        {
            name: 'gams-auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }), // Only persist session, not data which should change
        }
    )
);
