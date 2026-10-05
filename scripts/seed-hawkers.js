const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding mock hawkers...');

    const hawkers = [
        { name: 'Raju Bhai', role: 'HAWKER', mobile: '9876543210' },
        { name: 'Suresh Kumar', role: 'HAWKER', mobile: '8765432109' },
        { name: 'Amit Singh', role: 'HAWKER', mobile: '7654321098' }
    ];

    for (const hawker of hawkers) {
        // Use upsert to avoid duplicates if run multiple times
        await prisma.user.upsert({
            where: { mobile: hawker.mobile }, // Assuming mobile is unique or we can just use a findFirst on name
            update: {},
            create: hawker
        });
        console.log(`Upserted Hawker: ${hawker.name}`);
    }

    console.log('Finished seeding hawkers.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
