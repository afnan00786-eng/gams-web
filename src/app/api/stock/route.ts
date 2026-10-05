import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stock - Get all stock
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        // The date for which we want closing stock
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);

        const allStockTypes = await prisma.stock.findMany();

        const enrichedStock = await Promise.all(allStockTypes.map(async (st) => {
            // 1. Get Closing Stock for targetDate
            let closing;
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            const isToday = !dateParam || new Date(dateParam).toDateString() === new Date().toDateString();

            if (isToday) {
                // For today, closing is live stock
                closing = st;
            } else {
                // For past date, closing is the last recorded state ON or BEFORE targetDate
                closing = await prisma.dailyStock.findFirst({
                    where: { type: st.type, date: { lte: targetDate } },
                    orderBy: { date: 'desc' }
                });
            }

            // 2. Get Opening Stock for targetDate (last recorded state STRICTLY BEFORE targetDate)
            const opening = await prisma.dailyStock.findFirst({
                where: { type: st.type, date: { lt: targetDate } },
                orderBy: { date: 'desc' }
            });

            return {
                ...st,
                full: closing?.full ?? st.full,
                empty: closing?.empty ?? st.empty,
                defective: closing?.defective ?? st.defective,
                openingFull: opening?.full ?? st.full,
                openingEmpty: opening?.empty ?? st.empty,
                openingDefective: opening?.defective ?? st.defective,
            };
        }));

        return NextResponse.json(enrichedStock);

    } catch (error) {
        console.error("Failed to fetch stock", error);
        return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
    }
}

// POST /api/stock - Update stock
// Frontend sends: { type: "Domestic", field: "full", value: 155 }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, field, value } = body;

        // Validate field
        if (!['full', 'empty', 'defective'].includes(field)) {
            return NextResponse.json({ error: "Invalid field" }, { status: 400 });
        }

        // Using transaction to ensure consistency & log history
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current stock
            const currentStock = await tx.stock.findUnique({ where: { type } });

            if (!currentStock) {
                throw new Error("Stock item not found.");
            }

            const oldValue = (currentStock as any)[field] || 0;
            const diff = value - oldValue;

            // 2. Update Stock Count
            const updatedStock = await tx.stock.update({
                where: { type },
                data: { [field]: value }
            });

            // 3. Upsert DailyStock
            await tx.dailyStock.upsert({
                where: {
                    date_type: {
                        date: today,
                        type: updatedStock.type
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

            // 4. Record Transaction for Movement Audit
            if (diff !== 0) {
                await tx.transaction.create({
                    data: {
                        type: diff > 0 ? "RECEIVE" : "SEND",
                        quantity: Math.abs(diff),
                        description: JSON.stringify([{
                            type: updatedStock.type,
                            fullChange: field === 'full' ? diff : 0,
                            emptyChange: field === 'empty' ? diff : 0,
                            defectiveChange: field === 'defective' ? diff : 0
                        }]),
                        date: new Date()
                    }
                });
            }

            return updatedStock;
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Stock Update Error:", error);
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }
}

// PUT /api/stock - Create new stock type
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { type, weight, date, isCylinder = true } = body;

        if (!type || !weight) {
            return NextResponse.json({ error: "Type and weight are required" }, { status: 400 });
        }

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);

        const newStock = await prisma.$transaction(async (tx) => {
            const created = await tx.stock.create({
                data: {
                    type,
                    weight,
                    full: 0,
                    empty: 0,
                    defective: 0,
                    isCylinder
                }
            });

            await tx.dailyStock.create({
                data: {
                    date: targetDate,
                    type: created.type,
                    weight: created.weight,
                    full: 0,
                    empty: 0,
                    defective: 0
                }
            });

            // Record Movement Audit Transaction for New Type Deployment
            await tx.transaction.create({
                data: {
                    type: 'CREATE',
                    quantity: 0,
                    description: JSON.stringify([{
                        type: created.type,
                        fullChange: 0,
                        emptyChange: 0,
                        defectiveChange: 0
                    }]),
                    date: new Date()
                }
            });

            return created;
        });

        return NextResponse.json(newStock);
    } catch (error) {
        console.error("Add Stock Error:", error);
        return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
    }
}

