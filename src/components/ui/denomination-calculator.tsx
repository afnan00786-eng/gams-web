"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calculator, AlertTriangle, TrendingUp, TrendingDown, X } from "lucide-react";

interface DenominationCalculatorProps {
    value: number;
    onChange: (value: number) => void;
    expectedAmount?: number;
    triggerClassName?: string;
    children?: React.ReactNode;
}

export function DenominationCalculator({ value, onChange, expectedAmount, triggerClassName, children }: DenominationCalculatorProps) {
    const [counts, setCounts] = useState<{ [key: number]: number | '' }>({
        500: '',
        200: '',
        100: '',
        50: '',
        20: '',
        10: '',
        5: '',
        2: '',
        1: ''
    });

    const [open, setOpen] = useState(false);
    const [mismatch, setMismatch] = useState<'over' | 'under' | null>(null);

    // Calculate total on the fly
    const currentTotal = [500, 200, 100, 50, 20, 10, 5, 2, 1].reduce((sum, denom) => {
        const count = counts[denom];
        return sum + (typeof count === 'number' ? count * denom : 0);
    }, 0);

    const handleCountChange = (denom: number, val: string) => {
        const numVal = val === '' ? '' : parseInt(val, 10);
        const newCounts: { [key: number]: number | '' } = { ...counts, [denom]: isNaN(numVal as any) ? '' : numVal };
        setCounts(newCounts);

        const updatedTotal = [500, 200, 100, 50, 20, 10, 5, 2, 1].reduce((sum, d) => {
            const count = newCounts[d];
            return sum + (typeof count === 'number' ? count * d : 0);
        }, 0);
        onChange(updatedTotal);
    };

    const handleClear = () => {
        setCounts({ 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' });
        onChange(0);
        setMismatch(null);
    };

    const handleDone = () => {
        if (expectedAmount !== undefined && currentTotal !== expectedAmount) {
            // Show contextual warning
            setMismatch(currentTotal > expectedAmount ? 'over' : 'under');
            return; // Don't close yet - let user acknowledge
        }
        onChange(currentTotal);
        setOpen(false);
        setMismatch(null);
    };

    const handleForceApply = () => {
        onChange(currentTotal);
        setOpen(false);
        setMismatch(null);
    };

    const diff = expectedAmount !== undefined ? Math.abs(currentTotal - expectedAmount) : 0;

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMismatch(null); }}>
            <PopoverTrigger asChild>
                {children ? (
                    <div className={`relative cursor-pointer group ${triggerClassName || ''}`}>
                        {children}
                        <div className="absolute inset-y-0 right-4 flex items-center justify-center pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <Calculator className="h-5 w-5" />
                        </div>
                    </div>
                ) : (
                    <div className={`relative cursor-pointer group ${triggerClassName || ''}`}>
                        <div className="absolute inset-y-0 right-4 flex items-center justify-center pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <Calculator className="h-5 w-5" />
                        </div>
                    </div>
                )}
            </PopoverTrigger>
            <PopoverContent 
                className="w-[calc(100vw-2rem)] sm:w-[360px] p-0 rounded-[2rem] border-slate-100 shadow-2xl glass-card overflow-hidden z-[100]" 
                align="center" 
                sideOffset={10} 
                collisionPadding={10}
                onInteractOutside={() => { setOpen(false); setMismatch(null); }}
            >

                {/* Mismatch Warning Overlay */}
                {mismatch && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[2rem] p-6 animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: mismatch === 'over' ? 'rgba(254,243,199,0.97)' : 'rgba(255,241,242,0.97)' }}>
                        <div className={`p-4 rounded-2xl mb-4 ${mismatch === 'over' ? 'bg-amber-100' : 'bg-rose-100'}`}>
                            {mismatch === 'over'
                                ? <TrendingUp className="h-10 w-10 text-amber-500" />
                                : <TrendingDown className="h-10 w-10 text-rose-500" />}
                        </div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${mismatch === 'over' ? 'text-amber-700' : 'text-rose-700'}`}>
                            {mismatch === 'over' ? 'Amount More Than Expected!' : 'Amount Less Than Expected!'}
                        </h3>
                        <p className={`text-xs font-bold text-center mb-1 ${mismatch === 'over' ? 'text-amber-600' : 'text-rose-600'}`}>
                            {mismatch === 'over'
                                ? `Collected Rs.${diff.toLocaleString()} extra.`
                                : `Short by Rs.${diff.toLocaleString()}.`}
                        </p>
                        <p className={`text-[11px] font-medium text-center mb-5 ${mismatch === 'over' ? 'text-amber-500' : 'text-rose-500'}`}>
                            {mismatch === 'over'
                                ? '⚠️ Please enter this as Extra Money in the trip log.'
                                : '⚠️ Please record this as Money Bal (pending) in the trip log.'}
                        </p>
                        <div className="flex gap-3 w-full">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl h-10 text-xs font-bold uppercase border-2"
                                onClick={() => setMismatch(null)}
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Go Back
                            </Button>
                            <Button
                                className={`flex-1 rounded-xl h-10 text-xs font-black uppercase ${mismatch === 'over' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'} text-white`}
                                onClick={handleForceApply}
                            >
                                Apply Anyway
                            </Button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-widest">Denomination Calculator</h4>
                        <p className="text-indigo-200 text-[10px] font-bold uppercase mt-0.5">Physical Cash Tally</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClear} className="text-indigo-200 hover:text-white hover:bg-white/10 h-8 rounded-xl text-xs font-bold uppercase tracking-wider">
                        Clear
                    </Button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {[500, 200, 100, 50, 20, 10, 5, 2, 1].map((denom) => {
                        const count = counts[denom];
                        const rowTotal = typeof count === 'number' ? count * denom : 0;
                        return (
                            <div key={denom} className="flex items-center gap-3">
                                <div className="w-16 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                                    <span className="text-[10px] text-slate-400 mr-1">Rs.</span>{denom}
                                </div>
                                <div className="text-slate-300 font-bold text-sm">X</div>
                                <Input
                                    type="number"
                                    placeholder="Qty"
                                    className="flex-1 h-10 rounded-xl border-slate-200 font-bold text-center bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    value={count}
                                    onChange={(e) => handleCountChange(denom, e.target.value)}
                                    min="0"
                                />
                                <div className="w-20 text-right font-black text-slate-800 text-sm">
                                    <span className="text-[10px] text-slate-400 mr-0.5 font-bold">Rs.</span>
                                    {rowTotal.toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Total */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Total</p>
                            <p className={`text-2xl font-black ${expectedAmount !== undefined && currentTotal !== expectedAmount ? (currentTotal > expectedAmount ? 'text-amber-500' : 'text-rose-500') : 'text-indigo-600'}`}>
                                Rs. {currentTotal.toLocaleString()}
                            </p>
                        </div>
                        {expectedAmount !== undefined && (
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expected</p>
                                <p className={`text-xs font-black ${currentTotal >= expectedAmount ? 'text-emerald-500' : 'text-rose-500'}`}>Rs. {expectedAmount.toLocaleString()}</p>
                                {currentTotal !== expectedAmount && currentTotal > 0 && (
                                    <p className={`text-[9px] font-black mt-0.5 flex items-center justify-end gap-1 ${currentTotal > expectedAmount ? 'text-amber-500' : 'text-rose-500'}`}>
                                        <AlertTriangle className="h-3 w-3" />
                                        {currentTotal > expectedAmount ? `+₹${(currentTotal - expectedAmount).toLocaleString()} Over` : `-₹${(expectedAmount - currentTotal).toLocaleString()} Short`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <Button
                        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-500/20 active-scale"
                        onClick={handleDone}
                    >
                        Done &amp; Apply Total
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
