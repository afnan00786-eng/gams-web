import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const hawkers = await prisma.user.findMany({
            where: { role: 'HAWKER' }
        });

        const summary = await Promise.all(hawkers.map(async (h) => {
            const customers = await prisma.customer.findMany({
                where: { hawkerId: h.id }
            });

            const totalCashBal = customers.reduce((sum, c) => sum + (c.cashBal || 0), 0);
            const totalEmptyBal = customers.reduce((sum, c) => sum + (c.emptyBal || 0), 0);

            return {
                hawkerId: h.id,
                totalCashBal,
                totalEmptyBal,
                customerCount: customers.length
            };
        }));

        return NextResponse.json(summary);
    } catch (error) {
        console.error("Failed to fetch hawker ledger summary:", error);
        return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
    }
}
