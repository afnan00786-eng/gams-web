"use client";

import { useState } from "react";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Card, CardContent } from "@/components/ui/card";
import {
    Flame,
    Users,
    Truck,
    Wallet,
    Banknote,
    RotateCcw,
    FileText,
    UserPlus,
    LayoutDashboard,
    ArrowRight,
    ClipboardList,
    Lock,
    Info,
    Share2,
    Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, ModuleKey } from "@/lib/permissions";
import { AboutModal } from "@/components/AboutModal";

interface ModuleCardProps {
    title: string;
    icon: React.ReactNode;
    href: string;
    color: string;
    lightColor: string;
    description: string;
    allowedRoles?: UserRole[];
    sectionKey?: ModuleKey;
    masterOnly?: boolean;
    isAboutModal?: boolean;
}

const modules: ModuleCardProps[] = [
    {
        title: "Godown Stock",
        icon: <Flame className="h-7 w-7" />,
        href: "/dashboard/stock",
        color: "bg-orange-500",
        lightColor: "bg-orange-500/10",
        description: "Inventory & Snapshots",
        sectionKey: "STOCK"
    },
    {
        title: "Refill & Booking",
        icon: <ClipboardList className="h-7 w-7" />,
        href: "/dashboard/refill-booking",
        color: "bg-rose-500",
        lightColor: "bg-rose-500/10",
        description: "Orders & Refills",
        sectionKey: "BOOKING"
    },
    {
        title: "Staff's A/c",
        icon: <Users className="h-7 w-7" />,
        href: "/dashboard/staff-accounts",
        color: "bg-blue-500",
        lightColor: "bg-blue-500/10",
        description: "Commissions & Payroll",
        sectionKey: "STAFF_ACCOUNTS"
    },
    {
        title: "Trip Log",
        icon: <Truck className="h-7 w-7" />,
        href: "/dashboard/trip-log",
        color: "bg-emerald-500",
        lightColor: "bg-emerald-500/10",
        description: "Active Trips & History",
        sectionKey: "TRIPS"
    },
    {
        title: "Hawker's A/c",
        icon: <Wallet className="h-7 w-7" />,
        href: "/dashboard/hawker-accounts",
        color: "bg-purple-500",
        lightColor: "bg-purple-500/10",
        description: "Deliveries & Dues",
        sectionKey: "HAWKER_LEDGER"
    },
    {
        title: "Cash/Balance A/c",
        icon: <Banknote className="h-7 w-7" />,
        href: "/dashboard/cash-balance",
        color: "bg-teal-500",
        lightColor: "bg-teal-500/10",
        description: "Drawer & Bank Ledger",
        sectionKey: "HAWKER_LEDGER",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT"]
    },
    {
        title: "Empty/Money Bal.",
        icon: <RotateCcw className="h-7 w-7" />,
        href: "/dashboard/empty-balance",
        color: "bg-indigo-500",
        lightColor: "bg-indigo-500/10",
        description: "Returnables & Pending",
        sectionKey: "STOCK",
        allowedRoles: ["MASTER", "MANAGER", "GODOWN", "ACCOUNTANT"]
    },
    {
        title: "Summary",
        icon: <FileText className="h-7 w-7" />,
        href: "/dashboard/summary",
        color: "bg-slate-500",
        lightColor: "bg-slate-500/10",
        description: "Insights & Analytics",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT"]
    },
    {
        title: "Staff & Vehicles",
        icon: <UserPlus className="h-7 w-7" />,
        href: "/dashboard/employees",
        color: "bg-cyan-500",
        lightColor: "bg-cyan-500/10",
        description: "Assets & Access",
        masterOnly: true
    },
    {
        title: "Download App",
        icon: <Share2 className="h-7 w-7" />,
        href: "#about",
        color: "bg-blue-600",
        lightColor: "bg-blue-600/10",
        description: "App Link Share & Install",
        isAboutModal: true
    },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { t } = useLanguageStore();
    const router = useRouter();
    const [aboutOpen, setAboutOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
                        Command Center
                    </h1>
                </div>
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] text-indigo-500 mt-2 ml-1">
                    Welcome back, {user.name} • {user.role}
                    {user.agencyName && ` • ${user.agencyName}`}
                </p>
            </div>

            {/* Redesigned Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 pb-4">
                {modules.map((module) => {
                    const isAllowed = module.isAboutModal || user.role === 'MASTER' || (
                        module.masterOnly
                            ? false
                            : module.sectionKey
                                ? hasPermission(user, module.sectionKey)
                                : (module.allowedRoles?.includes(user.role) ?? false)
                    );

                    return (
                        <Card
                            key={module.title}
                            className={cn(
                                "group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border-none shadow-xl transition-all duration-300 hover:-translate-y-1 active-scale glass-card",
                                !isAllowed ? "opacity-45 grayscale pointer-events-none select-none" : "cursor-pointer"
                            )}
                            onClick={() => {
                                if (!isAllowed) return;
                                if (module.isAboutModal) {
                                    setAboutOpen(true);
                                } else {
                                    router.push(module.href);
                                }
                            }}
                        >
                            {/* Decorative background circle */}
                            <div className={cn(
                                "absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-10 transition-all duration-500",
                                module.color
                            )} />

                            <CardContent className="p-6 md:p-8 flex flex-col h-full relative z-10">
                                <div className={cn(
                                    "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                                    module.color
                                )}>
                                    {module.icon}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
                                        {t(module.title)}
                                    </h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-hover:text-slate-900">
                                        {t(module.description)}
                                    </p>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <div className={cn(
                                        "rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                                        isAllowed ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {!isAllowed && <Lock className="w-2.5 h-2.5" />}
                                        {module.isAboutModal ? "Download & Share" : isAllowed ? t("Access Granted") : t("Restricted")}
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-indigo-500" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* About & Quick Utility Hub Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 md:h-16 md:w-16 rounded-3xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                        <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-indigo-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight">
                                GAMS Enterprise Portal
                            </h3>
                            <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                                v3.2.0
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            LPG Gas Agency Cloud & Offline Logistics • <span className="text-indigo-300 font-bold uppercase">{user.agencyName || "Agency Edition"}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                            const msg = `📲 *GAMS Gas Agency App Download Karein*\n\nGas Agency app apne phone me install karne ke liye link par click karein:\n👉 ${window.location.origin}\n\n📌 *Mobile me install karne ka tarika:*\n1. Link ko Chrome me kholein.\n2. Menu (⋮) me "Install App" ya "Add to Home screen" dabayein.\n3. App aapke phone me install ho jayegi aur bina internet (Offline) bhi chalegi!`;
                            if (typeof navigator !== "undefined" && navigator.share) {
                                navigator.share({
                                    title: "GAMS App Download Link",
                                    text: msg,
                                    url: window.location.origin,
                                }).catch(() => {});
                            } else {
                                const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                                window.open(url, "_blank");
                            }
                        }}
                        className="flex-1 md:flex-none h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active-scale flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <Share2 className="h-4 w-4" /> Share Download Link
                    </button>

                    <button
                        onClick={() => setAboutOpen(true)}
                        className="flex-1 md:flex-none h-11 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs active-scale flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <Info className="h-4 w-4 text-indigo-300" /> About & Info
                    </button>
                </div>
            </div>

            <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
        </div>
    );
}
