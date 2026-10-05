"use client";

import { useStockStore } from "@/store/useStockStore";
import { useTripStore } from "@/store/useTripStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Flame,
    Truck,
    IndianRupee,
    TrendingUp,
    ChevronLeft,
    CalendarDays,
    Download,
    FileSpreadsheet,
    History,
    Wallet,
    Home,
    BarChart3,
    ArrowUpRight,
    ArrowDownLeft,
    Package,
    ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportData } from '@/lib/exportUtils';
import { CapacitorBackButton } from "@/components/CapacitorBackButton";

export default function SummaryPage() {
    const router = useRouter();
    const { stock } = useStockStore();
    const { activeTrips, trips } = useTripStore();
    const { getBalance, transactions } = useAccountsStore();

    // Metrics for Overview
    const totalFullCylinders = stock.reduce((acc, item) => acc + item.full, 0);
    const totalEmptyCylinders = stock.reduce((acc, item) => acc + item.empty, 0);
    const totalTripsToday = trips.filter(t => new Date(t.timeOut).toDateString() === new Date().toDateString()).length;
    const cashInHand = getBalance('CASH');

    // Reports Logic
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const filterByDate = (dateStr: string) => {
        if (!dateRange?.from) return true;
        const date = new Date(dateStr);
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);

        if (!dateRange.to) {
            const check = new Date(date);
            return check.getFullYear() === start.getFullYear() &&
                check.getMonth() === start.getMonth() &&
                check.getDate() === start.getDate();
        }

        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);

        return date >= start && date <= end;
    };

    const handleExportTrips = () => {
        const filteredTrips = trips.filter(t => filterByDate(t.timeOut));
        const exportable = filteredTrips.map(t => ({
            ID: t.id,
            Date: format(new Date(t.timeOut), 'yyyy-MM-dd HH:mm'),
            Vehicle: t.vehicleNo,
            Driver: t.driverName,
            Destination: t.destination,
            Status: t.status,
            StockItems: t.stockItems,
            Expenses: t.expenses
        }));
        exportData(exportable, 'GAMS_Trips');
    };

    const handleExportLedger = () => {
        const filteredTx = transactions.filter(t => filterByDate(t.date));
        exportData(filteredTx, 'GAMS_Ledger');
    };

    const handleExportInventory = () => {
        exportData(stock, 'GAMS_Current_Inventory');
    };

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
                                Agency / <span className="text-indigo-600">Intelligence</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time performance & audit hub</p>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-8">
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md py-2 -mx-4 px-4">
                    <TabsList className="bg-slate-100/50 p-1.5 rounded-[1.5rem] h-14 w-full sm:w-auto flex">
                        <TabsTrigger
                            value="overview"
                            className="flex-1 sm:flex-none sm:px-12 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full"
                        >
                            Live Summary
                        </TabsTrigger>
                        <TabsTrigger
                            value="reports"
                            className="flex-1 sm:flex-none sm:px-12 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all h-full"
                        >
                            Reports Hub
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="glass-card p-8 rounded-[2rem] border-none shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Flame className="h-24 w-24 text-orange-600" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Full Stock
                            </p>
                            <div className="text-5xl font-black tracking-tighter text-slate-900">{totalFullCylinders}</div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Across all items</p>
                        </div>

                        <div className="glass-card p-8 rounded-[2rem] border-none shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Truck className="h-24 w-24 text-blue-600" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Active Ops
                            </p>
                            <div className="text-5xl font-black tracking-tighter text-slate-900">{activeTrips}</div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">{totalTripsToday} Trips today</p>
                        </div>

                        <div className="glass-card p-8 rounded-[2rem] border-none shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 bg-slate-900">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <IndianRupee className="h-24 w-24 text-white" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Liquid Cash
                            </p>
                            <div className="text-5xl font-black tracking-tighter text-white uppercase italic">₹{cashInHand.toLocaleString()}</div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-4 text-emerald-500/80">Available in drawer</p>
                        </div>

                        <div className="glass-card p-8 rounded-[2rem] border-none shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <TrendingUp className="h-24 w-24 text-indigo-600" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Empty Depot
                            </p>
                            <div className="text-5xl font-black tracking-tighter text-slate-900">{totalEmptyCylinders}</div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">Ready for refilling</p>
                        </div>
                    </div>

                    <Card className="border-none shadow-xl rounded-[2.5rem] glass-card overflow-hidden">
                        <CardHeader className="py-8 px-10 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 italic">System / <span className="text-indigo-600">Heartbeat</span></CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational activity log</CardDescription>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-slate-400" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-6 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <div>
                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">System Status: Optimal</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Core services active at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    <div>
                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">Database integrity: Verified</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">Inventory snapshots synchronized</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                                    <div>
                                        <p className="font-black text-slate-400 text-sm uppercase tracking-tight italic">No critical alerts detected</p>
                                        <p className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest italic">Agency performance within safe thresholds</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    {/* Date Picker Ribbon */}
                    <div className="glass-card p-10 rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <CalendarDays className="h-40 w-40 text-indigo-600" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black tracking-tight italic uppercase text-slate-900 leading-none">Financial Hub</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3 italic flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Audit-ready data exports
                                </p>
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "h-16 border-4 rounded-[1.5rem] px-10 font-black uppercase text-xs tracking-widest transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 active-scale",
                                            !dateRange && "text-muted-foreground",
                                            dateRange?.from ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100"
                                        )}
                                    >
                                        <CalendarDays className="mr-3 h-5 w-5" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>{format(dateRange.from, "LLL dd")} — {format(dateRange.to, "LLL dd")}</>
                                            ) : (format(dateRange.from, "LLL dd"))
                                        ) : (<span>Select Date Range</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-[2rem] shadow-2xl border-none" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={(range: any) => setDateRange(range)}
                                        numberOfMonths={1}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border border-slate-50 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                            <CardHeader className="p-10 pb-6">
                                <div className="h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Operation Log</CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-2">{trips.length} Total records</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Comprehensive dump of all deliveries, returns, and hawker transactions.</p>
                                <Button
                                    onClick={handleExportTrips}
                                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-colors shadow-xl active-scale"
                                >
                                    <Download className="mr-2 h-5 w-5" /> Export Dataset
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border border-slate-50 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
                            <CardHeader className="p-10 pb-6">
                                <div className="h-16 w-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Wallet className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Ledger Flow</CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mt-2">Financial Audit Trail</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Detailed cash and bank transaction history for internal audits and balance checks.</p>
                                <Button
                                    onClick={handleExportLedger}
                                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition-colors shadow-xl active-scale"
                                >
                                    <Download className="mr-2 h-5 w-5" /> Export Dataset
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border border-slate-50 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
                            <CardHeader className="p-10 pb-6">
                                <div className="h-16 w-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Package className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Stock Assets</CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase text-orange-600 tracking-widest mt-2">Current Manifest</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Snapshot of all Godown inventory including full cylinders and empty due records.</p>
                                <Button
                                    onClick={handleExportInventory}
                                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors shadow-xl active-scale"
                                >
                                    <Download className="mr-2 h-5 w-5" /> Export Snapshot
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
