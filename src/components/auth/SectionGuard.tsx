"use client";

import React from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ModuleKey, SECTIONS, hasPermission } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

interface SectionGuardProps {
    section: ModuleKey;
    children: React.ReactNode;
}

export function SectionGuard({ section, children }: SectionGuardProps) {
    const { user } = useAuthStore();
    const router = useRouter();

    if (!user) {
        return null;
    }

    const isAllowed = hasPermission(user, section);

    if (isAllowed) {
        return <>{children}</>;
    }

    const secDef = SECTIONS.find(s => s.key === section);

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <Card className="max-w-md w-full rounded-[2.5rem] border-none shadow-2xl glass-card overflow-hidden text-center">
                <div className="h-2 w-full bg-rose-500"></div>
                <CardContent className="p-8 pt-10 space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
                        <ShieldAlert className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                            <Lock className="w-3 h-3" /> Section Restricted
                        </div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                            {secDef ? secDef.name : section}
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                            Aapke account ({user.name} • {user.role}) ko is module ka access allot nahi kiya gaya hai.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] font-medium text-slate-500 leading-relaxed">
                        Access lene ke liye apne <strong>Agency Master / Owner</strong> se sampark karein taaki wo <strong>Staff & Assets</strong> me aapke permissions update kar sakein.
                    </div>

                    <Button
                        onClick={() => router.push('/dashboard')}
                        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs shadow-xl active-scale flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Return to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