// PATCH /api/stock - Bulk update stock (Load Receive/Sending)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();

        if (body.action === 'edit') {
            const { oldType, newType, newWeight, newIsCylinder } = body;

            if (!oldType || !newType || !newWeight) {
                return NextResponse.json({ error: "Missing required fields for edit" }, { status: 400 });
            }

            const result = await prisma.$transaction(async (tx) => {
                const stockItem = await tx.stock.findUnique({ where: { type: oldType } });
                if (!stockItem) throw new Error("Stock item not found");

                // Update base stock table
                const updatedStock = await tx.stock.update({
                    where: { type: oldType },
                    data: {
                        type: newType,
                        weight: newWeight,
                        isCylinder: Boolean(newIsCylinder)
                    }
                });

                // Update all historical records referencing this type
                await tx.dailyStock.updateMany({
                    where: { type: oldType },
                    data: {
                        type: newType,
                        weight: newWeight
                    }
                });

                return updatedStock;
            });

            return NextResponse.json(result);
        }

        const { updates, date, isUndo } = body;

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: "Updates must be an array" }, { status: 400 });
        }

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const isPastDate = targetDate.getTime() !== today.getTime();

        const result = await prisma.$transaction(async (tx) => {
            if (isPastDate) {
                // Apply the delta to the historical record, all subsequent historical records, and the live stock
                const historicalUpdates = await Promise.all(
                    updates.map(async (update) => {
                        // 1. Ensure a record exists for targetDate (just in case they didn't have one that day)
                        const existingTargetDate = await tx.dailyStock.findUnique({
                            where: { date_type: { date: targetDate, type: update.type } }
                        });

                        if (!existingTargetDate) {
                            const liveStock = await tx.stock.findUnique({ where: { type: update.type } });
                            await tx.dailyStock.create({
                                data: {
                                    date: targetDate,
                                    type: update.type,
                                    weight: liveStock?.weight || "Unknown",
                                    full: 0,
                                    empty: 0,
                                    defective: 0
                                }
                            });
                        }

                        // 2. Propagate updates to all DailyStock records from targetDate up to today
                        await tx.dailyStock.updateMany({
                            where: {
                                type: update.type,
                                date: {
                                    gte: targetDate,
                                    lte: today
                                }
                            },
                            data: {
                                full: { increment: update.fullChange || 0 },
                                empty: { increment: update.emptyChange || 0 },
                                defective: { increment: update.defectiveChange || 0 }
                            }
                        });

                        // 3. Apply the exact same delta to today's live stock table
                        return tx.stock.update({
                            where: { type: update.type },
                            data: {
                                full: { increment: update.fullChange || 0 },
                                empty: { increment: update.emptyChange || 0 },
                                defective: { increment: update.defectiveChange || 0 }
                            }
                        });
                    })
                );
                const updatedStockItems = historicalUpdates;
            } else {
                // 1. Update live stock (Today)
                const updatedLiveStock = await Promise.all(
                    updates.map((update) =>
                        tx.stock.update({
                            where: { type: update.type },
                            data: {
                                full: { increment: update.fullChange || 0 },
                                empty: { increment: update.emptyChange || 0 },
                                defective: { increment: update.defectiveChange || 0 }
                            }
                        })
                    )
                );

                // 2. Upsert DailyStock to keep today's end-of-day snapshot in sync
                await Promise.all(
                    updatedLiveStock.map((stockItem) =>
                        tx.dailyStock.upsert({
                            where: {
                                date_type: {
                                    date: today,
                                    type: stockItem.type
                                }
                            },
                            update: {
                                full: stockItem.full,
                                empty: stockItem.empty,
                                defective: stockItem.defective
                            },
                            create: {
                                date: today,
                                type: stockItem.type,
                                weight: stockItem.weight,
                                full: stockItem.full,
                                empty: stockItem.empty,
                                defective: stockItem.defective
                            }
                        })
                    )
                );
            }

            // Always record Transaction log for Movement Audit
            const isUndo = body.isUndo || false;
            const actionType = isUndo ? "UNDO" : (updates.some(u => (u.fullChange || 0) > 0 || (u.emptyChange || 0) > 0) ? "RECEIVE" : "SEND");
            const totalQty = updates.reduce((acc, u) => acc + (Math.abs(u.fullChange || 0) + Math.abs(u.emptyChange || 0) + Math.abs(u.defectiveChange || 0)), 0);

            await tx.transaction.create({
                data: {
                    type: actionType,
                    quantity: totalQty,
                    description: JSON.stringify(updates),
                    date: targetDate || new Date()
                }
            });

            return { success: true };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Bulk Stock Update Error:", error);
        return NextResponse.json({ error: "Failed to bulk update stock" }, { status: 500 });
    }
}

// DELETE /api/stock?id=<type>
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("id");

        if (!type) {
            return NextResponse.json({ error: "Stock type is required" }, { status: 400 });
        }

        // Transaction to delete from both tables
        const result = await prisma.$transaction(async (tx) => {
            // Check if stock exists
            const existingStock = await tx.stock.findUnique({ where: { type } });
            if (!existingStock) {
                throw new Error("Stock item not found");
            }

            // 1. Delete all historical daily records first due to foreign keys / cascading safety
            await tx.dailyStock.deleteMany({
                where: { type }
            });

            // 2. Delete main stock item
            const deletedStock = await tx.stock.delete({
                where: { type }
            });

            return deletedStock;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Delete Stock Error:", error);
        return NextResponse.json({ error: "Failed to delete stock" }, { status: 500 });
    }
}
