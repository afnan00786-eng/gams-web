"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useTripStore } from "@/store/useTripStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Cylinder,
    IndianRupee,
    AlertTriangle,
    Share2,
    Phone,
    ChevronLeft,
    Home,
    TrendingUp,
    TrendingDown,
    Truck,
    ArrowRight
} from "lucide-react";
import { generateAccountReport, generateWhatsAppLink, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SettleQuickDialog } from "@/components/SettleQuickDialog";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";

export default function EmptyMoneyBalancePage() {
    const router = useRouter();
    const { employees, user } = useAuthStore();
    const { trips } = useTripStore();
    const { getBalance } = useAccountsStore();

    const hawkers = employees.filter(e => e.role === "HAWKER");

    const getPendingCylinders = (driverName: string) => {
        return trips
            .filter(t => t.status === 'OUT' && t.driverName.toLowerCase() === driverName.toLowerCase())
            .reduce((total, t) => {
                try {
                    const items = JSON.parse(t.stockItems || "[]");
                    const tripItemsSum = items.reduce((sum: number, item: any) => sum + (item.quantity * (item.isCylinder ? 1 : 0) || 0), 0);
                    return total + tripItemsSum;
                } catch {
                    return total;
                }
            }, 0);
    };

    const handleShare = (name: string, balance: number) => {
        const report = generateAccountReport(name, balance, 'Account Reconciliation');
        window.open(generateWhatsAppLink(report), '_blank');
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
                                Asset / <span className="text-orange-600">Reconciliation</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tracking Field Assets & Cash Liabilities</p>
                        </div>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-3xl border-slate-100 flex items-center gap-4 shadow-sm border border-transparent hover:border-orange-100 transition-all">
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                            <Cylinder className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Empty Due</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">
                                {hawkers.reduce((acc, h) => acc + getBalance('EMPTY_CYLINDER', h.id), 0)}
                            </p>
                        </div>
                    </div>
                    <div className="glass-card p-4 rounded-3xl border-slate-100 flex items-center gap-4 shadow-sm border border-transparent hover:border-emerald-100 transition-all">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <IndianRupee className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Hawker Cash</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">
                                ₹{hawkers.reduce((acc, h) => acc + getBalance('HAWKER', h.id), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {hawkers.map(hawker => {
                    const pendingCylinders = getPendingCylinders(hawker.name);
                    const emptyBalance = getBalance('EMPTY_CYLINDER', hawker.id);
                    const moneyBalance = getBalance('HAWKER', hawker.id);
                    const hasDues = pendingCylinders > 0 || emptyBalance > 0 || moneyBalance !== 0;

                    return (
                        <Card key={hawker.id} className={cn(
                            "group border-none shadow-xl rounded-[2.5rem] overflow-hidden transition-all duration-500",
                            hasDues ? "glass-card ring-2 ring-orange-500/10" : "opacity-40 grayscale"
                        )}>
                            <CardContent className="p-0">
                                <div className="flex flex-col lg:flex-row items-stretch">
                                    {/* Sidebar Info */}
                                    <div className={cn(
                                        "w-full lg:w-72 p-8 flex flex-col justify-center items-center lg:items-start text-center lg:text-left transition-colors",
                                        hasDues ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <div className="text-2xl font-black italic">{hawker.name.charAt(0)}</div>
                                        </div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter">{hawker.name}</h3>
                                        <div className="flex items-center gap-2 mt-2 opacity-60">
                                            <Phone className="h-3 w-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{hawker.mobile || 'No Mobile'}</span>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="flex flex-col justify-center gap-2 p-6 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <Badge className="bg-blue-100 text-blue-700 font-black text-[9px] uppercase tracking-widest border-none">Active</Badge>
                                            </div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">In Transit / Load</p>
                                            <div className="text-4xl font-black italic text-slate-900 tracking-tighter">{pendingCylinders}</div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cylinders on trip</p>
                                        </div>

                                        <div className="flex flex-col justify-center gap-2 p-6 rounded-3xl bg-orange-50 border border-orange-100 group-hover:bg-white transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                                                    <Cylinder className="h-5 w-5" />
                                                </div>
                                                {emptyBalance > 0 && <Badge className="bg-orange-600 text-white font-black text-[9px] uppercase tracking-widest border-none">Due</Badge>}
                                            </div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Empty Due / Deficit</p>
                                            <div className={cn(
                                                "text-4xl font-black italic tracking-tighter",
                                                emptyBalance > 0 ? "text-orange-600" : "text-slate-900"
                                            )}>{emptyBalance}</div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cylinders missing</p>
                                        </div>

                                        <div className="flex flex-col justify-center gap-2 p-6 rounded-3xl bg-emerald-50 border border-emerald-100 group-hover:bg-white transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                                    <IndianRupee className="h-5 w-5" />
                                                </div>
                                                {moneyBalance !== 0 && (
                                                    <Badge className={cn(
                                                        "text-white font-black text-[9px] uppercase tracking-widest border-none",
                                                        moneyBalance < 0 ? "bg-rose-600" : "bg-emerald-600"
                                                    )}>{moneyBalance < 0 ? 'Pay' : 'Extra'}</Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Net Cash Balance</p>
                                            <div className={cn(
                                                "text-4xl font-black italic tracking-tighter",
                                                moneyBalance < 0 ? "text-rose-600" : moneyBalance > 0 ? "text-emerald-600" : "text-slate-900"
                                            )}>₹{Math.abs(moneyBalance).toLocaleString()}</div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Financial standing</p>
                                        </div>
                                    </div>

                                    {/* Action Footers-Mobile Stacked */}
                                    <div className="w-full lg:w-48 p-8 flex flex-col justify-center gap-3 border-l border-slate-100 bg-slate-50/30">
                                        <SettleQuickDialog
                                            hawkerId={hawker.id}
                                            hawkerName={hawker.name}
                                            type="EMPTY_CYLINDER"
                                            trigger={
                                                <Button className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-orange-600/20 active-scale">
                                                    Settle Cyl
                                                </Button>
                                            }
                                        />
                                        <SettleQuickDialog
                                            hawkerId={hawker.id}
                                            hawkerName={hawker.name}
                                            type="CASH"
                                            trigger={
                                                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20 active-scale">
                                                    Settle Cash
                                                </Button>
                                            }
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 h-12 rounded-2xl border-2 border-slate-100 text-slate-600 hover:bg-slate-100 active-scale"
                                                onClick={() => handleShare(hawker.name, moneyBalance)}
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                            {hawker.mobile && (
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 h-12 rounded-2xl border-2 border-slate-100 text-slate-600 hover:bg-slate-100 active-scale"
                                                    onClick={() => window.open(`tel:${hawker.mobile}`)}
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {hawkers.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-300">No Hawkers Activated</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Initialize pilot profiles in staffing to begin asset tracking.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
