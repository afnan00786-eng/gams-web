"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { 
    PlusCircle, 
    MapPin, 
    ClipboardList, 
    AlertTriangle, 
    PhoneCall, 
    MessageCircle, 
    CheckCircle2, 
    XCircle,
    ShoppingCart,
    ChevronLeft,
    Filter,
    ChevronDown,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionGuard } from "@/components/auth/SectionGuard";
import { offlineFetch } from "@/lib/offlineFetch";

// Types
interface Area {
    id: string;
    name: string;
    hawker: string;
}

interface Booking {
    id: string;
    areaId?: string; // For Area Bookings
    priority?: "Normal" | "Urgent"; // For Area Bookings
    name?: string; // For Direct Orders
    date?: string; // For Direct Orders
    cylinders?: number; // For Direct Orders
    isDirectOrder?: boolean;
    address: string;
    mobile: string;
    timestamp: number;
    updatedAt?: number;
    status: "UD" | "Done" | "NR";
}

export default function OfflineBookingPage() {
    const router = useRouter();

    // State
    const [areas, setAreas] = useState<Area[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [systemHawkers, setSystemHawkers] = useState<{id: string, name: string}[]>([]);

    // Initial Load from localStorage
    useEffect(() => {
        const savedAreas = localStorage.getItem("offline_booking_areas");
        const savedBookings = localStorage.getItem("offline_booking_orders");
        const savedHawkers = localStorage.getItem("offline_booking_hawkers");
        if (savedAreas) setAreas(JSON.parse(savedAreas));
        if (savedBookings) setBookings(JSON.parse(savedBookings));
        if (savedHawkers) setSystemHawkers(JSON.parse(savedHawkers));
        setIsLoaded(true);

        // Fetch latest hawkers from DB
        fetch("/api/employees")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const hawkers = data
                        .filter(e => e.role === 'HAWKER' || e.role === 'Hawker')
                        .map(h => ({ id: h.id, name: h.name }));
                    setSystemHawkers(hawkers);
                    localStorage.setItem("offline_booking_hawkers", JSON.stringify(hawkers));
                }
            })
            .catch(err => console.log("Offline or failed to fetch hawkers", err));
    }, []);

    // Sync from remote DB after offline load
    useEffect(() => {
        if (!isLoaded) return;
        const fetchRemoteData = async () => {
            try {
                const resAreas = await offlineFetch('/api/offline-areas');
                if (resAreas.ok) {
                    const dataAreas = await resAreas.json();
                    if (Array.isArray(dataAreas) && dataAreas.length > 0) setAreas(dataAreas);
                }
                const resBookings = await offlineFetch('/api/offline-bookings');
                if (resBookings.ok) {
                    const dataBookings = await resBookings.json();
                    if (Array.isArray(dataBookings) && dataBookings.length > 0) setBookings(dataBookings);
                }
            } catch (e) {
                console.error("Offline: Using local storage");
            }
        };
        fetchRemoteData();
    }, [isLoaded]);

    // Save state changes to localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("offline_booking_areas", JSON.stringify(areas));
            localStorage.setItem("offline_booking_orders", JSON.stringify(bookings));
        }
    }, [areas, bookings, isLoaded]);

    // Filter State
    const [filterAreaId, setFilterAreaId] = useState(""); // "" = All
    const [filterAddress, setFilterAddress] = useState("");
    const [activeFilter, setActiveFilter] = useState<"area" | "address" | null>(null);

    // Mobile Autocomplete State
    const [mobileMatches, setMobileMatches] = useState<Booking[]>([]);

    // Modal States
    const [isAddAreaOpen, setIsAddAreaOpen] = useState(false);
    const [isRemoveAreaOpen, setIsRemoveAreaOpen] = useState(false);
    const [areaToRemove, setAreaToRemove] = useState<string>("");
    const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
    const [isBookOrderOpen, setIsBookOrderOpen] = useState(false);

    // Form States
    const [newArea, setNewArea] = useState({ name: "", hawker: "" });
    const [newBooking, setNewBooking] = useState({
        areaId: "",
        priority: "Normal" as "Normal" | "Urgent",
        address: "",
        mobile: "",
    });
    
    const [newDirectOrder, setNewDirectOrder] = useState({
        date: new Date().toISOString().split("T")[0],
        name: "",
        address: "",
        mobile: "",
        cylinders: 1,
    });

    // Action Modal States
    const [confirmAction, setConfirmAction] = useState<{ type: "Done" | "NR", bookingId: string } | null>(null);

    const handleConfirmAction = () => {
        if (!confirmAction) return;
        setBookings(prev => prev.map(b => b.id === confirmAction.bookingId ? { ...b, status: confirmAction.type, updatedAt: Date.now() } : b));
        toast.success(`Booking marked as ${confirmAction.type === "Done" ? "Delivered" : "Not Reachable"}`);
        
        offlineFetch('/api/offline-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: confirmAction.bookingId, status: confirmAction.type })
        }).catch(() => console.log('Status queued offline'));
        
        setConfirmAction(null);
    };

    // Handlers
    const handleRemoveArea = () => {
        if (!areaToRemove) return;
        const hasPending = bookings.some(b => b.areaId === areaToRemove && b.status === "UD");
        if (hasPending) {
            toast.error("Cannot remove area with pending bookings. Mark them done/NR first.");
            return;
        }
        setAreas(prev => prev.filter(a => a.id !== areaToRemove));
        setAreaToRemove("");
        setIsRemoveAreaOpen(false);
        toast.success("Area removed successfully!");

        offlineFetch('/api/offline-areas', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: areaToRemove })
        }).catch(() => console.log('Delete queued offline'));
    };

    const handleSaveArea = () => {
        if (!newArea.name.trim() || !newArea.hawker.trim()) {
            toast.error("Please fill in both Area and Hawker names.");
            return;
        }

        const area: Area = {
            id: Date.now().toString(),
            name: newArea.name.trim(),
            hawker: newArea.hawker.trim(),
        };

        setAreas((prev) => [...prev, area]);
        setNewArea({ name: "", hawker: "" });
        setIsAddAreaOpen(false);
        toast.success("Area added successfully!");

        offlineFetch('/api/offline-areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(area)
        }).catch(() => console.log('Saved offline'));
    };

    const handleSaveBooking = () => {
        if (!newBooking.areaId) {
            toast.error("Please select an Area.");
            return;
        }
        if (!newBooking.address.trim()) {
            toast.error("Please enter the delivery address.");
            return;
        }

        const booking: Booking = {
            id: Date.now().toString(),
            areaId: newBooking.areaId,
            priority: newBooking.priority,
            address: newBooking.address.trim(),
            mobile: newBooking.mobile.trim(),
            timestamp: Date.now(),
            updatedAt: Date.now(),
            status: "UD",
        };

        setBookings((prev) => [...prev, booking]);
        handleClearBooking();
        setIsAddBookingOpen(false);
        toast.success("Booking added successfully!");

        offlineFetch('/api/offline-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        }).catch(() => console.log('Saved offline'));
    };

    const handleClearBooking = () => {
        setNewBooking({
            areaId: "",
            priority: "Normal",
            address: "",
            mobile: "",
        });
    };

    const handleSaveDirectOrder = () => {
        if (!newDirectOrder.name.trim() || !newDirectOrder.address.trim()) {
            toast.error("Please fill in Name and Address.");
            return;
        }

        const booking: Booking = {
            id: Date.now().toString(),
            name: newDirectOrder.name.trim(),
            date: newDirectOrder.date,
            address: newDirectOrder.address.trim(),
            mobile: newDirectOrder.mobile.trim(),
            cylinders: newDirectOrder.cylinders,
            isDirectOrder: true,
            timestamp: Date.now(),
            updatedAt: Date.now(),
            status: "UD",
        };

        setBookings((prev) => [...prev, booking]);
        setNewDirectOrder({ date: new Date().toISOString().split("T")[0], name: "", address: "", mobile: "", cylinders: 1 });
        setIsBookOrderOpen(false);
        toast.success("Order booked successfully!");

        offlineFetch('/api/offline-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        }).catch(() => console.log('Saved offline'));
    };

    const todayStr = new Date().toDateString();
    
    // Calculate available addresses based on current area filter + date filter
    const uniqueAddresses = Array.from(new Set(
        bookings.filter(b => {
            const dateOk = b.status === "UD" || new Date(b.updatedAt || b.timestamp).toDateString() === todayStr;
            if (!dateOk) return false;
            if (filterAreaId && b.areaId !== filterAreaId) return false;
            return true;
        }).map(b => b.address)
    )).filter(Boolean).sort();
    
    const displayedBookings = [...bookings]
        .filter(b => {
            // Date filter
            const dateOk = b.status === "UD" || new Date(b.updatedAt || b.timestamp).toDateString() === todayStr;
            if (!dateOk) return false;
            // Area dropdown filter
            if (filterAreaId) {
                if (b.areaId !== filterAreaId) return false;
            }
            // Address text filter
            if (filterAddress.trim()) {
                if (!b.address.toLowerCase().includes(filterAddress.toLowerCase())) return false;
            }
            return true;
        })
        .sort((a, b) => {
            // Priority 1: Urgent bookings at the very top
            if (a.priority === "Urgent" && b.priority !== "Urgent") return -1;
            if (a.priority !== "Urgent" && b.priority === "Urgent") return 1;
            
            // Priority 2: Undelivered (UD) bookings
            if (a.status === "UD" && b.status !== "UD") return -1;
            if (a.status !== "UD" && b.status === "UD") return 1;
            
            // Priority 3: Timestamp
            return a.timestamp - b.timestamp;
        });

    return (
        <SectionGuard section="BOOKING">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header section matches the aesthetic of the app */}
            <div className="flex items-start gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="h-10 w-10 rounded-2xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm border border-slate-200 transition-colors shrink-0"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter italic uppercase text-slate-900 leading-none truncate">
                            Refill &amp; Booking
                        </h1>
                    </div>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em] text-indigo-500 mt-2 ml-1">
                        Offline Booking Management
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden rounded-[2.5rem] border-none shadow-2xl glass-card relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />

                <CardContent className="p-8 space-y-8 mt-4">
                    {/* Top Action Bar */}
                    <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                        {/* Buttons Row */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            {/* Main Button Cluster Match Sketch */}
                            <div className="flex-1 flex gap-3 h-48 md:h-40">
                                {/* Large Add Booking Button */}
                                <Button
                                    onClick={() => setIsAddBookingOpen(true)}
                                    className="flex-[2] h-full rounded-[2rem] font-black text-2xl shadow-2xl shadow-amber-400/30 bg-amber-400 hover:bg-amber-500 text-slate-900 border-b-8 border-amber-600 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center gap-2 group"
                                >
                                    <ClipboardList className="h-10 w-10 group-hover:scale-110 transition-transform" />
                                    <span>Add Booking</span>
                                </Button>

                                {/* Stacked Side Buttons */}
                                <div className="flex-1 flex flex-col gap-2">
                                    <Button
                                        onClick={() => setIsAddAreaOpen(true)}
                                        className="flex-1 rounded-2xl font-black text-xs shadow-md shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center py-2"
                                    >
                                        <PlusCircle className="h-4 w-4 mb-1" />
                                        <span>Add Area</span>
                                    </Button>
                                    <Button
                                        onClick={() => { setAreaToRemove(""); setIsRemoveAreaOpen(true); }}
                                        className="flex-1 rounded-2xl font-black text-xs shadow-md shadow-rose-100 bg-rose-500 hover:bg-rose-600 text-white border-b-4 border-rose-700 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center py-2"
                                        disabled={areas.length === 0}
                                    >
                                        <Trash2 className="h-4 w-4 mb-1" />
                                        <span>Remove</span>
                                    </Button>
                                    <Button
                                        onClick={() => setIsBookOrderOpen(true)}
                                        className="flex-1 rounded-2xl font-black text-xs shadow-md shadow-emerald-100 bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center py-2"
                                    >
                                        <ShoppingCart className="h-4 w-4 mb-1" />
                                        <span>Book</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Pending Count Section */}
                            <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] shadow-xl border-2 border-slate-100 justify-center min-w-[120px]">
                                <span className="text-6xl font-black text-rose-500 tracking-tighter tabular-nums drop-shadow-sm">
                                    {bookings.filter(b => b.status === "UD").length}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 leading-tight">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Orders Table */}
                    <div className="space-y-4">
                        <h3 className="font-black uppercase tracking-tight text-slate-800 flex items-center gap-2 ml-2">
                            <MapPin className="h-5 w-5 text-indigo-500" />
                            {filterAreaId ? `${areas.find(a => a.id === filterAreaId)?.name ?? ''} Orders` : 'All Pending Orders'}
                        </h3>

                        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-1 sm:p-0">
                            {/* Table View (all screen sizes) */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                Sr. no.
                                            </th>
                                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            className={`flex items-center gap-1 hover:text-indigo-300 transition-colors ${filterAreaId ? 'text-indigo-300' : ''}`}
                                                        >
                                                            Party / Area
                                                            <Filter className="h-3 w-3 ml-0.5" />
                                                            {filterAreaId && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="start" className="w-48 p-2 rounded-xl shadow-xl shadow-slate-900/10 border-slate-200" sideOffset={8}>
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => setFilterAreaId('')}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                    filterAreaId === '' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                All Areas
                                                            </button>
                                                            {areas.map(area => (
                                                                <button
                                                                    key={area.id}
                                                                    onClick={() => setFilterAreaId(area.id)}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                        filterAreaId === area.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                                                    }`}
                                                                >
                                                                    {area.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </th>
                                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            className={`flex items-center gap-1 hover:text-indigo-300 transition-colors ${filterAddress ? 'text-indigo-300' : ''}`}
                                                        >
                                                            Address
                                                            <Filter className="h-3 w-3 ml-0.5" />
                                                            {filterAddress && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="start" className="w-48 p-2 rounded-xl shadow-xl shadow-slate-900/10 border-slate-200" sideOffset={8}>
                                                        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                                                            <button
                                                                onClick={() => setFilterAddress('')}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                    filterAddress === '' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                All Addresses
                                                            </button>
                                                            {uniqueAddresses.map(address => (
                                                                <button
                                                                    key={address}
                                                                    onClick={() => setFilterAddress(address)}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                                        filterAddress === address ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                                                    }`}
                                                                >
                                                                    {address}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </th>
                                            <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                Mob. no.
                                            </th>
                                            <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedBookings.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"
                                                >
                                                    No orders for today
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedBookings.map((booking, index) => {
                                                const area = booking.areaId ? areas.find((a) => a.id === booking.areaId) : null;
                                                const isUrgent = booking.priority === "Urgent";
                                                
                                                return (
                                                    <tr
                                                        key={booking.id}
                                                        className={cn(
                                                            "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                                                            isUrgent && booking.status === "UD" ? "bg-orange-50 border-orange-100 shadow-sm" : "bg-white",
                                                            booking.status === "Done" && "opacity-60 bg-slate-50"
                                                        )}
                                                    >
                                                        <td className="px-4 py-4 font-black text-slate-500">
                                                            #{index + 1}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {booking.isDirectOrder ? (
                                                                <>
                                                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none px-1 h-4 tracking-widest uppercase text-[8px] font-black shrink-0">DIR</Badge>
                                                                        {booking.name || "Unknown"}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">
                                                                        Date: {booking.date}
                                                                        {booking.cylinders && booking.cylinders > 0 ? (
                                                                            <span className="ml-2 text-indigo-500 font-black">• {booking.cylinders} Cyl.</span>
                                                                        ) : null}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="font-bold text-slate-800">
                                                                        {area?.name || "Unknown"}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                        {area?.hawker || "Unknown Hawker"}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-start gap-2 max-w-xs">
                                                                {isUrgent && (
                                                                    <Badge className="bg-orange-500 text-white border-none h-5 px-1 tracking-widest uppercase text-[9px] font-black shrink-0 mt-0.5 shadow-sm shadow-orange-200">
                                                                        HIGHLIGHT URGENT
                                                                    </Badge>
                                                                )}
                                                                <span className={cn("text-slate-700 font-medium line-clamp-2", booking.status === "Done" && "line-through")} title={booking.address}>
                                                                    {booking.address}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {booking.mobile ? (
                                                                <div className="flex flex-col gap-2 items-start">
                                                                    <span className="font-bold text-slate-700 tracking-wide">{booking.mobile}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <a 
                                                                            href={`tel:${booking.mobile}`}
                                                                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors text-[10px] uppercase font-black tracking-widest"
                                                                        >
                                                                            <PhoneCall className="h-3.5 w-3.5" />
                                                                            Call
                                                                        </a>
                                                                        <a 
                                                                            href={`https://wa.me/91${booking.mobile}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md transition-colors text-[10px] uppercase font-black tracking-widest"
                                                                        >
                                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                                            WhatsApp
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 italic font-medium">Not provided</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            {booking.status === "UD" ? (
                                                                <div className="flex flex-col items-center justify-center gap-2">
                                                                    <Button 
                                                                        size="sm" 
                                                                        onClick={() => setConfirmAction({ type: "Done", bookingId: booking.id })}
                                                                        className="h-8 w-[80px] bg-emerald-500 hover:bg-emerald-600 font-black tracking-widest text-[10px] uppercase rounded-lg shadow shadow-emerald-200"
                                                                    >
                                                                        Done
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        onClick={() => setConfirmAction({ type: "NR", bookingId: booking.id })}
                                                                        className="h-8 w-[80px] border-rose-200 text-rose-600 hover:bg-rose-50 font-black tracking-widest text-[10px] uppercase rounded-lg"
                                                                    >
                                                                        NR
                                                                    </Button>
                                                                </div>
                                                            ) : booking.status === "Done" ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 uppercase tracking-widest text-[9px] font-black border-none">
                                                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Delivered
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-widest text-[9px] font-black">
                                                                    <XCircle className="mr-1 h-3 w-3" /> Not Reachable
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* Modal: Remove Area */}
            <Dialog open={isRemoveAreaOpen} onOpenChange={setIsRemoveAreaOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                            <Trash2 className="h-6 w-6 text-rose-500" />
                            Remove Area
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4 pb-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Select Area to Remove</Label>
                            <Select value={areaToRemove} onValueChange={setAreaToRemove}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold text-slate-700">
                                    <SelectValue placeholder="Choose an area..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                    {areas.map((a) => (
                                        <SelectItem key={a.id} value={a.id} className="font-bold cursor-pointer rounded-lg m-1">
                                            {a.name} <span className="text-slate-400 font-normal ml-1">({a.hawker})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {areaToRemove && bookings.some(b => b.areaId === areaToRemove && b.status === "UD") && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                                <p className="text-xs font-bold text-rose-600">This area has pending bookings. Mark them done/NR first.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 mt-2">
                        <Button variant="outline" onClick={() => setIsRemoveAreaOpen(false)} className="rounded-xl font-bold border-slate-200">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRemoveArea}
                            disabled={!areaToRemove}
                            className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white border-b-4 border-rose-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg shadow-rose-200"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Area */}
            <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                            <PlusCircle className="h-6 w-6 text-indigo-500" />
                            Add Area
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4 pb-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Area</Label>
                            <Input
                                value={newArea.name}
                                onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                                placeholder="E.g., Sector 15"
                                className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hawker</Label>
                            {systemHawkers.length > 0 ? (
                                <Select 
                                    value={newArea.hawker} 
                                    onValueChange={(val) => setNewArea({ ...newArea, hawker: val })}
                                >
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold text-slate-700">
                                        <SelectValue placeholder="Select existing Hawker" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl">
                                        {systemHawkers.map((h) => (
                                            <SelectItem key={h.id} value={h.name} className="font-bold cursor-pointer rounded-lg m-1">
                                                {h.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={newArea.hawker}
                                    onChange={(e) => setNewArea({ ...newArea, hawker: e.target.value })}
                                    placeholder="E.g., Ramesh"
                                    className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsAddAreaOpen(false)}
                            className="rounded-xl font-bold uppercase tracking-widest text-xs h-12"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveArea}
                            className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Save Area
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Booking Flash Card */}
            <Dialog open={isAddBookingOpen} onOpenChange={setIsAddBookingOpen}>
                <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-transparent">
                    <div className="bg-slate-900 text-white p-6 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-6 w-6 text-amber-400" />
                                Add Booking
                            </div>
                            {mobileMatches.some(m => m.status === 'UD' && m.priority !== 'Urgent') && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const matchToHighlight = mobileMatches.find(m => m.status === 'UD' && m.priority !== 'Urgent');
                                        if (!matchToHighlight) return;
                                        setBookings(prev => prev.map(b => b.id === matchToHighlight.id ? { ...b, priority: 'Urgent' } : b));
                                        toast.success('Existing order highlighted as URGENT! ⚡');
                                        setMobileMatches([]);
                                        setNewBooking(prev => ({ ...prev, mobile: '' }));
                                        setIsAddBookingOpen(false);
                                        
                                        fetch('/api/offline-bookings', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: matchToHighlight.id, priority: 'Urgent' })
                                        }).catch(console.error);
                                    }}
                                    className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-black not-italic tracking-widest transition-all hover:bg-orange-600 animate-pulse shadow-lg shadow-orange-500/30 flex items-center gap-1"
                                >
                                    Highlight ⚡
                                </button>
                            )}
                        </DialogTitle>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            New area booking order
                        </p>
                    </div>
                    <div className="bg-white p-6 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Area Dropdown</Label>
                            <Select 
                                value={newBooking.areaId} 
                                onValueChange={(val) => setNewBooking({ ...newBooking, areaId: val })}
                            >
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold text-slate-700">
                                    <SelectValue placeholder={areas.length === 0 ? "No areas added yet" : "Select previously added area"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                    {areas.map((area) => (
                                        <SelectItem key={area.id} value={area.id} className="font-bold cursor-pointer rounded-lg m-1">
                                            {area.name} <span className="text-slate-400 font-normal text-xs ml-2">({area.hawker})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {areas.length === 0 && (
                                <p className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-1 ml-1">
                                    <AlertTriangle className="h-3 w-3" /> Please Add Area first
                                </p>
                            )}
                        </div>

                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                            <RadioGroup 
                                value={newBooking.priority} 
                                onValueChange={(val) => setNewBooking({ ...newBooking, priority: val as "Normal" | "Urgent" })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Normal" id="r1" className="border-indigo-400 text-indigo-600" />
                                    <Label htmlFor="r1" className="font-bold text-slate-700 cursor-pointer">Normal</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Urgent" id="r2" className="border-rose-400 text-rose-500" />
                                    <Label htmlFor="r2" className="font-bold text-rose-600 cursor-pointer">Urgent</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address</Label>
                            <Textarea
                                value={newBooking.address}
                                onChange={(e) => setNewBooking({ ...newBooking, address: e.target.value })}
                                placeholder="Enter full address details..."
                                className="min-h-[80px] bg-slate-50 border-slate-200 shadow-inner rounded-xl font-medium resize-none"
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mob. no. (Optional)</Label>
                            <Input
                                type="tel"
                                value={newBooking.mobile}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d+]/g, '').slice(0, 14);
                                    setNewBooking({ ...newBooking, mobile: val });
                                    // Autocomplete: only show UNDELIVERED bookings with same mobile
                                    if (val.length >= 5) {
                                        const matches = bookings.filter(b => b.mobile && b.mobile.includes(val) && b.status === "UD");
                                        setMobileMatches(matches);
                                    } else {
                                        setMobileMatches([]);
                                    }
                                }}
                                onPaste={(e) => {
                                    // Handle paste separately to allow + and trigger lookup
                                    setTimeout(() => {
                                        const val = e.currentTarget.value.replace(/[^\d+]/g, '').slice(0, 14);
                                        setNewBooking(prev => ({ ...prev, mobile: val }));
                                        if (val.length >= 5) {
                                            const matches = bookings.filter(b => b.mobile && b.mobile.includes(val) && b.status === "UD");
                                            setMobileMatches(matches);
                                        }
                                    }, 0);
                                }}
                                maxLength={14}
                                placeholder="E.g., 9876543210"
                                className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                            />
                            {/* Mobile Autocomplete Dropdown */}
                            {mobileMatches.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Previous entries with this number</p>
                                    </div>
                                    {mobileMatches.slice(0, 4).map(match => {
                                        const matchArea = match.areaId ? areas.find(a => a.id === match.areaId) : null;
                                        return (
                                            <button
                                                key={match.id}
                                                type="button"
                                                onClick={() => {
                                                    setNewBooking(prev => ({
                                                        ...prev,
                                                        mobile: match.mobile,
                                                        address: match.address,
                                                        areaId: match.areaId || prev.areaId,
                                                    }));
                                                    setMobileMatches([]);
                                                }}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800">{match.address}</p>
                                                        <p className="text-[10px] text-indigo-500 font-bold">{matchArea?.name || match.name || "Direct Order"}</p>
                                                    </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                                        match.status === 'Done' ? 'bg-emerald-100 text-emerald-700' :
                                                        match.status === 'NR' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>{match.status === 'Done' ? 'Delivered' : match.status === 'NR' ? 'NR' : 'Pending'}</span>
                                                </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsAddBookingOpen(false)}
                                className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs h-12 border-slate-200 hover:bg-slate-100 text-slate-600"
                            >
                                Abort
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={handleClearBooking}
                                className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs h-12 border-amber-200 hover:bg-amber-50 text-amber-600"
                            >
                                Clear
                            </Button>
                            <Button 
                                onClick={handleSaveBooking}
                                disabled={areas.length === 0}
                                className="flex-[2] rounded-xl font-black uppercase tracking-widest text-sm h-12 bg-amber-400 hover:bg-amber-500 text-amber-950 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                            >
                                Save Booking
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Direct Book Order */}
            <Dialog open={isBookOrderOpen} onOpenChange={setIsBookOrderOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-transparent">
                    <div className="bg-slate-900 text-white p-6 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6 text-emerald-400" />
                            Book Order
                        </DialogTitle>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Direct independent order
                        </p>
                    </div>
                    <div className="bg-white p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Date</Label>
                                <Input
                                    type="date"
                                    value={newDirectOrder.date}
                                    onChange={(e) => setNewDirectOrder({ ...newDirectOrder, date: e.target.value })}
                                    className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cylinders</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={newDirectOrder.cylinders}
                                    onChange={(e) => setNewDirectOrder({ ...newDirectOrder, cylinders: parseInt(e.target.value) || 1 })}
                                    className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Name</Label>
                            <Input
                                type="text"
                                value={newDirectOrder.name}
                                onChange={(e) => setNewDirectOrder({ ...newDirectOrder, name: e.target.value })}
                                placeholder="Customer Name"
                                className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address</Label>
                            <Textarea
                                value={newDirectOrder.address}
                                onChange={(e) => setNewDirectOrder({ ...newDirectOrder, address: e.target.value })}
                                placeholder="Enter home/delivery address..."
                                className="min-h-[80px] bg-slate-50 border-slate-200 shadow-inner rounded-xl font-medium resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mob. no.</Label>
                            <Input
                                type="tel"
                                value={newDirectOrder.mobile}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d+]/g, '').slice(0, 14);
                                    setNewDirectOrder({ ...newDirectOrder, mobile: val });
                                }}
                                maxLength={13}
                                placeholder="E.g., 9876543210"
                                className="h-12 bg-slate-50 border-slate-200 shadow-inner rounded-xl font-bold"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsBookOrderOpen(false)}
                                className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs h-12 border-slate-200 hover:bg-slate-100 text-slate-600"
                            >
                                Back
                            </Button>
                            <Button 
                                onClick={handleSaveDirectOrder}
                                className="flex-[2] rounded-xl font-black uppercase tracking-widest text-sm h-12 bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all"
                            >
                                Submit
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Action Confirmation Modal */}
            <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="sm:max-w-sm rounded-[2rem] p-6 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className={cn(
                            "text-xl font-black italic uppercase tracking-tighter flex items-center gap-2",
                            confirmAction?.type === "Done" ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {confirmAction?.type === "Done" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                            Confirm Action
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed">
                            {confirmAction?.type === "Done" 
                                ? "Are you sure this refill has been successfully delivered to the customer?"
                                : "Are you sure the customer is not reachable right now?"}
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => setConfirmAction(null)}
                            className="rounded-xl font-bold uppercase tracking-widest text-xs h-12"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmAction}
                            className={cn(
                                "rounded-xl font-bold uppercase tracking-widest text-xs h-12 text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all",
                                confirmAction?.type === "Done" ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700" : "bg-rose-500 hover:bg-rose-600 border-rose-700"
                            )}
                        >
                            Yes, Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </SectionGuard>
    );
}
