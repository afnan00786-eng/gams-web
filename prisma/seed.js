const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // 1. Upsert Master User
    const master = await prisma.user.upsert({
        where: { mobile: 'admin' },
        update: {},
        create: {
            name: 'Amit Proprietor',
            role: 'MASTER', // String now
            mobile: 'admin',
        },
    })

    // 2. Create Employees
    const employees = [
        { name: 'Ramesh Manager', role: 'MANAGER', mobile: '9876543210' },
        { name: 'Suresh Godown', role: 'GODOWN', mobile: '9876543211' },
        { name: 'Mahesh Hawker', role: 'HAWKER', mobile: '9876543212' },
        { name: 'Anjali Accounts', role: 'ACCOUNTANT', mobile: '9876543213' },
        { name: 'Priya Office', role: 'OFFICE_STAFF', mobile: '9876543214' },
    ]

    for (const emp of employees) {
        await prisma.user.upsert({
            where: { mobile: emp.mobile },
            update: {},
            create: emp,
        })
    }

    // 3. Initialize Stock
    const stockItems = [
        { type: "Domestic", weight: "14.2 kg", full: 150, empty: 45, defective: 2 },
        { type: "Commercial", weight: "19 kg", full: 80, empty: 20, defective: 0 },
        { type: "Small", weight: "5 kg", full: 50, empty: 10, defective: 0 },
    ]

    for (const item of stockItems) {
        await prisma.stock.upsert({
            where: { type: item.type }, // Unique constraint on type
            update: {},
            create: item,
        })
    }

    console.log('Database seeded!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
