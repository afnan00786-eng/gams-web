"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowUpRight,
    ArrowDownLeft,
    IndianRupee,
    User,
    History,
    Share2,
    Phone,
    Home,
    Search,
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowRight
} from "lucide-react";
import { generateAccountReport, generateWhatsAppLink, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";
import { SectionGuard } from "@/components/auth/SectionGuard";

export default function StaffAccountsPage() {
    const { employees, user } = useAuthStore();
    const { transactions, addTransaction, getBalance } = useAccountsStore();
    const router = useRouter();
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Transaction Form
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");

    // Filter staff: exclude Hawkers for this page
    const staffList = employees
        .filter(e => e.role === "MANAGER" || e.role === "GODOWN")
        .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleTransaction = (type: 'CREDIT' | 'DEBIT') => {
        if (!selectedStaffId || !amount || !desc) return;
        addTransaction({
            amount: parseFloat(amount),
            description: desc,
            type,
            category: 'STAFF',
            relatedEntityId: selectedStaffId
        });
        setAmount("");
        setDesc("");
    };

    const selectedStaff = employees.find(e => e.id === selectedStaffId);
    const staffTransactions = transactions
        .filter(t => t.category === 'STAFF' && t.relatedEntityId === selectedStaffId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentBalance = selectedStaffId ? getBalance('STAFF', selectedStaffId) : 0;

    const handleShare = () => {
        if (!selectedStaff) return;
        const report = generateAccountReport(selectedStaff.name, currentBalance, 'Staff Account');
        window.open(generateWhatsAppLink(report), '_blank');
    };

    return (
        <SectionGuard section="STAFF_ACCOUNTS">
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
                                Staff / <span className="text-violet-600">Accounts</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Internal Payroll & Advances</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search Staff..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 rounded-full border-2 border-slate-100 bg-white/50 focus:bg-white transition-all font-bold text-xs uppercase"
                            />
                        </div>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-3xl border-slate-100 flex items-center gap-4 shadow-sm border border-transparent hover:border-violet-100 transition-all">
                        <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Wallet className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Staff Liability</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">₹{employees.filter(e => e.role !== 'HAWKER').reduce((acc, s) => acc + getBalance('STAFF', s.id), 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Staff Search & List */}
                <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2.5rem] overflow-hidden glass-card flex flex-col h-[700px]">
                    <CardHeader className="bg-slate-900 py-6 px-8 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                                <User className="h-5 w-5 text-violet-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-white italic">Internal Staff</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management & Operations</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                        {staffList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <Search className="h-12 w-12 text-slate-300 mb-4" />
                                <div className="text-xs font-black uppercase tracking-widest text-slate-400">No staff detected</div>
                            </div>
                        ) : (
                            staffList.map(s => {
                                const balance = getBalance('STAFF', s.id);
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => setSelectedStaffId(s.id)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer group active-scale",
                                            selectedStaffId === s.id
                                                ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/20"
                                                : "bg-white border-slate-50 hover:border-violet-100 hover:bg-slate-50/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                                                selectedStaffId === s.id ? "bg-white/20" : "bg-slate-100 group-hover:bg-violet-50"
                                            )}>
                                                <User className={cn("h-6 w-6", selectedStaffId === s.id ? "text-white" : "text-slate-400 group-hover:text-violet-600")} />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm uppercase tracking-tight">{s.name}</div>
                                                <div className={cn("text-[10px] font-bold uppercase tracking-wider", selectedStaffId === s.id ? "text-violet-100" : "text-slate-400")}>{s.role}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "font-black text-sm tracking-tight",
                                                selectedStaffId === s.id
                                                    ? "text-white"
                                                    : balance >= 0 ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                ₹{Math.abs(balance).toLocaleString()}
                                            </div>
                                            <div className={cn("text-[9px] font-black uppercase", selectedStaffId === s.id ? "text-violet-200" : "text-slate-300")}>
                                                {balance >= 0 ? 'Collect' : 'Pay'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Ledger Details */}
                <div className="lg:col-span-8 space-y-8 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedStaff ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-12">
                            {/* Staff Profile Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                                <div className="flex items-center gap-6">
                                    <div className="h-20 w-20 rounded-[2rem] bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-600/20">
                                        <User className="h-10 w-10 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedStaff.name}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="rounded-full bg-slate-900 text-white px-3 font-black text-[9px] uppercase tracking-widest">{selectedStaff.role}</Badge>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedStaff.mobile || 'No Mobile'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-12 px-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 font-black uppercase text-[10px] tracking-widest active-scale"
                                        onClick={handleShare}
                                    >
                                        <Share2 className="mr-2 h-4 w-4" /> Share Statement
                                    </Button>
                                    {selectedStaff.mobile && (
                                        <Button
                                            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center active-scale shadow-xl shadow-slate-900/20"
                                            onClick={() => window.open(`tel:${selectedStaff.mobile}`)}
                                        >
                                            <Phone className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Balance Card */}
                            <div className="glass-card p-10 rounded-[2.5rem] border-none shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                    <IndianRupee className="h-32 w-32 text-violet-600" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Internal Ledger / <span className="text-violet-600">Net Balance</span></p>
                                <div className={cn(
                                    "text-7xl font-black tracking-tighter",
                                    currentBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    ₹{Math.abs(currentBalance).toLocaleString()}
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-6 flex items-center gap-2">
                                    {currentBalance >= 0 ? (
                                        <><TrendingUp className="h-5 w-5 text-emerald-500" /> Agency to Collect (Advance) </>
                                    ) : (
                                        <><TrendingDown className="h-5 w-5 text-rose-500" /> Agency to Pay (Salary/Owes) </>
                                    )}
                                </p>
                            </div>

                            {/* Add Transaction Form */}
                            <Card className="border-none shadow-xl rounded-[2.5rem] glass-card overflow-hidden">
                                <CardHeader className="py-6 border-b border-slate-100 bg-slate-50/50">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Financial / <span className="text-violet-600">Modification</span></CardTitle>
                                </CardHeader>
                                <CardContent className="p-10 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Activity Purpose</Label>
                                            <Input
                                                value={desc}
                                                onChange={e => setDesc(e.target.value)}
                                                placeholder="e.g. Salary Disbursement, Fest Bonus"
                                                className="h-14 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-sm uppercase px-6"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount Magnitude</Label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">₹</span>
                                                <Input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="h-14 pl-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-black text-2xl tracking-tighter"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Button
                                            className="h-14 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active-scale"
                                            onClick={() => handleTransaction('CREDIT')}
                                        >
                                            <ArrowDownLeft className="mr-2 h-5 w-5" /> Credit Entry
                                        </Button>
                                        <Button
                                            className="h-14 flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20 active-scale"
                                            onClick={() => handleTransaction('DEBIT')}
                                        >
                                            <ArrowUpRight className="mr-2 h-5 w-5" /> Debit Entry
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* History Feed */}
                            <Card className="border-none shadow-xl rounded-[2.5rem] glass-card overflow-hidden">
                                <CardHeader className="bg-slate-900 py-6 px-10 flex flex-row items-center justify-between border-b border-white/5">
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3 italic">
                                        <div className="h-1 w-8 bg-violet-500 rounded-full" /> Staff Ledger Audit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {staffTransactions.length === 0 ? (
                                            <div className="py-24 text-center opacity-30">
                                                <History className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                                                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Zero entries found</div>
                                            </div>
                                        ) : (
                                            staffTransactions.map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-8 hover:bg-slate-50/50 transition-colors group">
                                                    <div className="flex items-center gap-6">
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                                                            tx.type === 'CREDIT' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            {tx.type === 'CREDIT' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-violet-600 transition-colors">{tx.description}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        "text-xl font-black tracking-tighter",
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
                        </div>
                    ) : (
                        <div className="flex flex-col h-[700px] items-center justify-center rounded-[2.5rem] border-4 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center group">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-xl shadow-slate-200 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <User className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-300">Awaiting Profile Selection</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 leading-relaxed">Select an employee from the roster to access<br />restricted payroll and advance ledger systems.</p>
                            <ArrowRight className="h-6 w-6 text-slate-200 mt-10 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>
            </div>
        </SectionGuard>
    );
}
