import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettlementDraft {
    tripId: string;
    wizardStep: number;
    rateStepIndex: number;
    financialStep: number;
    logisticsFinalized: boolean;
    isEnteringRates: boolean;
    returnItemsState: Record<string, any>;
    expenses: any[];
    extraMoney: any[];
    prepaidPayments: any[];
    cashSubmitted: string;
    completingDriverName: string;
    savedAt: string; // ISO timestamp
}

interface SettlementDraftState {
    drafts: Record<string, SettlementDraft>; // key = tripId
    saveDraft: (tripId: string, data: Omit<SettlementDraft, 'tripId' | 'savedAt'>) => void;
    getDraft: (tripId: string) => SettlementDraft | null;
    clearDraft: (tripId: string) => void;
    clearAllDrafts: () => void;
}

export const useSettlementDraftStore = create<SettlementDraftState>()(
    persist(
        (set, get) => ({
            drafts: {},

            saveDraft: (tripId, data) => {
                set(state => ({
                    drafts: {
                        ...state.drafts,
                        [tripId]: {
                            tripId,
                            ...data,
                            savedAt: new Date().toISOString(),
                        }
                    }
                }));
            },

            getDraft: (tripId) => {
                return get().drafts[tripId] || null;
            },

            clearDraft: (tripId) => {
                set(state => {
                    const { [tripId]: _, ...rest } = state.drafts;
                    return { drafts: rest };
                });
            },

            clearAllDrafts: () => {
                set({ drafts: {} });
            },
        }),
        {
            name: 'gams-settlement-drafts',
        }
    )
);
