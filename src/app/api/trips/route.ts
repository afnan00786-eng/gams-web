import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/trips - Get trips (optional date filtering)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        if (dateParam) {
            const targetDate = new Date(dateParam);

            // Create a window from (targetDate - 1 day) to (targetDate + 2 days)
            // This safely covers any timezone offset discrepancies (like IST +5:30)
            const startDate = new Date(targetDate);
            startDate.setUTCDate(startDate.getUTCDate() - 1);

            const endDate = new Date(targetDate);
            endDate.setUTCDate(endDate.getUTCDate() + 2);

            const trips = await prisma.trip.findMany({
                where: {
                    OR: [
                        { status: 'OUT' }, // Always fetch ALL active trips
                        {
                            timeOut: {
                                gte: startDate,
                                lt: endDate
                            }
                        },
                        {
                            timeIn: {
                                gte: startDate,
                                lt: endDate
                            }
                        }
                    ]
                },
                orderBy: { timeOut: 'desc' }
            });
            return NextResponse.json(trips);
        }

        const trips = await prisma.trip.findMany({
            orderBy: { timeOut: 'desc' }
        });
        return NextResponse.json(trips);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
    }
}

// POST /api/trips - Start a new trip
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, vehicleNo, driverName, destination, stockItems } = body;

        let parsedStockItems: any[] = [];
        if (typeof stockItems === 'string') {
            try { parsedStockItems = JSON.parse(stockItems); } catch (e) { }
        } else if (Array.isArray(stockItems)) {
            parsedStockItems = stockItems;
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Trip (preserve client id if provided, e.g. for offline sync continuity)
            const tripData: any = {
                vehicleNo,
                driverName,
                destination,
                stockItems: JSON.stringify(parsedStockItems),
                status: 'OUT'
            };
            if (id) {
                tripData.id = id;
            }

            const trip = await tx.trip.create({
                data: tripData
            });

            // 2. Reduce Stock for each item
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            for (const item of parsedStockItems) {
                if (item.type && item.quantity > 0) {
                    // Update live Stock
                    const updatedStock = await tx.stock.update({
                        where: { type: item.type },
                        data: { full: { decrement: item.quantity } }
                    });

                    // Update today's DailyStock closing balance to reflect the trip
                    await tx.dailyStock.upsert({
                        where: {
                            date_type: {
                                date: today,
                                type: item.type
                            }
                        },
                        update: {
                            full: updatedStock.full,
                            empty: updatedStock.empty,
                            defective: updatedStock.defective
                        },
                        create: {
                            date: today,
                            type: updatedStock.type,
                            weight: updatedStock.weight,
                            full: updatedStock.full,
                            empty: updatedStock.empty,
                            defective: updatedStock.defective
                        }
                    });
                }
            }

            // Record Movement Audit transaction for Trip dispatch
            const totalTripQty = parsedStockItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            if (totalTripQty > 0) {
                await tx.transaction.create({
                    data: {
                        type: 'SEND',
                        quantity: totalTripQty,
                        description: JSON.stringify(parsedStockItems.map((item: any) => ({
                            type: item.type,
                            fullChange: -(item.quantity || 0),
                            emptyChange: 0,
                            defectiveChange: 0
                        }))),
                        date: new Date()
                    }
                });
            }

            return trip;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Trip Start Error:", error);
        return NextResponse.json({ error: "Failed to start trip" }, { status: 500 });
    }
}

