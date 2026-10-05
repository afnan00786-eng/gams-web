'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountsStore } from '@/store/useAccountsStore';
import { IndianRupee, Cylinder, CheckCircle2 } from 'lucide-react';

interface SettleQuickDialogProps {
    hawkerId: string;
    hawkerName: string;
    type: 'CASH' | 'EMPTY_CYLINDER';
    trigger?: React.ReactNode;
}

export function SettleQuickDialog({ hawkerId, hawkerName, type, trigger }: SettleQuickDialogProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState(type === 'CASH' ? 'Cash Received' : 'Returned Empty Cylinders');
    const settle = useAccountsStore((s) => s.settleHawkerBalance);

    const handleSettle = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        settle(hawkerId, hawkerName, val, description, type);
        setAmount('');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        {type === 'CASH' ? <IndianRupee className="h-4 w-4" /> : <Cylinder className="h-4 w-4" />}
                        Settle {type === 'CASH' ? 'Cash' : 'Empties'}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black italic uppercase tracking-tighter">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        Quick Settle
                    </DialogTitle>
                    <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-slate-400">
                        Recording {type} for {hawkerName}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">
                            {type === 'CASH' ? 'Amount Received (₹)' : 'Quantity Returned'}
                        </Label>
                        <Input
                            type="number"
                            placeholder="0"
                            className="h-14 rounded-2xl border-2 border-slate-200 focus:border-green-500 text-center text-2xl font-black shadow-sm"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-slate-500 ml-1">Description</Label>
                        <Input
                            placeholder="e.g. Cash Submitted"
                            className="h-12 rounded-xl border-2 border-slate-200 focus:border-green-500 font-bold text-sm uppercase"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-lg font-black uppercase italic tracking-tighter shadow-lg shadow-green-200 transition-all hover:scale-[1.02]"
                        onClick={handleSettle}
                        disabled={!amount || parseFloat(amount) <= 0}
                    >
                        Confirm Settlement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
