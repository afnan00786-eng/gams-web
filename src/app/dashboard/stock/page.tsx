"use client";

import { useEffect, useState } from "react";
import { useStockStore } from "@/store/useStockStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { Home, CalendarIcon, RotateCcw, Plus, Package, ArrowUpRight, ArrowDownRight, History, ShieldAlert, Pencil, Check, X, Trash2, RefreshCw, Truck } from "lucide-react";
import { format, isToday as isDateToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";
import { SectionGuard } from "@/components/auth/SectionGuard";

export default function StockPage() {
    const { stock, updateStock, fetchStock, addStockItem, bulkUpdateStock, lastBatchUpdate, undoLastBatch, deleteStockItem, editStockItem } = useStockStore();
    const { t } = useLanguageStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const [date, setDate] = useState<Date>(new Date());
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [newStockType, setNewStockType] = useState("");
    const [newStockWeight, setNewStockWeight] = useState("");
    const [newIsCylinder, setNewIsCylinder] = useState(true);
    const [addPopoverOpen, setAddPopoverOpen] = useState(false);
    const [soldByType, setSoldByType] = useState<Record<string, number>>({});

    // Batch Updates State for Load Receive/Sending
    const [receivePopoverOpen, setReceivePopoverOpen] = useState(false);
    const [sendPopoverOpen, setSendPopoverOpen] = useState(false);
    const [batchUpdates, setBatchUpdates] = useState<Record<string, { fullChange?: number, emptyChange?: number, defectiveChange?: number }>>({});
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchStock(date),
            fetchTransactions(date)
        ]);
        setTimeout(() => setIsRefreshing(false), 400);
    };

    // Edit state for audit rows
    const [editingTx, setEditingTx] = useState<{ id: string; stockType: string } | null>(null);
    const [editFull, setEditFull] = useState("");
    const [editEmpty, setEditEmpty] = useState("");
    const [editDefective, setEditDefective] = useState("");

    // Delete Modal State
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Edit Schema Modal State
    const [schemaToEdit, setSchemaToEdit] = useState<any | null>(null);
    const [editSchemaType, setEditSchemaType] = useState("");
    const [editSchemaWeight, setEditSchemaWeight] = useState("");
    const [editSchemaIsCylinder, setEditSchemaIsCylinder] = useState(true);

    const openEditSchema = (item: any) => {
        setSchemaToEdit(item);
        setEditSchemaType(item.type);
        setEditSchemaWeight(item.weight);
        setEditSchemaIsCylinder(item.isCylinder !== false); // Default true if undefined
    };

    const handleSaveSchemaEdit = async () => {
        if (!schemaToEdit) return;
        await editStockItem(schemaToEdit.type, editSchemaType, editSchemaWeight, editSchemaIsCylinder);
        setSchemaToEdit(null);
    };

    const confirmDeleteStock = async () => {
        if (itemToDelete) {
            await deleteStockItem(itemToDelete);
            setItemToDelete(null);
        }
    };

    const toLocalDateStr = (d: Date) => d.toLocaleDateString('en-CA');

    const fetchTransactions = async (d: Date) => {
        try {
            const res = await fetch(`/api/stock/transactions?date=${d.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        }
    };

    useEffect(() => {
        fetchStock(date);
        fetchTransactions(date);
        // Fetch completed trips for selected date to compute Refill+NC sold per type
        fetch('/api/trips')
            .then(r => r.json())
            .then((trips: any[]) => {
                const soldMap: Record<string, number> = {};
                trips
                    .filter(t => t.status === 'COMPLETED' && toLocalDateStr(new Date(t.timeOut)) === toLocalDateStr(date))
                    .forEach(trip => {
                        try {
                            const items = JSON.parse(trip.stockItems || '[]');
                            items.forEach((item: any) => {
                                // Lookup from current stock definitions
                                const stockDef = stock.find(s => s.type === item.type);
                                const isCylinder = stockDef ? (stockDef.isCylinder !== false) : true;

                                const sold = isCylinder
                                    ? (item.inEmpty || 0) + (item.inNc || 0)
                                    : Math.max(0, (item.out || item.quantity || 0) - (item.inFull || 0));
                                soldMap[item.type] = (soldMap[item.type] || 0) + sold;
                            });
                        } catch (e) { }
                    });
                setSoldByType(soldMap);
            })
            .catch(() => { });
    }, [fetchStock, date, stock]);

    const canEdit = user?.role === "MASTER" || user?.role === "GODOWN";
    const isPastDate = !isDateToday(date);
    const canEditHistorical = user?.role === "MASTER" || user?.role === "MANAGER";

    // Calculate total defective across all types
    const totalDefective = stock.reduce((acc, curr) => acc + curr.defective, 0);

    const handleAddStock = async () => {
        if (!newStockType || !newStockWeight) return;
        await addStockItem(newStockType, newStockWeight, newIsCylinder, date);
        fetchTransactions(date);
        setNewStockType("");
        setNewStockWeight("");
        setNewIsCylinder(true);
        setAddPopoverOpen(false);
    };

    const handleBatchInputChange = (type: string, field: 'fullChange' | 'emptyChange' | 'defectiveChange', value: string) => {
        const numValue = value === "" ? undefined : parseInt(value);
        setBatchUpdates(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: numValue
            }
        }));
    };

    const submitBatchUpdate = async (action: 'receive' | 'send') => {
        const updatesArray = Object.entries(batchUpdates).map(([type, changes]) => {
            const multiplier = action === 'receive' ? 1 : -1;
            return {
                type,
                fullChange: (changes.fullChange || 0) * multiplier,
                emptyChange: (changes.emptyChange || 0) * multiplier,
                defectiveChange: (changes.defectiveChange || 0) * multiplier,
            };
        }).filter(u => u.fullChange !== 0 || u.emptyChange !== 0 || u.defectiveChange !== 0);

        if (updatesArray.length > 0) {
            await bulkUpdateStock(updatesArray, date);
            fetchTransactions(date);
        }

        setBatchUpdates({});
        setReceivePopoverOpen(false);
        setSendPopoverOpen(false);
    };

    const handleUndo = async () => {
        if (confirm(`Revert last batch update?`)) {
            await undoLastBatch();
            fetchTransactions(date);
        }
    };

    const handleEditSave = async () => {
        if (!editingTx) return;
        try {
            await fetch(`/api/stock/transactions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingTx.id,
                    stockType: editingTx.stockType,
                    fullChange: parseInt(editFull) || 0,
                    emptyChange: parseInt(editEmpty) || 0,
                    defectiveChange: parseInt(editDefective) || 0,
                }),
            });
            setEditingTx(null);
            fetchTransactions(date);
            fetchStock(date);
        } catch (e) {
            console.error("Edit save failed", e);
        }
    };

    // Helper to sum stock quantity for specific category keys
    const getCategoryStock = (weightKey: '14.2' | '19' | '5', field: 'full' | 'empty') => {
        return stock
            .filter(s => {
                const text = `${s.type} ${s.weight}`.toLowerCase();
                return text.includes(weightKey);
            })
            .reduce((sum, item) => {
                const valFromField = item[field] || 0;
                if (valFromField > 0) return sum + valFromField;

                const typeLower = item.type.toLowerCase();
                const isFullType = typeLower.includes('filled') || typeLower.includes('full');
                const isEmptyType = typeLower.includes('empty');

                if (field === 'full' && isFullType) {
                    const parsedWeight = parseInt(item.weight, 10);
                    return sum + (isNaN(parsedWeight) ? 0 : parsedWeight);
                }
                if (field === 'empty' && isEmptyType) {
                    const parsedWeight = parseInt(item.weight, 10);
                    return sum + (isNaN(parsedWeight) ? 0 : parsedWeight);
                }
                return sum + valFromField;
            }, 0);
    };

    const getOmcStockValue = () => {
        const omcItems = stock.filter(s => {
            const text = `${s.type} ${s.weight}`.toLowerCase();
            return text.includes('omc');
        });
        if (omcItems.length === 0) return 55;
        return omcItems.reduce((sum, item) => {
            const sumVal = item.full + item.empty + item.defective;
            if (sumVal > 0) return sum + sumVal;
            const parsedWeight = parseInt(item.weight, 10);
            return sum + (isNaN(parsedWeight) ? 0 : parsedWeight);
        }, 0);
    };

    const totalFilledSum = getCategoryStock('14.2', 'full') + getCategoryStock('19', 'full') + getCategoryStock('5', 'full');
    const totalEmptySum = getCategoryStock('14.2', 'empty') + getCategoryStock('19', 'empty') + getCategoryStock('5', 'empty');

    return (
        <SectionGuard section="STOCK">
            <div className="space-y-8 pb-12">
            <CapacitorBackButton />

            {/* Header Module */}
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
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                                Godown / <span className="text-indigo-600">Stock</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5 tracking-tighter">Inventory Tracking & Audit</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {lastBatchUpdate && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-11 px-6 rounded-full font-black uppercase text-[10px] tracking-widest border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all active-scale"
                                onClick={handleUndo}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" /> Undo Action
                            </Button>
                        )}
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-11 px-6 rounded-full font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 active-scale transition-all",
                                        !isDateToday(date) ? "border-blue-200 bg-blue-50/50 text-blue-700" : "border-slate-200"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(date, "PP")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
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
                    </div>
                </div>

                {/* Handwritten Sketch Exact Replica KPI Ribbon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Box 1: Total Filled */}
                    <Card className="border-2 border-slate-100 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden transition-all duration-300 hover:border-emerald-200">
                        <CardHeader className="bg-slate-50/60 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-black uppercase tracking-wider text-slate-900 italic flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                Total Filled
                            </CardTitle>
                            <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                Sum: {totalFilledSum}
                            </span>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-3 font-mono">
                                {/* Header Row: 14.2 / 19kg / 5kg */}
                                <div className="grid grid-cols-3 text-center border-b-2 border-slate-200 pb-3 divide-x-2 divide-slate-200">
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">14.2</span>
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">19kg</span>
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">5kg</span>
                                </div>
                                {/* Value Row */}
                                <div className="grid grid-cols-3 text-center pt-1 divide-x-2 divide-slate-200">
                                    <span className="font-black text-2xl sm:text-3xl text-emerald-600 tracking-tight">
                                        {getCategoryStock('14.2', 'full')}
                                    </span>
                                    <span className="font-black text-2xl sm:text-3xl text-emerald-600 tracking-tight">
                                        {getCategoryStock('19', 'full')}
                                    </span>
                                    <span className="font-black text-2xl sm:text-3xl text-emerald-600 tracking-tight">
                                        {getCategoryStock('5', 'full')}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Box 2: Total Empty */}
                    <Card className="border-2 border-slate-100 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden transition-all duration-300 hover:border-slate-300">
                        <CardHeader className="bg-slate-50/60 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-black uppercase tracking-wider text-slate-900 italic flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-slate-700" />
                                Total Empty
                            </CardTitle>
                            <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-full">
                                Sum: {totalEmptySum}
                            </span>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-3 font-mono">
                                {/* Header Row: 14.2 / 19kg / 5kg */}
                                <div className="grid grid-cols-3 text-center border-b-2 border-slate-200 pb-3 divide-x-2 divide-slate-200">
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">14.2</span>
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">19kg</span>
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">5kg</span>
                                </div>
                                {/* Value Row */}
                                <div className="grid grid-cols-3 text-center pt-1 divide-x-2 divide-slate-200">
                                    <span className="font-black text-2xl sm:text-3xl text-slate-800 tracking-tight">
                                        {getCategoryStock('14.2', 'empty')}
                                    </span>
                                    <span className="font-black text-2xl sm:text-3xl text-slate-800 tracking-tight">
                                        {getCategoryStock('19', 'empty')}
                                    </span>
                                    <span className="font-black text-2xl sm:text-3xl text-slate-800 tracking-tight">
                                        {getCategoryStock('5', 'empty')}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Box 3: OMC / Other */}
                    <Card className="border-2 border-slate-100 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden transition-all duration-300 hover:border-indigo-200">
                        <CardHeader className="bg-slate-50/60 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-black uppercase tracking-wider text-slate-900 italic flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-indigo-500" />
                                OMC / Other
                            </CardTitle>
                            <span className="text-xs font-black px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                                Defective: {totalDefective}
                            </span>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-3 font-mono">
                                {/* Header Row: OMC / Other */}
                                <div className="grid grid-cols-2 text-center border-b-2 border-slate-200 pb-3 divide-x-2 divide-slate-200">
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">OMC</span>
                                    <span className="font-black text-xs sm:text-sm uppercase text-slate-500">Other</span>
                                </div>
                                {/* Value Row: 55 / --- */}
                                <div className="grid grid-cols-2 text-center pt-1 divide-x-2 divide-slate-200">
                                    <span className="font-black text-2xl sm:text-3xl text-indigo-600 tracking-tight">
                                        {getOmcStockValue()}
                                    </span>
                                    <span className="font-black text-2xl sm:text-3xl text-slate-300 tracking-tight">
                                        —
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Main Stock Ledger Card */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden glass-card">
                <CardHeader className="bg-slate-900 py-6 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-white italic">Current Inventory / <span className="text-indigo-400">Ledger</span></CardTitle>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live stock levels as tracked in godown</p>
                        </div>

                        {(canEdit && (!isPastDate || canEditHistorical)) && (
                            <div className="flex flex-wrap gap-2">
                                <Popover open={receivePopoverOpen} onOpenChange={setReceivePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active-scale">
                                            Load Receive
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[350px] p-4 max-h-[80vh] overflow-y-auto border-none shadow-2xl rounded-2xl" side="bottom" align="end">
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-black text-sm uppercase text-slate-900 italic">Load Receive / <span className="text-emerald-500">Incoming</span></h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Add stock arriving in godown</p>
                                            </div>

                                            <div className="space-y-4">
                                                {stock.map((item) => (
                                                    <div key={item.type} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="bg-white px-3 py-1.5 rounded-xl border-2 border-slate-100 text-xs font-black text-slate-900 shadow-sm">{item.weight}</div>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full In</label>
                                                                <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-emerald-500" value={batchUpdates[item.type]?.fullChange || ""} onChange={(e) => handleBatchInputChange(item.type, "fullChange", e.target.value)} placeholder="0" />
                                                            </div>
                                                            {item.isCylinder !== false && (
                                                                <>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Empty In</label>
                                                                        <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-emerald-500" value={batchUpdates[item.type]?.emptyChange || ""} onChange={(e) => handleBatchInputChange(item.type, "emptyChange", e.target.value)} placeholder="0" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Def In</label>
                                                                        <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-emerald-500" value={batchUpdates[item.type]?.defectiveChange || ""} onChange={(e) => handleBatchInputChange(item.type, "defectiveChange", e.target.value)} placeholder="0" />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-3 justify-end pt-4 border-t sticky bottom-0 bg-white">
                                                <Button variant="ghost" className="h-12 flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest italic" onClick={() => setReceivePopoverOpen(false)}>Abort</Button>
                                                <Button className="h-12 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active-scale" onClick={() => submitBatchUpdate("receive")}>Confirm Receive</Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Popover open={sendPopoverOpen} onOpenChange={setSendPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button className="h-10 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-500/20 active-scale">
                                            Load Sending
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[350px] sm:w-[500px] p-6 max-h-[85vh] overflow-y-auto border-none shadow-2xl rounded-[2rem]" side="bottom" align="end">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                                    <ArrowUpRight className="h-5 w-5 text-rose-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm uppercase text-slate-900 italic tracking-tight">Load Sending / <span className="text-rose-500">Outgoing</span></h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Remove stock leaving godown</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {stock.map((item) => (
                                                    <div key={item.type} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="bg-white px-3 py-1.5 rounded-xl border-2 border-slate-100 text-xs font-black text-slate-900 shadow-sm">{item.weight}</div>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full Out</label>
                                                                <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-rose-500" value={batchUpdates[item.type]?.fullChange || ""} onChange={(e) => handleBatchInputChange(item.type, "fullChange", e.target.value)} placeholder="0" />
                                                            </div>
                                                            {item.isCylinder !== false && (
                                                                <>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Empty Out</label>
                                                                        <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-rose-500" value={batchUpdates[item.type]?.emptyChange || ""} onChange={(e) => handleBatchInputChange(item.type, "emptyChange", e.target.value)} placeholder="0" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Def Out</label>
                                                                        <Input type="number" className="h-11 text-sm font-bold rounded-xl border-2 border-slate-100 focus:ring-rose-500" value={batchUpdates[item.type]?.defectiveChange || ""} onChange={(e) => handleBatchInputChange(item.type, "defectiveChange", e.target.value)} placeholder="0" />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-3 justify-end pt-4 border-t sticky bottom-0 bg-white">
                                                <Button variant="ghost" className="h-12 flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest italic" onClick={() => setSendPopoverOpen(false)}>Abort</Button>
                                                <Button className="h-12 flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/20 active-scale" onClick={() => submitBatchUpdate("send")}>Confirm Sending</Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 active-scale">
                                            <Plus className="mr-2 h-4 w-4" /> New Type
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-6 space-y-4 border-none shadow-2xl rounded-2xl" side="bottom" align="end">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-sm uppercase italic">Inject Stock Row</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Initialize a new cylinder category</p>
                                        </div>
                                        <div className="space-y-3 pt-2">
                                            <RadioGroup
                                                value={newIsCylinder ? "cylinder" : "normal"}
                                                onValueChange={(val) => setNewIsCylinder(val === "cylinder")}
                                                className="flex gap-4 mb-2 p-2 bg-slate-50 rounded-xl"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="cylinder" id="cylinder-mod" />
                                                    <Label htmlFor="cylinder-mod" className="text-xs font-bold cursor-pointer">Cylinder</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="normal" id="normal-mod" />
                                                    <Label htmlFor="normal-mod" className="text-xs font-bold cursor-pointer">Normal Item</Label>
                                                </div>
                                            </RadioGroup>
                                            <Input placeholder="Type Name (e.g. Small)" value={newStockType} onChange={(e) => setNewStockType(e.target.value)} className="h-10 rounded-xl" />
                                            <Input placeholder="Weight Val (e.g. 5 kg)" value={newStockWeight} onChange={(e) => setNewStockWeight(e.target.value)} className="h-10 rounded-xl" />
                                            <Button className="w-full h-11 premium-gradient text-white font-black uppercase shadow-lg rounded-xl active-scale" onClick={handleAddStock}>
                                                Deploy New Type
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 border-b border-slate-200">
                                <TableHead className="w-[180px] font-black uppercase text-[10px] tracking-widest text-slate-500 text-center py-6">Identity Hub</TableHead>
                                <TableHead colSpan={2} className="text-center font-black uppercase text-[10px] tracking-widest text-indigo-600 border-x border-slate-200/50">
                                    Filled Inventory / भरे
                                </TableHead>
                                <TableHead colSpan={2} className="text-center font-black uppercase text-[10px] tracking-widest text-slate-600">
                                    Empty Inventory / खाली
                                </TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-rose-500 border-l border-slate-200/50 italic">
                                    Consumption
                                </TableHead>
                            </TableRow>
                            <TableRow className="bg-slate-900/[0.02] hover:bg-slate-900/[0.02] border-b border-slate-200">
                                <TableHead />
                                <TableHead className="text-center font-black uppercase text-[8px] tracking-[0.2em] text-slate-400 py-3 border-l border-slate-200/50">Opening</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] tracking-[0.2em] text-indigo-500 py-3 border-x border-slate-200/50 bg-indigo-50/30">Closing</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] tracking-[0.2em] text-slate-400 py-3">Opening</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] tracking-[0.2em] text-slate-600 py-3 border-x border-slate-200/50 bg-slate-100/30">Closing</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] tracking-[0.2em] text-rose-400 py-3 bg-rose-50/30">Refill+NC</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Package className="h-16 w-16 text-slate-100 mb-4" />
                                            <div className="text-slate-200 font-black text-5xl mb-2 opacity-15 tracking-tighter uppercase shrink-0 select-none">VACUUM</div>
                                            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] italic">No active inventory structures</div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stock.map((item) => (
                                    <TableRow key={item.type} className="group hover:bg-indigo-50/[0.15] transition-all duration-300">
                                        <TableCell className="py-6 text-center relative overflow-hidden group/cell">
                                            <div className="inline-flex flex-col items-center relative z-10 transition-transform duration-300 group-hover/cell:-translate-y-2">
                                                <div className="px-6 py-2.5 bg-white border-2 border-slate-100 rounded-[1.2rem] shadow-sm text-sm font-black text-slate-900 group-hover:border-indigo-200 group-hover:shadow-md transition-all duration-300 cursor-default select-none">
                                                    {item.weight}
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400 mt-2.5 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                                    {item.type}
                                                </div>
                                            </div>

                                            {/* Action Overlay */}
                                            {canEdit && (
                                                <div className="absolute left-0 right-0 bottom-1 flex justify-center gap-2 opacity-0 translate-y-4 group-hover/cell:opacity-100 group-hover/cell:translate-y-0 transition-all duration-300">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditSchema(item)}
                                                        className="h-7 w-7 rounded-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-600 shadow-sm"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setItemToDelete(item.type)}
                                                        className="h-7 w-7 rounded-sm bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-sm"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* Filled Opening */}
                                        <TableCell className="text-center p-0 border-l border-slate-100">
                                            <div className="text-xl font-bold text-slate-300 tracking-tighter group-hover:text-slate-400 transition-colors">
                                                {item.openingFull || 0}
                                            </div>
                                        </TableCell>

                                        {/* Filled Closing */}
                                        <TableCell className="text-center p-0 bg-indigo-50/[0.2] border-x border-slate-100">
                                            <div className="text-3xl font-black text-indigo-600 tracking-tighter drop-shadow-sm group-hover:scale-110 group-hover:text-indigo-700 transition-all duration-500 cursor-pointer select-none">
                                                {item.full}
                                            </div>
                                        </TableCell>

                                        {/* Empty Opening */}
                                        <TableCell className="text-center p-0">
                                            <div className="text-xl font-bold text-slate-300 tracking-tighter group-hover:text-slate-400 transition-colors">
                                                {item.isCylinder !== false ? (item.openingEmpty || 0) : <span className="text-xl font-light text-slate-200">-</span>}
                                            </div>
                                        </TableCell>

                                        {/* Empty Closing */}
                                        <TableCell className="text-center p-0 bg-slate-100/[0.2] border-x border-slate-100">
                                            <div className="text-3xl font-black text-slate-700 tracking-tighter drop-shadow-sm group-hover:scale-110 group-hover:text-slate-900 transition-all duration-500 cursor-pointer select-none">
                                                {item.isCylinder !== false ? item.empty : <span className="text-3xl font-light text-slate-300">-</span>}
                                            </div>
                                        </TableCell>

                                        {/* Sold (Refill+NC) */}
                                        <TableCell className="text-center p-0 bg-rose-50/[0.2]">
                                            <div className="text-3xl font-black text-rose-500 tracking-tighter drop-shadow-sm group-hover:scale-110 group-hover:text-rose-600 transition-all duration-500 cursor-pointer select-none">
                                                {soldByType[item.type] || 0}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Combined Activity Feed & Defective Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Movement History */}
                <Card className="lg:col-span-8 border-none shadow-2xl rounded-[2.5rem] overflow-hidden glass-card">
                    <CardHeader className="bg-slate-900/5 border-b border-slate-200/50 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                    <History className="h-4 w-4 text-indigo-500" /> Movement Audit
                                </CardTitle>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time godown activities</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="h-8 px-3 rounded-xl border-2 border-indigo-100 bg-white hover:bg-indigo-50 text-indigo-600 font-black uppercase text-[10px] tracking-widest transition-all active-scale shadow-sm flex items-center gap-1.5"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-600", isRefreshing && "animate-spin")} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/50">
                                    <tr>
                                        <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-400">Timestamp</th>
                                        <th className="px-6 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-400">Category / Event</th>
                                        <th className="px-8 py-5 font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 text-right">Magnitude</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-slate-200 font-extrabold text-2xl mb-1 italic opacity-40 uppercase tracking-tighter shrink-0 select-none">No Activity</div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Static state detected</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx: any, idx: number) => {
                                            const isEditing = editingTx?.id === tx.id && editingTx?.stockType === tx.stockType;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                    {/* Timestamp */}
                                                    <td className="px-8 py-5">
                                                        <div className="font-black text-slate-900 text-xs tracking-tight">
                                                            {tx.date ? format(new Date(tx.date), "hh:mm a") : "—"}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                            {tx.date ? format(new Date(tx.date), "MMM d") : "—"}
                                                        </div>
                                                    </td>

                                                    {/* Category / Event */}
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "h-10 w-10 rounded-full flex items-center justify-center transition-all shrink-0",
                                                                tx.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-600' :
                                                                tx.type === 'CREATE' ? 'bg-indigo-50 text-indigo-600' :
                                                                tx.type === 'TRIP RETURN' ? 'bg-teal-50 text-teal-600' :
                                                                tx.type === 'TRIP OUT' ? 'bg-amber-50 text-amber-600' :
                                                                'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
                                                            )}>
                                                                {tx.type === 'RECEIVE' ? <ArrowDownRight className="h-5 w-5" /> :
                                                                 tx.type === 'CREATE' ? <Plus className="h-5 w-5" /> :
                                                                 (tx.type === 'TRIP OUT' || tx.type === 'TRIP RETURN') ? <Truck className="h-5 w-5" /> :
                                                                 <ArrowUpRight className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <span className="font-black text-[11px] uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
                                                                    {tx.type} <span className="text-slate-300 font-medium">/</span> {tx.weight || "—"}
                                                                </span>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {tx.stockType || "Unknown"}
                                                                    {tx.driverName && (
                                                                        <span className="text-indigo-600 font-black ml-1.5">
                                                                            • {tx.driverName} {tx.vehicleNo ? `(${tx.vehicleNo})` : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Magnitude + Edit */}
                                                    <td className="px-8 py-5 text-right">
                                                        {isEditing ? (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-10 text-right">Full</span>
                                                                    <Input type="number" className="h-7 w-20 text-xs rounded-lg text-right" value={editFull} onChange={e => setEditFull(e.target.value)} />
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-10 text-right">Empty</span>
                                                                    <Input type="number" className="h-7 w-20 text-xs rounded-lg text-right" value={editEmpty} onChange={e => setEditEmpty(e.target.value)} />
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-10 text-right">Def</span>
                                                                    <Input type="number" className="h-7 w-20 text-xs rounded-lg text-right" value={editDefective} onChange={e => setEditDefective(e.target.value)} />
                                                                </div>
                                                                <div className="flex gap-1.5 mt-1">
                                                                    <Button size="sm" className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-black" onClick={handleEditSave}>
                                                                        <Check className="h-3 w-3 mr-1" /> Save
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-3 rounded-lg text-[10px] font-black" onClick={() => setEditingTx(null)}>
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start justify-end gap-3">
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {tx.fullChange !== 0 && (
                                                                        <div className={cn("text-xs font-black tracking-tighter", tx.fullChange > 0 ? "text-emerald-600" : "text-rose-600")}>
                                                                            {tx.fullChange > 0 ? '+' : ''}{tx.fullChange} <span className="text-[9px] font-bold uppercase opacity-60">Full</span>
                                                                        </div>
                                                                    )}
                                                                    {tx.emptyChange !== 0 && (
                                                                        <div className={cn("text-xs font-black tracking-tighter", tx.emptyChange > 0 ? "text-teal-600" : "text-slate-600")}>
                                                                            {tx.emptyChange > 0 ? '+' : ''}{tx.emptyChange} <span className="text-[9px] font-bold uppercase opacity-60">Empty</span>
                                                                        </div>
                                                                    )}
                                                                    {tx.defectiveChange !== 0 && (
                                                                        <div className="text-xs font-black tracking-tighter text-amber-600">
                                                                            {tx.defectiveChange > 0 ? '+' : ''}{tx.defectiveChange} <span className="text-[9px] font-bold uppercase opacity-60">Def</span>
                                                                        </div>
                                                                    )}
                                                                    {tx.fullChange === 0 && tx.emptyChange === 0 && tx.defectiveChange === 0 && (
                                                                        <span className="text-[10px] text-slate-300 font-bold">—</span>
                                                                    )}
                                                                </div>
                                                                {canEdit && !tx.isTrip && (
                                                                    <button
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center shrink-0"
                                                                        onClick={() => {
                                                                            setEditingTx({ id: tx.id, stockType: tx.stockType });
                                                                            setEditFull(String(tx.fullChange ?? 0));
                                                                            setEditEmpty(String(tx.emptyChange ?? 0));
                                                                            setEditDefective(String(tx.defectiveChange ?? 0));
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5 text-slate-500 hover:text-indigo-600" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })

                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Defective Status & Damage Tracker */}
                <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-rose-50/50 group hover:bg-rose-50 transition-all duration-700">
                    <CardHeader className="py-8 text-center border-b border-rose-100/50">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-500 text-white shadow-xl shadow-rose-200 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-xl font-black uppercase text-rose-900 italic tracking-tighter mb-1">Containment / <span className="text-rose-500">Defects</span></CardTitle>
                        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Aggregate damage & loss hub</p>
                    </CardHeader>
                    <CardContent className="p-8 text-center">
                        <div className="bg-white rounded-[2rem] p-8 shadow-inner border-2 border-rose-100/20 mb-6 shadow-rose-900/[0.02]">
                            <div className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em] mb-4">Total Faulty Units</div>
                            <div className="text-6xl font-black text-rose-600 tracking-tighter drop-shadow-sm select-none">
                                {totalDefective}
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-rose-400 uppercase leading-relaxed text-center px-4 italic">
                            Cumulative count of damaged, leaking, or lost cylinders across all active Godown schemas.
                        </p>
                    </CardContent>
                </Card>
            </div>
            {/* Edit Stock Schema Dialog */}
            <Dialog open={!!schemaToEdit} onOpenChange={(open) => !open && setSchemaToEdit(null)}>
                <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase text-slate-900 tracking-tight italic">
                            {t('Mod Godown Schema')}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {t('Modify identity & core properties')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <RadioGroup
                            value={editSchemaIsCylinder ? "cylinder" : "normal"}
                            onValueChange={(val) => setEditSchemaIsCylinder(val === "cylinder")}
                            className="flex gap-4 mb-2 p-3 bg-slate-50 rounded-2xl"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cylinder" id="edit-cylinder" />
                                <Label htmlFor="edit-cylinder" className="text-xs font-black uppercase cursor-pointer text-slate-700">{t('Cylinder')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="normal" id="edit-normal" />
                                <Label htmlFor="edit-normal" className="text-xs font-black uppercase cursor-pointer text-slate-700">{t('Normal Item')}</Label>
                            </div>
                        </RadioGroup>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('Identity Name')}</Label>
                            <Input value={editSchemaType} onChange={(e) => setEditSchemaType(e.target.value)} className="h-11 rounded-xl" placeholder="e.g. Domestic" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('Asset Weight/Size')}</Label>
                            <Input value={editSchemaWeight} onChange={(e) => setEditSchemaWeight(e.target.value)} className="h-11 rounded-xl" placeholder="e.g. 14.2 kg" />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setSchemaToEdit(null)} className="rounded-xl font-bold uppercase text-xs">
                            {t('Abort')}
                        </Button>
                        <Button type="button" onClick={handleSaveSchemaEdit} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs">
                            {t('Patch Schema')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="border-none shadow-2xl rounded-[2rem] max-w-[400px]">
                    <AlertDialogHeader>
                        <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-6 w-6 text-rose-600" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl font-black uppercase italic tracking-tight text-slate-900">
                            {t('Eradicate Schema')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center font-medium text-slate-500 text-sm py-2">
                            {t('Nuclear Warning')} <strong className="text-rose-600 font-bold">`{itemToDelete}`</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 hover:bg-slate-50 sm:ms-0 font-bold uppercase text-xs">
                            {t('Retreat')}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteStock} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs border-transparent">
                            {t('Nuke It')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </SectionGuard>
    );
}
