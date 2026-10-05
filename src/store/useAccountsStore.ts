import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Bank {
    id: string;
    name: string;
    accountNumber: string;
}

export interface Transaction {
    id: string;
    date: string; // ISO string
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT'; // CREDIT = In (Income), DEBIT = Out (Expense)
    category: 'CASH' | 'BANK' | 'STAFF' | 'HAWKER' | 'EMPTY_MONEY' | 'EMPTY_CYLINDER';
    relatedEntityId?: string; // e.g. Staff ID, Hawker ID, or Bank ID
    recipientName?: string;
    recipientPhone?: string;
    bankName?: string;
    accountNumber?: string;
}

interface AccountsState {
    transactions: Transaction[];
    banks: Bank[];
    addTransaction: (tx: Omit<Transaction, 'id' | 'date'> & { date?: string }) => void;
    addBank: (bank: Omit<Bank, 'id'>) => void;
    deleteBank: (id: string) => void;
    getBalance: (category: Transaction['category'], entityId?: string, asOfDate?: string) => number;
    settleHawkerBalance: (hawkerId: string, hawkerName: string, amount: number, description: string, type: 'CASH' | 'EMPTY_CYLINDER') => void;
}

export const useAccountsStore = create<AccountsState>()(
    persist(
        (set, get) => ({
            transactions: [],
            banks: [],
            addBank: (bank) => set((state) => ({
                banks: [...state.banks, { ...bank, id: Math.random().toString(36).substr(2, 9) }]
            })),
            deleteBank: (id) => set((state) => ({
                banks: state.banks.filter(b => b.id !== id)
            })),
            addTransaction: (tx) => set((state) => {
                const newTx = {
                    ...tx,
                    id: Math.random().toString(36).substr(2, 9),
                    date: tx.date || new Date().toISOString(),
                };

                // Sort transactions by date descending
                const updatedTxs = [newTx, ...state.transactions].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                return { transactions: updatedTxs };
            }),
            getBalance: (category, entityId, asOfDate) => {
                const txs = get().transactions.filter((t) => {
                    const matchesCategory = t.category === category;
                    const matchesEntity = !entityId || t.relatedEntityId === entityId;
                    const matchesDate = !asOfDate || new Date(t.date) <= new Date(asOfDate);
                    return matchesCategory && matchesEntity && matchesDate;
                });
                const balance = txs.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);
                return Math.round(balance * 100) / 100;
            },
            settleHawkerBalance: (hawkerId, hawkerName, amount, description, type) => {
                const category = type === 'CASH' ? 'HAWKER' : 'EMPTY_CYLINDER';

                // 1. Update Hawker Ledger
                get().addTransaction({
                    amount,
                    description,
                    type: 'CREDIT',
                    category,
                    relatedEntityId: hawkerId
                });

                // 2. If Cash, Update Main Cash Balance
                if (type === 'CASH') {
                    get().addTransaction({
                        amount,
                        description: `Hawker Settle (${hawkerName}): ${description}`,
                        type: 'CREDIT',
                        category: 'CASH'
                    });
                }
            }
        }),
        {
            name: 'gams-accounts-storage',
        }
    )
);
