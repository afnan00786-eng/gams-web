import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { offlineFetch } from '@/lib/offlineFetch';

export interface CylinderStock {
    type: string;
    weight: string;
    full: number;
    empty: number;
    defective: number;
    isCylinder?: boolean;
    openingFull?: number;
    openingEmpty?: number;
    openingDefective?: number;
}

interface StockState {
    stock: CylinderStock[];
    fetchStock: (date?: Date) => Promise<void>;
    updateStock: (type: string, field: 'full' | 'empty' | 'defective', value: number) => Promise<void>;
    addStockItem: (type: string, weight: string, isCylinder: boolean, date?: Date) => Promise<void>;
    bulkUpdateStock: (updates: { type: string, fullChange?: number, emptyChange?: number, defectiveChange?: number }[], date?: Date) => Promise<void>;
    undoLastBatch: () => Promise<void>;
    deleteStockItem: (type: string) => Promise<void>;
    editStockItem: (oldType: string, newType: string, newWeight: string, newIsCylinder: boolean) => Promise<void>;
    lastBatchUpdate: { updates: { type: string, fullChange?: number, emptyChange?: number, defectiveChange?: number }[], date?: Date } | null;
}

export const useStockStore = create<StockState>()(
    persist(
        (set, get) => ({
            stock: [], // Initial empty, fetch from API
            lastBatchUpdate: null,

            fetchStock: async (date?: Date) => {
                try {
                    let url = '/api/stock';
                    if (date) {
                        // Using ISO string to reliably pass the date part
                        url += `?date=${date.toISOString()}`;
                    }

                    const res = await offlineFetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        set({ stock: data });
                    }
                } catch (e) {
                    console.error("Failed to fetch stock", e);
                }
            },

            updateStock: async (type, field, value) => {
                // Optimistic Update
                set((state) => ({
                    stock: state.stock.map((item) =>
                        item.type === type ? { ...item, [field]: value } : item
                    ),
                }));

                try {
                    const res = await offlineFetch('/api/stock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, field, value }),
                    });

                    if (!res.ok) {
                        // Revert on failure? For now just log
                        console.error("Failed to persist stock update");
                        // Ideally we should revert here by refetching
                        get().fetchStock();
                    }
                } catch (e) {
                    console.error(e);
                    get().fetchStock();
                }
            },

            addStockItem: async (type, weight, isCylinder, date?: Date) => {
                try {
                    const res = await offlineFetch('/api/stock', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type,
                            weight,
                            isCylinder,
                            date: date ? date.toISOString() : undefined
                        }),
                    });

                    if (res.ok) {
                        const newItem = await res.json();
                        set((state) => ({
                            stock: [...state.stock, newItem]
                        }));
                    } else {
                        console.error("Failed to add new stock item");
                    }
                } catch (e) {
                    console.error(e);
                }
            },

            bulkUpdateStock: async (updates, date?: Date) => {
                try {
                    const res = await offlineFetch('/api/stock', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            updates,
                            date: date ? date.toISOString() : undefined
                        }),
                    });

                    if (res.ok) {
                        set({ lastBatchUpdate: { updates, date } });
                        get().fetchStock();
                    } else {
                        console.error("Failed to perform bulk stock update");
                    }
                } catch (e) {
                    console.error("Bulk update error:", e);
                }
            },

            undoLastBatch: async () => {
                const last = get().lastBatchUpdate;
                if (!last) return;

                const negatedUpdates = last.updates.map(u => ({
                    type: u.type,
                    fullChange: u.fullChange ? -u.fullChange : 0,
                    emptyChange: u.emptyChange ? -u.emptyChange : 0,
                    defectiveChange: u.defectiveChange ? -u.defectiveChange : 0,
                }));

                try {
                    const res = await offlineFetch('/api/stock', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            updates: negatedUpdates,
                            date: last.date ? last.date.toISOString() : undefined,
                            isUndo: true
                        }),
                    });

                    if (res.ok) {
                        set({ lastBatchUpdate: null });
                        get().fetchStock();
                    } else {
                        console.error("Failed to undo last batch update");
                    }
                } catch (e) {
                    console.error("Undo error:", e);
                }
            },

            deleteStockItem: async (type: string) => {
                try {
                    const res = await offlineFetch(`/api/stock?id=${encodeURIComponent(type)}`, {
                        method: 'DELETE',
                    });

                    if (res.ok) {
                        set((state) => ({
                            stock: state.stock.filter((s) => s.type !== type)
                        }));
                        get().fetchStock();
                    } else {
                        console.error("Failed to delete stock item");
                    }
                } catch (e) {
                    console.error("Delete error:", e);
                }
            },

            editStockItem: async (oldType: string, newType: string, newWeight: string, newIsCylinder: boolean) => {
                try {
                    const res = await offlineFetch('/api/stock', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'edit',
                            oldType,
                            newType,
                            newWeight,
                            newIsCylinder
                        }),
                    });

                    if (res.ok) {
                        get().fetchStock();
                    } else {
                        console.error("Failed to edit stock item");
                    }
                } catch (e) {
                    console.error("Edit error:", e);
                }
            },
        }),
        {
            name: 'gams-stock-storage',
            partialize: (state) => ({ stock: [] }), // Don't persist stock in local storage, always fetch
        }
    )
);
