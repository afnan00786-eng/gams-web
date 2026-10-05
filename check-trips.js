const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trips = await prisma.trip.findMany({
        orderBy: { timeOut: 'desc' },
        take: 5
    });
    console.dir(trips, { depth: null });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
