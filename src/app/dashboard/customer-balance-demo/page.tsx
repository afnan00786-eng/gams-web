"use client";

import React, { useState } from 'react';
import { User, Phone, MapPin, Search, ArrowUpRight, ArrowDownLeft, Plus, History, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Hardcoded Dummy Data for Demonstration
const MOCK_CUSTOMERS = [
    { id: 1, name: "Ramesh Hotel", mobile: "9876543210", address: "Main Bazaar", emptyBal: 12, cashBal: 2500 },
    { id: 2, name: "Suresh Cafe", mobile: "9123456780", address: "Station Road", emptyBal: 5, cashBal: 0 },
    { id: 3, name: "Amit Household", mobile: "9988776655", address: "Sector 4", emptyBal: 0, cashBal: 850 },
    { id: 4, name: "Biryani Point", mobile: "9998887770", address: "Jubilee Hills", emptyBal: 22, cashBal: -500 }, // Overpaid
];

const MOCK_LEDGER = [
    { id: 101, date: "12 Oct 2024", type: "GIVEN_FULL", title: "Delivered Full", qty: 5, amount: 4750, balChange: "+5 Empty", cashChange: "+₹4750" },
    { id: 102, date: "12 Oct 2024", type: "RECEIVED_EMPTY", title: "Returned Empty", qty: 2, amount: 0, balChange: "-2 Empty", cashChange: "₹0" },
    { id: 103, date: "14 Oct 2024", type: "PAYMENT", title: "Cash Payment", qty: 0, amount: 4000, balChange: "0 Empty", cashChange: "-₹4000" },
];

export default function CustomerBalanceDemo() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    const filtered = MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Rajesh Yadav's Customers</h1>
                <p className="text-slate-500 font-medium text-sm">Visual Demo / Prototype for Tracker System</p>
            </div>

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
                        <Button className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200">
                            <Plus className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="grid gap-4 mt-6">
                        {filtered.map(c => (
                            <Card
                                key={c.id}
                                className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden rounded-2xl"
                                onClick={() => setSelectedCustomer(c)}
                            >
                                <CardContent className="p-0">
                                    <div className="flex items-center p-5 bg-white">
                                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mr-4 shrink-0">
                                            <span className="text-lg font-black text-indigo-600">{c.name.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-slate-800 truncate">{c.name}</h3>
                                            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.mobile}</span>
                                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                                            {c.emptyBal > 0 && (
                                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-black text-[10px] px-2 py-0.5">
                                                    {c.emptyBal} M.T. DUE
                                                </Badge>
                                            )}
                                            {c.cashBal > 0 && (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-black text-[10px] px-2 py-0.5">
                                                    ₹{c.cashBal} DUE
                                                </Badge>
                                            )}
                                            {c.emptyBal === 0 && c.cashBal <= 0 && (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[10px] px-2 py-0.5">
                                                    CLEAR
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedCustomer(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 -ml-2 h-8"
                    >
                        <ArrowDownLeft className="h-4 w-4" /> Back to Customers
                    </Button>

                    <Card className="border-none shadow-sm overflow-hidden rounded-3xl bg-white relative">
                        <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardHeader className="pt-8 pb-6 text-center border-b border-slate-50">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 mx-auto flex items-center justify-center mb-4 transform rotate-3">
                                <User className="h-8 w-8 text-indigo-600 -rotate-3" />
                            </div>
                            <CardTitle className="text-2xl font-black text-slate-800">{selectedCustomer.name}</CardTitle>
                            <CardDescription className="flex justify-center gap-4 mt-2 font-semibold text-[11px] uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedCustomer.mobile}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="bg-slate-50/50 p-6 flex justify-around items-center">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Empties</p>
                                <p className="text-3xl font-black text-rose-600">{selectedCustomer.emptyBal}</p>
                            </div>
                            <div className="w-[1px] h-12 bg-slate-200" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash Due</p>
                                <p className="text-3xl font-black text-orange-600">₹{selectedCustomer.cashBal}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl h-12 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                            <ArrowDownLeft className="h-4 w-4 mr-2" /> Receive Empty
                        </Button>
                        <Button className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl h-12 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                            <Plus className="h-4 w-4 mr-2" /> Give Full
                        </Button>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <History className="h-4 w-4 text-slate-400" />
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Ledger History</h3>
                        </div>

                        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {MOCK_LEDGER.map((l, i) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-sm">
                                        {l.type === 'GIVEN_FULL' ? <ArrowUpRight className="h-4 w-4 text-indigo-600" /> : <ArrowDownLeft className="h-4 w-4 text-emerald-600" />}
                                    </div>

                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 block mb-1">{l.date}</span>
                                                <h4 className="text-sm font-black text-slate-800">{l.title}</h4>
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-50 text-slate-600 font-bold text-[9px]">{l.type}</Badge>
                                        </div>
                                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-50">
                                            <span className="text-xs font-bold text-slate-500">{l.balChange}</span>
                                            <span className="text-xs font-black text-slate-700">{l.cashChange}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
