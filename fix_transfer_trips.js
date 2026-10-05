const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transferTrips = await prisma.trip.findMany({
        where: { vehicleNo: 'TRANSFER' }
    });

    let count = 0;
    for (const trip of transferTrips) {
        let items = [];
        try {
            items = JSON.parse(trip.stockItems || "[]");
        } catch (e) { continue; }

        let changed = false;
        items.forEach(it => {
            if (it.quantity > 0) {
                it.quantity = 0;
                changed = true;
            }
        });

        if (changed) {
            await prisma.trip.update({
                where: { id: trip.id },
                data: { stockItems: JSON.stringify(items) }
            });
            count++;
        }
    }
    console.log(`Fixed ${count} TRANSFER trips`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
