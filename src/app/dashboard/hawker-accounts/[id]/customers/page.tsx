"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { User, Phone, MapPin, Search, ArrowUpRight, ArrowDownLeft, Plus, History, X, Loader2, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { CapacitorBackButton } from '@/components/CapacitorBackButton';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CustomerBalancesPage({ params }: { params: { id: string } }) {
    const hawkerId = params.id;
    const { employees } = useAuthStore();
    const router = useRouter();
    const hawker = employees.find((h: any) => h.id === hawkerId && h.role === 'HAWKER');

    const { data: customers, mutate: mutateCustomers, isLoading } = useSWR(`/api/customers?hawkerId=${hawkerId}`, fetcher);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    // New Customer Form
    const [newCustName, setNewCustName] = useState("");
    const [newCustMobile, setNewCustMobile] = useState("");
    const [newCustAddress, setNewCustAddress] = useState("");
    const [isAddingCust, setIsAddingCust] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddCustomer = async () => {
        if (!newCustName) return toast.error("Name is required");
        setIsAddingCust(true);
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCustName, mobile: newCustMobile, address: newCustAddress, hawkerId })
            });
            if (!res.ok) throw new Error("Failed to add customer");
            toast.success("Customer added!");
            setNewCustName(""); setNewCustMobile(""); setNewCustAddress("");
            setIsDialogOpen(false);
            mutateCustomers();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsAddingCust(false);
        }
    };

    const filtered = (customers || []).filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="w-full pb-12 space-y-8 animate-in fade-in duration-500">
            <CapacitorBackButton />

            {/* Header Module - Inspired by Sketch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/hawker-accounts')}
                        className="shrink-0 rounded-full hover:bg-slate-200 active-scale"
                    >
                        <ArrowDownLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                            {hawker?.name}'s <span className="text-indigo-600">Customers</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Field Balance & Assets</p>
                    </div>
                </div>
            </div>

            {isLoading && !customers && (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                </div>
            )}

            {!selectedCustomer ? (
                <>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 h-12 rounded-xl border-slate-200 bg-white text-base font-semibold shadow-sm"
                            />
                        </div>
                        <Dialog open={isAddingCust} onOpenChange={setIsAddingCust}>
                            <DialogTrigger asChild>
                                <Button className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 shrink-0">
                                    <Plus className="h-6 w-6" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-6 border-none shadow-2xl">
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="h-16 w-16 mx-auto bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 transform rotate-12">
                                            <User className="h-8 w-8 text-indigo-600 -rotate-12" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Onboard Entity</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">New Customer Setup</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Name</Label>
                                        <Input value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Customer/Shop Name" className="h-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-xs uppercase" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mobile</Label>
                                        <Input type="tel" value={newCustMobile} onChange={e => setNewCustMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" className="h-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-xs uppercase" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Address (Optional)</Label>
                                        <Input value={newCustAddress} onChange={e => setNewCustAddress(e.target.value)} placeholder="Locality/Area" className="h-12 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white transition-all font-bold text-xs uppercase" />
                                    </div>
                                    <Button onClick={handleAddCustomer} disabled={isAddingCust} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 active-scale mt-4">
                                        {isAddingCust ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Target"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="mt-8 rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl bg-white">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b-2 border-slate-100">
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Sr. No.</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Date</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Empty Bal</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-32">Money Bal</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-40">Mob. No.</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">Call</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center opacity-40">
                                                <Search className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                                                <div className="text-[10px] font-black uppercase tracking-widest">No customers found</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((c: any, idx: number) => (
                                            <tr
                                                key={c.id}
                                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => setSelectedCustomer(c)}
                                            >
                                                <td className="px-6 py-5">
                                                    <span className="text-xs font-black text-slate-400">#{(idx + 1).toString().padStart(2, '0')}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '---'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                                            <span className="text-[12px] font-black text-indigo-600 uppercase">{c.name.charAt(0)}</span>
                                                        </div>
                                                        <span className="font-black text-sm text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                            {c.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2",
                                                            c.emptyBal > 0 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                        )}>
                                                            {c.emptyBal} EMPTY
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className={cn(
                                                        "text-sm font-black tracking-tighter text-center",
                                                        c.cashBal > 0 ? "text-slate-900" : "text-emerald-600"
                                                    )}>
                                                        {c.cashBal > 0 ? `₹${c.cashBal.toLocaleString()}` : "PAID"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-[11px] font-bold text-slate-600 tracking-[0.1em]">{c.mobile || "---"}</span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {c.mobile ? (
                                                        <Button
                                                            size="sm"
                                                            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest active-scale shadow-lg shadow-indigo-600/20"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.href = `tel:${c.mobile}`;
                                                            }}
                                                        >
                                                            <Phone className="h-3.5 w-3.5 mr-2" /> CALL
                                                        </Button>
                                                    ) : (
                                                        <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center mx-auto opacity-30">
                                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : selectedCustomer ? (
                <CustomerLedgerView
                    customer={selectedCustomer}
                    onBack={() => { setSelectedCustomer(null); mutateCustomers(); }}
                />
            ) : null}
        </div>
    );
}

function CustomerLedgerView({ customer, onBack }: { customer: any, onBack: () => void }) {
    const { data: ledger, mutate: mutateLedger, isLoading } = useSWR(`/api/customers/${customer.id}/ledger`, fetcher);

    // Transaction States
    const [txType, setTxType] = useState<"GIVEN_FULL" | "RECEIVED_EMPTY" | "CASH_PAYMENT" | null>(null);
    const [cylQty, setCylQty] = useState("");
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTransaction = async () => {
        if (!txType) return;
        setIsSubmitting(true);
        try {
            const qty = parseInt(cylQty) || 0;
            const amt = parseFloat(amount) || 0;
            const res = await fetch(`/api/customers/${customer.id}/ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: txType,
                    cylinders: qty,
                    amount: amt,
                    note: txType === 'GIVEN_FULL' ? 'Delivered Full' : (txType === 'RECEIVED_EMPTY' ? 'Returned Empty' : 'Cash Payment')
                })
            });
            if (!res.ok) throw new Error("Failed to save transaction");
            toast.success("Ledger updated!");

            // Optimistic UI update for customer balances
            if (txType === 'GIVEN_FULL') {
                customer.emptyBal += qty;
                customer.cashBal += amt;
            } else if (txType === 'RECEIVED_EMPTY') {
                customer.emptyBal -= qty;
            } else if (txType === 'CASH_PAYMENT') {
                customer.cashBal -= amt;
            }

            setTxType(null); setCylQty(""); setAmount("");
            mutateLedger();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-12">
            <Button
                variant="ghost"
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 -ml-2 h-10 rounded-full font-bold uppercase tracking-widest text-[10px]"
            >
                <ArrowDownLeft className="h-4 w-4" /> Back to Directory
            </Button>

            <Card className="border-none shadow-sm overflow-hidden rounded-3xl bg-white relative">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <CardHeader className="pt-8 pb-6 text-center border-b border-slate-50">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 mx-auto flex items-center justify-center mb-4 transform rotate-3">
                        <User className="h-8 w-8 text-indigo-600 -rotate-3" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-800">{customer.name}</CardTitle>
                    <CardDescription className="flex justify-center gap-4 mt-2 font-semibold text-[11px] uppercase tracking-wider text-slate-400">
                        {customer.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.mobile}</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent className="bg-slate-50/50 p-6 flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Empties</p>
                        <p className="text-3xl font-black text-rose-600">{customer.emptyBal}</p>
                    </div>
                    <div className="w-[1px] h-12 bg-slate-200" />
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash Due</p>
                        <p className="text-3xl font-black text-orange-600">₹{customer.cashBal}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Dialog open={txType === 'RECEIVED_EMPTY'} onOpenChange={(o) => { if (!o) setTxType(null); else setTxType('RECEIVED_EMPTY'); }}>
                    <DialogTrigger asChild>
                        <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl h-12 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest border-none">
                            <ArrowDownLeft className="h-4 w-4 mr-1 md:mr-2" /> Recv Empty
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs rounded-2xl p-6 text-center border-none shadow-xl">
                        <DialogHeader>
                            <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <ArrowDownLeft className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Receive <span className="text-emerald-600">Empty</span></DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-4">
                            <Input type="number" value={cylQty} onChange={e => setCylQty(e.target.value)} placeholder="0" className="h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl" />
                            <Button onClick={handleTransaction} disabled={isSubmitting || !cylQty} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-md">
                                Confirm Received
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={txType === 'GIVEN_FULL'} onOpenChange={(o) => { if (!o) setTxType(null); else setTxType('GIVEN_FULL'); }}>
                    <DialogTrigger asChild>
                        <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl h-12 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest border-none">
                            <Plus className="h-4 w-4 mr-1 md:mr-2" /> Give Full
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs rounded-2xl p-6 text-center border-none shadow-xl">
                        <DialogHeader>
                            <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                <Plus className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Give <span className="text-indigo-600">Full</span></DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 text-left block ml-1 tracking-widest">Cylinders Given</Label>
                                <Input type="number" value={cylQty} onChange={e => setCylQty(e.target.value)} placeholder="0" className="h-14 text-center text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 text-left block ml-1 tracking-widest">Cash Due / Charge (₹)</Label>
                                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0" className="h-14 text-center text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl" />
                            </div>
                            <Button onClick={handleTransaction} disabled={isSubmitting || (!cylQty && !amount)} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-md mt-4">
                                Add to Ledger
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={txType === 'CASH_PAYMENT'} onOpenChange={(o) => { if (!o) setTxType(null); else setTxType('CASH_PAYMENT'); }}>
                    <DialogTrigger asChild>
                        <Button className="flex-1 col-span-2 md:col-span-1 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl h-12 shadow-lg shadow-slate-900/20 active:scale-95 transition-all text-xs uppercase tracking-widest border-none">
                            ₹ Collect Cash
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs rounded-2xl p-6 text-center border-none shadow-xl">
                        <DialogHeader>
                            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-800">
                                <ArrowDownLeft className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Cash <span className="text-slate-500">Collection</span></DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-4">
                            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹0" className="h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl" />
                            <Button onClick={handleTransaction} disabled={isSubmitting || !amount} className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest shadow-md">
                                Confirm Payment
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="pt-4">
                <div className="flex items-center gap-2 mb-4 px-2">
                    <History className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Ledger History</h3>
                </div>

                {isLoading ? (
                    <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" /></div>
                ) : !ledger || ledger.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                        <History className="h-8 w-8 text-slate-200 mb-2" />
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">No transactions found</div>
                    </div>
                ) : (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {ledger.map((l: any, i: number) => (
                            <div key={l.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-sm">
                                    {l.type === 'GIVEN_FULL' ? <ArrowUpRight className="h-4 w-4 text-indigo-600" /> : <ArrowDownLeft className="h-4 w-4 text-emerald-600" />}
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 transition-all hover:shadow-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">{new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <h4 className="text-sm font-black text-slate-800">{l.note}</h4>
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-50 text-slate-600 font-bold text-[9px]">{l.type}</Badge>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-50">
                                        <div>
                                            {l.cylinders > 0 && <span className="block text-xs font-black text-rose-600">{l.type === 'GIVEN_FULL' ? '+' : '-'}{l.cylinders} Empty</span>}
                                            {l.amount > 0 && <span className="block text-xs font-black text-orange-600">{l.type === 'CASH_PAYMENT' ? '-' : '+'}₹{l.amount}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
