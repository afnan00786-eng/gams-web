"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import {
    Share2,
    Copy,
    Check,
    QrCode,
    Smartphone,
    RefreshCw,
    ShieldCheck,
    Database,
    Wifi,
    WifiOff,
    MessageCircle,
    Download,
    ExternalLink,
    CheckCircle2,
    Info
} from "lucide-react";

interface AboutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
    const { user } = useAuthStore();
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [appUrl, setAppUrl] = useState("");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setAppUrl(window.location.origin);
            setIsOnline(navigator.onLine);

            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener("online", handleOnline);
            window.addEventListener("offline", handleOffline);

            if (window.matchMedia("(display-mode: standalone)").matches) {
                setIsInstalled(true);
            }

            const handleBeforeInstallPrompt = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
            };

            window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

            return () => {
                window.removeEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
                window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            };
        }
    }, []);

    // Formatted download message for WhatsApp / SMS
    const downloadMessage = `📲 *GAMS Gas Agency App Download Karein*

Gas Agency management aur delivery ke liye GAMS App apne phone me install karein:
👉 Link: ${appUrl}

📌 *Mobile Me Install Karne Ka Tarika:*
1️⃣ Upar diye gaye link ko Google Chrome browser me kholein.
2️⃣ Browser me upar 3 dots (⋮) dabayein aur "Install App" ya "Add to Home screen" par click karein.
3️⃣ App aapke phone me install ho jayegi aur bina internet (Offline) bhi chalegi!

🏢 Agency: *${user?.agencyName || "LPG Gas Agency"}*`;

    const handleCopy = () => {
        if (!appUrl) return;
        navigator.clipboard.writeText(downloadMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleCopyOnlyLink = () => {
        if (!appUrl) return;
        navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsAppShare = () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(downloadMessage)}`;
        window.open(url, "_blank");
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: "GAMS App Download Link",
                    text: downloadMessage,
                    url: appUrl,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            handleCopy();
        }
    };

    const handleInstallApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } else {
            alert("To install GAMS on your phone:\n1. Open Chrome/Safari menu (⋮ or Share)\n2. Tap 'Add to Home screen' or 'Install App'");
        }
    };

    const handleClearCache = async () => {
        if (confirm("Clear local cache and reload fresh app data?")) {
            if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            window.location.reload();
        }
    };

    const qrCodeUrl = appUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&margin=10` : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md md:max-w-lg p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl glass-card">
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl" />
                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/30 border border-white/10">
                                G
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                                    GAMS <span className="text-xs font-bold text-indigo-400 not-italic tracking-normal bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">v3.2.0</span>
                                </DialogTitle>
                                <DialogDescription className="text-slate-300 text-xs font-semibold mt-0.5">
                                    Gas Agency Management System
                                </DialogDescription>
                            </div>
                        </div>

                        <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isOnline ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"}`}>
                            {isOnline ? <Wifi className="w-3 h-3 mr-1 inline" /> : <WifiOff className="w-3 h-3 mr-1 inline" />}
                            {isOnline ? "Online Cloud" : "Offline PWA"}
                        </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Agency: <b className="text-white uppercase">{user?.agencyName || "GAMS Agency"}</b></span>
                        <span>Role: <b className="text-indigo-300 uppercase">{user?.role}</b></span>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Share App Download Link Section (Featured) */}
                    <div className="bg-gradient-to-br from-indigo-50 via-white to-emerald-50/40 rounded-2xl p-5 border-2 border-indigo-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                                <Download className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                                    App Download Link Share Karein
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                                    Kisi ko bhi WhatsApp ya SMS par app download aur install karne ka link bhejein
                                </p>
                            </div>
                        </div>

                        {/* Big Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <Button
                                onClick={handleWhatsAppShare}
                                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 active-scale flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" /> WhatsApp Par Bhejein
                            </Button>

                            <Button
                                onClick={handleNativeShare}
                                className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/20 active-scale flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" /> Share Link (All Apps)
                            </Button>
                        </div>

                        {/* Copy Link Row */}
                        <div className="flex items-center gap-2 pt-1">
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono truncate select-all">
                                {appUrl || "https://..."}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyOnlyLink}
                                className="h-9 px-3 rounded-xl border-slate-200 font-bold text-xs hover:bg-slate-100 shrink-0"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                                <span className="ml-1.5">{copied ? "Copied!" : "Copy Link"}</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowQr(!showQr)}
                                className={`h-9 px-3 rounded-xl font-bold text-xs shrink-0 ${showQr ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 hover:bg-slate-100"}`}
                            >
                                <QrCode className="w-4 h-4 mr-1" /> QR
                            </Button>
                        </div>

                        {/* QR Code Container */}
                        {showQr && (
                            <div className="pt-2 flex flex-col items-center justify-center animate-in fade-in duration-300">
                                <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-200">
                                    {qrCodeUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={qrCodeUrl}
                                            alt="Scan to install GAMS"
                                            className="w-44 h-44 rounded-lg object-contain"
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 mt-2">
                                    Mobile camera se scan karke direct open & install karein
                                </span>
                            </div>
                        )}

                        {/* Step-by-Step Installation Guide */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-[11px]">
                            <span className="font-black text-slate-700 uppercase tracking-wider block text-[10px]">
                                💡 Mobile Me Download / Install Karne Ka Tarika:
                            </span>
                            <div className="flex items-start gap-2 text-slate-600">
                                <span className="font-black text-indigo-600">1.</span>
                                <span>Link ko apne phone ke <b>Chrome browser</b> me open karein.</span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-600">
                                <span className="font-black text-indigo-600">2.</span>
                                <span>Chrome me upar 3 dots (⋮) dabayein aur <b>"Install App"</b> ya <b>"Add to Home screen"</b> select karein.</span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-600">
                                <span className="font-black text-indigo-600">3.</span>
                                <span>App aapke mobile screen par aa jayegi aur bina internet <b>(Offline Mode)</b> me bhi chalegi!</span>
                            </div>
                        </div>
                    </div>

                    {/* Direct Install on Current Device */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Smartphone className="w-6 h-6 text-indigo-400 shrink-0" />
                            <div>
                                <p className="font-black text-xs uppercase tracking-wider">
                                    {isInstalled ? "App Already Installed" : "Is Device Me App Install Karein"}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    {isInstalled ? "Standalone full-screen mode me chal raha hai" : "Seedha 1-tap me home screen par install karein"}
                                </p>
                            </div>
                        </div>
                        {!isInstalled && (
                            <Button
                                size="sm"
                                onClick={handleInstallApp}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] rounded-xl px-3.5 h-9 shadow-md shrink-0"
                            >
                                <Download className="w-3.5 h-3.5 mr-1" /> Install
                            </Button>
                        )}
                    </div>

                    {/* Features Overview */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-black text-slate-800 text-[11px]">100% Offline Mode</p>
                                <p className="text-[9px] text-slate-500 leading-tight">Bina net ke trip close, booking aur stock update karein</p>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2">
                            <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-black text-slate-800 text-[11px]">Realtime Cloud Sync</p>
                                <p className="text-[9px] text-slate-500 leading-tight">Net aate hi server aur desktop par auto update</p>
                            </div>
                        </div>
                    </div>

                    {/* System Maintenance */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                            onClick={handleClearCache}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Cache & Reload
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">
                            GAMS © 2026 • Enterprise Edition
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
