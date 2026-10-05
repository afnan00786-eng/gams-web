import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, tripId, transferId } = body; // type can be 'GODOWN', 'HAWKER', or 'TRANSFER'

        if (!tripId || !type) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        if (type === 'GODOWN') {
            // Use raw SQL (same pattern as expenses field) to work around stale Prisma client 
            await prisma.$executeRaw`UPDATE "Trip" SET "isConfirmedByGodown" = true WHERE "id" = ${tripId}`;
            return NextResponse.json({ success: true });
        }

        if (type === 'HAWKER') {
            await prisma.$executeRaw`UPDATE "Trip" SET "isConfirmedByHawker" = true WHERE "id" = ${tripId}`;
            return NextResponse.json({ success: true });
        }

        if (type === 'TRANSFER') {
            let items: any[] = [];
            try {
                items = JSON.parse(trip.stockItems || "[]");
            } catch (e) {
                return NextResponse.json({ error: "Failed to parse stockItems" }, { status: 500 });
            }

            let updated = false;
            console.log(`[Confirm Transfer] Looking for transferId: ${transferId} in trip ${tripId}`);

            items.forEach((item: any) => {
                if (item.receivedTransfers && Array.isArray(item.receivedTransfers)) {
                    item.receivedTransfers.forEach((rt: any) => {
                        if (String(rt.id) === String(transferId)) {
                            rt.isConfirmed = true;
                            updated = true;
                            console.log(`[Confirm Transfer] Found and confirmed: ${rt.id}`);
                        }
                    });
                }
            });

            if (updated) {
                await prisma.trip.update({
                    where: { id: tripId },
                    data: { stockItems: JSON.stringify(items) }
                });
                return NextResponse.json({ success: true });
            } else {
                console.error(`[Confirm Transfer] NOT FOUND. Current items:`, JSON.stringify(items, null, 2));
                // Fallback: mark ALL unconfirmed transfers as confirmed (if IDs are missing/mismatched from older data)
                let anyUpdated = false;
                items.forEach((item: any) => {
                    if (item.receivedTransfers && Array.isArray(item.receivedTransfers)) {
                        item.receivedTransfers.forEach((rt: any) => {
                            if (!rt.isConfirmed) {
                                rt.isConfirmed = true;
                                anyUpdated = true;
                            }
                        });
                    }
                });
                if (anyUpdated) {
                    await prisma.trip.update({
                        where: { id: tripId },
                        data: { stockItems: JSON.stringify(items) }
                    });
                    return NextResponse.json({ success: true, note: "Confirmed via fallback (no matching ID)" });
                }
                return NextResponse.json({ error: "No pending transfers found to confirm." }, { status: 404 });
            }
        }

        return NextResponse.json({ error: "Invalid confirmation type" }, { status: 400 });
    } catch (error: any) {
        console.error("Confirmation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to confirm" }, { status: 500 });
    }
}