// PATCH /api/trips - Complete a trip
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, returnedItems = [], expenses = [] } = body;

        const result = await prisma.$transaction(async (tx) => {
            // Find trip: try exact id first, else fallback if offline/temp id
            let existingTrip = id ? await tx.trip.findUnique({ where: { id } }) : null;
            if (!existingTrip && id) {
                // Try finding by driverName / vehicleNo if temporary offline id was used
                existingTrip = await tx.trip.findFirst({
                    where: {
                        OR: [
                            { id },
                            { driverName: body.driverName || undefined, status: 'OUT' }
                        ]
                    },
                    orderBy: { timeOut: 'desc' }
                });
            }
            if (!existingTrip) {
                // Fallback to most recent active trip
                existingTrip = await tx.trip.findFirst({
                    where: { status: 'OUT' },
                    orderBy: { timeOut: 'desc' }
                });
            }

            if (!existingTrip) throw new Error("Trip not found");

            // If already completed (idempotent sync retry), return existing trip immediately
            if (existingTrip.status === 'COMPLETED') {
                return existingTrip;
            }

            const tripId = existingTrip.id;

            let prevItems: any[] = [];
            try {
                let parsed = JSON.parse(existingTrip.stockItems || "[]");
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) prevItems = parsed;
            } catch (e) { }

            const updatedItems = prevItems.map((p: any) => {
                const ret = returnedItems.find((r: any) => r.type === p.type);
                if (ret) {
                    return {
                        ...p,
                        inFull: ret.inFull,
                        inEmpty: ret.inEmpty,
                        inDefective: ret.inDefective,
                        inNc: ret.inNc,
                        inRefillRates: ret.inRefillRates,
                        inNcRates: ret.inNcRates,
                        inEmptyBal: ret.inEmptyBal,
                        inEmptyBalSource: ret.inEmptyBalSource,
                        inEmptyBalName: ret.inEmptyBalName,
                        inEmptyBalMobile: ret.inEmptyBalMobile,
                        inEmptyBalCustomerId: ret.inEmptyBalCustomerId,
                        inExtraEmpty: ret.inExtraEmpty,
                        inExtraEmptySource: ret.inExtraEmptySource,
                        inExtraEmptyName: ret.inExtraEmptyName,
                        inExtraEmptyMobile: ret.inExtraEmptyMobile,
                        inExtraEmptyCustomerId: ret.inExtraEmptyCustomerId,
                        hawkerTransfers: ret.hawkerTransfers
                    };
                }
                return p;
            });

            // Also include any items in returnedItems that were not in prevItems
            for (const ret of returnedItems) {
                if (!updatedItems.some((u: any) => u.type === ret.type)) {
                    updatedItems.push(ret);
                }
            }

            // 1. Update Trip
            const trip = await tx.trip.update({
                where: { id: tripId },
                data: {
                    status: 'COMPLETED',
                    timeIn: new Date(),
                    stockItems: JSON.stringify(updatedItems),
                    expenses: JSON.stringify(expenses || [])
                }
            });

            // Save expenses using raw SQL (safe even if Prisma client is stale)
            try {
                await tx.$executeRaw`UPDATE "Trip" SET "expenses" = ${JSON.stringify(expenses || [])} WHERE "id" = ${tripId}`;
            } catch (e) {
                // Silently skip if column issue
            }

            // 2. Update Stock (Add returned items)
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            for (const ret of returnedItems) {
                if (!ret || !ret.type) continue;
                const out = ret.out || 0;
                const full = ret.inFull || 0;
                const def = ret.inDefective || 0;
                const nc = ret.inNc || 0;
                const extra = ret.inExtraEmpty || 0;
                const bal = ret.inEmptyBal || 0;

                const stockType = await tx.stock.findUnique({ where: { type: ret.type } });
                const isCylinder = stockType?.isCylinder !== false;

                // Extract hawker transfer quantities for this item
                const transfers = ret.hawkerTransfers || [];
                const givenFilled = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                const takenFilled = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Filled').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                const givenEmpty = transfers.filter((t: any) => t.type === 'Given' && t.condition === 'Empty').reduce((s: number, t: any) => s + (t.qty || 0), 0);
                const takenEmpty = transfers.filter((t: any) => t.type === 'Taken' && t.condition === 'Empty').reduce((s: number, t: any) => s + (t.qty || 0), 0);

                // Required empties = what hawker's own customers owed back
                const requiredEmpty = Math.max(0, out - full - def - nc - givenFilled + takenFilled);
                const emptyReturnedToGodown = isCylinder ? (requiredEmpty + givenFilled - takenFilled + takenEmpty - givenEmpty + extra - bal) : 0;

                if (stockType) {
                    const updatedStock = await tx.stock.update({
                        where: { type: ret.type },
                        data: {
                            full: { increment: full },
                            empty: { increment: emptyReturnedToGodown },
                            defective: { increment: def }
                        }
                    });

                    await tx.dailyStock.upsert({
                        where: {
                            date_type: {
                                date: today,
                                type: ret.type
                            }
                        },
                        update: {
                            full: updatedStock.full,
                            empty: updatedStock.empty,
                            defective: updatedStock.defective
                        },
                        create: {
                            date: today,
                            type: updatedStock.type,
                            weight: updatedStock.weight,
                            full: updatedStock.full,
                            empty: updatedStock.empty,
                            defective: updatedStock.defective
                        }
                    });
                }

                // --- Handle Customer Transactions (Logistics) ---
                let shortageCustId = ret.inEmptyBalCustomerId;
                let extraCustId = ret.inExtraEmptyCustomerId;

                if (!shortageCustId && ret.inEmptyBalName && ret.inEmptyBal > 0) {
                    const cust = await getOrCreateCustomer(tx, existingTrip.driverName, ret.inEmptyBalName, ret.inEmptyBalMobile);
                    shortageCustId = cust?.id;
                }
                if (!extraCustId && ret.inExtraEmptyName && ret.inExtraEmpty > 0) {
                    const cust = await getOrCreateCustomer(tx, existingTrip.driverName, ret.inExtraEmptyName, ret.inExtraEmptyMobile);
                    extraCustId = cust?.id;
                }

                if (shortageCustId && ret.inEmptyBal > 0) {
                    try {
                        await tx.customerTransaction.create({
                            data: {
                                customerId: shortageCustId,
                                tripId,
                                type: 'GIVEN_FULL',
                                cylinders: ret.inEmptyBal,
                                note: `Shortage from Trip (${existingTrip.vehicleNo}) - ${ret.type}`
                            }
                        });
                        await tx.customer.update({
                            where: { id: shortageCustId },
                            data: { emptyBal: { increment: ret.inEmptyBal } }
                        });
                    } catch (e) {
                        console.warn("Non-fatal: customer shortage update failed:", e);
                    }
                }

                if (extraCustId && ret.inExtraEmpty > 0) {
                    try {
                        await tx.customerTransaction.create({
                            data: {
                                customerId: extraCustId,
                                tripId,
                                type: 'RECEIVED_EMPTY',
                                cylinders: ret.inExtraEmpty,
                                note: `Extra Empty from Trip (${existingTrip.vehicleNo}) - ${ret.type}`
                            }
                        });
                        await tx.customer.update({
                            where: { id: extraCustId },
                            data: { emptyBal: { decrement: ret.inExtraEmpty } }
                        });
                    } catch (e) {
                        console.warn("Non-fatal: customer extra empty update failed:", e);
                    }
                }

                // --- Handle Hawker Transfers ---
                const pendingTransfers = ret.hawkerTransfers || [];
                for (const t of pendingTransfers) {
                    if (t.isProcessed || !t.hawkerId || !t.qty || t.qty <= 0) continue;

                    try {
                        const receiverUser = await tx.user.findUnique({ where: { id: t.hawkerId } });
                        if (!receiverUser) continue;

                        let receiverTrip = await tx.trip.findFirst({
                            where: { driverName: receiverUser.name, status: 'OUT' },
                            orderBy: { timeOut: 'desc' }
                        });

                        if (!receiverTrip) {
                            receiverTrip = await tx.trip.create({
                                data: {
                                    driverName: receiverUser.name,
                                    vehicleNo: 'TRANSFER',
                                    destination: `Transfer from ${existingTrip.driverName}`,
                                    status: 'OUT',
                                    stockItems: JSON.stringify([{
                                        type: ret.type,
                                        quantity: 0,
                                        weight: '',
                                        isTransferTrip: true
                                    }])
                                }
                            });
                        }

                        let recItems: any[] = [];
                        try { recItems = JSON.parse(receiverTrip.stockItems || "[]"); } catch (e) { }

                        let foundItem = recItems.find((i: any) => i.type === ret.type);
                        if (!foundItem) {
                            foundItem = { type: ret.type, quantity: 0, weight: '', isTransferTrip: true };
                            recItems.push(foundItem);
                        }

                        if (t.type === 'Given') {
                            if (!foundItem.receivedTransfers) foundItem.receivedTransfers = [];
                            foundItem.receivedTransfers.push({
                                id: Date.now().toString() + Math.random().toString(36).substring(7),
                                from: existingTrip.driverName,
                                qty: t.qty,
                                type: ret.type,
                                condition: t.condition,
                                isConfirmed: false
                            });
                        }

                        await tx.trip.update({
                            where: { id: receiverTrip.id },
                            data: { stockItems: JSON.stringify(recItems) }
                        });
                    } catch (transferErr) {
                        console.warn("Non-fatal: transfer update failed:", transferErr);
                    }
                }
            }

            // --- Handle Financial Customer Transactions ---
            for (const exp of (expenses || [])) {
                let financialCustId = exp.customerId;
                if (!financialCustId && exp.name && exp.amount > 0) {
                    const cust = await getOrCreateCustomer(tx, existingTrip.driverName, exp.name, exp.mobile);
                    financialCustId = cust?.id;
                }

                if (financialCustId && exp.amount > 0) {
                    try {
                        if (exp.type === 'Money Bal') {
                            await tx.customerTransaction.create({
                                data: {
                                    customerId: financialCustId,
                                    tripId,
                                    type: 'CASH_DUE',
                                    amount: exp.amount,
                                    note: `Credit from Trip (${existingTrip.vehicleNo})`
                                }
                            });
                            await tx.customer.update({
                                where: { id: financialCustId },
                                data: { cashBal: { increment: exp.amount } }
                            });
                        } else if (exp.type === 'Extra Money') {
                            await tx.customerTransaction.create({
                                data: {
                                    customerId: financialCustId,
                                    tripId,
                                    type: 'CASH_PAYMENT',
                                    amount: exp.amount,
                                    note: `Payment from Trip (${existingTrip.vehicleNo}) - ${exp.name || 'Extra'}`
                                }
                            });
                            await tx.customer.update({
                                where: { id: financialCustId },
                                data: { cashBal: { decrement: exp.amount } }
                            });
                        }
                    } catch (finErr) {
                        console.warn("Non-fatal: financial transaction failed:", finErr);
                    }
                }
            }

            // Record Movement Audit transaction for Trip completion
            const returnItemLogs = (returnedItems || []).map((ret: any) => ({
                type: ret.type,
                fullChange: ret.inFull || 0,
                emptyChange: ret.inEmpty || 0,
                defectiveChange: ret.inDefective || 0
            })).filter((u: any) => u.fullChange > 0 || u.emptyChange > 0 || u.defectiveChange > 0);

            if (returnItemLogs.length > 0) {
                try {
                    const totalReturnQty = returnItemLogs.reduce((s: number, i: any) => s + i.fullChange + i.emptyChange + i.defectiveChange, 0);
                    await tx.transaction.create({
                        data: {
                            type: 'RECEIVE',
                            quantity: totalReturnQty,
                            description: JSON.stringify(returnItemLogs),
                            date: new Date()
                        }
                    });
                } catch (auditErr) {
                    console.warn("Non-fatal: movement audit failed:", auditErr);
                }
            }

            return trip;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Trip Complete Error:", error);
        return NextResponse.json({ error: "Failed to complete trip" }, { status: 500 });
    }
}
// DELETE /api/trips - Delete an active trip and restore stock
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const trip = await tx.trip.findUnique({ where: { id } });
            if (!trip) throw new Error("Trip not found");

            // Only restore stock if the trip was 'OUT' (effectively cancelled)
            // If it was already completed, stock has already been returned.
            // But usually we only want to delete active trips via this UI.
            if (trip.status === 'OUT') {
                let stockItems: any[] = [];
                try {
                    stockItems = JSON.parse(trip.stockItems || "[]");
                    if (typeof stockItems === 'string') stockItems = JSON.parse(stockItems);
                } catch (e) { }

                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                for (const item of stockItems) {
                    if (item.type && item.quantity > 0) {
                        // Restore live Stock
                        const updatedStock = await tx.stock.update({
                            where: { type: item.type },
                            data: { full: { increment: item.quantity } }
                        });

                        // Update today's DailyStock closing balance
                        await tx.dailyStock.upsert({
                            where: {
                                date_type: {
                                    date: today,
                                    type: item.type
                                }
                            },
                            update: {
                                full: updatedStock.full,
                                empty: updatedStock.empty,
                                defective: updatedStock.defective
                            },
                            create: {
                                date: today,
                                type: updatedStock.type,
                                weight: updatedStock.weight,
                                full: updatedStock.full,
                                empty: updatedStock.empty,
                                defective: updatedStock.defective
                            }
                        });
                    }
                }
            }

            // Finally, delete the trip record
            await tx.trip.delete({ where: { id } });
            return { message: "Trip deleted and stock restored" };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Trip Delete Error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete trip" }, { status: 500 });
    }
}
// PUT /api/trips - Update an existing active trip
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, vehicleNo, driverName, destination, stockItems } = body;

        let newStockItems: any[] = [];
        if (typeof stockItems === 'string') {
            try { newStockItems = JSON.parse(stockItems); } catch (e) { }
        } else if (Array.isArray(stockItems)) {
            newStockItems = stockItems;
        }

        const result = await prisma.$transaction(async (tx) => {
            const existingTrip = await tx.trip.findUnique({ where: { id } });
            if (!existingTrip) throw new Error("Trip not found");
            if (existingTrip.status !== 'OUT') throw new Error("Only active trips can be edited");

            let oldStockItems: any[] = [];
            try {
                oldStockItems = JSON.parse(existingTrip.stockItems || "[]");
                if (typeof oldStockItems === 'string') oldStockItems = JSON.parse(oldStockItems);
            } catch (e) { }

            // 1. Revert Old Stock
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            for (const item of oldStockItems) {
                if (item.type && item.quantity > 0) {
                    const updatedStock = await tx.stock.update({
                        where: { type: item.type },
                        data: { full: { increment: item.quantity } }
                    });

                    await tx.dailyStock.upsert({
                        where: { date_type: { date: today, type: item.type } },
                        update: { full: updatedStock.full },
                        create: { date: today, type: updatedStock.type, weight: updatedStock.weight, full: updatedStock.full, empty: updatedStock.empty, defective: updatedStock.defective }
                    });
                }
            }

            // 2. Apply New Stock
            for (const item of newStockItems) {
                if (item.type && item.quantity > 0) {
                    const updatedStock = await tx.stock.update({
                        where: { type: item.type },
                        data: { full: { decrement: item.quantity } }
                    });

                    await tx.dailyStock.upsert({
                        where: { date_type: { date: today, type: item.type } },
                        update: { full: updatedStock.full },
                        create: { date: today, type: updatedStock.type, weight: updatedStock.weight, full: updatedStock.full, empty: updatedStock.empty, defective: updatedStock.defective }
                    });
                }
            }

            // 3. Update Trip
            const updatedTrip = await tx.trip.update({
                where: { id },
                data: {
                    vehicleNo,
                    driverName,
                    destination,
                    stockItems: JSON.stringify(newStockItems)
                }
            });

            return updatedTrip;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Trip Update Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update trip" }, { status: 500 });
    }
}

