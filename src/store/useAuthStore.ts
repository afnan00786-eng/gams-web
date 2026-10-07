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
    agencyName?: string;
    pin?: string;
    allowedSections?: string | string[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    employees: User[];
    login: (credentials: any) => Promise<boolean>;
    setUser: (user: User) => void;
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

            setUser: (user: User) => set({ user, isAuthenticated: true }),

            login: async (credentials: any) => {
                // If direct user passed
                if (credentials && credentials.id && credentials.role && !credentials.pin) {
                    set({ user: credentials, isAuthenticated: true });
                    return true;
                }

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
                        if (Array.isArray(employees) && employees.length > 0) {
                            set({ employees });
                        }
                    }
                } catch (e) {
                    console.error("fetchEmployees offline fallback:", e);
                }
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
                set((state) => ({
                    employees: state.employees.map((e) => e.id === id ? { ...e, ...updates } : e)
                }));
                try {
                    const res = await offlineFetch('/api/employees', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, ...updates }),
                    });
                    if (res.ok) {
                        get().fetchEmployees();
                    }
                } catch (e) {
                    console.error("Update Employee Error:", e);
                }
            },
        }),
        {
            name: 'gams-auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                employees: state.employees
            }),
        }
    )
);
