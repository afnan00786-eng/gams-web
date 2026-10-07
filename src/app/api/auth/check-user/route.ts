import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mobile } = body;

        if (!mobile) {
            return NextResponse.json({ error: "Mobile number required" }, { status: 400 });
        }

        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);

        // Find user by mobile number using raw SQL
        const users = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, email, pin, "agencyName", "allowedSections"
            FROM "User"
            WHERE mobile LIKE ${'%' + cleanMobile}
            LIMIT 1
        `;

        // Check if any master exists in system
        const masters = await prisma.$queryRaw<any[]>`
            SELECT id, "agencyName"
            FROM "User"
            WHERE role = 'MASTER'
            LIMIT 1
        `;

        const hasMaster = Boolean(masters && masters.length > 0);
        const defaultAgencyName = masters?.[0]?.agencyName || "My Gas Agency";

        if (!users || users.length === 0) {
            return NextResponse.json({
                exists: false,
                isMasterRegistered: hasMaster
            });
        }

        const user = users[0];
        const hasPin = Boolean(user.pin && String(user.pin).trim().length === 4);

        return NextResponse.json({
            exists: true,
            isMasterRegistered: hasMaster,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                mobile: user.mobile,
                hasPin: hasPin,
                allowedSections: user.allowedSections || "[]",
                agencyName: user.agencyName || defaultAgencyName
            }
        });
    } catch (error: any) {
        console.error("Check User Error:", error);
        return NextResponse.json({ error: "Failed to check user" }, { status: 500 });
    }
}
