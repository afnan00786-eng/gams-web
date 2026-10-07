import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mobile, pin, role } = body;

        // Legacy / dev fallback
        if (!mobile && role && !pin) {
            return NextResponse.json({
                id: "mock-" + role.toLowerCase(),
                name: role,
                role: role
            });
        }

        if (!mobile || !pin) {
            return NextResponse.json({ error: "Mobile number and 4-digit PIN required" }, { status: 400 });
        }

        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        const cleanPin = String(pin).trim();

        const users = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, email, pin, "agencyName", "allowedSections"
            FROM "User"
            WHERE mobile LIKE ${'%' + cleanMobile}
            LIMIT 1
        `;

        if (!users || users.length === 0) {
            return NextResponse.json(
                { error: "No account found with this mobile number. Contact Owner/Master." },
                { status: 404 }
            );
        }

        const user = users[0];

        if (!user.pin) {
            return NextResponse.json(
                { error: "PIN is not set yet. Please set your 4-digit PIN first.", needsPinSetup: true },
                { status: 403 }
            );
        }

        if (String(user.pin).trim() !== cleanPin) {
            return NextResponse.json(
                { error: "Incorrect 4-digit PIN. Please try again." },
                { status: 401 }
            );
        }

        const masters = await prisma.$queryRaw<any[]>`
            SELECT "agencyName" FROM "User" WHERE role = 'MASTER' LIMIT 1
        `;

        return NextResponse.json({
            id: user.id,
            name: user.name,
            role: user.role,
            mobile: user.mobile,
            email: user.email,
            allowedSections: user.allowedSections || "[]",
            agencyName: user.agencyName || masters?.[0]?.agencyName || "My Gas Agency"
        });

    } catch (error: any) {
        console.error("Login API Error:", error);
        return NextResponse.json({ error: "Login failed due to server error" }, { status: 500 });
    }
}
