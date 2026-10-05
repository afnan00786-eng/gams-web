"use client";

import { useState, useEffect } from "react";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTripStore } from "@/store/useTripStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDownLeft, ArrowUpRight, IndianRupee, ChevronLeft, CalendarIcon, Building2, User, Users, Plus, Trash2, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";

export default function CashBalancePage() {
    const router = useRouter();
    const { transactions, banks, addTransaction, addBank, deleteBank, getBalance } = useAccountsStore();
    const { employees, fetchEmployees } = useAuthStore();
    const { trips, fetchTrips } = useTripStore();

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
        fetchEmployees();
        fetchTrips();
    }, [fetchEmployees, fetchTrips]);

    // UI State
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [activeCategory, setActiveCategory] = useState<'CASH' | 'BANK'>('CASH');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedBankId, setSelectedBankId] = useState<string>("");
    const [calendarOpen, setCalendarOpen] = useState(false);

    const [newBankName, setNewBankName] = useState("");
    const [newBankNumber, setNewBankNumber] = useState("");

    const handleAddBank = () => {
        if (!newBankName || !newBankNumber) return;
        addBank({ name: newBankName, accountNumber: newBankNumber });
        setNewBankName("");
        setNewBankNumber("");
    };

    // Calculate balances as of selected date
    const dateStr = selectedDate.toISOString();
    const cashBalance = getBalance('CASH', undefined, dateStr);
    const bankBalance = getBalance('BANK', undefined, dateStr);

    const combinedTxs = transactions.filter(t => {
        const isTargetType = t.category === 'CASH' || t.category === 'BANK';
        const isUpToDate = new Date(t.date) <= new Date(dateStr);
        return isTargetType && isUpToDate;
    });

    const handleTransaction = (type: 'CREDIT' | 'DEBIT') => {
        if (!amount) return;

        let finalDesc = description;
        if (selectedBankId) {
            const b = banks.find(x => x.id === selectedBankId);
            finalDesc = `${b?.name || ''} - ${description}`.trim();
        }

        addTransaction({
            amount: parseFloat(amount),
            description: activeCategory === 'BANK' ? `[BANK] ${finalDesc}` : finalDesc,
            type,
            category: activeCategory,
            date: selectedDate.toISOString(),
            recipientName,
            recipientPhone,
            bankName: activeCategory === 'BANK' ? bankName : undefined,
            accountNumber: activeCategory === 'BANK' ? accountNumber : undefined,
            relatedEntityId: selectedBankId || undefined
        });

        // Reset fields
        setAmount("");
        setDescription("");
        setRecipientName("");
        setRecipientPhone("");
        setSelectedBankId("");
    };

    const handleBankDeposit = () => {
        if (!amount) return;
        const depositAmt = parseFloat(amount);
        const date = selectedDate.toISOString();

        // Debit from Cash
        addTransaction({
            amount: depositAmt,
            description: `Bank Deposit: ${bankName || 'General'}`,
            type: 'DEBIT',
            category: 'CASH',
            date,
            bankName,
            accountNumber
        });
        // Credit to Bank
        addTransaction({
            amount: depositAmt,
            description: `Deposit from Cash`,
            type: 'CREDIT',
            category: 'BANK',
            date,
            bankName,
            accountNumber
        });
        setAmount("");
    };

    if (!isHydrated) {
        return <div className="p-8 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Balances...</div>;
    }

    return (
        <div className="w-full pb-12 space-y-8 animate-in fade-in duration-500">
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
                                Cash / <span className="text-indigo-600">Balance</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Managing Agency Cash & Bank Flow</p>
                        </div>
                    </div>

                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full sm:w-auto h-11 px-6 rounded-full font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 active-scale transition-all",
                                    !isToday(selectedDate) ? "border-indigo-200 bg-indigo-50/50 text-indigo-700" : "border-slate-200"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, "PP")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(d) => d && setSelectedDate(d)}
                                initialFocus
                            />
                            <div className="p-4 border-t bg-slate-50">
                                <Button
                                    className="w-full h-10 premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-lg active-scale rounded-xl"
                                    onClick={() => setCalendarOpen(false)}
                                >
                                    Confirm Date
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Quick Info Cards - Modern Gradients */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative overflow-hidden rounded-3xl premium-gradient p-6 shadow-2xl shadow-indigo-500/20 group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                        <div className="relative">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/80 mb-2">Cash Deposited in Bank</h3>
                            <div className="flex items-baseline gap-2 text-white">
                                <span className="text-xl font-bold opacity-60">₹</span>
                                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                                    {bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {activeCategory === 'BANK' && bankName && (
                                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                    <div className="text-[10px] font-black text-white/60 uppercase tracking-widest truncate max-w-[150px]">
                                        {bankName} - {accountNumber}
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="text-[9px] font-black text-indigo-200 hover:text-white uppercase tracking-widest underline underline-offset-4 active-scale transition-all">
                                                Manage
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-6 glass-card border-none rounded-2xl shadow-2xl" align="end">
                                            <div className="space-y-4">
                                                <div className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-indigo-500" /> Add Bank Account
                                                </div>
                                                <div className="grid gap-3">
                                                    <Input
                                                        placeholder="Bank Name"
                                                        value={newBankName}
                                                        onChange={e => setNewBankName(e.target.value)}
                                                        className="h-10 text-xs font-bold border-slate-200 bg-white/50 focus:ring-2 focus:ring-indigo-500 rounded-xl"
                                                    />
                                                    <Input
                                                        placeholder="A/c Number"
                                                        value={newBankNumber}
                                                        onChange={e => setNewBankNumber(e.target.value)}
                                                        className="h-10 text-xs font-bold border-slate-200 bg-white/50 focus:ring-2 focus:ring-indigo-500 rounded-xl"
                                                    />
                                                </div>
                                                <Button onClick={handleAddBank} className="w-full h-10 premium-gradient text-white font-black uppercase text-[10px] tracking-widest shadow-lg active-scale rounded-xl">
                                                    <Plus className="h-4 w-4 mr-2" /> Save Account
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-2xl group">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                        <div className="relative">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Liquid Cash Available</h3>
                            <div className="flex items-baseline gap-2 text-white">
                                <span className="text-xl font-bold opacity-40">₹</span>
                                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                                    {cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Entry Form - Glassmorphic & Modern */}
                <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2rem] overflow-hidden glass-card">
                    <CardHeader className="bg-slate-900/5 border-b border-slate-200/50 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Add Entry</CardTitle>
                            <div className="flex bg-slate-200/50 backdrop-blur-sm p-1 rounded-xl border border-slate-300/50 overflow-hidden">
                                <button
                                    onClick={() => setActiveCategory('CASH')}
                                    className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black rounded-lg transition-all active-scale ${activeCategory === 'CASH' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-300/30'}`}
                                >CASH</button>
                                <button
                                    onClick={() => setActiveCategory('BANK')}
                                    className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black rounded-lg transition-all active-scale ${activeCategory === 'BANK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-300/30'}`}
                                >BANK</button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Bank/Entity Dropdown */}
                        {activeCategory === 'BANK' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Select Source / Bank</Label>
                                <Select value={selectedBankId} onValueChange={(val) => {
                                    setSelectedBankId(val);
                                    if (val !== "none") {
                                        const b = banks.find(x => x.id === val);
                                        if (b) {
                                            setBankName(b.name);
                                            setAccountNumber(b.accountNumber);
                                        }
                                    }
                                }}>
                                    <SelectTrigger className="h-12 border-2 border-slate-100 rounded-xl font-bold bg-white/50 focus:ring-2 focus:ring-indigo-500 transition-all">
                                        <SelectValue placeholder="--- Select Account ---" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        <SelectItem value="none">General / Others</SelectItem>
                                        {banks.map(b => (
                                            <div key={b.id} className="flex items-center justify-between w-full group pr-2 py-1">
                                                <SelectItem value={b.id} className="font-bold">{b.name} <span className="opacity-40 text-[10px]">({b.accountNumber})</span></SelectItem>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteBank(b.id);
                                                        if (selectedBankId === b.id) setSelectedBankId("");
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Amount (₹)</Label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg group-focus-within:text-indigo-500 transition-colors">₹</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-8 h-12 border-2 border-slate-100 rounded-xl font-black text-lg bg-white/50 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-200"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Description</Label>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="What is this for?"
                                    className="h-12 border-2 border-slate-100 rounded-xl font-bold bg-white/50 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-200 text-sm"
                                />
                            </div>
                        </div>

                        {/* Recipient Details - Mobile Optimized Collapsible look */}
                        <div className="p-4 bg-indigo-50/50 rounded-xl border-2 border-dashed border-indigo-100/50 space-y-3">
                            <div className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-2 tracking-widest">
                                <div className="p-1 bg-white rounded-sm shadow-sm">
                                    <User className="h-3 w-3" />
                                </div>
                                Recipient (Optional)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    placeholder="Full Name"
                                    className="h-10 bg-white border-none rounded-lg font-bold shadow-sm placeholder:text-slate-300 text-xs"
                                />
                                <Input
                                    value={recipientPhone}
                                    type="tel"
                                    maxLength={10}
                                    pattern="\d*"
                                    onChange={e => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="Phone / Mobile"
                                    className="h-10 bg-white border-none rounded-lg font-bold shadow-sm placeholder:text-slate-300 text-xs"
                                />
                            </div>
                        </div>

                        {activeCategory === 'BANK' && (
                            <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-100/50 space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-2 tracking-widest">
                                    <div className="p-1 bg-white rounded-md shadow-sm">
                                        <Building2 className="h-3.5 w-3.5" />
                                    </div>
                                    Bank Details
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input
                                        value={bankName}
                                        onChange={e => setBankName(e.target.value)}
                                        placeholder="Bank Name"
                                        className="h-11 bg-white border-none rounded-xl font-bold shadow-sm placeholder:text-slate-300 text-sm"
                                    />
                                    <Input
                                        value={accountNumber}
                                        onChange={e => setAccountNumber(e.target.value)}
                                        placeholder="Account Number"
                                        className="h-11 bg-white border-none rounded-xl font-bold shadow-sm placeholder:text-slate-300 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button
                                className="bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl font-black text-sm shadow-xl shadow-emerald-500/10 active-scale group transition-all"
                                onClick={() => handleTransaction('CREDIT')}
                            >
                                <ArrowDownLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform" />
                                <span className="uppercase tracking-widest">Cash In</span>
                            </Button>
                            <Button
                                className="bg-rose-500 hover:bg-rose-600 h-12 rounded-xl font-black text-sm shadow-xl shadow-rose-500/10 active-scale group transition-all"
                                onClick={() => handleTransaction('DEBIT')}
                            >
                                <ArrowUpRight className="mr-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                <span className="uppercase tracking-widest">Cash Out</span>
                            </Button>
                        </div>

                        {activeCategory === 'CASH' && (
                            <Button
                                variant="ghost"
                                className="w-full h-14 rounded-2xl border-2 border-indigo-100 text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50 active-scale transition-all mt-2"
                                onClick={handleBankDeposit}
                            >
                                Transfer to Bank
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Hawker / Staff Balances - Advanced Tabular Layout */}
                <Card className="lg:col-span-8 border-none shadow-2xl rounded-[2rem] overflow-hidden glass-card">
                    <CardHeader className="bg-slate-900/5 border-b border-slate-200/50 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Operational Balances</CardTitle>
                                <CardDescription className="text-[10px] font-bold italic text-slate-400 uppercase tracking-widest mt-1">Real-time status tracking</CardDescription>
                            </div>
                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                <Users className="h-5 w-5 text-indigo-500" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Shortages / Money Balances Table */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-2">Shortages / Pending Dues</h3>
                                <div className="rounded-xl border border-rose-100 overflow-hidden">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-rose-50/50 text-rose-700 uppercase font-black tracking-widest text-[9px]">
                                            <tr>
                                                <th className="px-3 py-2 border-b border-rose-100">Hawker</th>
                                                <th className="px-3 py-2 border-b border-rose-100">Pending With / Name</th>
                                                <th className="px-3 py-2 border-b border-rose-100 hidden sm:table-cell">Mobile</th>
                                                <th className="px-3 py-2 border-b border-rose-100 text-right">Trip Amt</th>
                                                <th className="px-3 py-2 border-b border-rose-100 text-right bg-rose-50">Total Due</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {employees
                                                .filter(e => (e.role === 'HAWKER' || e.role === 'OFFICE_STAFF' || e.role === 'GODOWN') && getBalance(e.role === 'HAWKER' ? 'HAWKER' : 'STAFF', e.id, dateStr) < 0)
                                                .map(emp => {
                                                    const bal = getBalance(emp.role === 'HAWKER' ? 'HAWKER' : 'STAFF', emp.id, dateStr);

                                                    // Pluck recent money balances from Trips
                                                    const empTrips = trips
                                                        .filter(t => t.driverName === emp.name && t.status === 'COMPLETED')
                                                        .sort((a, b) => new Date(b.timeOut).getTime() - new Date(a.timeOut).getTime());

                                                    let mbEntries: any[] = [];
                                                    for (const t of empTrips) {
                                                        try {
                                                            const exps = JSON.parse(t.expenses || "[]");
                                                            const mbList = exps.filter((e: any) => e.type === 'Money Bal');
                                                            if (mbList.length > 0) {
                                                                mbEntries = [...mbEntries, ...mbList];
                                                            }
                                                        } catch { }
                                                    }
                                                    // Limit to top 2-3 to avoid blowing up table height
                                                    mbEntries = mbEntries.slice(0, 3);

                                                    // If no trip context found, render a simplified row to still show the math total
                                                    if (mbEntries.length === 0) {
                                                        return (
                                                            <tr key={emp.id} className="border-b border-rose-50 hover:bg-rose-50/30 transition-colors">
                                                                <td className="px-3 py-3 font-bold text-slate-800">{emp.name}</td>
                                                                <td colSpan={3} className="px-3 py-3 text-slate-400 font-medium italic text-[10px]">No recent trip records found. Rolling / past due.</td>
                                                                <td className="px-3 py-3 text-right font-black text-rose-600 bg-rose-50/30">₹{Math.abs(bal).toLocaleString()}</td>
                                                            </tr>
                                                        )
                                                    }

                                                    return mbEntries.map((mb, idx) => (
                                                        <tr key={`${emp.id}-${idx}`} className="border-b border-rose-50 hover:bg-rose-50/30 transition-colors">
                                                            {idx === 0 && (
                                                                <td rowSpan={mbEntries.length} className="px-3 py-3 font-bold text-slate-800 align-top border-r border-rose-50">
                                                                    {emp.name}
                                                                </td>
                                                            )}
                                                            <td className="px-3 py-2 font-semibold text-slate-700 uppercase text-[10px]">{mb.name}</td>
                                                            <td className="px-3 py-2 text-slate-500 font-mono text-[9px] hidden sm:table-cell tracking-wider">{mb.mobile || '---'}</td>
                                                            <td className="px-3 py-2 text-right font-bold text-slate-600">₹{mb.amount}</td>
                                                            {idx === 0 && (
                                                                <td rowSpan={mbEntries.length} className="px-3 py-3 text-right font-black text-rose-600 align-top bg-rose-50/30 border-l border-rose-50">
                                                                    ₹{Math.abs(bal).toLocaleString()}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ));
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Advances / Extra Money Table */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Advances / Extra Collections</h3>
                                <div className="rounded-xl border border-emerald-100 overflow-hidden">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-emerald-50/50 text-emerald-700 uppercase font-black tracking-widest text-[9px]">
                                            <tr>
                                                <th className="px-3 py-2 border-b border-emerald-100">Hawker</th>
                                                <th className="px-3 py-2 border-b border-emerald-100">Collector / Source</th>
                                                <th className="px-3 py-2 border-b border-emerald-100 hidden sm:table-cell">Details/Mobile</th>
                                                <th className="px-3 py-2 border-b border-emerald-100 text-right">Trip Amt</th>
                                                <th className="px-3 py-2 border-b border-emerald-100 text-right bg-emerald-50">Total Adv</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {employees
                                                .filter(e => (e.role === 'HAWKER' || e.role === 'OFFICE_STAFF' || e.role === 'GODOWN') && getBalance(e.role === 'HAWKER' ? 'HAWKER' : 'STAFF', e.id, dateStr) > 0)
                                                .map(emp => {
                                                    const bal = getBalance(emp.role === 'HAWKER' ? 'HAWKER' : 'STAFF', emp.id, dateStr);

                                                    // Pluck recent extra money from Trips
                                                    const empTrips = trips
                                                        .filter(t => t.driverName === emp.name && t.status === 'COMPLETED')
                                                        .sort((a, b) => new Date(b.timeOut).getTime() - new Date(a.timeOut).getTime());

                                                    let advEntries: any[] = [];
                                                    for (const t of empTrips) {
                                                        try {
                                                            const allExps = JSON.parse(t.expenses || "[]");
                                                            const extraList = allExps.filter((e: any) => e.type === 'Extra Money');
                                                            if (extraList.length > 0) {
                                                                advEntries = [...advEntries, ...extraList];
                                                            }
                                                        } catch { }
                                                    }
                                                    advEntries = advEntries.slice(0, 3);

                                                    if (advEntries.length === 0) {
                                                        return (
                                                            <tr key={emp.id} className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors">
                                                                <td className="px-3 py-3 font-bold text-slate-800">{emp.name}</td>
                                                                <td colSpan={3} className="px-3 py-3 text-slate-400 font-medium italic text-[10px]">No recent trip extras found. Carry forward.</td>
                                                                <td className="px-3 py-3 text-right font-black text-emerald-600 bg-emerald-50/30">₹{bal.toLocaleString()}</td>
                                                            </tr>
                                                        )
                                                    }

                                                    return advEntries.map((adv, idx) => (
                                                        <tr key={`${emp.id}-${idx}`} className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors">
                                                            {idx === 0 && (
                                                                <td rowSpan={advEntries.length} className="px-3 py-3 font-bold text-slate-800 align-top border-r border-emerald-50">
                                                                    {emp.name}
                                                                </td>
                                                            )}
                                                            <td className="px-3 py-2 font-semibold text-slate-700 uppercase text-[10px]">{adv.name}</td>
                                                            <td className="px-3 py-2 text-slate-500 font-mono text-[9px] hidden sm:table-cell tracking-wider">{adv.mobile || '---'}</td>
                                                            <td className="px-3 py-2 text-right font-bold text-slate-600">₹{adv.amount}</td>
                                                            {idx === 0 && (
                                                                <td rowSpan={advEntries.length} className="px-3 py-3 text-right font-black text-emerald-600 align-top bg-emerald-50/30 border-l border-emerald-50">
                                                                    ₹{bal.toLocaleString()}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ));
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline Table - Clean & Large */}
                <Card className="lg:col-span-12 border-none shadow-2xl rounded-[2.5rem] overflow-hidden glass-card">
                    <CardHeader className="bg-slate-900 border-b border-white/5 py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-white italic">Activity Timeline</CardTitle>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Transaction stream for {format(selectedDate, "PPP")}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-[10px] font-black uppercase bg-indigo-50/30 text-indigo-600 border-b border-indigo-100">
                                    <tr>
                                        <th className="px-6 py-5 tracking-[0.2em]">Transaction Flow</th>
                                        <th className="px-6 py-5 tracking-[0.2em]">Purpose / Description</th>
                                        <th className="px-6 py-5 tracking-[0.2em] hidden md:table-cell">Recipient Hub</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {combinedTxs.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-24 text-center">
                                                <div className="text-slate-200 font-black text-6xl mb-4 opacity-10 tracking-tighter">SILENT TRACE</div>
                                                <div className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] italic">No pulses detected for this timeline</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        combinedTxs.map((tx) => (
                                            <tr key={tx.id} className="border-b border-slate-100 hover:bg-indigo-50/20 transition-all duration-300 group">
                                                <td className="px-6 py-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className={cn(
                                                            "p-3 rounded-2xl shadow-sm active-scale transition-all",
                                                            tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                        )}>
                                                            {tx.type === 'CREDIT' ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                                                        </div>
                                                        <div>
                                                            <div className={cn("text-xl font-black tracking-tighter", tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600')}>
                                                                <span className="text-xs mr-0.5 opacity-60 font-bold">₹</span>
                                                                {tx.amount.toLocaleString()}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {format(new Date(tx.date), "hh:mm a")}
                                                                </span>
                                                                {tx.category === 'BANK' && (
                                                                    <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                                        <Building2 className="h-2.5 w-2.5" /> {tx.bankName || 'BANK'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="font-black text-slate-800 uppercase tracking-tight text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                                                        {tx.description}
                                                    </div>
                                                    {/* Mobile Only Recipient Info */}
                                                    {(tx.recipientName || tx.recipientPhone) && (
                                                        <div className="mt-2 md:hidden flex flex-col gap-1">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                <User className="h-3 w-3" /> {tx.recipientName || '---'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6 hidden md:table-cell">
                                                    {(tx.recipientName || tx.recipientPhone) ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="font-black text-slate-900 text-xs uppercase tracking-tight flex items-center gap-2">
                                                                <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400">
                                                                    <User className="h-3.5 w-3.5" />
                                                                </div>
                                                                {tx.recipientName || '---'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold tracking-[0.1em] ml-8">{tx.recipientPhone || '---'}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-200 font-black italic text-[10px] uppercase tracking-widest ml-8">System Entry</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
