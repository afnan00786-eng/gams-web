import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { senderTripId, senderDriverName, itemType, transfers } = body;

        const result = await prisma.$transaction(async (tx) => {
            for (const t of transfers) {
                if (!t.hawkerId || !t.qty || t.qty <= 0 || t.isProcessed) continue;
                // We now process both 'Filled' and 'Empty'
                // if (t.condition !== 'Filled') continue;

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
                            destination: `Transfer from ${senderDriverName}`,
                            status: 'OUT',
                            stockItems: JSON.stringify([{
                                type: itemType,
                                quantity: 0,
                                weight: '',
                                isTransferTrip: true
                            }])
                        }
                    });
                }

                let recItems: any[] = [];
                try { recItems = JSON.parse(receiverTrip.stockItems || "[]"); } catch (e) { }

                let foundItem = recItems.find((i: any) => i.type === itemType);
                if (!foundItem) {
                    foundItem = { type: itemType, quantity: 0, weight: '', isTransferTrip: true };
                    recItems.push(foundItem);
                }

                if (t.type === 'Given') {
                    // Do NOT mutate quantity (Godown OUT). Let the UI add receivedTransfers dynamically.
                    if (!foundItem.receivedTransfers) foundItem.receivedTransfers = [];
                    foundItem.receivedTransfers.push({
                        id: Date.now().toString() + Math.random().toString(36).substring(7),
                        from: senderDriverName,
                        qty: t.qty,
                        type: itemType,
                        condition: t.condition, // Store condition to distinguish filled vs empty
                        isConfirmed: false
                    });
                } else if (t.type === 'Taken') {
                    // A took from B. This means B gave to A.
                    // We shouldn't shrink B's Godown OUT. We should log that B "Given" to A.
                    // However, full bidirectional complex sync might be out of scope.
                    // The main fix needed is to NOT mutate `quantity`.
                }

                await tx.trip.update({
                    where: { id: receiverTrip.id },
                    data: { stockItems: JSON.stringify(recItems) }
                });
            }

            return { success: true };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Hawker Transfer Instant Save Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process transfer instantly" }, { status: 500 });
    }
}
