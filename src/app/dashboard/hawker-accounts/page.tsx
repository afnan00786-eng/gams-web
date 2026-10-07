"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowUpRight,
    ArrowDownLeft,
    Truck,
    History,
    Share2,
    Phone,
    Home,
    Search,
    Wallet,
    Package,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    ShieldAlert,
    Users
} from "lucide-react";
import { generateAccountReport, generateWhatsAppLink, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";
import { SectionGuard } from "@/components/auth/SectionGuard";

export default function HawkerAccountsPage() {
    const { employees, user, fetchEmployees } = useAuthStore();
    const { transactions, addTransaction, getBalance } = useAccountsStore();
    const router = useRouter();
    const [selectedHawkerId, setSelectedHawkerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: dbSummary, mutate: mutateSummary } = useSWR('/api/hawkers/ledger-summary', (url) => fetch(url).then(r => r.json()));

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");

    const [emptyQty, setEmptyQty] = useState("");
    const [emptyDesc, setEmptyDesc] = useState("");

    const hawkerList = employees
        .filter((e: any) => e.role === "HAWKER")
        .filter((e: any) => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleTransaction = (type: 'CREDIT' | 'DEBIT') => {
        if (!selectedHawkerId || !amount || !desc) return;
        const parsedAmount = parseFloat(amount);

        addTransaction({
            amount: parsedAmount,
            description: desc,
            type,
            category: 'HAWKER',
            relatedEntityId: selectedHawkerId
        });

        const hawkerObj = employees.find((e: any) => e.id === selectedHawkerId);
        addTransaction({
            amount: parsedAmount,
            description: `Hawker Settle (${hawkerObj?.name}): ${desc}`,
            type,
            category: 'CASH',
        });

        setAmount("");
        setDesc("");
    };

    const handleEmptyTransaction = (type: 'CREDIT' | 'DEBIT') => {
        if (!selectedHawkerId || !emptyQty || !emptyDesc) return;
        const parsedQty = parseInt(emptyQty);

        addTransaction({
            amount: parsedQty,
            description: emptyDesc,
            type,
            category: 'EMPTY_CYLINDER',
            relatedEntityId: selectedHawkerId
        });

        setEmptyQty("");
        setEmptyDesc("");
    };

    const selectedHawker = employees.find(e => e.id === selectedHawkerId);
    const hawkerTransactions = transactions
        .filter((t: any) => t.category === 'HAWKER' && t.relatedEntityId === selectedHawkerId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const emptyTransactions = transactions
        .filter((t: any) => t.category === 'EMPTY_CYLINDER' && t.relatedEntityId === selectedHawkerId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentBalance = selectedHawkerId
        ? (dbSummary?.find((s: any) => s.hawkerId === selectedHawkerId)?.totalCashBal ?? getBalance('HAWKER', selectedHawkerId))
        : 0;
    const currentEmptyBalance = selectedHawkerId
        ? (dbSummary?.find((s: any) => s.hawkerId === selectedHawkerId)?.totalEmptyBal ?? getBalance('EMPTY_CYLINDER', selectedHawkerId))
        : 0;

    const handleShare = () => {
        if (!selectedHawker) return;
        const report = generateAccountReport(selectedHawker.name, currentBalance, 'Hawker Account');
        window.open(generateWhatsAppLink(report), '_blank');
    };

    const totalMoney = dbSummary?.reduce((acc: number, s: any) => acc + (s.totalCashBal || 0), 0) ?? 0;
    const totalEmpty = dbSummary?.reduce((acc: number, s: any) => acc + (s.totalEmptyBal || 0), 0) ?? 0;

    return (
        <SectionGuard section="HAWKER_LEDGER">
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
                                Hawker / <span className="text-indigo-600">Ledger</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Field Agent Settlements</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search Hawker..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 rounded-full border-2 border-slate-100 bg-white/50 focus:bg-white transition-all font-bold text-xs uppercase"
                            />
                        </div>
                    </div>
                </div>

                {/* Totals Summary Bar - From Sketch */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="border-none shadow-sm bg-white rounded-3xl p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Bal</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{Math.abs(totalMoney).toLocaleString()}</p>
                    </Card>
                    <Card className="border-none shadow-sm bg-white rounded-3xl p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Empty Bal</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{totalEmpty}</p>
                    </Card>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Hawker Search & List */}
                <Card className="lg:col-span-4 border-none shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col h-[700px]">
                    <CardHeader className="bg-slate-50 py-5 px-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                                    <Truck className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 italic">Hawkers List</CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Field Delivery Force</CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                        {hawkerList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <Search className="h-12 w-12 text-slate-300 mb-4" />
                                <div className="text-xs font-black uppercase tracking-widest text-slate-400">No agents found</div>
                            </div>
                        ) : (
                            hawkerList.map((h: any) => {
                                const hawkerSummary = dbSummary?.find((s: any) => s.hawkerId === h.id);
                                const balance = hawkerSummary?.totalCashBal ?? 0;
                                const emptyBal = hawkerSummary?.totalEmptyBal ?? 0;
                                return (
                                    <div
                                        key={h.id}
                                        onClick={() => setSelectedHawkerId(h.id)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer group active-scale",
                                            selectedHawkerId === h.id
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                                : "bg-white border-slate-50 hover:border-indigo-100 hover:bg-slate-50/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                                                selectedHawkerId === h.id ? "bg-white/20" : "bg-slate-100 group-hover:bg-indigo-50"
                                            )}>
                                                <Truck className={cn("h-6 w-6", selectedHawkerId === h.id ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm uppercase tracking-tight">{h.name}</div>
                                                <div className={cn("text-[10px] font-bold uppercase tracking-wider", selectedHawkerId === h.id ? "text-indigo-100" : "text-slate-400")}>{h.mobile}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={cn(
                                                    "font-black text-sm tracking-tight",
                                                    selectedHawkerId === h.id
                                                        ? "text-white"
                                                        : balance >= 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    ₹{Math.abs(balance).toLocaleString()}
                                                </div>
                                                {emptyBal !== 0 && (
                                                    <div className={cn(
                                                        "text-[10px] font-black uppercase",
                                                        selectedHawkerId === h.id ? "text-indigo-200" : "text-orange-500"
                                                    )}>
                                                        {emptyBal} Empty
                                                    </div>
                                                )}
                                            </div>

                                            {h.mobile && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-8 w-8 rounded-full",
                                                        selectedHawkerId === h.id ? "text-white hover:bg-white/20" : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `tel:${h.mobile}`;
                                                    }}
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Selected Hawker Details & Actions */}
                <div className="lg:col-span-8 space-y-8 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedHawker ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-12">
                            {/* Hawker Profile Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                                <div className="flex items-center gap-6">
                                    <div className="h-20 w-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                                        <Truck className="h-10 w-10 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedHawker.name}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="rounded-full bg-slate-900 text-white px-3 font-black text-[9px] uppercase tracking-widest">{selectedHawker.role}</Badge>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedHawker.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4 sm:mt-0 flex-wrap">
                                    <Button
                                        className="h-12 px-6 rounded-2xl border-none bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest active-scale shadow-lg shadow-indigo-600/20"
                                        onClick={() => router.push(`/dashboard/hawker-accounts/${selectedHawker.id}/customers`)}
                                    >
                                        <Users className="mr-2 h-4 w-4" /> Customers
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 font-black uppercase text-[10px] tracking-widest active-scale"
                                        onClick={handleShare}
                                    >
                                        <Share2 className="mr-2 h-4 w-4" /> Share Statement
                                    </Button>
                                    {selectedHawker.mobile && (
                                        <Button
                                            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center active-scale shadow-xl shadow-slate-900/20"
                                            onClick={() => window.open(`tel:${selectedHawker.mobile}`)}
                                        >
                                            <Phone className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Balance Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="glass-card p-8 rounded-[2.5rem] border-none shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                        <Wallet className="h-24 w-24 text-indigo-600" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Cash Position / <span className="text-indigo-600">Ledger</span></p>
                                    <div className={cn(
                                        "text-6xl font-black tracking-tighter",
                                        currentBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        ₹{Math.abs(currentBalance).toLocaleString()}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-2">
                                        {currentBalance >= 0 ? (
                                            <><TrendingUp className="h-4 w-4 text-emerald-500" /> Agency to Collect</>
                                        ) : (
                                            <><TrendingDown className="h-4 w-4 text-rose-500" /> Agency to Pay</>
                                        )}
                                    </p>
                                </div>

                                <div className="glass-card p-8 rounded-[2.5rem] border-none shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                        <Package className="h-24 w-24 text-orange-600" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Asset Position / <span className="text-orange-500">Empties</span></p>
                                    <div className={cn(
                                        "text-6xl font-black tracking-tighter",
                                        currentEmptyBalance >= 0 ? "text-emerald-600" : "text-orange-600"
                                    )}>
                                        {currentEmptyBalance} <span className="text-2xl uppercase opacity-40 ml-1">Units</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-2">
                                        {currentEmptyBalance >= 0 ? (
                                            <><History className="h-4 w-4 text-emerald-500" /> Out in field</>
                                        ) : (
                                            <><ShieldAlert className="h-4 w-4 text-rose-500" /> Advanced Return</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Settlement Forms */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cash Settlement Form */}
                                <Card className="border-none shadow-xl rounded-[2.5rem] glass-card">
                                    <CardHeader className="py-6 border-b border-slate-100">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Settlement / <span className="text-indigo-600">Cash</span></CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Purpose / Note</Label>
                                                <Input
                                                    value={desc}
                                                    onChange={e => setDesc(e.target.value)}
                                                    placeholder="e.g. Cash Collected from Field"
                                                    className="h-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-xs uppercase"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Magnitude (Rs.)</Label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                                                    <Input
                                                        type="number"
                                                        value={amount}
                                                        onChange={e => setAmount(e.target.value)}
                                                        placeholder="0,000"
                                                        className="h-14 pl-10 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-black text-xl tracking-tighter"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                className="h-12 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active-scale"
                                                onClick={() => handleTransaction('CREDIT')}
                                            >
                                                <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
                                            </Button>
                                            <Button
                                                className="h-12 flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-500/20 active-scale"
                                                onClick={() => handleTransaction('DEBIT')}
                                            >
                                                <ArrowUpRight className="mr-2 h-4 w-4" /> Paid Out
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Empty Settlement Form */}
                                <Card className="border-none shadow-xl rounded-[2.5rem] glass-card">
                                    <CardHeader className="py-6 border-b border-slate-100">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Settlement / <span className="text-orange-500">Empties</span></CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Asset Movement Task</Label>
                                                <Input
                                                    value={emptyDesc}
                                                    onChange={e => setEmptyDesc(e.target.value)}
                                                    placeholder="e.g. Return from Sector 5"
                                                    className="h-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-xs uppercase"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unit Count</Label>
                                                <Input
                                                    type="number"
                                                    value={emptyQty}
                                                    onChange={e => setEmptyQty(e.target.value)}
                                                    placeholder="0"
                                                    className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-black text-2xl text-center"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                className="h-12 flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 active-scale"
                                                onClick={() => handleEmptyTransaction('CREDIT')}
                                            >
                                                <ArrowDownLeft className="mr-2 h-4 w-4" /> Asset In
                                            </Button>
                                            <Button
                                                className="h-12 flex-1 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-900/20 active-scale"
                                                onClick={() => handleEmptyTransaction('DEBIT')}
                                            >
                                                <ArrowUpRight className="mr-2 h-4 w-4" /> Asset Out
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Activity Feeds */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cash Activity */}
                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-50 py-4 px-6 flex flex-row items-center justify-between border-b border-slate-100">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                            <History className="h-4 w-4 text-indigo-500" /> Cash Audit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {hawkerTransactions.length === 0 ? (
                                                <div className="py-20 text-center opacity-30">
                                                    <Wallet className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                                    <div className="text-[10px] font-black uppercase tracking-widest">No financial history</div>
                                                </div>
                                            ) : (
                                                hawkerTransactions.map(tx => (
                                                    <div key={tx.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                                tx.type === 'CREDIT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                            )}>
                                                                {tx.type === 'CREDIT' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-xs uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{tx.description}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "font-black text-sm tracking-tight",
                                                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                                                        )}>
                                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Empty Activity */}
                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-50 py-4 px-6 flex flex-row items-center justify-between border-b border-slate-100">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                            <Package className="h-4 w-4 text-orange-500" /> Asset Audit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {emptyTransactions.length === 0 ? (
                                                <div className="py-20 text-center opacity-30">
                                                    <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                                    <div className="text-[10px] font-black uppercase tracking-widest">No asset history</div>
                                                </div>
                                            ) : (
                                                emptyTransactions.map(tx => (
                                                    <div key={tx.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                                tx.type === 'CREDIT' ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-600"
                                                            )}>
                                                                {tx.type === 'CREDIT' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-xs uppercase tracking-tight group-hover:text-orange-600 transition-colors">{tx.description}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "font-black text-sm tracking-tight",
                                                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-orange-600'
                                                        )}>
                                                            {tx.type === 'CREDIT' ? '+' : '-'} {tx.amount}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-[700px] items-center justify-center rounded-[2.5rem] border-4 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center group">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-xl shadow-slate-200 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <Truck className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-300">Awaiting Agent Selection</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 leading-relaxed">Select a hawker from the command list to access<br />real-time ledger and settlement systems.</p>
                            <ArrowRight className="h-6 w-6 text-slate-200 mt-8 animate-bounce" />
                        </div>
                    )}
                </div>
            </div >
        </div >
        </SectionGuard>
    );
}
