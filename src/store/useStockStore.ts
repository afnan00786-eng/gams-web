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
            stock: [],
            lastBatchUpdate: null,

            fetchStock: async (date?: Date) => {
                try {
                    let url = '/api/stock';
                    if (date) {
                        url += `?date=${date.toISOString()}`;
                    }

                    const res = await offlineFetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            set({ stock: data });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch stock, keeping existing cache:", e);
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
                    await offlineFetch('/api/stock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, field, value }),
                    });
                } catch (e) {
                    console.error("Stock update error:", e);
                }
            },

            addStockItem: async (type, weight, isCylinder, date?: Date) => {
                const newItem: CylinderStock = {
                    type,
                    weight,
                    full: 0,
                    empty: 0,
                    defective: 0,
                    isCylinder,
                    openingFull: 0,
                    openingEmpty: 0,
                    openingDefective: 0
                };

                // Optimistically add to store immediately
                set((state) => ({
                    stock: [...state.stock.filter(s => s.type !== type), newItem]
                }));

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
                        const serverItem = await res.json();
                        if (serverItem && serverItem.type) {
                            set((state) => ({
                                stock: state.stock.map(s => s.type === type ? serverItem : s)
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Error adding stock item:", e);
                }
            },

            bulkUpdateStock: async (updates, date?: Date) => {
                // 1. Immediate optimistic update on screen!
                set((state) => {
                    const updatedStock = state.stock.map((item) => {
                        const update = updates.find((u) => u.type === item.type);
                        if (!update) return item;
                        return {
                            ...item,
                            full: Math.max(0, item.full + (update.fullChange || 0)),
                            empty: Math.max(0, item.empty + (update.emptyChange || 0)),
                            defective: Math.max(0, item.defective + (update.defectiveChange || 0)),
                        };
                    });
                    return {
                        stock: updatedStock,
                        lastBatchUpdate: { updates, date }
                    };
                });

                // 2. Queue or send to API
                try {
                    await offlineFetch('/api/stock', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            updates,
                            date: date ? date.toISOString() : undefined
                        }),
                    });
                } catch (e) {
                    console.error("Bulk update network error:", e);
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

                // Optimistically revert local stock
                set((state) => {
                    const revertedStock = state.stock.map((item) => {
                        const update = negatedUpdates.find((u) => u.type === item.type);
                        if (!update) return item;
                        return {
                            ...item,
                            full: Math.max(0, item.full + (update.fullChange || 0)),
                            empty: Math.max(0, item.empty + (update.emptyChange || 0)),
                            defective: Math.max(0, item.defective + (update.defectiveChange || 0)),
                        };
                    });
                    return { stock: revertedStock, lastBatchUpdate: null };
                });

                try {
                    await offlineFetch('/api/stock', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            updates: negatedUpdates,
                            date: last.date ? last.date.toISOString() : undefined,
                            isUndo: true
                        }),
                    });
                } catch (e) {
                    console.error("Undo error:", e);
                }
            },

            deleteStockItem: async (type: string) => {
                set((state) => ({
                    stock: state.stock.filter((s) => s.type !== type)
                }));

                try {
                    await offlineFetch(`/api/stock?id=${encodeURIComponent(type)}`, {
                        method: 'DELETE',
                    });
                } catch (e) {
                    console.error("Failed to delete stock item:", e);
                }
            },

            editStockItem: async (oldType: string, newType: string, newWeight: string, newIsCylinder: boolean) => {
                set((state) => ({
                    stock: state.stock.map((s) =>
                        s.type === oldType
                            ? { ...s, type: newType, weight: newWeight, isCylinder: newIsCylinder }
                            : s
                    )
                }));

                try {
                    await offlineFetch('/api/stock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            editType: true,
                            oldType,
                            newType,
                            newWeight,
                            newIsCylinder
                        }),
                    });
                } catch (e) {
                    console.error("Edit error:", e);
                }
            },
        }),
        {
            name: 'gams-stock-storage',
            partialize: (state) => ({
                stock: state.stock,
                lastBatchUpdate: state.lastBatchUpdate
            }),
        }
    )
);
