"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { 
    ShieldCheck, 
    User as UserIcon, 
    Users, 
    Truck, 
    Calculator, 
    Briefcase,
    Flame,
    Phone,
    Lock,
    KeyRound,
    Building2,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Delete,
    AlertCircle,
    UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecentUser {
    id: string;
    name: string;
    role: UserRole;
    mobile: string;
    agencyName?: string;
}

export default function LoginPage() {
    const router = useRouter();
    const setUser = useAuthStore((state) => state.setUser);

    // Flow State: 'PHONE' | 'ENTER_PIN' | 'SET_PIN'
    const [step, setStep] = useState<'PHONE' | 'ENTER_PIN' | 'SET_PIN'>('PHONE');

    // Form inputs
    const [mobile, setMobile] = useState("");
    const [pin, setPin] = useState(["", "", "", ""]);
    const [newPin, setNewPin] = useState(["", "", "", ""]);
    const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);

    // Active verified user details
    const [verifiedUser, setVerifiedUser] = useState<{
        id: string;
        name: string;
        role: UserRole;
        mobile: string;
        hasPin: boolean;
        agencyName?: string;
    } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingMobile, setIsCheckingMobile] = useState(false);
    const [pinError, setPinError] = useState("");

    // Recent users on this device
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

    // Master Registration Modal
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [regAgencyName, setRegAgencyName] = useState("");
    const [regOwnerName, setRegOwnerName] = useState("");
    const [regMobile, setRegMobile] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPin, setRegPin] = useState("");
    const [regConfirmPin, setRegConfirmPin] = useState("");
    const [regLoading, setRegLoading] = useState(false);

    // Refs for 4-digit PIN inputs
    const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const newPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Load recent logins on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("gams_recent_users");
            if (saved) {
                setRecentUsers(JSON.parse(saved));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const saveToRecentUsers = (u: RecentUser) => {
        try {
            const filtered = recentUsers.filter((r) => r.mobile !== u.mobile);
            const updated = [u, ...filtered].slice(0, 4); // Keep top 4
            setRecentUsers(updated);
            localStorage.setItem("gams_recent_users", JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }
    };

    // Redirection to Dashboard Command Center
    const navigateByRole = (role: UserRole) => {
        router.push('/dashboard');
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case "MASTER":
                return <Badge className="bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider">Owner / Master</Badge>;
            case "MANAGER":
                return <Badge className="bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider">Manager</Badge>;
            case "GODOWN":
                return <Badge className="bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider">Godown</Badge>;
            case "HAWKER":
                return <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider">Hawker</Badge>;
            case "ACCOUNTANT":
                return <Badge className="bg-purple-600 text-white font-black text-[9px] uppercase tracking-wider">Accountant</Badge>;
            default:
                return <Badge className="bg-slate-700 text-white font-black text-[9px] uppercase tracking-wider">{role}</Badge>;
        }
    };

    // Step 1: Check mobile number
    const handleCheckMobile = async (mobileToTest?: string) => {
        const targetMobile = mobileToTest || mobile;
        const clean = targetMobile.replace(/\D/g, '').slice(-10);

        if (clean.length !== 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        setIsCheckingMobile(true);
        setPinError("");

        try {
            const res = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: clean }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Unable to verify mobile number");
                setIsCheckingMobile(false);
                return;
            }

            if (!data.exists) {
                if (!data.isMasterRegistered) {
                    toast.info("No Master account found! Please register as Agency Owner.");
                    setRegMobile(clean);
                    setIsRegisterOpen(true);
                } else {
                    toast.error("This mobile number is not registered. Please ask the Agency Owner to add you.");
                }
                setIsCheckingMobile(false);
                return;
            }

            setVerifiedUser(data.user);
            setMobile(clean);

            if (data.user.hasPin) {
                setStep('ENTER_PIN');
                setPin(["", "", "", ""]);
                setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
            } else {
                setStep('SET_PIN');
                setNewPin(["", "", "", ""]);
                setConfirmPin(["", "", "", ""]);
                setTimeout(() => newPinInputRefs.current[0]?.focus(), 150);
            }
        } catch (e) {
            console.error(e);
            toast.error("Connection error. Please try again.");
        } finally {
            setIsCheckingMobile(false);
        }
    };

    // Quick select from recent users
    const handleSelectRecent = (user: RecentUser) => {
        setVerifiedUser({
            id: user.id,
            name: user.name,
            role: user.role,
            mobile: user.mobile,
            hasPin: true,
            agencyName: user.agencyName
        });
        setMobile(user.mobile);
        setStep('ENTER_PIN');
        setPin(["", "", "", ""]);
        setPinError("");
        setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
    };

    // Handle entering PIN digits
    const handlePinDigitChange = (idx: number, val: string) => {
        const clean = val.replace(/\D/g, '').slice(-1);
        const updated = [...pin];
        updated[idx] = clean;
        setPin(updated);
        setPinError("");

        if (clean && idx < 3) {
            pinInputRefs.current[idx + 1]?.focus();
        }

        // If completed 4 digits, auto submit
        if (clean && idx === 3) {
            const fullPin = updated.join("");
            if (fullPin.length === 4) {
                submitLogin(fullPin);
            }
        }
    };

    const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !pin[idx] && idx > 0) {
            pinInputRefs.current[idx - 1]?.focus();
        }
    };

    // Dialpad click
    const handleDialpadClick = (digit: string) => {
        if (digit === "BACK") {
            const lastFilledIdx = pin.map(p => Boolean(p)).lastIndexOf(true);
            if (lastFilledIdx !== -1) {
                const updated = [...pin];
                updated[lastFilledIdx] = "";
                setPin(updated);
                pinInputRefs.current[lastFilledIdx]?.focus();
            }
            return;
        }

        const firstEmptyIdx = pin.findIndex(p => p === "");
        if (firstEmptyIdx !== -1) {
            const updated = [...pin];
            updated[firstEmptyIdx] = digit;
            setPin(updated);
            setPinError("");

            if (firstEmptyIdx < 3) {
                pinInputRefs.current[firstEmptyIdx + 1]?.focus();
            }

            if (firstEmptyIdx === 3) {
                const fullPin = updated.join("");
                submitLogin(fullPin);
            }
        }
    };

    // Submit PIN Login
    const submitLogin = async (enteredPin: string) => {
        if (!verifiedUser || enteredPin.length !== 4) return;
        setIsLoading(true);
        setPinError("");

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: verifiedUser.mobile,
                    pin: enteredPin
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPinError(data.error || "Incorrect PIN");
                setPin(["", "", "", ""]);
                pinInputRefs.current[0]?.focus();
                setIsLoading(false);
                return;
            }

            // Save to Zustand
            setUser({
                id: data.id,
                name: data.name,
                role: data.role,
                mobile: data.mobile,
                allowedSections: data.allowedSections,
                agencyName: data.agencyName
            });

            // Save to recent users
            saveToRecentUsers({
                id: data.id,
                name: data.name,
                role: data.role,
                mobile: data.mobile,
                agencyName: data.agencyName
            });

            toast.success(`Welcome back, ${data.name}!`);
            navigateByRole(data.role);

        } catch (e) {
            console.error(e);
            setPinError("Login failed. Check server connection.");
            setIsLoading(false);
        }
    };

    // Step 3: Set 4-Digit PIN for first-time staff
    const handleSaveNewPin = async () => {
        const fullNewPin = newPin.join("");
        const fullConfirmPin = confirmPin.join("");

        if (fullNewPin.length !== 4 || fullConfirmPin.length !== 4) {
            toast.error("Please enter full 4-digit PIN in both fields");
            return;
        }

        if (fullNewPin !== fullConfirmPin) {
            toast.error("PINs do not match. Please re-enter.");
            setConfirmPin(["", "", "", ""]);
            confirmPinInputRefs.current[0]?.focus();
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/set-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: verifiedUser?.mobile,
                    pin: fullNewPin
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to set PIN");
                setIsLoading(false);
                return;
            }

            // Auto login after PIN set
            setUser({
                id: data.user.id,
                name: data.user.name,
                role: data.user.role,
                mobile: data.user.mobile,
                allowedSections: data.user.allowedSections,
                agencyName: data.user.agencyName
            });

            saveToRecentUsers({
                id: data.user.id,
                name: data.user.name,
                role: data.user.role,
                mobile: data.user.mobile,
                agencyName: data.user.agencyName
            });

            toast.success("PIN set successfully! Logged in.");
            navigateByRole(data.user.role);

        } catch (e) {
            console.error(e);
            toast.error("Error setting PIN. Please try again.");
            setIsLoading(false);
        }
    };

    // Master Registration Submit
    const handleRegisterMaster = async () => {
        if (!regOwnerName.trim() || !regMobile.trim() || !regPin.trim()) {
            toast.error("Owner Name, Mobile Number, and 4-digit PIN are required.");
            return;
        }

        if (regPin.trim().length !== 4 || !/^\d{4}$/.test(regPin.trim())) {
            toast.error("Master PIN must be exactly 4 digits.");
            return;
        }

        if (regPin !== regConfirmPin) {
            toast.error("Master PIN and Confirm PIN do not match.");
            return;
        }

        setRegLoading(true);
        try {
            const res = await fetch('/api/auth/register-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agencyName: regAgencyName.trim() || "My Gas Agency",
                    name: regOwnerName.trim(),
                    mobile: regMobile.trim(),
                    email: regEmail.trim() || undefined,
                    pin: regPin.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Master registration failed.");
                setRegLoading(false);
                return;
            }

            // Save user to Zustand & recent
            setUser(data.user);
            saveToRecentUsers(data.user);

            setIsRegisterOpen(false);
            toast.success(`Owner Account Created! Welcome, ${data.user.name}.`);
            router.push('/dashboard');

        } catch (e) {
            console.error(e);
            toast.error("Failed to connect to server.");
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10 space-y-6">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 shadow-xl shadow-orange-500/25 flex items-center justify-center">
                        <div className="h-full w-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                            <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center justify-center gap-1.5">
                            GAMS <span className="text-orange-500 text-sm font-black px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20 not-italic">AUTH</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {verifiedUser?.agencyName || "Gas Agency Management System"}
                        </p>
                    </div>
                </div>

                {/* Main Card */}
                <Card className="border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden text-white">
                    <CardContent className="p-6 sm:p-8 space-y-6">

                        {/* Recent Profile Quick Switcher (Only visible in Phone step if users exist) */}
                        {step === 'PHONE' && recentUsers.length > 0 && (
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Quick Switch Profile
                                </Label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {recentUsers.map((u) => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => handleSelectRecent(u)}
                                            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-left active:scale-95"
                                        >
                                            <div className="h-9 w-9 rounded-xl bg-orange-500/20 text-orange-400 font-black flex items-center justify-center text-sm shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black text-white truncate">{u.name}</p>
                                                <p className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter truncate">{u.role}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 1: MOBILE NUMBER ENTRY */}
                        {step === 'PHONE' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight italic uppercase">
                                        Sign In With Mobile
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        Enter your 10-digit registered mobile number to continue.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Mobile Number
                                    </Label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 flex items-center gap-1.5 pointer-events-none text-slate-400 font-bold text-sm">
                                            <span>🇮🇳</span>
                                            <span>+91</span>
                                            <span className="text-slate-600">|</span>
                                        </div>
                                        <Input
                                            type="tel"
                                            maxLength={10}
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onKeyDown={(e) => e.key === "Enter" && handleCheckMobile()}
                                            placeholder="9876543210"
                                            className="h-14 pl-20 bg-slate-950/60 border-white/10 rounded-2xl text-lg font-black tracking-widest text-white placeholder:text-slate-600 focus:border-orange-500 focus:ring-orange-500/20"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleCheckMobile()}
                                    disabled={mobile.length !== 10 || isCheckingMobile}
                                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isCheckingMobile ? "Checking..." : (
                                        <span className="flex items-center gap-2">
                                            Continue <ArrowRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </Button>

                                <div className="pt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsRegisterOpen(true)}
                                        className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1.5 py-1"
                                    >
                                        <Building2 className="h-3.5 w-3.5" />
                                        Register Agency Owner / Master
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: ENTER 4-DIGIT PIN */}
                        {step === 'ENTER_PIN' && verifiedUser && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('PHONE'); setPin(["", "", "", ""]); }}
                                        className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400">{verifiedUser.mobile}</p>
                                    </div>
                                </div>

                                <div className="text-center space-y-1.5">
                                    <div className="inline-block">{getRoleBadge(verifiedUser.role)}</div>
                                    <h2 className="text-2xl font-black text-white italic tracking-tight">
                                        {verifiedUser.name}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Enter your 4-digit security PIN to unlock
                                    </p>
                                </div>

                                {/* 4 PIN Digit Inputs */}
                                <div className="flex justify-center gap-3 my-4">
                                    {pin.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { pinInputRefs.current[idx] = el; }}
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                                            onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                            className={cn(
                                                "w-14 h-16 text-center text-2xl font-black rounded-2xl bg-slate-950/80 border text-white transition-all outline-none",
                                                pinError ? "border-rose-500 bg-rose-500/10 text-rose-300" :
                                                digit ? "border-orange-500 shadow-lg shadow-orange-500/20" : "border-white/10 focus:border-orange-400"
                                            )}
                                        />
                                    ))}
                                </div>

                                {pinError && (
                                    <p className="text-center text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 animate-shake">
                                        <AlertCircle className="h-4 w-4" /> {pinError}
                                    </p>
                                )}

                                {/* Mobile Dialpad (0-9) */}
                                <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                if (key === "C") {
                                                    setPin(["", "", "", ""]);
                                                    setPinError("");
                                                    pinInputRefs.current[0]?.focus();
                                                } else {
                                                    handleDialpadClick(key);
                                                }
                                            }}
                                            className={cn(
                                                "h-14 rounded-2xl font-black text-lg flex items-center justify-center active:scale-90 transition-all shadow-sm",
                                                key === "BACK" ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" :
                                                key === "C" ? "bg-slate-800 text-slate-400 hover:text-white" :
                                                "bg-white/5 hover:bg-white/10 text-white border border-white/5"
                                            )}
                                        >
                                            {key === "BACK" ? <Delete className="h-5 w-5" /> : key}
                                        </button>
                                    ))}
                                </div>

                                <div className="text-center pt-2">
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Forgot PIN? Contact Owner/Master to reset.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: FIRST-TIME PIN SETUP */}
                        {step === 'SET_PIN' && verifiedUser && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="text-center space-y-2">
                                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                                        <KeyRound className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-xl font-black text-white italic tracking-tight">
                                        Welcome, {verifiedUser.name}!
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">
                                        First time login: Set your 4-digit PIN for daily access.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            Choose 4-Digit PIN
                                        </Label>
                                        <div className="flex justify-center gap-3">
                                            {newPin.map((digit, idx) => (
                                                <input
                                                    key={idx}
                                                    ref={(el) => { newPinInputRefs.current[idx] = el; }}
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/\D/g, '').slice(-1);
                                                        const updated = [...newPin];
                                                        updated[idx] = clean;
                                                        setNewPin(updated);
                                                        if (clean && idx < 3) newPinInputRefs.current[idx + 1]?.focus();
                                                        if (clean && idx === 3) confirmPinInputRefs.current[0]?.focus();
                                                    }}
                                                    className="w-12 h-14 text-center text-xl font-black rounded-xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-amber-400"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            Confirm 4-Digit PIN
                                        </Label>
                                        <div className="flex justify-center gap-3">
                                            {confirmPin.map((digit, idx) => (
                                                <input
                                                    key={idx}
                                                    ref={(el) => { confirmPinInputRefs.current[idx] = el; }}
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => {
                                                        const clean = e.target.value.replace(/\D/g, '').slice(-1);
                                                        const updated = [...confirmPin];
                                                        updated[idx] = clean;
                                                        setConfirmPin(updated);
                                                        if (clean && idx < 3) confirmPinInputRefs.current[idx + 1]?.focus();
                                                    }}
                                                    className="w-12 h-14 text-center text-xl font-black rounded-xl bg-slate-950/80 border border-white/10 text-white outline-none focus:border-emerald-400"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveNewPin}
                                    disabled={isLoading || newPin.join("").length !== 4 || confirmPin.join("").length !== 4}
                                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                                >
                                    {isLoading ? "Saving PIN..." : "Save PIN & Log In"}
                                </Button>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>

            {/* MASTER / OWNER REGISTRATION DIALOG */}
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-6 text-white shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-white">
                                    Register Agency Owner
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Create Master Administrator Account
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Agency Name</Label>
                            <Input
                                value={regAgencyName}
                                onChange={(e) => setRegAgencyName(e.target.value)}
                                placeholder="E.g., Bharat Gas Agency / GAMS"
                                className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-bold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Owner Name *</Label>
                            <Input
                                value={regOwnerName}
                                onChange={(e) => setRegOwnerName(e.target.value)}
                                placeholder="Enter your full name"
                                className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-bold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number *</Label>
                            <Input
                                type="tel"
                                maxLength={10}
                                value={regMobile}
                                onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-bold tracking-wider"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email (Optional)</Label>
                            <Input
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                placeholder="owner@agency.com"
                                className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">4-Digit PIN *</Label>
                                <Input
                                    type="password"
                                    maxLength={4}
                                    value={regPin}
                                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-black text-center text-lg tracking-widest"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm PIN *</Label>
                                <Input
                                    type="password"
                                    maxLength={4}
                                    value={regConfirmPin}
                                    onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    className="h-11 bg-slate-950 border-white/10 rounded-xl text-white font-black text-center text-lg tracking-widest"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsRegisterOpen(false)}
                            className="flex-1 rounded-xl h-12 font-black uppercase text-xs text-slate-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRegisterMaster}
                            disabled={regLoading || !regOwnerName || regMobile.length !== 10 || regPin.length !== 4}
                            className="flex-[2] rounded-xl h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider shadow-lg"
                        >
                            {regLoading ? "Registering..." : "Create Master Account"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
