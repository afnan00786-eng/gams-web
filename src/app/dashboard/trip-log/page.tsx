"use client";

import { useState, useEffect } from "react";
import { useTripStore } from "@/store/useTripStore";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CheckCircle2, Clock, Share2, Phone, X, ChevronLeft, CalendarDays, Trash2, Pencil, BarChart3, Plus, Home, History as HistoryIcon, Users, Lock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, generateTripReport, generateWhatsAppLink } from "@/lib/utils";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";
import { SectionGuard } from "@/components/auth/SectionGuard";
import { useAuthStore } from "@/store/useAuthStore";
import { useStockStore } from "@/store/useStockStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useRouter } from "next/navigation";
import { DenominationCalculator } from "@/components/ui/denomination-calculator";
import { useSettlementDraftStore } from "@/store/useSettlementDraftStore";

export default function TripLogPage() {
    const router = useRouter();
    const { trips, startTrip, completeTrip, fetchTrips, deleteTrip } = useTripStore();
    const { employees, user, fetchEmployees } = useAuthStore();
    const { stock, fetchStock } = useStockStore();
    const { vehicles, fetchVehicles } = useVehicleStore();
    const [showNewTrip, setShowNewTrip] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [calendarOpen, setCalendarOpen] = useState(false);



    // 'en-CA' locale gives YYYY-MM-DD which is perfect for date comparison
    // toLocaleDateString() automatically converts UTC timestamps to browser's local timezone (IST)
    const toLocalDateStr = (d: Date) => d.toLocaleDateString('en-CA'); // e.g. "2026-02-23"

    const isSameDay = (a: Date, b: Date) => toLocalDateStr(a) === toLocalDateStr(b);

    const tripMatchesDate = (trip: any) => {
        const targetStr = toLocalDateStr(selectedDate);
        if (trip.timeOut && toLocalDateStr(new Date(trip.timeOut)) === targetStr) {
            return true;
        }
        if (trip.timeIn && toLocalDateStr(new Date(trip.timeIn)) === targetStr) {
            return true;
        }
        return false;
    };

    const updateStockState = (type: string, updates: any) => {
        const prevState = returnItemsState[type];
        if (!prevState) return;

        const newState = { ...prevState, ...updates };
        const isCylinderItem = stock.find(s => s.type === type)?.isCylinder !== false;

        if (isCylinderItem) {
            // Formula: Out = Full + Defective + NC + Refills(Empty) + Given(Filled) - Taken(Filled)
            const out = newState.out || 0;
            const full = newState.full || 0;
            const def = newState.defective || 0;
            const nc = newState.nc || 0;

            const transfers = newState.hawkerTransfers || [];
            const givenFilled = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
            const takenFilled = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);

            // Required Empties = what Panda's own customers owe back
            // = Out - Returned Full - Defective - NC - Filled Given + Filled Taken
            // Empties swapped/taken from another hawker are physically on truck but NOT part of this "Required" balance.
            newState.empty = Math.max(0, out - full - def - nc - givenFilled + takenFilled);

            // Sync Rate Qty if only 1 rate exists
            if (newState.refillRates?.length === 1) {
                newState.refillRates = [{ ...newState.refillRates[0], qty: newState.empty }];
            }
            if (!newState.ncRates || newState.ncRates.length === 0) {
                newState.ncRates = [{ id: Date.now().toString() + Math.random(), qty: newState.nc, rate: 0 }];
            } else if (newState.ncRates.length === 1) {
                newState.ncRates = [{ ...newState.ncRates[0], qty: newState.nc }];
            }
        } else {
            const sold = Math.max(0, (newState.out || 0) - (newState.full || 0));
            if (newState.refillRates?.length === 1) {
                newState.refillRates = [{ ...newState.refillRates[0], qty: sold }];
            }
        }

        setReturnItemsState(prev => ({ ...prev, [type]: newState }));
    };

    const formattedDate = selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const isToday = isSameDay(selectedDate, new Date());

    useEffect(() => {
        fetchTrips(selectedDate);
        fetchStock();
        fetchEmployees();
        fetchVehicles();
    }, [fetchTrips, fetchStock, fetchEmployees, fetchVehicles, selectedDate]);

    // New Trip State
    const [vehicleNo, setVehicleNo] = useState("");
    const [driverName, setDriverName] = useState("");
    const [destination, setDestination] = useState("");
    const [stockItems, setStockItems] = useState<{ type: string; quantity: number; weight?: string }[]>([{ type: "", quantity: 0 }]);

    // Complete Trip State
    const [wizardStep, setWizardStep] = useState<number>(0);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [completingDriverName, setCompletingDriverName] = useState<string>("");
    const [returnItemsState, setReturnItemsState] = useState<Record<string, {
        full: number;
        empty: number;
        extraEmpty: number;
        extraEmptySource?: string;
        extraEmptyName?: string;
        extraEmptyMobile?: string;
        extraEmptyCustomerId?: string;
        emptyBal: number;
        emptyBalSource?: string;
        emptyBalName?: string;
        emptyBalMobile?: string;
        emptyBalCustomerId?: string;
        defective: number;
        nc: number;
        ncRates: { id: string; qty: number; rate: number }[];
        out: number;
        refillRates: { id: string; qty: number; rate: number }[];
        hawkerTransfers: { id: string; type: 'Given' | 'Taken'; hawkerId: string; condition: 'Filled' | 'Empty'; qty: number; isProcessed?: boolean }[];
    }>>({});
    const [cashSubmitted, setCashSubmitted] = useState<string>("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // UI Flow State
    const [logisticsFinalized, setLogisticsFinalized] = useState(false);
    const [isEnteringRates, setIsEnteringRates] = useState(false);

    // Get current hawker's ID for customer fetching
    // Prioritize the trip being completed, then the one being edited, then any active trip
    const activeCompletingTrip = trips.find(t => t.id === completingId);
    const activeEditingTrip = trips.find(t => t.id === editingId);
    const anyActiveTrip = trips.find(t => t.status === 'OUT');

    const targetTrip = activeCompletingTrip || activeEditingTrip || anyActiveTrip;
    // Use completingDriverName state if available for de-brief consistency
    const effectiveDriverName = (completingId && completingDriverName) ? completingDriverName : targetTrip?.driverName;
    const currentHawker = employees.find(e => e.name?.trim()?.toLowerCase() === effectiveDriverName?.trim()?.toLowerCase());
    const hawkerId = currentHawker?.id;

    // Fetch customers for the current hawker
    const { data: customers = [] } = useSWR<any[]>(
        hawkerId ? `/api/customers?hawkerId=${hawkerId}` : null,
        (url: string) => fetch(url).then(res => res.json())
    );

    const [rateStepIndex, setRateStepIndex] = useState(0);
    const [financialStep, setFinancialStep] = useState(0); // 0: Kharcha, 1: Money Bal, 2: Extra Money / Net Cash
    const [isSavingTransfers, setIsSavingTransfers] = useState(false);

    const [expenses, setExpenses] = useState<{ id: string; type: string; name?: string; mobile?: string; amount: number; customerId?: string }[]>([]);
    const [extraMoney, setExtraMoney] = useState<{ id: string; name: string; amount: number; mobile?: string; customerId?: string }[]>([]);
    const [prepaidPayments, setPrepaidPayments] = useState<{ id: string; name: string; amount: number }[]>([]);
    const [prevMoneyBal, setPrevMoneyBal] = useState<{ name: string; mobile?: string; amount: number; tripDate: string }[]>([]);
    const [prevEmptyBals, setPrevEmptyBals] = useState<Record<string, { name: string; qty: number; tripDate: string }[]>>({});

    // --- Settlement Draft (Resume Feature) ---
    const { saveDraft, getDraft, clearDraft } = useSettlementDraftStore();

    // Auto-save wizard state to localStorage whenever any settlement state changes
    useEffect(() => {
        if (!completingId) return;
        saveDraft(completingId, {
            wizardStep,
            rateStepIndex,
            financialStep,
            logisticsFinalized,
            isEnteringRates,
            returnItemsState,
            expenses,
            extraMoney,
            prepaidPayments,
            cashSubmitted,
            completingDriverName,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [completingId, wizardStep, rateStepIndex, financialStep, logisticsFinalized,
        isEnteringRates, returnItemsState, expenses, extraMoney,
        prepaidPayments, cashSubmitted]);

    // Compute total expected cash (NC + Refill + extraMoney - kharcha - moneyBal - prepaid)
    const totalExpectedCash = Object.values(returnItemsState).reduce((sum, s) => {
        const ncAmt = (s.ncRates || []).reduce((a, r) => a + (r.qty || 0) * (r.rate || 0), 0);
        const refillAmt = (s.refillRates || []).reduce((a, r) => a + (r.qty || 0) * (r.rate || 0), 0);
        return sum + ncAmt + refillAmt;
    }, 0) + extraMoney.reduce((s, x) => s + x.amount, 0) - expenses.reduce((s, x) => s + x.amount, 0) - prepaidPayments.reduce((s, x) => s + x.amount, 0);

    const hawkers = employees.filter(e => e.role === 'HAWKER' || e.role === 'OFFICE_STAFF');
    const actualHawkers = employees.filter(e => e.role === 'HAWKER');

    const handleAddStockRow = () => setStockItems([...stockItems, { type: "", quantity: 0 }]);
    const handleRemoveStockRow = (index: number) => setStockItems(stockItems.filter((_, i) => i !== index));
    const handleStockItemChange = (index: number, field: 'type' | 'quantity', value: any) => {
        const newItems = [...stockItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setStockItems(newItems);
    };

    const handleStartTrip = async () => {
        if (!vehicleNo || !driverName || stockItems.some(i => !i.type || i.quantity <= 0)) {
            alert("Please complete all configuration parameters (Vehicle, Driver, and Stock).");
            return;
        }

        const tripData = {
            vehicleNo,
            driverName,
            destination,
            stockItems: JSON.stringify(stockItems)
        };

        if (editingId) {
            await useTripStore.getState().updateTrip(editingId, tripData);
        } else {
            await startTrip(tripData);
        }
        handleCancelTripEntry();
    };

    const handleCancelTripEntry = () => {
        setShowNewTrip(false);
        setEditingId(null);
        setVehicleNo("");
        setDriverName("");
        setDestination("");
        setStockItems([{ type: "", quantity: 0 }]);
    };

    const handleEditTrip = (trip: any) => {
        setEditingId(trip.id);
        setVehicleNo(trip.vehicleNo);
        setDriverName(trip.driverName);
        setDestination(trip.destination || "");
        try {
            const items = JSON.parse(trip.stockItems || "[]");
            setStockItems(items.length > 0 ? items : [{ type: "", quantity: 0 }]);
        } catch {
            setStockItems([{ type: "", quantity: 0 }]);
        }
        setShowNewTrip(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prepareCompleteTrip = (tripId: string, itemsString: string, hawkerName?: string) => {
        // --- Check for existing draft and offer resume ---
        const existingDraft = getDraft(tripId);
        if (existingDraft && Object.keys(existingDraft.returnItemsState || {}).length > 0) {
            const savedTime = new Date(existingDraft.savedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const shouldResume = window.confirm(
                `⏸️ Draft Milaa!

"${existingDraft.completingDriverName || 'Trip'}" ka settlement Step ${existingDraft.wizardStep + 1} tak (${savedTime} pe) save hua tha.

Kya wahan se resume karna chahte hain?

(Cancel dabao fresh start ke liye)`
            );
            if (shouldResume) {
                // Restore all state from draft
                setCompletingId(tripId);
                setCompletingDriverName(existingDraft.completingDriverName);
                setWizardStep(existingDraft.wizardStep);
                setRateStepIndex(existingDraft.rateStepIndex);
                setFinancialStep(existingDraft.financialStep);
                setLogisticsFinalized(existingDraft.logisticsFinalized);
                setIsEnteringRates(existingDraft.isEnteringRates);
                setReturnItemsState(existingDraft.returnItemsState);
                setExpenses(existingDraft.expenses);
                setExtraMoney(existingDraft.extraMoney);
                setPrepaidPayments(existingDraft.prepaidPayments);
                setCashSubmitted(existingDraft.cashSubmitted);
                return; // Skip fresh initialization
            } else {
                clearDraft(tripId); // User chose fresh start
            }
        }

        setCompletingId(tripId);
        setCompletingDriverName(hawkerName || "");
        setCashSubmitted("");
        setExpenses([]);
        setExtraMoney([]);
        setPrepaidPayments([]);
        setLogisticsFinalized(false);
        setIsEnteringRates(false);
        setRateStepIndex(0);
        setWizardStep(0);
        setFinancialStep(0);

        // Load All-Time Financial & Empty History (not just today)
        const loadHistory = async () => {
            try {
                const res = await fetch('/api/trips'); 
                const allTrips: any[] = await res.json();
                
                const currentTrip = trips.find(t => t.id === tripId);
                const currentTripDate = currentTrip ? new Date(currentTrip.timeOut) : new Date();

                const moneyBals: any[] = [];
                const empBalsMap: Record<string, any[]> = {};
                
                allTrips.filter(t => t.status === 'COMPLETED').forEach(t => {
                    const tripTime = new Date(t.timeOut);
                    if (tripTime >= currentTripDate) return;

                    try {
                        let parsedItems = JSON.parse(t.stockItems || '[]');
                        if (typeof parsedItems === 'string') parsedItems = JSON.parse(parsedItems);
                        
                        parsedItems.forEach((item: any) => {
                            if (item.inEmptyBal > 0) {
                                if (!empBalsMap[item.type]) empBalsMap[item.type] = [];
                                empBalsMap[item.type].push({ 
                                    name: item.inEmptyBalName || t.driverName, 
                                    qty: item.inEmptyBal, 
                                    tripDate: t.timeOut 
                                });
                            }
                        });

                        const exps = JSON.parse(t.expenses || '[]');
                        exps.filter((e: any) => e.type === 'Money Bal').forEach((e: any) => {
                            moneyBals.push({ name: e.name, mobile: e.mobile, amount: e.amount, tripDate: t.timeOut });
                        });
                    } catch { }
                });
                setPrevMoneyBal(moneyBals);
                setPrevEmptyBals(empBalsMap);
            } catch (err) {
                console.error("Failed to load history:", err);
            }
        };
        loadHistory();

        try {
            const parsed = JSON.parse(itemsString || "[]");
            const initialMap: any = {};
            parsed.forEach((p: any) => {
                const initialOut = p.quantity || 0;
                const isCylinderItem = stock.find(s => s.type === p.type)?.isCylinder !== false;
                initialMap[p.type] = {
                    full: 0,
                    empty: isCylinderItem ? initialOut : 0,
                    extraEmpty: 0,
                    emptyBal: 0,
                    defective: 0,
                    nc: 0,
                    out: initialOut,
                    refillRates: [{ id: Date.now().toString() + Math.random(), qty: initialOut, rate: 0 }],
                    ncRates: [{ id: Date.now().toString() + Math.random(), qty: 0, rate: 0 }],
                    hawkerTransfers: []
                };
            });
            setReturnItemsState(initialMap);
        } catch { }
    };

    const handleCompleteTrip = async () => {
        if (!completingId) {
            alert("Internal Error: No active trip ID found for completion.");
            return;
        }

        try {
            // Validation Rules Checklist
            const errors: string[] = [];
            Object.entries(returnItemsState).forEach(([type, state]: [string, any]) => {
                const isCylinderItem = (stock || []).find(s => s.type === type)?.isCylinder !== false;

                if (isCylinderItem) {
                    const transfers = state.hawkerTransfers || [];
                    const givenFilled = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                    const takenFilled = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);

                    // Expected Empties from own customers must account for filled cylinders transferred
                    const expectedEmpties = (state.out || 0) - (state.full || 0) - (state.nc || 0) - (state.defective || 0) - givenFilled + takenFilled;

                    // Physical empties on truck should be:
                    // Expected Empties - Shortages + Surpluses
                    // So state.empty (which is the physical count expected from customers) should satisfy this:
                    const reconciledEmpties = (state.empty || 0) + (state.emptyBal || 0) - (state.extraEmpty || 0);

                    if (reconciledEmpties !== expectedEmpties && !state._bypassReconciliation) {
                        const msg = `${type}: Physical reconciliation mismatch.\n\nDetected Returns (${reconciledEmpties}) vs Manifest (${expectedEmpties}).\n\nDo you want to IGNORE this and finalize anyway? (Inventory will be updated with actual physical counts)`;
                        if (window.confirm(msg)) {
                            setReturnItemsState(prev => ({
                                ...prev,
                                [type]: { ...prev[type], _bypassReconciliation: true }
                            }));
                        } else {
                            errors.push(`${type}: Physical reconciliation mismatch.`);
                        }
                    }

                    if ((state.extraEmpty || 0) > 0 && !state.extraEmptySource) {
                        errors.push(`${type}: Please select a Source for Extra Empty recovery.`);
                    }

                    if ((state.emptyBal || 0) > 0 && !state.emptyBalSource) {
                        errors.push(`${type}: Please select a Person for the Shortage (Empty Bal).`);
                    }

                    const refillTotal = (state.refillRates || []).reduce((s: number, r: any) => s + (r.qty || 0), 0);
                    if ((state.empty || 0) > 0 && refillTotal !== state.empty) {
                        errors.push(`${type}: Total refill rate quantities (${refillTotal}) must match Refills count (${state.empty}).`);
                    }

                    const ncTotal = (state.ncRates || []).reduce((s: number, r: any) => s + (r.qty || 0), 0);
                    if ((state.nc || 0) > 0 && ncTotal !== state.nc) {
                        errors.push(`${type}: Total NC rate quantities (${ncTotal}) must match New Conn. count (${state.nc}).`);
                    }
                } else {
                    const sold = Math.max(0, (state.out || 0) - (state.full || 0));
                    const saleTotal = (state.refillRates || []).reduce((s: number, r: any) => s + (r.qty || 0), 0);
                    if (sold > 0 && saleTotal !== sold) {
                        errors.push(`${type}: Total sale quantities (${saleTotal}) must match items sold (${sold}).`);
                    }
                }
            });

            if (errors.length > 0) {
                alert("Refill Rules Violation:\n\n" + errors.join("\n"));
                return;
            }

            const returnedItemsArray = Object.entries(returnItemsState).map(([type, counts]: [string, any]) => ({
                type,
                inFull: counts.full || 0,
                inEmpty: counts.empty || 0,
                inDefective: counts.defective || 0,
                inNc: counts.nc || 0,
                inRefillRates: counts.refillRates || [],
                inNcRates: counts.ncRates || [],
                out: counts.out || 0,
                inEmptyBal: counts.emptyBal || 0,
                inEmptyBalSource: counts.emptyBalSource || '',
                inEmptyBalName: counts.emptyBalName || '',
                inEmptyBalMobile: counts.emptyBalMobile || '',
                inEmptyBalCustomerId: counts.emptyBalCustomerId,
                inExtraEmpty: counts.extraEmpty || 0,
                inExtraEmptySource: counts.extraEmptySource || '',
                inExtraEmptyName: counts.extraEmptyName || '',
                inExtraEmptyMobile: counts.extraEmptyMobile || '',
                inExtraEmptyCustomerId: counts.extraEmptyCustomerId,
                hawkerTransfers: counts.hawkerTransfers || []
            }));

            const finalExpenses = [
                ...expenses,
                ...extraMoney.map(e => ({ id: e.id, type: 'Extra Money', name: e.name, mobile: e.mobile, amount: e.amount, customerId: e.customerId })),
                ...prepaidPayments.map(p => ({ id: p.id, type: 'Prepaid', name: p.name, amount: p.amount }))
            ];

            // Capture IDs and Names before async store refresh
            const tripToSync = trips.find(t => t.id === completingId);
            const searchName = (completingDriverName || tripToSync?.driverName)?.trim()?.toLowerCase();
            const hawker = employees.find(e => e.name?.trim()?.toLowerCase() === searchName);
            const vehicleNoToSync = tripToSync?.vehicleNo;

            await completeTrip(completingId, returnedItemsArray, finalExpenses);
            alert("Mission Successfully Finalized & Synchronized!");

            // Record Discrepancies to Ledger
            const currentCashSub = parseFloat(cashSubmitted) || 0;
            const diff = currentCashSub - totalExpectedCash;

            console.log("Sync DEBUG:", {
                hawkerFound: !!hawker,
                hawkerName: hawker?.name,
                tripDriver: tripToSync?.driverName,
                diff,
                totalExpectedCash
            });

            if (hawker && diff !== 0) {
                useAccountsStore.getState().addTransaction({
                    amount: Math.abs(diff),
                    description: `Trip Settlement (${vehicleNoToSync}) - ${diff < 0 ? 'Deficit' : 'Surplus'}`,
                    type: diff < 0 ? 'DEBIT' : 'CREDIT',
                    category: 'HAWKER',
                    relatedEntityId: hawker.id
                });
            }

            // --- RECORD BALANCES TO HAWKER LEDGER ---

            // 1. Record Cylinder Balances (Shortages/Surpluses)
            returnedItemsArray.forEach((item: any) => {
                if (hawker && item.inEmptyBal > 0) {
                    const shortageDetail = item.inEmptyBalName ? ` - ${item.inEmptyBalName}${item.inEmptyBalMobile ? ` (${item.inEmptyBalMobile})` : ''}` : '';
                    useAccountsStore.getState().addTransaction({
                        amount: item.inEmptyBal,
                        description: `Trip Shortage (${vehicleNoToSync}) - ${item.type}${shortageDetail}`,
                        type: 'DEBIT',
                        category: 'EMPTY_CYLINDER',
                        relatedEntityId: hawker.id
                    });
                }
                if (hawker && item.inExtraEmpty > 0) {
                    const recoveryDetail = item.inExtraEmptyName ? ` - ${item.inExtraEmptyName}${item.inExtraEmptyMobile ? ` (${item.inExtraEmptyMobile})` : ''}` : '';
                    useAccountsStore.getState().addTransaction({
                        amount: item.inExtraEmpty,
                        description: `Extra Empty (${vehicleNoToSync}) - ${item.type}${recoveryDetail}`,
                        type: 'CREDIT',
                        category: 'EMPTY_CYLINDER',
                        relatedEntityId: hawker.id
                    });
                }
            });

            // 2. Record Customer Money Balances (Dues)
            // Note: totalExpectedCash already subtracts moneyBal, so if diff is 0, 
            // the Hawker's responsibility for the customer debt isn't recorded unless we do it here.
            finalExpenses.forEach((exp: any) => {
                if (hawker && exp.type === 'Money Bal' && exp.amount > 0) {
                    const dueDetail = exp.name ? ` - ${exp.name}${exp.mobile ? ` (${exp.mobile})` : ''}` : '';
                    useAccountsStore.getState().addTransaction({
                        amount: exp.amount,
                        description: `Customer Due (${vehicleNoToSync})${dueDetail}`,
                        type: 'DEBIT',
                        category: 'HAWKER',
                        relatedEntityId: hawker.id
                    });
                }
            });

            // --- END HAWKER LEDGER UPDATES ---

            // Record Cash Submitted
            if (currentCashSub > 0) {
                useAccountsStore.getState().addTransaction({
                    amount: currentCashSub,
                    description: `Trip Return Cash (${vehicleNoToSync}) - ${effectiveDriverName}`,
                    type: 'CREDIT',
                    category: 'CASH',
                });
            }

            clearDraft(completingId); // Clear saved draft on successful completion
            setCompletingId(null);
            setReturnItemsState({});
            setExpenses([]);
            setExtraMoney([]);
            setCashSubmitted("");
            setShowConfirmDialog(false);
            setLogisticsFinalized(false);
            setIsEnteringRates(false);
            setRateStepIndex(0);
            setWizardStep(0);
        } catch (error: any) {
            console.error("FATAL ERROR in handleCompleteTrip:", error);
            alert("Failed to save trip: " + (error.message || "Unknown error"));
        }
    };

    const handleShareReport = (trip: any) => {
        const report = generateTripReport(trip);
        const url = generateWhatsAppLink(report);
        window.open(url, '_blank');
    };

    const handleConfirm = async (type: 'GODOWN' | 'HAWKER' | 'TRANSFER', tripId: string, transferId?: string) => {
        try {
            const res = await fetch('/api/trips/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, tripId, transferId })
            });
            if (res.ok) fetchTrips(selectedDate);
            else alert("Failed to confirm");
        } catch (e) {
            alert("Network error confirming item.");
        }
    };
    // KPI Summaries for the selected day
    const dayTrips = trips.filter(tripMatchesDate);
    const activeMissions = dayTrips.filter(t => t.status === 'OUT').length;
    const completedMissions = dayTrips.filter(t => t.status === 'COMPLETED').length;

    const dayFinancials = dayTrips.reduce((acc, t) => {
        if (t.status !== 'COMPLETED') return acc;
        try {
            const items = JSON.parse(t.stockItems || '[]');
            const exps = JSON.parse(t.expenses || '[]');
            const revenue = items.reduce((sum: number, it: any) => sum + (it.inRefillRates?.reduce((s: number, r: any) => s + (r.qty * r.rate), 0) || 0), 0);
            return {
                revenue: acc.revenue + revenue,
                expenses: acc.expenses + exps.reduce((s: number, x: any) => s + (x.amount || 0), 0)
            };
        } catch { return acc; }
    }, { revenue: 0, expenses: 0 });

    const renderTripCard = (trip: any) => (
        <Card
            key={trip.id}
            className={cn(
                "group border-none shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 glass-card flex flex-col",
                trip.status === 'COMPLETED' ? "opacity-90 grayscale-[0.2] bg-slate-50/50" : "bg-white"
            )}
        >
            {/* Status Ribbon */}
            <div className={cn(
                "py-2 px-6 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-between",
                trip.vehicleNo === 'TRANSFER'
                    ? "bg-amber-500 text-white"
                    : trip.status === 'OUT' ? "bg-indigo-600 text-white" : "bg-emerald-500 text-white"
            )}>
                <span>{trip.vehicleNo === 'TRANSFER' ? "⇄ Hawker Transfer Trip" : trip.status === 'OUT' ? "In Transit / Delivery" : "Mission Accomplished"}</span>
                <div className="flex gap-2 items-center">
                    {trip.status === 'OUT' && getDraft(trip.id) && (
                        <span className="text-[8px] font-black tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 animate-pulse">
                            ⏸ DRAFT
                        </span>
                    )}
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                </div>
            </div>

            <CardHeader className="p-8 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                            trip.status === 'OUT' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                            <Truck className="h-7 w-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors uppercase italic">{trip.destination || "Unnamed Route"}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trip.vehicleNo}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{trip.driverName}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-8 pb-4">
                {/* --- UNIVERSAL CONFIRMATION ALERTS --- */}

                {/* 1. Godown -> Hawker (Morning Dispatch) */}
                {trip.status === 'OUT' && !trip.isConfirmedByHawker && user?.role === 'HAWKER' && trip.vehicleNo !== 'TRANSFER' && (
                    <div className="mb-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
                        <div className="flex gap-2 items-center">
                            <span className="text-xl">📦</span>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900">Awaiting Your Confirmation</h4>
                                <p className="text-[10px] text-amber-700/80 font-bold leading-tight">Please manually confirm receipt of the payload manifest below before continuing.</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => handleConfirm('HAWKER', trip.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 active-scale rounded-xl font-black text-[10px] uppercase h-10"
                        >
                            Confirm Received
                        </Button>
                    </div>
                )}

                {/* 2. Hawker -> Godown (Evening Return) */}
                {trip.status === 'COMPLETED' && !trip.isConfirmedByGodown && ['MASTER', 'MANAGER', 'GODOWN', 'ACCOUNTANT', 'OFFICE_STAFF'].includes(user?.role || '') && (
                    <div className="mb-4 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
                        <div className="flex gap-2 items-center">
                            <span className="text-xl">🏭</span>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-rose-900">Awaiting Warehouse Receipt</h4>
                                <p className="text-[10px] text-rose-700/80 font-bold leading-tight">Hawker has dropped off returns. Needs warehouse confirmation.</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => handleConfirm('GODOWN', trip.id)}
                            className="bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 active-scale rounded-xl font-black text-[10px] uppercase h-10"
                        >
                            Confirm Items Received
                        </Button>
                    </div>
                )}

                {/* 3. Hawker -> Hawker (Mid-Day Transfer) */}
                {user?.role === 'HAWKER' && trip.status === 'OUT' && (() => {
                    try {
                        const items = JSON.parse(trip.stockItems || "[]");
                        let unconfirmedTransfers: any[] = [];
                        items.forEach((it: any) => {
                            if (it.receivedTransfers) {
                                it.receivedTransfers.forEach((rt: any) => {
                                    if (!rt.isConfirmed) unconfirmedTransfers.push({ type: it.type, ...rt });
                                });
                            }
                        });

                        if (unconfirmedTransfers.length > 0) {
                            return (
                                <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Truck className="h-4 w-4 text-blue-600" />
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-900">Pending Transfers</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {unconfirmedTransfers.map((rt: any, i: number) => (
                                            <div key={i} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-800 uppercase">From: {rt.from}</span>
                                                    <span className="text-[12px] font-black text-blue-600">+{rt.qty} {rt.type} {rt.condition === 'Empty' ? '(Empty)' : ''}</span>
                                                </div>
                                                <Button
                                                    onClick={() => handleConfirm('TRANSFER', trip.id, rt.id)}
                                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white active-scale rounded-lg font-black text-[10px] uppercase h-8"
                                                >
                                                    Confirm
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                    } catch { return null; }
                    return null;
                })()}

                {/* --- END ALERTS --- */}

                <>
                    <div className="bg-white/50 rounded-3xl p-6 border border-white/40 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Payload Manifest</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {format(new Date(trip.timeOut), "hh:mm a")}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(() => {
                                try {
                                    const items = JSON.parse(trip.stockItems || "[]");
                                    return items.map((it: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
                                            <span className="text-xs font-black text-slate-900">{it.quantity}X</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{it.type}</span>
                                        </div>
                                    ));
                                } catch { return <span>Parsing Error</span>; }
                            })()}
                        </div>
                    </div>

                    {/* Mission Financial Summary (Only for Completed Trips) */}
                    {trip.status === 'COMPLETED' && (
                        <div className="mt-4 bg-slate-50/80 rounded-3xl overflow-hidden border border-slate-100 shadow-inner">
                            {/* Header row mimics the drawn line */}
                            <div className="flex border-b-2 border-slate-200 bg-white">
                                <div className="flex-1 py-3 px-6 border-r-2 border-slate-200 text-center">
                                    <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-indigo-900">Cylinders</h4>
                                </div>
                                <div className="flex-1 py-3 px-6 text-center">
                                    <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-emerald-900">Summary Cash</h4>
                                </div>
                            </div>

                            <div className="flex relative bg-white/50">
                                {/* Vertical divider mimicking the hand-drawn line */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-200 -ml-[1px]" />

                                {(() => {
                                    try {
                                        const items = JSON.parse(trip.stockItems || "[]");
                                        const exps = JSON.parse(trip.expenses || "[]");

                                        // Calculate Metrics
                                        let c_out = 0;
                                        let c_refill = 0;
                                        let c_nc = 0;
                                        let c_extra = 0;
                                        let c_bal = 0;
                                        let c_bal_names: string[] = [];
                                        let c_extra_names: string[] = [];
                                        let c_return_filled = 0;
                                        let c_return_empty = 0;
                                        let c_given_filled = 0;
                                        let c_taken_filled = 0;
                                        let c_given_empty = 0;
                                        let c_taken_empty = 0;
                                        let c_given_filled_names: string[] = [];
                                        let c_taken_filled_names: string[] = [];
                                        let c_given_empty_names: string[] = [];
                                        let c_taken_empty_names: string[] = [];

                                        let cash_refill = 0;
                                        let cash_nc = 0;
                                        let cash_extra = 0;
                                        let cash_bal = 0;
                                        let cash_other = 0;

                                        items.forEach((it: any) => {
                                            const out = it.quantity || 0;
                                            const full = it.inFull || 0;
                                            const def = it.inDefective || 0;
                                            const nc = it.inNc || 0;
                                            const empty = it.inEmpty || 0;
                                            const exEmpty = it.inExtraEmpty || 0;
                                            const balDue = it.inEmptyBal || 0;

                                            // Refills logic
                                            const transfers = it.hawkerTransfers || [];
                                            const givenFilledList = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Filled');
                                            const givenFilled = givenFilledList.reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                            givenFilledList.forEach((t: any) => {
                                                const h = employees.find(ah => ah.id === t.hawkerId);
                                                if (h) c_given_filled_names.push(h.name);
                                            });

                                            // The receiver uses receivedTransfers directly.
                                            const recx = it.receivedTransfers || [];
                                            const takenFilledRecx = recx.filter((t: any) => t.condition !== 'Empty');
                                            const takenFilledTransfers = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Filled');
                                            
                                            const takenFilled = takenFilledRecx.reduce((s: number, t: any) => s + (t.qty || 0), 0) + takenFilledTransfers.reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                            takenFilledRecx.forEach((t: any) => { if (t.from) c_taken_filled_names.push(t.from); });
                                            takenFilledTransfers.forEach((t: any) => { 
                                                const h = employees.find(ah => ah.id === t.hawkerId);
                                                if (h) c_taken_filled_names.push(h.name);
                                            });

                                            const givenEmptyList = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Empty');
                                            const givenEmpty = givenEmptyList.reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                            givenEmptyList.forEach((t: any) => {
                                                const h = employees.find(ah => ah.id === t.hawkerId);
                                                if (h) c_given_empty_names.push(h.name);
                                            });

                                            const takenEmptyRecx = recx.filter((t: any) => t.condition === 'Empty');
                                            const takenEmptyTransfers = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Empty');
                                            const takenEmpty = takenEmptyRecx.reduce((s: number, t: any) => s + (t.qty || 0), 0) + takenEmptyTransfers.reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                            takenEmptyRecx.forEach((t: any) => { if (t.from) c_taken_empty_names.push(t.from); });
                                            takenEmptyTransfers.forEach((t: any) => {
                                                const h = employees.find(ah => ah.id === t.hawkerId);
                                                if (h) c_taken_empty_names.push(h.name);
                                            });

                                            // Actual Sold = (out + takenFilled) - (full + givenFilled)
                                            const sold = Math.max(0, out + takenFilled - full - givenFilled);
                                            const refills = Math.max(0, sold - def - nc);

                                            const isCylinder = stock.find(s => s.type === it.type)?.isCylinder !== false;

                                            if (isCylinder) {
                                                c_out += out;
                                                c_refill += refills;
                                                c_nc += nc;
                                                c_return_filled += full;
                                                c_return_empty += (refills + exEmpty - balDue + takenEmpty - givenEmpty);
                                                c_extra += exEmpty;
                                                if (exEmpty > 0) {
                                                    const name = it.inExtraEmptyName || it.extraEmptyName;
                                                    if (name) c_extra_names.push(`${it.type}: ${name}`);
                                                }
                                                c_bal += balDue;
                                                if (balDue > 0) {
                                                    const name = it.inEmptyBalName || it.emptyBalName;
                                                    if (name) c_bal_names.push(`${it.type}: ${name}`);
                                                }
                                                c_given_filled += givenFilled;
                                                c_taken_filled += takenFilled;
                                                c_given_empty += givenEmpty;
                                                c_taken_empty += takenEmpty;
                                            }
                                            (it.inRefillRates || []).forEach((r: any) => {
                                                if (isCylinder) {
                                                    cash_refill += (r.qty || 0) * (r.rate || 0);
                                                } else {
                                                    cash_other += (r.qty || 0) * (r.rate || 0);
                                                }
                                            });
                                            (it.inNcRates || []).forEach((r: any) => {
                                                cash_nc += (r.qty || 0) * (r.rate || 0);
                                            });
                                        }); // Close items.forEach

                                        exps.forEach((exp: any) => {
                                            if (exp.type === 'Extra Money') cash_extra += exp.amount || 0;
                                            if (exp.type === 'Money Bal') cash_bal += exp.amount || 0;
                                        });

                                        const cash_bal_names = exps.filter((e: any) => e.type === 'Money Bal' && e.name).map((e: any) => e.name).join(', ');
                                        const cash_extra_names = exps.filter((e: any) => e.type === 'Extra Money' && e.name).map((e: any) => e.name).join(', ');

                                        const kharcha = exps.filter((e: any) => !['Extra Money', 'Money Bal', 'Prepaid'].includes(e.type))
                                            .reduce((s: number, x: any) => s + (x.amount || 0), 0);

                                        const online = exps.filter((e: any) => e.type === 'Prepaid')
                                            .reduce((s: number, x: any) => s + (x.amount || 0), 0);

                                        // Net Deposit = Refills + NC + Extras + Other - Balance(short) - Kharcha - Online
                                        const deposit = cash_refill + cash_nc + cash_extra + cash_other - cash_bal - kharcha - online;

                                        const GridRow = ({ label, val, subLabel, isCash, isMinus, isPlus }: { label: string, val: string | number, subLabel?: string, isCash?: boolean, isMinus?: boolean, isPlus?: boolean }) => {
                                            const alwaysShow = ['Deposit'].includes(label); // Deposit should always show since it's the final total. Everything else hides if 0.
                                            if (!alwaysShow && (val === 0 || val === "0")) return null;
                                            return (
                                                <div className="flex flex-col py-1.5 px-6 hover:bg-slate-200/50 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase">{label}</span>
                                                        <span className={cn(
                                                            "text-sm font-black",
                                                            isMinus ? "text-rose-600" : (isPlus ? "text-emerald-600" : (isCash ? "text-emerald-700" : "text-indigo-900"))
                                                        )}>
                                                            {isMinus ? '-' : (isPlus ? '+' : '')}{isCash ? '₹' : ''}{val}
                                                        </span>
                                                    </div>
                                                    {subLabel && (
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-right leading-none mt-0.5">{subLabel}</span>
                                                    )}
                                                </div>
                                            );
                                        };

                                        const cylinderTypes = ['Domestic', 'Commercial', 'Small'];
                                        const otherItems = items.filter((it: any) => !cylinderTypes.includes(it.type));

                                        const sub_given_filled = Array.from(new Set(c_given_filled_names)).join(', ');
                                        const sub_taken_filled = Array.from(new Set(c_taken_filled_names)).join(', ');
                                        const sub_given_empty = Array.from(new Set(c_given_empty_names)).join(', ');
                                        const sub_taken_empty = Array.from(new Set(c_taken_empty_names)).join(', ');

                                        return (
                                            <>
                                                {/* Left Column (Cylinders & Other Items) */}
                                                <div className="flex-1 flex flex-col py-2 border-r border-slate-100">
                                                    <div className="px-6 py-1 bg-slate-50/50 mb-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cylinders</span>
                                                    </div>
                                                    <GridRow label="Out" val={c_out} />
                                                    <GridRow label="Trf Given (Full)" val={c_given_filled} isMinus subLabel={sub_given_filled} />
                                                    <GridRow label="Trf Taken (Full)" val={c_taken_filled} isPlus subLabel={sub_taken_filled} />
                                                    <GridRow label="Ret. Filled" val={c_return_filled} />
                                                    <GridRow label="NC" val={c_nc} />
                                                    <GridRow label="Refill" val={c_refill} />
                                                    <GridRow label="Trf Taken (M.T)" val={c_taken_empty} isPlus subLabel={sub_taken_empty} />
                                                    <GridRow label="Extra" val={c_extra} subLabel={c_extra_names.join(', ')} />
                                                    <GridRow label="Bal." val={c_bal} subLabel={c_bal_names.join(', ')} isMinus />
                                                    <GridRow label="Trf Given (M.T)" val={c_given_empty} isMinus subLabel={sub_given_empty} />
                                                    <GridRow label="Ret. Empty" val={c_return_empty} />

                                                    {/* Other Items appended below Cylinders */}
                                                    {otherItems.length > 0 && (
                                                        <>
                                                            <div className="px-6 py-1 bg-indigo-50/30 mt-2 mb-1">
                                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Other Items</span>
                                                            </div>
                                                            {otherItems.map((oi: any) => {
                                                                const sold = Math.max(0, (oi.quantity || 0) - (oi.inFull || 0));
                                                                const cash = (oi.inRefillRates || []).reduce((s: number, r: any) => s + (r.qty * r.rate), 0);
                                                                return (
                                                                    <div key={oi.type} className="px-6 py-2 border-b border-slate-50 last:border-0">
                                                                        <div className="flex justify-between items-center mb-0.5">
                                                                            <span className="text-[10px] font-black text-indigo-600 uppercase">{oi.type}</span>
                                                                            <span className="text-xs font-black text-slate-900">{sold} Sold</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[9px] font-bold text-slate-400 tracking-tighter">Out: {oi.quantity} | Ret: {oi.inFull}</span>
                                                                            <span className="text-[10px] font-black text-emerald-600">₹{cash}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Right Column (Cash Summary) */}
                                                <div className="flex-1 flex flex-col py-2">
                                                    <div className="px-6 py-1 bg-emerald-50/30 mb-1">
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Financials</span>
                                                    </div>
                                                    <GridRow label="Refill" val={cash_refill} isCash />
                                                    <GridRow label="NC" val={cash_nc} isCash />
                                                    {/* Only show 'Other' if there was revenue from non-cylinder items */}
                                                    {cash_other > 0 && (
                                                        <GridRow label="Other" val={cash_other} isCash />
                                                    )}
                                                    <GridRow label="Extra" val={cash_extra} subLabel={cash_extra_names} isCash />
                                                    <GridRow label="Bal." val={cash_bal} subLabel={cash_bal_names} isCash isMinus />
                                                    <GridRow label="Kharcha" val={kharcha} isCash isMinus />
                                                    <GridRow label="Online" val={online} isCash isMinus />
                                                    <div className="mt-auto border-t-2 border-slate-200 bg-emerald-50/50 pt-2 pb-2">
                                                        <GridRow label="Deposit" val={deposit} isCash />
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    } catch { return null; }
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Mission De-Brief Form */}
                    {completingId === trip.id && (
                        <>
                            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Mission De-Brief / <span className="text-emerald-500">Logistics</span></h4>
                                </div>

                                {/* Payload Returns Grid */}
                                <div className="space-y-4">
                                    {Object.keys(returnItemsState).sort((a, b) => {
                                        const aCyl = stock.find(s => s.type === a)?.isCylinder !== false ? 0 : 1;
                                        const bCyl = stock.find(s => s.type === b)?.isCylinder !== false ? 0 : 1;
                                        return aCyl - bCyl;
                                    }).map((type) => {
                                        const state = returnItemsState[type];
                                        const sold = Math.max(0, (state.out || 0) - (state.full || 0));
                                        const isCylinderItem = stock.find(s => s.type === type)?.isCylinder !== false;

                                        if (isEnteringRates && !logisticsFinalized) {
                                            const stockKeys = Object.keys(returnItemsState).sort((a, b) => {
                                                const aCyl = stock.find(s => s.type === a)?.isCylinder !== false ? 0 : 1;
                                                const bCyl = stock.find(s => s.type === b)?.isCylinder !== false ? 0 : 1;
                                                return aCyl - bCyl;
                                            });
                                            if (stockKeys[rateStepIndex] !== type) return null;
                                        }

                                        if (!isEnteringRates && !logisticsFinalized && !isCylinderItem && wizardStep >= 1 && wizardStep <= 3) return null;

                                        return (
                                            <div key={type} className="glass-card p-6 rounded-[1.5rem] border-slate-100 space-y-4 shadow-sm">
                                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                                    <span className="font-black text-indigo-600 uppercase italic tracking-tight">{type}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manifest: {state.out}</span>
                                                        <Badge variant="outline" className="rounded-full bg-indigo-50 border-indigo-100 text-indigo-700 font-bold px-3">
                                                            Sold: {sold}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Step 0: Hawker to Hawker Transfers */}
                                                {!isEnteringRates && !logisticsFinalized && wizardStep === 0 && isCylinderItem && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                                        <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/20 shadow-sm space-y-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Truck className="h-4 w-4 text-indigo-600" />
                                                                    <Label className="text-xs font-black uppercase text-indigo-700 tracking-widest">Hawker Transfers</Label>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const newTransfers = [...(state.hawkerTransfers || []), {
                                                                            id: Date.now().toString() + Math.random(),
                                                                            type: 'Given' as const,
                                                                            hawkerId: '',
                                                                            condition: 'Filled' as const,
                                                                            qty: 0
                                                                        }];
                                                                        updateStockState(type, { hawkerTransfers: newTransfers });
                                                                    }}
                                                                    className="h-8 rounded-full border-2 border-indigo-200 bg-white text-indigo-600 font-black uppercase text-[9px] px-3 hover:bg-indigo-50"
                                                                >
                                                                    <Plus className="mr-1 h-3 w-3" /> Add
                                                                </Button>
                                                            </div>

                                                            {state.hawkerTransfers?.map((transfer, idx) => {
                                                                const isLocked = transfer.isProcessed;
                                                                return (
                                                                    <div key={transfer.id} className={cn("relative p-4 rounded-2xl bg-white border shadow-sm space-y-3", isLocked ? "border-slate-200 opacity-90" : "border-indigo-100")}>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <Select
                                                                                disabled={isLocked}
                                                                                value={transfer.type}
                                                                                onValueChange={(val: 'Given' | 'Taken') => {
                                                                                    const newTransfers = [...state.hawkerTransfers];
                                                                                    newTransfers[idx].type = val;
                                                                                    updateStockState(type, { hawkerTransfers: newTransfers });
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="h-12 border-2 border-slate-100 bg-slate-50 font-bold text-xs uppercase focus:ring-indigo-500">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                                    <SelectItem value="Given" className="font-bold uppercase text-[10px]">Given To</SelectItem>
                                                                                    <SelectItem value="Taken" className="font-bold uppercase text-[10px]">Taken From</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>

                                                                            <Select
                                                                                disabled={isLocked}
                                                                                value={transfer.hawkerId}
                                                                                onValueChange={(val) => {
                                                                                    const newTransfers = [...state.hawkerTransfers];
                                                                                    newTransfers[idx].hawkerId = val;
                                                                                    updateStockState(type, { hawkerTransfers: newTransfers });
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="h-12 border-2 border-slate-100 bg-slate-50 font-bold text-xs uppercase focus:ring-indigo-500">
                                                                                    <SelectValue placeholder="Select Hawker" />
                                                                                </SelectTrigger>
                                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                                    {employees.filter(h => h.name !== trip.driverName).map(h => (
                                                                                        <SelectItem key={h.id} value={h.id} className="font-bold uppercase text-[10px]">{h.name}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <Select
                                                                                disabled={isLocked}
                                                                                value={transfer.condition}
                                                                                onValueChange={(val: 'Filled' | 'Empty') => {
                                                                                    const newTransfers = [...state.hawkerTransfers];
                                                                                    newTransfers[idx].condition = val;
                                                                                    updateStockState(type, { hawkerTransfers: newTransfers });
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="h-12 border-2 border-slate-100 bg-slate-50 font-bold text-xs uppercase focus:ring-indigo-500">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                                    <SelectItem value="Filled" className="font-bold uppercase text-[10px]">Filled</SelectItem>
                                                                                    <SelectItem value="Empty" className="font-bold uppercase text-[10px]">Empty</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>

                                                                            <Input
                                                                                disabled={isLocked}
                                                                                type="number"
                                                                                placeholder="Qty"
                                                                                className="h-12 border-2 border-slate-100 bg-slate-50 font-black text-center text-sm focus:border-indigo-500"
                                                                                value={transfer.qty || ""}
                                                                                onChange={(e) => {
                                                                                    const newTransfers = [...state.hawkerTransfers];
                                                                                    newTransfers[idx].qty = parseInt(e.target.value) || 0;
                                                                                    updateStockState(type, { hawkerTransfers: newTransfers });
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            disabled={isLocked}
                                                                            onClick={() => {
                                                                                if (isLocked) return;
                                                                                const newTransfers = state.hawkerTransfers.filter((_, i) => i !== idx);
                                                                                updateStockState(type, { hawkerTransfers: newTransfers });
                                                                            }}
                                                                            className={cn("absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white border shadow-sm", isLocked ? "border-slate-200 text-slate-400" : "border-rose-100 text-rose-500 hover:bg-rose-50")}
                                                                        >
                                                                            {isLocked ? <Lock className="h-3 w-3" /> : <X className="h-4 w-4" />}
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            })}

                                                            {(!state.hawkerTransfers || state.hawkerTransfers.length === 0) && (
                                                                <div className="text-center py-6 border-2 border-dashed border-indigo-200/50 rounded-2xl bg-white/50">
                                                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">No Transfers Logged</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step 1: Full Returns only */}
                                                {!isEnteringRates && !logisticsFinalized && wizardStep === 1 && (
                                                    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-2">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Full Returned</Label>
                                                            <Input
                                                                type="number"
                                                                className="h-14 rounded-xl border-2 border-slate-200 focus:border-indigo-500 text-center text-xl font-black shadow-sm"
                                                                value={state.full || ""}
                                                                onChange={(e) => updateStockState(type, { full: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Slide 2: New Connections */}
                                                {!isEnteringRates && !logisticsFinalized && wizardStep === 2 && isCylinderItem && (
                                                    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-right-2">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-black uppercase text-emerald-600 ml-1">N.C. (New Conn.) Installed</Label>
                                                            <Input
                                                                type="number"
                                                                className="h-14 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50/30 text-emerald-800 text-center text-xl font-black shadow-sm"
                                                                value={state.nc || ""}
                                                                onChange={(e) => updateStockState(type, { nc: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step 3: Extra Empties */}
                                                {!isEnteringRates && !logisticsFinalized && wizardStep === 3 && isCylinderItem && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                                        <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 shadow-sm space-y-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Plus className="h-4 w-4 text-emerald-600" />
                                                                <Label className="text-xs font-black uppercase text-emerald-700 tracking-widest">Extra Empty (Recovery Source)</Label>
                                                            </div>

                                                            <Select
                                                                value={state.extraEmptySource || ""}
                                                                onValueChange={(val) => {
                                                                    const isCustomer = val.startsWith("CUST-");
                                                                    const custId = isCustomer ? val.replace("CUST-", "") : undefined;
                                                                    const customer = customers.find(c => c.id === custId);

                                                                    setReturnItemsState({
                                                                        ...returnItemsState,
                                                                        [type]: {
                                                                            ...state,
                                                                            extraEmptySource: val,
                                                                            extraEmptyCustomerId: custId,
                                                                            extraEmptyName: customer?.name || (isCustomer ? "" : state.extraEmptyName),
                                                                            extraEmptyMobile: customer?.mobile || (isCustomer ? "" : state.extraEmptyMobile)
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-12 bg-white border-2 border-emerald-100 font-bold text-xs uppercase text-emerald-900 focus:ring-emerald-500">
                                                                    <SelectValue placeholder="Select Recovery Source..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                    <SelectItem value="MANUAL" className="font-black uppercase text-[10px] text-emerald-600 bg-emerald-50/50 mb-1">Feed Manually (Other)</SelectItem>
                                                                    {customers.length > 0 && (
                                                                        <div className="px-2 py-1.5 border-b border-slate-100 bg-slate-50/50">
                                                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Your Customers</p>
                                                                        </div>
                                                                    )}
                                                                    {customers.map((c: any) => (
                                                                        <SelectItem key={c.id} value={`CUST-${c.id}`} className="font-bold uppercase text-[10px] text-indigo-600">
                                                                            {c.name} ({c.emptyBal} Due)
                                                                        </SelectItem>
                                                                    ))}
                                                                    <div className="px-2 py-1.5 border-b border-slate-100 bg-slate-50/50 mt-1">
                                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Previous Shortages</p>
                                                                    </div>
                                                                    {(prevEmptyBals[type] || []).map((b, i) => (
                                                                        <SelectItem key={i} value={`${b.name}-${b.tripDate}`} className="font-bold uppercase text-[10px]">
                                                                            {b.name} ({b.qty} Short) - {format(new Date(b.tripDate), "dd MMM")}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {/* Dynamic Fields for Extra Empty */}
                                                            {state.extraEmptySource === "MANUAL" && (
                                                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                                                    <Input
                                                                        placeholder="Client Name"
                                                                        className="h-12 rounded-xl border-2 border-emerald-100 bg-white font-bold text-sm uppercase"
                                                                        value={state.extraEmptyName || ""}
                                                                        onChange={(e) => setReturnItemsState({
                                                                            ...returnItemsState, [type]: { ...state, extraEmptyName: e.target.value }
                                                                        })}
                                                                    />
                                                                    <Input
                                                                        placeholder="Mobile No."
                                                                        type="tel"
                                                                        maxLength={10}
                                                                        pattern="\d*"
                                                                        className="h-12 rounded-xl border-2 border-emerald-100 bg-white font-bold text-sm uppercase"
                                                                        value={state.extraEmptyMobile || ""}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                                            setReturnItemsState({
                                                                                ...returnItemsState, [type]: { ...state, extraEmptyMobile: val }
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Show Quantity either if a valid old record is picked OR if Manual Name/Mobile are feeded */}
                                                            {(state.extraEmptySource && state.extraEmptySource !== "MANUAL" || (state.extraEmptySource === "MANUAL" && state.extraEmptyName && state.extraEmptyMobile)) && (
                                                                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                                                    <Label className="text-[10px] font-black uppercase text-emerald-500 mb-2 block">Number of Empties Collected</Label>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-14 rounded-xl border-2 border-emerald-400 bg-white text-center text-xl font-black text-emerald-700 shadow-inner"
                                                                        value={state.extraEmpty || ""}
                                                                        placeholder="0"
                                                                        onChange={(e) => updateStockState(type, { extraEmpty: parseInt(e.target.value) || 0 })}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step 4: Empty Bal/Short */}
                                                {!isEnteringRates && !logisticsFinalized && wizardStep === 4 && isCylinderItem && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                                        <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50/20 shadow-sm space-y-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Users className="h-4 w-4 text-rose-600" />
                                                                <Label className="text-xs font-black uppercase text-rose-700 tracking-widest">Empty Shortage (Bal Due)</Label>
                                                            </div>

                                                            <Select
                                                                value={state.emptyBalSource || ""}
                                                                onValueChange={(val) => {
                                                                    const isCustomer = val.startsWith("CUST-");
                                                                    const custId = isCustomer ? val.replace("CUST-", "") : undefined;
                                                                    const customer = customers.find(c => c.id === custId);

                                                                    setReturnItemsState({
                                                                        ...returnItemsState,
                                                                        [type]: {
                                                                            ...state,
                                                                            emptyBalSource: val,
                                                                            emptyBalCustomerId: custId,
                                                                            emptyBalName: customer?.name || (isCustomer ? "" : state.emptyBalName),
                                                                            emptyBalMobile: customer?.mobile || (isCustomer ? "" : state.emptyBalMobile)
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-12 bg-white border-2 border-rose-100 font-bold text-xs uppercase text-rose-900 focus:ring-rose-500">
                                                                    <SelectValue placeholder="Select Defaulter..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                    <SelectItem value="MANUAL" className="font-black uppercase text-[10px] text-rose-600 bg-rose-50/50 mb-1">Feed Manually (Other)</SelectItem>
                                                                    {customers.length > 0 && (
                                                                        <div className="px-2 py-1.5 border-b border-slate-100 bg-slate-50/50">
                                                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Your Customers</p>
                                                                        </div>
                                                                    )}
                                                                    {customers.map((c: any) => (
                                                                        <SelectItem key={c.id} value={`CUST-${c.id}`} className="font-bold uppercase text-[10px] text-indigo-600">
                                                                            {c.name} (Bal: ₹{c.cashBal})
                                                                        </SelectItem>
                                                                    ))}
                                                                    <div className="px-2 py-1.5 border-b border-slate-100 bg-slate-50/50 mt-1">
                                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Other Agents/Staff</p>
                                                                    </div>
                                                                    {(employees).map((h) => (
                                                                        <SelectItem key={h.id} value={h.name} className="font-bold uppercase text-[10px]">{h.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {/* Dynamic Fields for Empty Bal */}
                                                            {state.emptyBalSource === "MANUAL" && (
                                                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                                                    <Input
                                                                        placeholder="Client Name"
                                                                        className="h-12 rounded-xl border-2 border-rose-100 bg-white font-bold text-sm uppercase"
                                                                        value={state.emptyBalName || ""}
                                                                        onChange={(e) => setReturnItemsState({
                                                                            ...returnItemsState, [type]: { ...state, emptyBalName: e.target.value }
                                                                        })}
                                                                    />
                                                                    <Input
                                                                        placeholder="Mobile No."
                                                                        type="tel"
                                                                        maxLength={10}
                                                                        pattern="\d*"
                                                                        className="h-12 rounded-xl border-2 border-rose-100 bg-white font-bold text-sm uppercase"
                                                                        value={state.emptyBalMobile || ""}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                                            setReturnItemsState({
                                                                                ...returnItemsState, [type]: { ...state, emptyBalMobile: val }
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Show Quantity either if Hawker is picked OR if Manual Name/Mobile are feeded */}
                                                            {(state.emptyBalSource && state.emptyBalSource !== "MANUAL" || (state.emptyBalSource === "MANUAL" && state.emptyBalName && state.emptyBalMobile)) && (
                                                                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                                                    <Label className="text-[10px] font-black uppercase text-rose-500 mb-2 block">Number of Empties Short</Label>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-14 rounded-xl border-2 border-rose-400 bg-white text-center text-xl font-black text-rose-700 shadow-inner"
                                                                        value={state.emptyBal || ""}
                                                                        placeholder="0"
                                                                        onChange={(e) => updateStockState(type, { emptyBal: parseInt(e.target.value) || 0 })}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step 5: Summary of Logistics */}
                                                {!isEnteringRates && !logisticsFinalized && ((wizardStep as any) === 5) && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Returns</span>
                                                                <span className="text-xl font-black text-slate-900">{state.full || 0}</span>
                                                            </div>
                                                            {isCylinderItem && (
                                                                <>
                                                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">NC Installed</span>
                                                                        <span className="text-xl font-black text-indigo-600">{state.nc || 0}</span>
                                                                    </div>
                                                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Extra Empty</span>
                                                                        <span className="text-xl font-black text-emerald-600">{state.extraEmpty || 0}</span>
                                                                    </div>
                                                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                                                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Shortage</span>
                                                                        <span className="text-xl font-black text-rose-600">{state.emptyBal || 0}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Hawker Transfers Summary */}
                                                        {isCylinderItem && state.hawkerTransfers && state.hawkerTransfers.length > 0 && (
                                                            <div className="mt-3 p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 space-y-2">
                                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Truck className="h-3 w-3" /> Hawker Transfers
                                                                </span>
                                                                <div className="space-y-1.5 mt-2">
                                                                    {state.hawkerTransfers.map((t, i) => {
                                                                        const hawkerObj = actualHawkers.find(h => h.id === t.hawkerId);
                                                                        return (
                                                                            <div key={i} className="flex items-center justify-between text-[11px] font-bold bg-white rounded-xl px-3 py-2 border border-indigo-100">
                                                                                <span className={t.type === 'Given' ? 'text-rose-500' : 'text-emerald-600'}>
                                                                                    {t.type === 'Given' ? '↑ Given To' : '↓ Taken From'}
                                                                                </span>
                                                                                <span className="text-slate-700 uppercase font-black">{hawkerObj?.name || t.hawkerId}</span>
                                                                                <span className="text-slate-500 font-bold">{t.condition}</span>
                                                                                <span className={`font-black text-base ${t.type === 'Given' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                                    {t.type === 'Given' ? '-' : '+'}{t.qty}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isCylinderItem && (
                                                            <div className="mt-6 pt-4 border-t border-slate-100">
                                                                <div className="flex items-center justify-between px-2 text-[10px] sm:text-[11px] font-bold">
                                                                    <div className="flex flex-col gap-1 text-slate-500 uppercase">
                                                                        {/* Total Empties on Truck = Required Empties + Swapped Empties (givenFilled - takenFilled) + Direct Empties (takenEmpty - givenEmpty) + Extra - Shortage */}
                                                                        {(() => {
                                                                            const transfers = state.hawkerTransfers || [];
                                                                            const givenFilled = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                                                            const takenFilled = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                                                            const takenEmpty = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Empty').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                                                                            const givenEmpty = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Empty').reduce((s: number, t: any) => s + (t.qty || 0), 0);

                                                                            const swappedEmpties = givenFilled - takenFilled;
                                                                            const totalOnTruck = (state.empty || 0) + swappedEmpties + takenEmpty - givenEmpty + (state.extraEmpty || 0) - (state.emptyBal || 0);

                                                                            // Settled = Panda's own empties balance correctly (extraEmpty covers any shortage)
                                                                            const isSettled = ((state.empty || 0) + (state.extraEmpty || 0) - (state.emptyBal || 0)) === (state.empty || 0);
                                                                            return (
                                                                                <>
                                                                                    <span>Total Empties on Truck: <span className="font-black text-slate-800 text-sm">{totalOnTruck}</span></span>
                                                                                    {(takenEmpty > 0 || givenFilled > 0) && (
                                                                                        <span className="text-emerald-600 text-[9px]">incl. {takenEmpty + givenFilled} recvd from hawkers</span>
                                                                                    )}
                                                                                    <span className="text-slate-400 text-[9px]">Full Returns: <span className="font-black text-slate-700">{state.full || 0}</span></span>
                                                                                    <div className="flex items-center gap-2 text-slate-400 font-bold mt-1">
                                                                                        Required Empties: <span className="font-black text-slate-800 text-sm ml-1">{state.empty}</span>
                                                                                        <div className={cn(
                                                                                            "flex items-center gap-1.5 px-2 py-1 rounded-md ml-2",
                                                                                            isSettled
                                                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                                                                : "bg-rose-50 text-rose-600 border border-rose-200"
                                                                                        )}>
                                                                                            <span className="uppercase tracking-tighter">{isSettled ? "Settled" : "Unbalanced"}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Separate Section: Rates Configuration (Sequential Slides) */}
                                                {isEnteringRates && !logisticsFinalized && (() => {
                                                    // We handle rateStepIndex check at the top of the map now.

                                                    return (
                                                        <div className="pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-right-2">
                                                            <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/20 shadow-sm space-y-4 mb-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Label className="text-xs font-black uppercase text-indigo-700 tracking-widest">{type} Rates Configuration</Label>
                                                                </div>

                                                                {/* Refill/Sale Rates */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <h6 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{isCylinderItem ? "Refill Rates" : "Sale Rates"}</h6>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const newRefill = [...(state.refillRates || []), { id: Date.now().toString() + Math.random(), qty: 0, rate: 0 }];
                                                                                setReturnItemsState({ ...returnItemsState, [type]: { ...state, refillRates: newRefill } });
                                                                            }}
                                                                            className="h-6 w-6 p-0 rounded-full hover:bg-indigo-50"
                                                                        >
                                                                            <Plus className="h-3 w-3 text-indigo-500" />
                                                                        </Button>
                                                                    </div>
                                                                    {state.refillRates?.map((r: any, idx: number) => (
                                                                        <div key={r.id} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-indigo-50/30 p-2 sm:p-3 rounded-xl border border-indigo-100/50">
                                                                            <div className="flex gap-2 items-center flex-1 min-w-[120px]">
                                                                                <Input
                                                                                    type="number"
                                                                                    placeholder="Qty"
                                                                                    className="w-20 h-10 rounded-lg text-center font-bold text-sm bg-white border-indigo-200"
                                                                                    value={r.qty || ""}
                                                                                    onChange={(e) => {
                                                                                        const newQty = parseInt(e.target.value) || 0;
                                                                                        const newRefill = [...state.refillRates];
                                                                                        newRefill[idx].qty = newQty;
                                                                                        // Auto-balance if exactly 2 splits
                                                                                        if (newRefill.length === 2) {
                                                                                            const otherIdx = idx === 0 ? 1 : 0;
                                                                                            const expectedEmpties = state.empty || 0;
                                                                                            newRefill[otherIdx].qty = Math.max(0, expectedEmpties - newQty);
                                                                                        }
                                                                                        setReturnItemsState({ ...returnItemsState, [type]: { ...state, refillRates: newRefill } });
                                                                                    }}
                                                                                />
                                                                                <span className="text-slate-300 font-black text-xs">×</span>
                                                                                <Input
                                                                                    type="number"
                                                                                    placeholder="Rate"
                                                                                    className="flex-1 h-10 rounded-lg font-bold text-sm bg-white border-indigo-200"
                                                                                    value={r.rate || ""}
                                                                                    onChange={(e) => {
                                                                                        const newRefill = [...state.refillRates];
                                                                                        newRefill[idx].rate = parseInt(e.target.value) || 0;
                                                                                        setReturnItemsState({ ...returnItemsState, [type]: { ...state, refillRates: newRefill } });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                                                                                <div className="min-w-[80px] text-right px-2 bg-white h-10 flex items-center justify-end rounded-lg border border-indigo-50">
                                                                                    <span className="text-[11px] font-black text-indigo-600 block">Rs. {(r.qty * r.rate) || 0}</span>
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        const newRefill = state.refillRates.filter((_: any, i: number) => i !== idx);
                                                                                        setReturnItemsState({ ...returnItemsState, [type]: { ...state, refillRates: newRefill } });
                                                                                    }}
                                                                                    className="h-10 w-10 shrink-0 text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 rounded-lg"
                                                                                >
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* NC Rates */}
                                                                {/* NC Rates - Only for Cylinders and when NC Installed > 0 */}
                                                                {isCylinderItem && (state.nc || 0) > 0 && (
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <h6 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">NC Rates</h6>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    const newNc = [...(state.ncRates || []), { id: Date.now().toString() + Math.random(), qty: 0, rate: 0 }];
                                                                                    setReturnItemsState({ ...returnItemsState, [type]: { ...state, ncRates: newNc } });
                                                                                }}
                                                                                className="h-6 w-6 p-0 rounded-full hover:bg-emerald-50"
                                                                            >
                                                                                <Plus className="h-3 w-3 text-emerald-500" />
                                                                            </Button>
                                                                        </div>
                                                                        {state.ncRates?.map((r: any, idx: number) => (
                                                                            <div key={r.id} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-emerald-50/30 p-2 sm:p-3 rounded-xl border border-emerald-100/50">
                                                                                <div className="flex gap-2 items-center flex-1 min-w-[120px]">
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="Qty"
                                                                                        className="w-20 h-10 rounded-lg text-center font-bold text-sm bg-white border-emerald-200"
                                                                                        value={r.qty || ""}
                                                                                        onChange={(e) => {
                                                                                            const newQty = parseInt(e.target.value) || 0;
                                                                                            const newNc = [...state.ncRates];
                                                                                            newNc[idx].qty = newQty;
                                                                                            // Auto-balance if exactly 2 splits
                                                                                            if (newNc.length === 2) {
                                                                                                const otherIdx = idx === 0 ? 1 : 0;
                                                                                                const expectedNc = state.nc || 0;
                                                                                                newNc[otherIdx].qty = Math.max(0, expectedNc - newQty);
                                                                                            }
                                                                                            setReturnItemsState({ ...returnItemsState, [type]: { ...state, ncRates: newNc } });
                                                                                        }}
                                                                                    />
                                                                                    <span className="text-slate-300 font-black text-xs">×</span>
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="Rate"
                                                                                        className="flex-1 h-10 rounded-lg font-bold text-sm bg-white border-emerald-200"
                                                                                        value={r.rate || ""}
                                                                                        onChange={(e) => {
                                                                                            const newNc = [...state.ncRates];
                                                                                            newNc[idx].rate = parseInt(e.target.value) || 0;
                                                                                            setReturnItemsState({ ...returnItemsState, [type]: { ...state, ncRates: newNc } });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                                                                                    <div className="min-w-[80px] text-right px-2 bg-white h-10 flex items-center justify-end rounded-lg border border-emerald-50">
                                                                                        <span className="text-[11px] font-black text-emerald-600 block">Rs. {(r.qty * r.rate) || 0}</span>
                                                                                    </div>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() => {
                                                                                            const newNc = state.ncRates.filter((_: any, i: number) => i !== idx);
                                                                                            setReturnItemsState({ ...returnItemsState, [type]: { ...state, ncRates: newNc } });
                                                                                        }}
                                                                                        className="h-10 w-10 shrink-0 text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 rounded-lg"
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Slide 5.1: Kharcha */}
                                {logisticsFinalized && financialStep === 0 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-800">Financial Settlement / <span className="text-indigo-600">Kharcha</span></h5>
                                        </div>

                                        <div className="flex flex-wrap gap-2 px-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExpenses([...expenses, { id: Date.now().toString(), type: "Other", amount: 0 }])}
                                                className="rounded-xl border-orange-200 bg-orange-50/50 text-orange-700 font-black uppercase text-[10px] tracking-widest h-10 px-4 hover:bg-orange-100"
                                            >
                                                <Plus className="mr-2 h-3 w-3" /> Add Kharcha
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Kharcha Rows */}
                                            {expenses.filter(e => e.type !== 'Money Bal').map((exp, idx) => (
                                                <div key={exp.id} className="flex gap-2 items-center bg-orange-50/30 p-2 rounded-2xl border border-orange-100/50 animate-in fade-in slide-in-from-left-2">
                                                    <Badge variant="outline" className="h-10 px-4 rounded-xl bg-orange-100 border-orange-200 text-orange-700 uppercase font-black text-[9px]">Kharcha</Badge>
                                                    <Select
                                                        value={exp.type}
                                                        onValueChange={(val) => {
                                                            const newEx = [...expenses];
                                                            const i = newEx.findIndex(e => e.id === exp.id);
                                                            newEx[i].type = val;
                                                            setExpenses(newEx);
                                                        }}
                                                    >
                                                        <SelectTrigger className="flex-1 h-10 rounded-xl border-slate-200 font-bold text-xs uppercase">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {['Diesel', 'Toll', 'Police', 'Repair', 'Tea/Snacks', 'Other'].map(t => (
                                                                <SelectItem key={t} value={t} className="font-bold text-xs uppercase tracking-widest">{t}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="relative w-32">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rs.</span>
                                                        <Input
                                                            type="number"
                                                            className="h-10 pl-7 pr-3 rounded-xl border-slate-200 text-right font-black"
                                                            value={exp.amount || ""}
                                                            onChange={(e) => {
                                                                const newEx = [...expenses];
                                                                const i = newEx.findIndex(e => e.id === exp.id);
                                                                newEx[i].amount = parseInt(e.target.value) || 0;
                                                                setExpenses(newEx);
                                                            }}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))}
                                                        className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-50">
                                            <span className="text-xs font-black uppercase text-slate-400">Total Kharcha Summary</span>
                                            <span className="text-lg font-black text-rose-600">
                                                - Rs.{(expenses.filter(e => e.type !== 'Money Bal').reduce((s, x) => s + x.amount, 0)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Slide 5.2: Money Bal */}
                                {logisticsFinalized && financialStep === 1 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-800">Financial Settlement / <span className="text-yellow-600">Money Bal</span></h5>
                                        </div>

                                        <div className="flex flex-wrap gap-2 px-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExpenses([...expenses, { id: Date.now().toString(), type: "Money Bal", name: "", mobile: "", amount: 0 }])}
                                                className="rounded-xl border-yellow-200 bg-yellow-50/50 text-yellow-700 font-black uppercase text-[10px] tracking-widest h-10 px-4 hover:bg-yellow-100"
                                            >
                                                <Plus className="mr-2 h-3 w-3" /> Add Money Bal
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Money Bal Rows */}
                                            {expenses.filter(e => e.type === 'Money Bal').map((exp) => (
                                                <div key={exp.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-yellow-50/30 p-4 rounded-2xl border border-yellow-100/50 animate-in fade-in slide-in-from-left-2 transition-all">
                                                    <Badge variant="outline" className="h-8 px-3 rounded-lg bg-yellow-100 border-yellow-200 text-yellow-700 uppercase font-black text-[9px] shrink-0">Money Bal</Badge>
                                                    <div className="flex-1 w-full sm:w-auto flex flex-col gap-2">
                                                        <Select
                                                            value={exp.customerId ? `CUST-${exp.customerId}` : ""}
                                                            onValueChange={(val) => {
                                                                const custId = val.replace("CUST-", "");
                                                                const customer = customers.find(c => c.id === custId);
                                                                const newEx = [...expenses];
                                                                const i = newEx.findIndex(e => e.id === exp.id);
                                                                newEx[i].customerId = custId;
                                                                newEx[i].name = customer?.name || "";
                                                                newEx[i].mobile = customer?.mobile || "";
                                                                setExpenses(newEx);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-10 rounded-xl border-yellow-200 bg-white font-bold text-[10px] uppercase text-yellow-700">
                                                                <div className="flex justify-between items-center w-full pr-2">
                                                                    <SelectValue placeholder="Pick Customer (Optional)" />
                                                                    {exp.customerId && (() => {
                                                                        const c = customers.find(c => c.id === exp.customerId);
                                                                        return c ? <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700 border-none text-[8px] h-5 px-1.5">Bal: ₹{c.cashBal}</Badge> : null;
                                                                    })()}
                                                                </div>
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                {customers.map((c: any) => {
                                                                    const prevBal = prevMoneyBal.filter(b => b.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())[0];
                                                                    return (
                                                                        <SelectItem key={c.id} value={`CUST-${c.id}`} className="font-bold uppercase text-[10px]">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span>{c.name}</span>
                                                                                <span className="text-[9px] font-bold text-yellow-600 normal-case">
                                                                                    Bal: ₹{c.cashBal || 0}{prevBal ? ` · Last: ₹${prevBal.amount} on ${new Date(prevBal.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                        {exp.customerId && (() => {
                                                            const c = customers.find((c: any) => c.id === exp.customerId);
                                                            const prevBal = c ? prevMoneyBal.filter(b => b.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())[0] : null;
                                                            if (!c) return null;
                                                            return (
                                                                <div className="flex flex-wrap gap-2 px-1 py-1.5">
                                                                    <span className="text-[10px] font-black text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5">
                                                                        💰 Current Balance: ₹{c.cashBal || 0}
                                                                    </span>
                                                                    {prevBal && (
                                                                        <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                                                                            📅 Last Due: ₹{prevBal.amount} on {new Date(prevBal.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="grid grid-cols-2 gap-2 items-center">
                                                            <Input
                                                                placeholder="Payee Name"
                                                                className="col-span-1 h-11 rounded-xl border-slate-200 font-bold text-xs uppercase"
                                                                value={exp.name || ""}
                                                                onChange={(e) => {
                                                                    const newEx = [...expenses];
                                                                    const i = newEx.findIndex(e => e.id === exp.id);
                                                                    newEx[i].name = e.target.value;
                                                                    setExpenses(newEx);
                                                                }}
                                                            />
                                                            <Input
                                                                placeholder="Mobile Number"
                                                                maxLength={10}
                                                                pattern="\d*"
                                                                className="col-span-1 h-11 rounded-xl border-slate-200 font-bold text-xs"
                                                                value={exp.mobile || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                                    const newEx = [...expenses];
                                                                    const i = newEx.findIndex(e => e.id === exp.id);
                                                                    newEx[i].mobile = val;
                                                                    setExpenses(newEx);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                                            <div className="relative flex-1 sm:w-32">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">Rs.</span>
                                                                <Input
                                                                    type="number"
                                                                    className="h-11 pl-8 pr-3 rounded-xl border-slate-200 text-right font-black"
                                                                    value={exp.amount || ""}
                                                                    onChange={(e) => {
                                                                        const newEx = [...expenses];
                                                                        const i = newEx.findIndex(e => e.id === exp.id);
                                                                        newEx[i].amount = parseInt(e.target.value) || 0;
                                                                        setExpenses(newEx);
                                                                    }}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))}
                                                                className="h-11 w-11 text-rose-500 hover:bg-rose-50 rounded-xl bg-white border border-yellow-100"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Slide 5.3: Extra Money & Net Cash */}
                                {logisticsFinalized && financialStep === 2 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-800">Financial Settlement / <span className="text-emerald-600">Extra Money & Net Summary</span></h5>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expected Revenue</p>
                                                <p className="text-xl font-black text-indigo-600">Rs.{totalExpectedCash.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 px-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setExtraMoney([...extraMoney, { id: Date.now().toString(), name: "OTHER (Manual)", amount: 0 }])}
                                                className="rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 font-black uppercase text-[10px] tracking-widest h-10 px-4 hover:bg-emerald-100"
                                            >
                                                <Plus className="mr-2 h-3 w-3" /> + Extra Money
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Extra Money Rows */}
                                            {extraMoney.map((exp) => (
                                                <div key={exp.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/50 animate-in fade-in slide-in-from-left-2">
                                                    <Badge variant="outline" className="hidden sm:inline-flex h-10 px-4 rounded-xl bg-emerald-100 border-emerald-200 text-emerald-700 uppercase font-black text-[9px]">Extra Money</Badge>
                                                    <Select
                                                        value={exp.name}
                                                        onValueChange={(val) => {
                                                            const isCustomer = val.startsWith("CUST-");
                                                            const custId = isCustomer ? val.replace("CUST-", "") : undefined;
                                                            const customer = customers.find(c => c.id === custId);

                                                            const newEx = [...extraMoney];
                                                            const i = newEx.findIndex(e => e.id === exp.id);
                                                            newEx[i].name = customer?.name || val;
                                                            newEx[i].customerId = custId;
                                                            newEx[i].mobile = customer?.mobile || "";
                                                            setExtraMoney(newEx);
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full sm:w-[150px] md:flex-1 h-12 rounded-xl border-emerald-200 font-bold text-xs uppercase bg-white">
                                                            <div className="flex justify-between items-center w-full pr-2">
                                                                <SelectValue />
                                                                {exp.customerId && (() => {
                                                                    const c = customers.find(c => c.id === exp.customerId);
                                                                    return c ? <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700 border-none text-[8px] h-5 px-1.5">Bal: ₹{c.cashBal}</Badge> : null;
                                                                })()}
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {['New Conn.', 'Excess Collection', 'OTHER (Manual)'].map(t => (
                                                                <SelectItem key={t} value={t} className="font-bold text-xs uppercase tracking-widest">{t}</SelectItem>
                                                            ))}
                                                            {customers.length > 0 && (
                                                                <>
                                                                    <div className="px-2 py-1.5 border-t border-slate-100 bg-slate-50/50 mt-1">
                                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Your Customers</p>
                                                                    </div>
                                                                    {customers.map((c: any) => {
                                                                        const prevBal = prevMoneyBal.filter(b => b.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())[0];
                                                                        return (
                                                                            <SelectItem key={c.id} value={`CUST-${c.id}`} className="font-bold uppercase text-[10px] text-indigo-600">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span>{c.name}</span>
                                                                                    <span className="text-[9px] font-bold text-emerald-600 normal-case">
                                                                                        Bal: ₹{c.cashBal || 0}{prevBal ? ` · Last: ₹${prevBal.amount} on ${new Date(prevBal.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                                                                    </span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>

                                                    {exp.customerId && (() => {
                                                        const c = customers.find((c: any) => c.id === exp.customerId);
                                                        const prevBal = c ? prevMoneyBal.filter(b => b.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())[0] : null;
                                                        if (!c) return null;
                                                        return (
                                                            <div className="flex flex-wrap gap-2 w-full px-1 py-0.5">
                                                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                                                    💰 Current Balance: ₹{c.cashBal || 0}
                                                                </span>
                                                                {prevBal && (
                                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                                                                        📅 Last Due: ₹{prevBal.amount} on {new Date(prevBal.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="flex w-full sm:w-auto gap-2 items-center">
                                                        <Input
                                                            placeholder="Details"
                                                            className="flex-1 min-w-[100px] h-12 rounded-xl border-emerald-200 font-bold text-xs uppercase bg-white"
                                                            value={exp.mobile || ""}
                                                            onChange={(e) => {
                                                                const newEx = [...extraMoney];
                                                                const i = newEx.findIndex(e => e.id === exp.id);
                                                                newEx[i].mobile = e.target.value;
                                                                setExtraMoney(newEx);
                                                            }}
                                                        />
                                                        <div className="relative w-28 shrink-0">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">Rs.</span>
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                className="h-12 pl-8 pr-3 rounded-xl border-emerald-400 text-right font-black bg-white focus:border-emerald-500 focus:ring-emerald-500 shadow-inner"
                                                                value={exp.amount || ""}
                                                                onChange={(e) => {
                                                                    const newEx = [...extraMoney];
                                                                    const i = newEx.findIndex(e => e.id === exp.id);
                                                                    newEx[i].amount = parseInt(e.target.value) || 0;
                                                                    setExtraMoney(newEx);
                                                                }}
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setExtraMoney(extraMoney.filter(e => e.id !== exp.id))}
                                                            className="h-12 w-12 shrink-0 text-rose-500 hover:bg-rose-50 rounded-xl bg-white border border-emerald-50 shadow-sm"
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Slide 5.4: Prepaid / Online Payments & Net Cash */}
                                {logisticsFinalized && financialStep === 3 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center justify-between px-2">
                                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-800">Financial Settlement / <span className="text-emerald-600">Prepaid & Net Summary</span></h5>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expected Revenue</p>
                                                <p className="text-xl font-black text-indigo-600">Rs.{totalExpectedCash.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 px-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPrepaidPayments([...prepaidPayments, { id: Date.now().toString(), name: "UPI / Online", amount: 0 }])}
                                                className="rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 font-black uppercase text-[10px] tracking-widest h-10 px-4 hover:bg-emerald-100"
                                            >
                                                <Plus className="mr-2 h-3 w-3" /> + Prepaid / Online
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {prepaidPayments.map((pay) => (
                                                <div key={pay.id} className="flex gap-2 items-center bg-emerald-50/30 p-2 rounded-2xl border border-emerald-100/50 animate-in fade-in slide-in-from-left-2">
                                                    <Badge variant="outline" className="h-10 px-4 rounded-xl bg-emerald-100 border-emerald-200 text-emerald-700 uppercase font-black text-[9px]">Online</Badge>
                                                    <Input
                                                        placeholder="Client / Reference"
                                                        className="flex-1 h-10 rounded-xl border-slate-200 font-bold text-xs uppercase"
                                                        value={pay.name || ""}
                                                        onChange={(e) => {
                                                            const newPay = [...prepaidPayments];
                                                            const i = newPay.findIndex(p => p.id === pay.id);
                                                            newPay[i].name = e.target.value;
                                                            setPrepaidPayments(newPay);
                                                        }}
                                                    />
                                                    <div className="relative w-32">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">Rs.</span>
                                                        <Input
                                                            type="number"
                                                            className="h-10 pl-7 pr-3 rounded-xl border-slate-200 text-right font-black"
                                                            value={pay.amount || ""}
                                                            onChange={(e) => {
                                                                const newPay = [...prepaidPayments];
                                                                const i = newPay.findIndex(p => p.id === pay.id);
                                                                newPay[i].amount = parseInt(e.target.value) || 0;
                                                                setPrepaidPayments(newPay);
                                                            }}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPrepaidPayments(prepaidPayments.filter(p => p.id !== pay.id))}
                                                        className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="glass-card p-6 rounded-[2rem] border-slate-100 space-y-4">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Cash Submission</h5>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-indigo-600 z-10 pointer-events-none">Rs.</span>
                                                <DenominationCalculator
                                                    value={parseInt(cashSubmitted) || 0}
                                                    onChange={(val) => setCashSubmitted(val.toString())}
                                                    expectedAmount={totalExpectedCash}
                                                >
                                                    <Input
                                                        type="number"
                                                        placeholder="Actual cash submitted"
                                                        className="h-16 pl-10 pr-12 rounded-[1.25rem] border-none bg-indigo-50 text-2xl font-black text-indigo-900 focus:ring-2 ring-indigo-500 cursor-pointer caret-transparent"
                                                        value={cashSubmitted}
                                                        readOnly
                                                    />
                                                </DenominationCalculator>
                                            </div>
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expected: Rs.{totalExpectedCash.toLocaleString()}</span>
                                                <Badge variant="outline" className={cn(
                                                    "rounded-full font-black px-2 py-0.5 text-[9px]",
                                                    (parseFloat(cashSubmitted) || 0) >= totalExpectedCash ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    {(parseFloat(cashSubmitted) || 0) >= totalExpectedCash ? "Surplus / Balanced" : `Shortage: Rs.${(totalExpectedCash - (parseFloat(cashSubmitted) || 0)).toLocaleString()}`}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* WIZARD NAVIGATION FOOTER */}
                                <div className="flex gap-3 pt-6 mt-4 border-t border-slate-100">
                                    {logisticsFinalized ? (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    if (financialStep > 0) {
                                                        setFinancialStep(financialStep - 1);
                                                    } else {
                                                        setLogisticsFinalized(false);
                                                        setIsEnteringRates(true);
                                                        setRateStepIndex(Object.keys(returnItemsState).length - 1);
                                                    }
                                                }}
                                                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest italic"
                                            >
                                                Previous Step
                                            </Button>

                                            {financialStep < 3 ? (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    onClick={() => setFinancialStep(financialStep + 1)}
                                                >
                                                    Next Step
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    onClick={() => setShowConfirmDialog(true)}
                                                >
                                                    Finalize Trip Details
                                                </Button>
                                            )}
                                        </>
                                    ) : isEnteringRates ? (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    if (rateStepIndex === 0) {
                                                        setIsEnteringRates(false);
                                                    } else {
                                                        setRateStepIndex(rateStepIndex - 1);
                                                    }
                                                }}
                                                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest italic"
                                            >
                                                Previous Step
                                            </Button>

                                            {rateStepIndex < Object.keys(returnItemsState).length - 1 ? (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    onClick={() => setRateStepIndex(rateStepIndex + 1)}
                                                >
                                                    Next Step
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    onClick={() => {
                                                        setIsEnteringRates(false);
                                                        setLogisticsFinalized(true);
                                                    }}
                                                >
                                                    Proceed to Financial Settlement
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    if (wizardStep === 0) setCompletingId(null);
                                                    else setWizardStep(wizardStep - 1);
                                                }}
                                                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest italic"
                                                disabled={isSavingTransfers}
                                            >
                                                {wizardStep === 0 ? "Abort" : "Previous Step"}
                                            </Button>

                                            {wizardStep < 5 ? (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    disabled={isSavingTransfers}
                                                    onClick={async () => {
                                                        if (wizardStep === 0) {
                                                            setIsSavingTransfers(true);
                                                            let hasError = false;
                                                            // Execute all hawker transfers synchronously
                                                            for (const [itemType, state] of Object.entries(returnItemsState)) {
                                                                const pending = (state.hawkerTransfers || []).filter((t: any) => !t.isProcessed);
                                                                if (pending.length > 0) {
                                                                    try {
                                                                        const res = await fetch('/api/trips/hawker-transfers', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                senderTripId: trip.id,
                                                                                senderDriverName: trip.driverName,
                                                                                itemType,
                                                                                transfers: pending
                                                                            })
                                                                        });
                                                                        if (!res.ok) throw new Error("Failed");

                                                                        // Mark transfers as processed
                                                                        setReturnItemsState(prev => {
                                                                            const oldState = prev[itemType];
                                                                            if (!oldState) return prev;
                                                                            return {
                                                                                ...prev,
                                                                                [itemType]: {
                                                                                    ...oldState,
                                                                                    hawkerTransfers: oldState.hawkerTransfers.map((t: any) => ({ ...t, isProcessed: true }))
                                                                                }
                                                                            };
                                                                        });
                                                                    } catch (e) {
                                                                        hasError = true;
                                                                        alert("Failed to save transfers securely. Please check your connection.");
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            setIsSavingTransfers(false);
                                                            if (hasError) return;
                                                        }
                                                        setWizardStep(wizardStep + 1);
                                                    }}
                                                >
                                                    {isSavingTransfers ? "Processing..." : wizardStep === 0 ? "Save & Next Step" : "Next Step"}
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="flex-1 h-12 rounded-xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                                    onClick={() => {
                                                        setIsEnteringRates(true);
                                                        setRateStepIndex(0);
                                                    }}
                                                >
                                                    Confirm Logistics & Move to Rates
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            </CardContent>

            <CardFooter className="px-8 pb-8 pt-0 gap-3 mt-auto">
                {trip.status === 'OUT' ? (
                    <div className="flex gap-2 w-full">
                        {completingId !== trip.id && (
                            <>
                                <Button
                                    className="flex-1 h-12 rounded-2xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale"
                                    onClick={() => prepareCompleteTrip(trip.id, trip.stockItems, trip.driverName)}
                                >
                                    End Mission / De-Brief
                                </Button>

                                {isToday && (user?.role === 'MASTER' || user?.role === 'MANAGER') && (
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 rounded-2xl border-2 border-slate-100 flex items-center justify-center active-scale"
                                        onClick={() => handleEditTrip(trip)}
                                    >
                                        <Pencil className="h-5 w-5 text-slate-400" />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-2xl border-2 border-slate-100 bg-white text-slate-600 font-black uppercase text-[10px] tracking-widest active-scale"
                            onClick={() => handleShareReport(trip)}
                        >
                            <BarChart3 className="mr-2 h-4 w-4" /> Final Audit
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 w-12 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-600 active-scale"
                            onClick={() => {
                                const url = generateWhatsAppLink(generateTripReport(trip));
                                window.open(url, '_blank');
                            }}
                        >
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {(user?.role === 'MASTER' || isToday) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Delete / <span className="text-rose-600">Trip</span></AlertDialogTitle>
                                <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    This will permanently delete this trip. THIS CANNOT BE UNDONE.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8">
                                <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest">Abort</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTrip(trip.id)} className="rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardFooter>
        </Card >
    );

    return (
        <SectionGuard section="TRIPS">
            <div className="w-full pb-12 overflow-x-hidden" id="main-container">

            <CapacitorBackButton />

            {/* Header Module - Premium & Responsive */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/dashboard')}
                            className="shrink-0 rounded-full hover:bg-slate-200 active-scale"
                        >
                            <Home className="h-6 w-6 text-slate-600" />
                        </Button>
                        <div >
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                                Fleet / <span className="text-indigo-600">Logistics</span>
                            </h2>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Route & Delivery Systems</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Date Picker Popover */}
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full sm:w-auto h-11 px-6 rounded-full font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 active-scale transition-all",
                                        !isToday ? "border-indigo-200 bg-indigo-50/50 text-indigo-700" : "border-slate-200"
                                    )}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {formattedDate}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(day) => {
                                        if (day) setSelectedDate(day);
                                    }}
                                    initialFocus
                                />
                                <div className="p-4 border-t bg-slate-50">
                                    <Button
                                        className="w-full h-10 premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-lg active-scale rounded-xl"
                                        onClick={() => setCalendarOpen(false)}
                                    >
                                        Jump to Date
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Deploy Fleet Button */}
                        {isToday && (
                            <Button
                                className="h-11 px-8 rounded-full premium-gradient text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-500/20 active-scale"
                                onClick={() => showNewTrip ? handleCancelTripEntry() : setShowNewTrip(true)}
                            >
                                {showNewTrip ? <X className="mr-2 h-4 w-4" /> : editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
                                {showNewTrip ? "Abort Setup" : editingId ? "Update configuration" : "Deploy Fleet"}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Intelligence Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Active Trips', value: activeMissions, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Completed', value: completedMissions, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Est. Revenue', value: `₹${dayFinancials.revenue.toLocaleString()}`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Daily Expenses', value: `₹${dayFinancials.expenses.toLocaleString()}`, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' }
                    ].map((kpi, i) => (
                        <div key={i} className="glass-card p-4 rounded-3xl border-slate-100 flex items-center gap-4 transition-all hover:translate-y-[-2px] border border-transparent hover:border-indigo-100 shadow-sm">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", kpi.bg)}>
                                <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
                                <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* New Trip Creation / Editor */}
            {showNewTrip && (
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden glass-card animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader className="bg-slate-900 py-8 px-8 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                                {editingId ? <Pencil className="h-6 w-6 text-indigo-400" /> : <Truck className="h-6 w-6 text-indigo-400" />}
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight text-white italic">
                                    {editingId ? "Update Trip" : "New Trip"}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure vehicle and stock for delivery</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Logistics Core</h4>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-indigo-600 ml-1">Vehicle Selection</label>
                                        <Select value={vehicleNo} onValueChange={setVehicleNo}>
                                            <SelectTrigger className="h-12 rounded-[1rem] border-2 border-slate-100 bg-slate-50/50 focus:ring-indigo-500 shadow-sm">
                                                <SelectValue placeholder="Select Vehicle" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                {vehicles.map(v => (
                                                    <SelectItem key={v.id} value={v.number} className="rounded-lg">{v.number} ({v.type})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-indigo-600 ml-1">Hawker</label>
                                        <Select value={driverName} onValueChange={setDriverName}>
                                            <SelectTrigger className="h-12 rounded-[1rem] border-2 border-slate-100 bg-slate-50/50 focus:ring-indigo-500 shadow-sm">
                                                <SelectValue placeholder="Select Hawker" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                {hawkers.map(h => (
                                                    <SelectItem key={h.id} value={h.name} className="rounded-lg">{h.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-indigo-600 ml-1">Route / Area</label>
                                        <Input
                                            placeholder="Enter Route / Area"
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            className="h-12 rounded-[1rem] border-2 border-slate-100 bg-slate-50/50 focus:ring-indigo-500 shadow-sm font-bold uppercase placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock Manifest</h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddStockRow}
                                            className="h-8 rounded-full border-2 border-indigo-100 bg-indigo-50 text-indigo-600 font-black uppercase text-[9px] px-4 active-scale transition-all"
                                        >
                                            <Plus className="mr-1 h-3 w-3" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {stockItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <div className="flex-1">
                                                    <Select
                                                        value={item.type}
                                                        onValueChange={(val) => {
                                                            const selectedStock = stock.find(s => s.type === val);
                                                            handleStockItemChange(idx, 'type', val);
                                                            const newItems = [...stockItems];
                                                            newItems[idx] = { ...newItems[idx], type: val, weight: selectedStock?.weight };
                                                            setStockItems(newItems);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-11 rounded-xl border-2 border-slate-100 bg-slate-50/50">
                                                            <SelectValue placeholder="Select Item" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                                            {stock.map(s => (
                                                                <SelectItem key={s.type} value={s.type} className="rounded-lg">{s.type} ({s.weight})</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-24">
                                                    <Input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.quantity === 0 ? "" : item.quantity}
                                                        onChange={(e) => handleStockItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                        className="h-11 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-center font-black"
                                                    />
                                                </div>
                                                {stockItems.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStockRow(idx)} className="h-11 w-11 rounded-xl text-rose-500 hover:bg-rose-50">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 p-8 border-t border-slate-100">
                        <div className="flex justify-end gap-3 w-full">
                            <Button variant="ghost" onClick={handleCancelTripEntry} className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest">Discard</Button>
                            <Button className="h-12 px-12 rounded-xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 active-scale" onClick={handleStartTrip}>
                                {editingId ? "Update Trip" : "Start Trip"}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {/* Missions Listing Grid */}
            <div className="space-y-12 mt-12">
                {/* 1. Ongoing Missions - Status: OUT */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 italic">Active Trips</h3>
                        <Badge variant="outline" className="rounded-full bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-3 ml-auto">
                            {trips.filter(t => t.status === 'OUT').length} Active
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-8">
                        {trips.filter(t => t.status === 'OUT').length === 0 ? (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                <Truck className="h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active trips</p>
                            </div>
                        ) : (
                            trips.filter(t => t.status === 'OUT').map(renderTripCard)
                        )}
                    </div>
                </div>

                {/* 2. Mission History - Status: COMPLETED, Date Filtered */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <HistoryIcon className="h-5 w-5 text-slate-400" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-600 italic">Trip History</h3>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formattedDate}</span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-8">
                        {trips.filter(t => t.status === 'COMPLETED' && tripMatchesDate(t)).length === 0 ? (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                <HistoryIcon className="h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No records found for this period</p>
                            </div>
                        ) : (
                            trips.filter(t => t.status === 'COMPLETED' && tripMatchesDate(t)).map(renderTripCard)
                        )}
                    </div>
                </div>
            </div>

            <div id="daily-intelligence-placeholder"></div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Confirm / <span className="text-indigo-600">Settle</span></AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Review financial settlements and stock returns. This will synchronize the ledger and agency inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8">
                        <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest">Re-Audit</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCompleteTrip} className="rounded-xl premium-gradient text-white font-black uppercase text-[10px] tracking-widest px-8">Execute Settlement</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
        </SectionGuard>
    );
}
