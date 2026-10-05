"use client";

import { useState, useEffect } from "react";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, Shield, Edit2, Check, X, Phone, ChevronLeft, Truck, Plus, Contact2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function StaffAccountsPage() {
    const router = useRouter();
    // New Employee State
    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newRole, setNewRole] = useState<UserRole>("HAWKER");

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMobile, setEditMobile] = useState("");

    const { employees, addEmployee, removeEmployee, updateEmployee, user, fetchEmployees } = useAuthStore();
    const { vehicles, addVehicle, removeVehicle, fetchVehicles } = useVehicleStore();

    // New Vehicle State
    const [newVehicleNumber, setNewVehicleNumber] = useState("");
    const [newVehicleType, setNewVehicleType] = useState("");

    useEffect(() => {
        fetchEmployees();
        fetchVehicles();
    }, [fetchEmployees, fetchVehicles]);

    if (user?.role !== 'MASTER') {
        return <div className="p-8 text-center text-red-500 font-black uppercase tracking-widest">Access Denied. Only Master can manage employees.</div>;
    }

    const handleAddUser = () => {
        if (!newName || !newMobile) return;
        addEmployee({
            name: newName,
            role: newRole,
            mobile: newMobile
        });
        setNewName("");
        setNewMobile("");
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
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] text-indigo-500 mt-2">Authority, Logistics & Access Control</p>
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
                            <CardDescription className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Create system accounts for personnel</CardDescription>
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
                                onChange={(e) => setNewRole(e.target.value as UserRole)}
                            >
                                <option value="MANAGER">Manager</option>
                                <option value="GODOWN">Godown Keeper</option>
                                <option value="HAWKER">Hawker</option>
                                <option value="ACCOUNTANT">Accountant</option>
                                <option value="OFFICE_STAFF">Office Staff</option>
                            </select>
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
                                {roleEmployees.map(emp => (
                                    <Card key={emp.id} className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300 border-none rounded-[2rem] glass-card">
                                        <div className={cn(
                                            "absolute top-0 left-0 w-1.5 h-full",
                                            emp.role === 'MANAGER' ? 'bg-blue-500' :
                                                emp.role === 'GODOWN' ? 'bg-orange-500' :
                                                    emp.role === 'ACCOUNTANT' ? 'bg-teal-500' :
                                                        emp.role === 'OFFICE_STAFF' ? 'bg-pink-500' : 'bg-purple-500'
                                        )}></div>
                                        <CardContent className="p-6 pl-8">
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
                                        </CardContent>
                                    </Card>
                                ))}
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
