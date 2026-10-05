const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stock = await prisma.stock.findMany();
    console.log('--- Current Live Stock ---');
    console.table(stock.map(s => ({ type: s.type, full: s.full, empty: s.empty, def: s.defective, isCyl: s.isCylinder })));

    const dailyStock = await prisma.dailyStock.findMany({
        orderBy: { date: 'asc' }
    });
    console.log('\n--- Daily Stock Snapshots ---');
    console.table(dailyStock.map(d => ({
        id: d.id,
        date: d.date.toISOString().split('T')[0],
        type: d.type,
        full: d.full,
        empty: d.empty
    })));

    const transactions = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        take: 10
    });
    console.log('\n--- Recent Transactions ---');
    console.table(transactions.map(t => ({ id: t.id, date: t.date.toISOString().split('T')[0], type: t.type, qty: t.quantity, desc: t.description })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
