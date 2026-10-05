const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trips = await prisma.trip.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10
    });
    console.log('Recent Trips:', JSON.stringify(trips, null, 2));

    const txs = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        take: 10
    });
    console.log('Recent TX:', JSON.stringify(txs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
