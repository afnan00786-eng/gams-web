const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Check all OUT trips
    const activeTrips = await prisma.trip.findMany({ where: { status: 'OUT' }, orderBy: { timeOut: 'desc' } });
    console.log('=== ALL ACTIVE TRIPS ===');
    activeTrips.forEach(t => console.log(`  [${t.id}] ${t.driverName} | ${t.vehicleNo} | ${t.destination} | ${t.timeOut}`));

    // Check all users
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
    console.log('\n=== ALL USERS ===');
    users.forEach(u => console.log(`  [${u.id}] ${u.name} (${u.role})`));

    // Check recent completed trips with transfers
    const recentCompleted = await prisma.trip.findMany({ where: { status: 'COMPLETED' }, orderBy: { timeIn: 'desc' }, take: 3 });
    console.log('\n=== RECENTLY COMPLETED TRIPS ===');
    recentCompleted.forEach(t => {
        console.log(`  [${t.id}] ${t.driverName} | timeIn: ${t.timeIn}`);
        try {
            const items = JSON.parse(t.stockItems || '[]');
            items.forEach(i => {
                if (i.hawkerTransfers && i.hawkerTransfers.length > 0) {
                    console.log(`    TRANSFERS FOUND: ${JSON.stringify(i.hawkerTransfers)}`);
                } else {
                    console.log(`    ${i.type}: qty=${i.quantity}, no transfers`);
                }
            });
        } catch (e) { console.log('    parse error:', e.message); }
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
