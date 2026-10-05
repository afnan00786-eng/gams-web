import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding 7 days of historical stock data...');

    const liveStock = await prisma.stock.findMany();

    if (liveStock.length === 0) {
        console.log('No live stock found to base history on. Please add some stock first.');
        return;
    }

    // Get today at 00:00:00 UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Generate for the past 7 days (not including today)
    for (let i = 1; i <= 7; i++) {
        const historicalDate = new Date(today);
        historicalDate.setDate(today.getDate() - i);

        console.log(`Generating data for ${historicalDate.toISOString().split('T')[0]}`);

        for (const item of liveStock) {
            // Create some random variance between -10 and +10 for the historical record
            const varianceFull = Math.floor(Math.random() * 21) - 10;
            const varianceEmpty = Math.floor(Math.random() * 21) - 10;
            const varianceDef = Math.floor(Math.random() * 5); // 0 to 4

            const histFull = Math.max(0, item.full + varianceFull);
            const histEmpty = Math.max(0, item.empty + varianceEmpty);
            const histDef = Math.max(0, item.defective + varianceDef);

            await prisma.dailyStock.upsert({
                where: {
                    date_type: {
                        date: historicalDate,
                        type: item.type
                    }
                },
                update: {
                    full: histFull,
                    empty: histEmpty,
                    defective: histDef
                },
                create: {
                    date: historicalDate,
                    type: item.type,
                    weight: item.weight,
                    full: histFull,
                    empty: histEmpty,
                    defective: histDef
                }
            });
        }
    }

    console.log('Historical seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
