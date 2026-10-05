import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);

        const startDate = new Date(targetDate);
        startDate.setUTCDate(startDate.getUTCDate() - 1);

        const endDate = new Date(targetDate);
        endDate.setUTCDate(endDate.getUTCDate() + 2);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startDate, lt: endDate },
                isUndone: false
            },
            orderBy: { date: 'desc' }
        });

        // Fetch all stock types for weight lookup
        const allStock = await prisma.stock.findMany();
        const stockWeightMap: Record<string, string> = {};
        allStock.forEach((s: any) => { stockWeightMap[s.type] = s.weight; });

        // Expand each transaction's description JSON into per-item rows
        const rows: any[] = [];
        for (const tx of transactions) {
            let items: any[] = [];
            try { items = JSON.parse(tx.description || "[]"); } catch { items = []; }

            if (items.length === 0) {
                // Fallback: show the transaction as-is with no item details
                rows.push({
                    id: tx.id,
                    date: tx.date,
                    type: tx.type,
                    stockType: null,
                    weight: null,
                    fullChange: 0,
                    emptyChange: 0,
                    defectiveChange: 0,
                });
            } else {
                for (const item of items) {
                    rows.push({
                        id: tx.id,
                        date: tx.date,
                        type: tx.type,
                        stockType: item.type,
                        weight: stockWeightMap[item.type] || null,
                        fullChange: item.fullChange || 0,
                        emptyChange: item.emptyChange || 0,
                        defectiveChange: item.defectiveChange || 0,
                    });
                }
            }
        }

        return NextResponse.json(rows);
    } catch (error) {
        console.error("Fetch Transactions Error:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

// PATCH /api/stock/transactions - Edit a transaction entry (changes stock deltas)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, stockType, fullChange, emptyChange, defectiveChange } = body;

        if (!id || !stockType) {
            return NextResponse.json({ error: "id and stockType required" }, { status: 400 });
        }

        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

        let items: any[] = [];
        try { items = JSON.parse(tx.description || "[]"); } catch { items = []; }

        // Find old values for this stockType
        const oldItem = items.find((i: any) => i.type === stockType) || { fullChange: 0, emptyChange: 0, defectiveChange: 0 };
        const deltaFull = fullChange - (oldItem.fullChange || 0);
        const deltaEmpty = emptyChange - (oldItem.emptyChange || 0);
        const deltaDefective = defectiveChange - (oldItem.defectiveChange || 0);

        // Update description JSON
        const updatedItems = items.map((i: any) =>
            i.type === stockType ? { ...i, fullChange, emptyChange, defectiveChange } : i
        );

        await prisma.$transaction(async (prismaTx) => {
            // Update the transaction record
            await prismaTx.transaction.update({
                where: { id },
                data: { description: JSON.stringify(updatedItems) }
            });

            // Apply the delta to live stock
            await prismaTx.stock.update({
                where: { type: stockType },
                data: {
                    full: { increment: deltaFull },
                    empty: { increment: deltaEmpty },
                    defective: { increment: deltaDefective }
                }
            });

            // Apply delta to today's DailyStock snapshot
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            await prismaTx.dailyStock.updateMany({
                where: { type: stockType, date: { gte: today } },
                data: {
                    full: { increment: deltaFull },
                    empty: { increment: deltaEmpty },
                    defective: { increment: deltaDefective }
                }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Edit Transaction Error:", error);
        return NextResponse.json({ error: "Failed to edit transaction" }, { status: 500 });
    }
}
