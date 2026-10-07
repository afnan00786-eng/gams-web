"use client";

import { useState, useEffect } from "react";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Trash2, UserPlus, Shield, Edit2, Check, X, Phone, ChevronLeft, Truck, Plus, 
    Contact2, KeyRound, Lock, Package, ClipboardList, Wallet, Users, CheckSquare, Square,
    ShieldCheck, Sparkles, Layers
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SECTIONS, ModuleKey, getDefaultSectionsForRole, parseAllowedSections } from "@/lib/permissions";

// Icon mapper for sections
const sectionIconMap: Record<string, any> = {
    Package,
    Truck,
    ClipboardList,
    Wallet,
    Users
};

export default function StaffAccountsPage() {
    const router = useRouter();

    // New Employee State
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newRole, setNewRole] = useState<UserRole>("HAWKER");
    const [newSections, setNewSections] = useState<ModuleKey[]>(getDefaultSectionsForRole("HAWKER"));

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMobile, setEditMobile] = useState("");

    const { employees, addEmployee, removeEmployee, updateEmployee, user, fetchEmployees } = useAuthStore();
    const { vehicles, addVehicle, removeVehicle, fetchVehicles } = useVehicleStore();

    // New Vehicle State
    const [newVehicleNumber, setNewVehicleNumber] = useState("");
    const [newVehicleType, setNewVehicleType] = useState("");

    // Reset PIN State
    const [pinModal, setPinModal] = useState<{ open: boolean; emp: any | null; newPin: string }>({
        open: false,
        emp: null,
        newPin: ""
    });
    const [isResettingPin, setIsResettingPin] = useState(false);

    // Manage Access / Permissions Modal State
    const [accessModal, setAccessModal] = useState<{
        open: boolean;
        emp: any | null;
        sections: ModuleKey[];
    }>({
        open: false,
        emp: null,
        sections: []
    });
    const [isSavingAccess, setIsSavingAccess] = useState(false);

    const handleConfirmResetPin = async () => {
        if (!pinModal.emp) return;
        setIsResettingPin(true);
        try {
            const res = await fetch('/api/auth/reset-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: pinModal.emp.id,
                    newPin: pinModal.newPin ? pinModal.newPin.trim() : undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `PIN updated for ${pinModal.emp.name}`);
                setPinModal({ open: false, emp: null, newPin: "" });
                fetchEmployees();
            } else {
                toast.error(data.error || "Failed to reset PIN");
            }
        } catch (e) {
            toast.error("Network error resetting PIN");
        } finally {
            setIsResettingPin(false);
        }
    };

    const handleSavePermissions = async () => {
        if (!accessModal.emp) return;
        setIsSavingAccess(true);
        try {
            await updateEmployee(accessModal.emp.id, {
                allowedSections: accessModal.sections
            });
            toast.success(`Access permissions updated for ${accessModal.emp.name}`);
            setAccessModal({ open: false, emp: null, sections: [] });
            fetchEmployees();
        } catch (e) {
            toast.error("Failed to update access permissions");
        } finally {
            setIsSavingAccess(false);
        }
    };

    const handleRoleChange = (role: UserRole) => {
        setNewRole(role);
        setNewSections(getDefaultSectionsForRole(role));
    };

    useEffect(() => {
        fetchEmployees();
        fetchVehicles();
    }, [fetchEmployees, fetchVehicles]);

    if (user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500 font-black uppercase tracking-widest">Access Denied. Only Master can manage employees.</div>;
    }

    const handleAddUser = async () => {
        if (!newName || !newMobile) {
            toast.error("Please enter staff name and 10-digit mobile number");
            return;
        }
        if (newMobile.length !== 10) {
            toast.error("Mobile number must be exactly 10 digits");
            return;
        }

        try {
            await addEmployee({
                name: newName,
                role: newRole,
                mobile: newMobile,
                allowedSections: newSections
            });
            toast.success(`${newName} added with ${newSections.length} allotted section(s)`);
            setNewName("");
            setNewMobile("");
            setNewRole("HAWKER");
            setNewSections(getDefaultSectionsForRole("HAWKER"));
        } catch (e) {
            toast.error("Failed to add employee");
        }
    };

    const startEdit = (id: string, currentMobile: string) => {
        setEditingId(id);
        setEditMobile(currentMobile);
    };

    const saveEdit = (id: string) => {
        if (updateEmployee) {
            updateEmployee(id, { mobile: editMobile });
        }
        setEditingId(null);
    };

    const handleAddVehicle = () => {
        if (!newVehicleNumber) return;
        addVehicle({ number: newVehicleNumber.toUpperCase(), type: newVehicleType });
        setNewVehicleNumber("");
        setNewVehicleType("");
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Header */}
            <div className="flex items-center gap-4 border-b border-indigo-50 pb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="shrink-0 -ml-2 h-12 w-12 rounded-2xl hover:bg-slate-100 transition-all active-scale">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">Staff & Assets</h1>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] text-indigo-500 mt-2">Authority, Logistics & Module Access Control</p>
                </div>
            </div>

            {/* Add New Employee */}
            <Card className="rounded-[2.5rem] border-none shadow-xl glass-card overflow-hidden">
                <CardHeader className="bg-indigo-500/5 p-8 pb-4 border-b border-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Add New Staff</CardTitle>
                            <CardDescription className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Create system accounts and allot permitted sections</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Rahul Sharma"
                                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold text-sm uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</Label>
                            <Input
                                value={newMobile}
                                type="tel"
                                maxLength={10}
                                pattern="\d*"
                                onChange={e => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10-digit number"
                                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-black text-sm tracking-widest"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">System Role</Label>
                            <select
                                className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-slate-50/50 px-4 py-2 text-xs font-black uppercase tracking-widest ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:bg-white"
                                value={newRole}
                                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                            >
                                <option value="MANAGER">Manager</option>
                                <option value="GODOWN">Godown Keeper</option>
                                <option value="HAWKER">Hawker</option>
                                <option value="ACCOUNTANT">Accountant</option>
                                <option value="OFFICE_STAFF">Office Staff</option>
                            </select>
                        </div>
                    </div>

                    {/* Section Allotment Checkboxes */}
                    <div className="space-y-3 pt-2 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                                    Allot Permitted Sections / Modules
                                </Label>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                                {newSections.length} of {SECTIONS.length} Selected
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Ye staff member login karne ke baad keval inhi allotted sections ko access kar sakega.
                        </p>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {SECTIONS.map((sec) => {
                                const isChecked = newSections.includes(sec.key);
                                const IconComp = sectionIconMap[sec.icon] || Package;
                                return (
                                    <button
                                        key={sec.key}
                                        type="button"
                                        onClick={() => {
                                            setNewSections(prev =>
                                                prev.includes(sec.key)
                                                    ? prev.filter(k => k !== sec.key)
                                                    : [...prev, sec.key]
                                            );
                                        }}
                                        className={cn(
                                            "px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all flex items-center gap-2.5 active-scale",
                                            isChecked
                                                ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                            isChecked ? "bg-indigo-500 text-white border-indigo-500" : "border-slate-300 bg-slate-50"
                                        )}>
                                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <IconComp className={cn("w-4 h-4", isChecked ? "text-indigo-300" : "text-slate-400")} />
                                        <span>{sec.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Button onClick={handleAddUser} className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic tracking-tighter shadow-xl transition-all active-scale w-full md:w-auto">
                        <UserPlus className="mr-2 h-4 w-4" /> Add Employee Account
                    </Button>
                </CardContent>
            </Card>

            {/* Employee List by Category */}
            <div className="space-y-10">
                {['MANAGER', 'ACCOUNTANT', 'OFFICE_STAFF', 'GODOWN', 'HAWKER'].map(role => {
                    const roleEmployees = employees.filter(emp => emp.role === role);
                    if (roleEmployees.length === 0) return null;

                    return (
                        <div key={role} className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <Shield className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
                                    {role.replace('_', ' ')}s
                                </h2>
                                <div className="h-px flex-1 bg-indigo-50"></div>
                                <Badge variant="outline" className="rounded-full bg-slate-50 text-slate-400 font-bold px-3 py-0.5 text-[9px] uppercase tracking-widest border-slate-100">{roleEmployees.length} Total</Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {roleEmployees.map(emp => {
                                    const allotted = parseAllowedSections(emp.allowedSections, emp.role);

                                    return (
                                        <Card key={emp.id} className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300 border-none rounded-[2rem] glass-card flex flex-col justify-between">
                                            <div className={cn(
                                                "absolute top-0 left-0 w-1.5 h-full",
                                                emp.role === 'MANAGER' ? 'bg-blue-500' :
                                                    emp.role === 'GODOWN' ? 'bg-orange-500' :
                                                        emp.role === 'ACCOUNTANT' ? 'bg-teal-500' :
                                                            emp.role === 'OFFICE_STAFF' ? 'bg-pink-500' : 'bg-purple-500'
                                            )}></div>
                                            <CardContent className="p-6 pl-8 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <h3 className="font-black text-lg italic uppercase tracking-tighter text-slate-900 truncate max-w-[150px]">{emp.name}</h3>
                                                            <div className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1 opacity-60">
                                                                <Contact2 className="h-2.5 w-2.5" /> ID: {emp.id.slice(-6).toUpperCase()}
                                                            </div>
                                                        </div>

                                                        {editingId === emp.id ? (
                                                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                                                                <Input
                                                                    value={editMobile}
                                                                    type="tel"
                                                                    maxLength={10}
                                                                    pattern="\d*"
                                                                    onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                                    className="h-10 w-32 rounded-xl border-slate-200 font-black tracking-widest text-xs"
                                                                />
                                                                <Button size="icon" className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-md" onClick={() => saveEdit(emp.id)}>
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setEditingId(null)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-4 group/mobile">
                                                                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50 flex items-center gap-2 group-hover/mobile:bg-indigo-50 group-hover/mobile:border-indigo-100 transition-colors">
                                                                    <Phone className="h-3 w-3 text-slate-400 group-hover/mobile:text-indigo-500" />
                                                                    <span className="text-xs font-black tracking-widest text-slate-600 group-hover/mobile:text-indigo-900">
                                                                        {emp.mobile || 'NO MOBILE'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover/mobile:opacity-100 transition-all translate-x-1 group-hover/mobile:translate-x-0">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 text-indigo-500"
                                                                        title="Manage Sections & Permissions"
                                                                        onClick={() => setAccessModal({
                                                                            open: true,
                                                                            emp,
                                                                            sections: allotted
                                                                        })}
                                                                    >
                                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-600"
                                                                        title="Manage 4-Digit PIN"
                                                                        onClick={() => setPinModal({ open: true, emp, newPin: "" })}
                                                                    >
                                                                        <KeyRound className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-lg hover:bg-indigo-100 hover:text-indigo-600"
                                                                        onClick={() => startEdit(emp.id, emp.mobile || "")}
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    {emp.mobile && (
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 rounded-lg hover:bg-emerald-100 hover:text-emerald-600"
                                                                            onClick={() => window.open(`tel:${emp.mobile}`)}
                                                                        >
                                                                            <Phone className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active-scale"
                                                        onClick={() => removeEmployee(emp.id)}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </div>

                                                {/* Allotted Sections Badges */}
                                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                        <span>Allotted Sections</span>
                                                        <button
                                                            onClick={() => setAccessModal({
                                                                open: true,
                                                                emp,
                                                                sections: allotted
                                                            })}
                                                            className="text-indigo-600 hover:underline flex items-center gap-1 font-bold lowercase"
                                                        >
                                                            <span>edit</span>
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {allotted.length === 0 ? (
                                                            <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                                                                No Sections Allotted
                                                            </span>
                                                        ) : (
                                                            allotted.map(secKey => {
                                                                const sec = SECTIONS.find(s => s.key === secKey);
                                                                if (!sec) return null;
                                                                return (
                                                                    <span
                                                                        key={secKey}
                                                                        className={cn(
                                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                                            sec.color
                                                                        )}
                                                                    >
                                                                        {sec.name}
                                                                    </span>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Vehicles Section */}
            <div className="pt-12 border-t border-indigo-50 space-y-8">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Agency Logistics</h2>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] text-indigo-500 mt-2">Trucks, Autos & Vans Registry</p>
                </div>

                {/* Add New Vehicle */}
                <Card className="rounded-[2.5rem] border-none shadow-xl glass-card overflow-hidden">
                    <CardHeader className="bg-emerald-500/5 p-8 pb-4 border-b border-emerald-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Add New Vehicle</CardTitle>
                                <CardDescription className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Register new delivery equipment</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Number</Label>
                                <Input
                                    value={newVehicleNumber}
                                    onChange={e => setNewVehicleNumber(e.target.value)}
                                    placeholder="e.g. MH 12 AB 1234"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-black text-sm uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Category (Optional)</Label>
                                <Input
                                    value={newVehicleType}
                                    onChange={e => setNewVehicleType(e.target.value)}
                                    placeholder="e.g. Truck, 3-Wheeler"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold text-sm uppercase"
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddVehicle} className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase italic tracking-tighter shadow-xl transition-all active-scale w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> register vehicle
                        </Button>
                    </CardContent>
                </Card>

                {/* Vehicle List */}
                {vehicles.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {vehicles.map(vehicle => (
                            <Card key={vehicle.id} className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300 border-none rounded-[2rem] glass-card">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                                <CardContent className="p-6 pl-8">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-black text-lg italic uppercase tracking-tighter text-slate-900">{vehicle.number}</h3>
                                                {vehicle.type && (
                                                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 bg-indigo-50/50 w-fit px-2 py-0.5 rounded-lg border border-indigo-100">
                                                        <Truck className="h-2.5 w-2.5" /> {vehicle.type}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active-scale"
                                            onClick={() => removeVehicle(vehicle.id)}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Manage Permissions / Sections Dialog */}
            <Dialog open={accessModal.open} onOpenChange={(open) => !open && setAccessModal({ open: false, emp: null, sections: [] })}>
                <DialogContent className="sm:max-w-lg bg-white border-none rounded-[2rem] p-6 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-slate-900">
                                    Manage Section Access
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {accessModal.emp?.name} • {accessModal.emp?.role}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-black uppercase tracking-wider text-slate-400 text-[10px]">
                                Permitted Sections ({accessModal.sections.length} of {SECTIONS.length})
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAccessModal(prev => ({ ...prev, sections: SECTIONS.map(s => s.key) }))}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                    Select All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => setAccessModal(prev => ({ ...prev, sections: [] }))}
                                    className="text-[10px] font-bold text-rose-500 hover:underline"
                                >
                                    Clear All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={() => setAccessModal(prev => ({
                                        ...prev,
                                        sections: getDefaultSectionsForRole(prev.emp?.role || "")
                                    }))}
                                    className="text-[10px] font-bold text-slate-600 hover:underline"
                                >
                                    Role Default
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {SECTIONS.map((sec) => {
                                const isChecked = accessModal.sections.includes(sec.key);
                                const IconComp = sectionIconMap[sec.icon] || Package;

                                return (
                                    <div
                                        key={sec.key}
                                        onClick={() => {
                                            setAccessModal(prev => ({
                                                ...prev,
                                                sections: prev.sections.includes(sec.key)
                                                    ? prev.sections.filter(k => k !== sec.key)
                                                    : [...prev.sections, sec.key]
                                            }));
                                        }}
                                        className={cn(
                                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none",
                                            isChecked
                                                ? "bg-indigo-50/60 border-indigo-200 shadow-sm"
                                                : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 opacity-70"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                isChecked ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                                            )}>
                                                <IconComp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                                                    {sec.name}
                                                </h4>
                                                <p className="text-[10px] font-medium text-slate-400">
                                                    {sec.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center border transition-all",
                                            isChecked ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 bg-white"
                                        )}>
                                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setAccessModal({ open: false, emp: null, sections: [] })}
                            className="flex-1 rounded-xl h-11 font-black uppercase text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSavePermissions}
                            disabled={isSavingAccess}
                            className="flex-[2] rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 active-scale"
                        >
                            {isSavingAccess ? "Saving..." : "Save Permissions"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reset Staff PIN Dialog */}
            <Dialog open={pinModal.open} onOpenChange={(open) => !open && setPinModal({ open: false, emp: null, newPin: "" })}>
                <DialogContent className="sm:max-w-md bg-white border-none rounded-[2rem] p-6 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-slate-900">
                                    Manage Staff PIN
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {pinModal.emp?.name} ({pinModal.emp?.role})
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-medium">
                            Staff member: <strong className="text-slate-900 font-bold">{pinModal.emp?.name}</strong><br />
                            Mobile: <strong className="text-slate-900 font-bold">{pinModal.emp?.mobile || "Not set"}</strong>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Set New 4-Digit PIN (Optional)
                            </Label>
                            <Input
                                type="password"
                                maxLength={4}
                                value={pinModal.newPin}
                                onChange={(e) => setPinModal({ ...pinModal, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                placeholder="E.g. 1234 (Leave blank to clear PIN)"
                                className="h-12 bg-white border-2 border-slate-200 rounded-xl font-black text-center text-xl tracking-widest"
                            />
                            <p className="text-[11px] text-slate-400 font-medium">
                                Blank chhodne par employee apne phone se naya PIN set kar sakega.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setPinModal({ open: false, emp: null, newPin: "" })}
                            className="flex-1 rounded-xl h-11 font-black uppercase text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmResetPin}
                            disabled={isResettingPin}
                            className="flex-[2] rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider shadow-lg shadow-amber-500/20 active-scale"
                        >
                            {isResettingPin ? "Updating..." : (pinModal.newPin ? "Set PIN" : "Clear & Reset PIN")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const Badge = ({ children, variant, className }: any) => (
    <div className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === 'outline' ? "text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/80",
        className
    )}>
        {children}
    </div>
);
