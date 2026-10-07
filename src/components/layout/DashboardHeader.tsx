"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Globe, Edit2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardHeader() {
    const { user, logout } = useAuthStore();
    const { language, setLanguage } = useLanguageStore();
    const router = useRouter();
    const [agencyName, setAgencyName] = useState(user?.agencyName || "My Gas Agency");
    const [isEditing, setIsEditing] = useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-indigo-100/20 bg-slate-900/90 text-white backdrop-blur-md shadow-lg premium-shadow">
            <div className="flex h-16 items-center px-4 md:px-8">
                <div className="mr-8 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-indigo-500/20 shadow-lg">
                        <span className="font-black text-xs">G</span>
                    </div>
                    <span className="font-black text-xl tracking-tighter uppercase hidden sm:block">GAMS</span>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
                    {/* Agency Name - Premium Editable */}
                    <div className="flex-1 md:flex-none">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={agencyName}
                                    onChange={(e) => setAgencyName(e.target.value)}
                                    className="h-9 w-[180px] sm:w-[240px] text-slate-900 bg-white border-none ring-2 ring-indigo-500 font-bold"
                                />
                                <Button size="icon" className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 shadow-md active-scale" onClick={() => setIsEditing(false)}>
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/20"
                                onClick={() => user?.role === 'MASTER' && setIsEditing(true)}
                            >
                                <h2 className="text-sm md:text-md font-black tracking-tight uppercase truncate">
                                    {agencyName}
                                </h2>
                                {user?.role === 'MASTER' && (
                                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Language Toggle - Premium */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3 rounded-full hover:bg-white/10 text-white font-bold transition-all active-scale border border-white/10 hidden sm:flex"
                            onClick={() => setLanguage(language === "EN" ? "HI" : "EN")}
                        >
                            <Globe className="mr-2 h-4 w-4 text-indigo-400" />
                            {language === "EN" ? "English" : "हिंदी"}
                        </Button>

                        {/* User Profile / Logout - Clean */}
                        <div className="flex items-center gap-3 border-l border-white/10 pl-3">
                            <div className="hidden lg:flex flex-col items-end leading-tight">
                                <span className="font-black text-xs uppercase tracking-wide">{user?.name}</span>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest opacity-80">{user?.role}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full hover:bg-rose-500/10 hover:text-rose-400 transition-all active-scale group"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