/**
 * Helper to get or create a customer by name and mobile for a specific hawker (driver)
 */
async function getOrCreateCustomer(tx: any, driverName: string, name: string, mobile?: string) {
    try {
        const cleanDriver = driverName?.trim();
        // 1. Resolve user profile: first by name, else any hawker/staff role, else fallback
        let hawker = await tx.user.findFirst({
            where: { name: { equals: cleanDriver, mode: 'insensitive' } }
        });
        if (!hawker) {
            hawker = await tx.user.findFirst({
                where: { role: { in: ['HAWKER', 'STAFF', 'OFFICE_STAFF', 'MANAGER', 'MASTER'] } }
            });
        }
        if (!hawker) {
            hawker = await tx.user.findFirst();
        }
        if (!hawker) return null;

        const cleanCustName = name?.trim();
        if (!cleanCustName) return null;

        // 2. Look for existing customer
        let customer = await tx.customer.findFirst({
            where: {
                hawkerId: hawker.id,
                name: { equals: cleanCustName, mode: 'insensitive' },
            }
        });

        // 3. Create if not found
        if (!customer) {
            customer = await tx.customer.create({
                data: {
                    name: cleanCustName,
                    mobile: mobile?.trim() || null,
                    hawkerId: hawker.id,
                    emptyBal: 0,
                    cashBal: 0
                }
            });
        }

        return customer;
    } catch (e) {
        console.warn("Non-fatal getOrCreateCustomer error:", e);
        return null;
    }
}
