import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mobile, pin } = body;

        if (!mobile || !pin) {
            return NextResponse.json({ error: "Mobile number and PIN required" }, { status: 400 });
        }

        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        const cleanPin = String(pin).trim();

        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
            return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
        }

        const users = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, "agencyName", "allowedSections"
            FROM "User"
            WHERE mobile LIKE ${'%' + cleanMobile}
            LIMIT 1
        `;

        if (!users || users.length === 0) {
            return NextResponse.json({ error: "User not found with this mobile number." }, { status: 404 });
        }

        const user = users[0];

        // Update PIN using raw SQL
        await prisma.$executeRaw`
            UPDATE "User"
            SET pin = ${cleanPin},
                "updatedAt" = NOW()
            WHERE id = ${user.id}
        `;

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                mobile: user.mobile,
                allowedSections: user.allowedSections || "[]",
                agencyName: user.agencyName || "My Gas Agency"
            }
        });
    } catch (error: any) {
        console.error("Set PIN Error:", error);
        return NextResponse.json({ error: "Failed to set PIN" }, { status: 500 });
    }
}
