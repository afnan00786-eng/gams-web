'use client';

import { useState } from 'react';
import { useTripStore } from '@/store/useTripStore';
import { useStockStore } from '@/store/useStockStore';
import { useAccountsStore } from '@/store/useAccountsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { CalendarDays, Download, FileSpreadsheet, History, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportData } from '@/lib/exportUtils';

export default function ReportsPage() {
    const { trips } = useTripStore();
    const { stock } = useStockStore();
    const { transactions } = useAccountsStore();

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
        // Flatten trip data for CSV
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
        // Just export current stock snapshot for now as we don't have a deep history store yet
        exportData(stock, 'GAMS_Current_Inventory');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">Reports & Exports</h1>
                    <p className="text-muted-foreground mt-2 font-bold uppercase text-[10px] tracking-widest text-indigo-500">Business Intelligence & Audit Trail</p>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-12 border-2 rounded-2xl px-6 font-black uppercase italic tracking-tighter transition-all hover:bg-slate-50", !dateRange && "text-muted-foreground")}>
                                <CalendarDays className="mr-2 h-5 w-5 text-indigo-500" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4 rounded-[2rem] shadow-2xl border-none bg-white" align="end">
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold uppercase text-[10px]"
                                        onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold uppercase text-[10px]"
                                        onClick={() => {
                                            const yesterday = new Date();
                                            yesterday.setDate(yesterday.getDate() - 1);
                                            setDateRange({ from: yesterday, to: yesterday });
                                        }}
                                    >
                                        Yesterday
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold uppercase text-[10px]"
                                        onClick={() => {
                                            const sevenDaysAgo = new Date();
                                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                                            setDateRange({ from: sevenDaysAgo, to: new Date() });
                                        }}
                                    >
                                        Last 7 Days
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold uppercase text-[10px]"
                                        onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                                    >
                                        This Month
                                    </Button>
                                </div>
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={(range: any) => setDateRange(range)}
                                    numberOfMonths={1}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Trip Log Export */}
                <Card className="rounded-[2.5rem] border-none shadow-xl glass-card overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="bg-emerald-500/10 p-8 pb-4">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 mb-4 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="h-7 w-7" />
                        </div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 italic">Trip Log</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Complete Manifest & Returns</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Download all delivery trips, including cylinder returns, NC installs, and expenses for the selected period.</p>
                        <Button onClick={handleExportTrips} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic tracking-tighter shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </CardContent>
                </Card>

                {/* Ledger Export */}
                <Card className="rounded-[2.5rem] border-none shadow-xl glass-card overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="bg-indigo-500/10 p-8 pb-4">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 group-hover:scale-110 transition-transform">
                            <Wallet className="h-7 w-7" />
                        </div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 italic">Accounts Ledger</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Financial Audit Trail</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Full history of cash and bank transactions, including staff commissions and agency expenses.</p>
                        <Button onClick={handleExportLedger} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic tracking-tighter shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </CardContent>
                </Card>

                {/* Inventory Snapshot */}
                <Card className="rounded-[2.5rem] border-none shadow-xl glass-card overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="bg-orange-500/10 p-8 pb-4">
                        <div className="h-14 w-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200 mb-4 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-7 w-7" />
                        </div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 italic">Inventory Snapshot</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Current Stock Assets</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Current state of Full, Empty, and Defective cylinders across all godowns and weight categories.</p>
                        <Button onClick={handleExportInventory} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic tracking-tighter shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl glass-card p-1">
                <CardContent className="p-8 flex items-center gap-6">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <History className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-black italic uppercase tracking-tight text-slate-900 italic">Advanced Filtering</h4>
                        <p className="text-xs text-slate-500 font-medium">Use the date picker at the top to filter data sets. The export will automatically include only the records within your selected range.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
