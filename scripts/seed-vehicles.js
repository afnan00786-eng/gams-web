const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding vehicles...');

    const dummyVehicles = [
        { number: 'MH 14 CX 5555', type: 'Truck' },
        { number: 'MH 12 AB 1234', type: 'Auto' },
        { number: 'MH 12 PQ 9876', type: 'Van' },
    ];

    for (const vehicle of dummyVehicles) {
        // Upsert to handle if they already exist without throwing error
        await prisma.vehicle.upsert({
            where: { number: vehicle.number },
            update: {}, // don't change existing
            create: vehicle,
        });
        console.log(`Ensured vehicle: ${vehicle.number} exists.`);
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
