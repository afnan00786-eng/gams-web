"use client";

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
    ClipboardList
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
    title: string;
    icon: React.ReactNode;
    href: string;
    color: string;
    lightColor: string;
    description: string;
    allowedRoles: UserRole[];
}

const modules: ModuleCardProps[] = [
    {
        title: "Godown Stock",
        icon: <Flame className="h-7 w-7" />,
        href: "/dashboard/stock",
        color: "bg-orange-500",
        lightColor: "bg-orange-500/10",
        description: "Inventory & Snapshots",
        allowedRoles: ["MASTER", "MANAGER", "GODOWN", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Refill & Booking",
        icon: <ClipboardList className="h-7 w-7" />,
        href: "/dashboard/refill-booking",
        color: "bg-rose-500",
        lightColor: "bg-rose-500/10",
        description: "Orders & Refills",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Staff's A/c",
        icon: <Users className="h-7 w-7" />,
        href: "/dashboard/staff-accounts",
        color: "bg-blue-500",
        lightColor: "bg-blue-500/10",
        description: "Commissions & Payroll",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Trip Log",
        icon: <Truck className="h-7 w-7" />,
        href: "/dashboard/trip-log",
        color: "bg-emerald-500",
        lightColor: "bg-emerald-500/10",
        description: "Active Trips & History",
        allowedRoles: ["MASTER", "MANAGER", "GODOWN", "HAWKER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Hawker's A/c",
        icon: <Wallet className="h-7 w-7" />,
        href: "/dashboard/hawker-accounts",
        color: "bg-purple-500",
        lightColor: "bg-purple-500/10",
        description: "Deliveries & Dues",
        allowedRoles: ["MASTER", "MANAGER", "HAWKER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Cash/Balance A/c",
        icon: <Banknote className="h-7 w-7" />,
        href: "/dashboard/cash-balance",
        color: "bg-teal-500",
        lightColor: "bg-teal-500/10",
        description: "Drawer & Bank Ledger",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Empty/Money Bal.",
        icon: <RotateCcw className="h-7 w-7" />,
        href: "/dashboard/empty-balance",
        color: "bg-indigo-500",
        lightColor: "bg-indigo-500/10",
        description: "Returnables & Pending",
        allowedRoles: ["MASTER", "MANAGER", "GODOWN", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Summary",
        icon: <FileText className="h-7 w-7" />,
        href: "/dashboard/summary",
        color: "bg-slate-500",
        lightColor: "bg-slate-500/10",
        description: "Insights & Analytics",
        allowedRoles: ["MASTER", "MANAGER", "ACCOUNTANT", "OFFICE_STAFF"]
    },
    {
        title: "Staff & Vehicles",
        icon: <UserPlus className="h-7 w-7" />,
        href: "/dashboard/employees",
        color: "bg-cyan-500",
        lightColor: "bg-cyan-500/10",
        description: "Assets & Access",
        allowedRoles: ["MASTER", "MANAGER"]
    },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { t } = useLanguageStore();
    const router = useRouter();

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
                </p>
            </div>

            {/* Redesigned Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 pb-10">
                {modules.map((module) => {
                    const isAllowed = module.allowedRoles.includes(user.role);

                    return (
                        <Card
                            key={module.title}
                            className={cn(
                                "group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border-none shadow-xl transition-all duration-300 hover:-translate-y-1 active-scale glass-card",
                                !isAllowed ? "opacity-40 grayscale pointer-events-none" : "cursor-pointer"
                            )}
                            onClick={() => isAllowed && router.push(module.href)}
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
                                        "rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest",
                                        isAllowed ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {isAllowed ? t("Access Granted") : t("Restricted")}
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-indigo-500" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
