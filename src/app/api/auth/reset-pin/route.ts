import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, newPin } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        let pinVal: string | null = null;
        if (newPin) {
            pinVal = String(newPin).trim();
            if (pinVal.length !== 4 || !/^\d{4}$/.test(pinVal)) {
                return NextResponse.json({ error: "PIN must be 4 numeric digits" }, { status: 400 });
            }
        }

        await prisma.$executeRaw`
            UPDATE "User"
            SET pin = ${pinVal},
                "updatedAt" = NOW()
            WHERE id = ${userId}
        `;

        const users = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, pin FROM "User" WHERE id = ${userId} LIMIT 1
        `;

        const updated = users?.[0];

        return NextResponse.json({
            success: true,
            message: pinVal ? `PIN successfully changed to ${pinVal}` : "PIN reset. Employee can set a new PIN on next login.",
            user: updated ? { id: updated.id, name: updated.name, role: updated.role, pin: updated.pin } : null
        });
    } catch (error: any) {
        console.error("Reset PIN Error:", error);
        return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
    }
}
