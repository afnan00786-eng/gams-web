import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agencyName, name, mobile, email, pin, password } = body;

        if (!name || !mobile || !pin) {
            return NextResponse.json(
                { error: "Owner name, mobile number, and 4-digit PIN are required." },
                { status: 400 }
            );
        }

        const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
        if (cleanMobile.length !== 10) {
            return NextResponse.json(
                { error: "Please enter a valid 10-digit mobile number." },
                { status: 400 }
            );
        }

        const cleanPin = String(pin).trim();
        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
            return NextResponse.json(
                { error: "PIN must be exactly 4 numeric digits." },
                { status: 400 }
            );
        }

        const cleanAgencyName = String(agencyName || "My Gas Agency").trim();

        // Check if master already exists using raw SQL for maximum robustness
        const masters = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, email, pin, "agencyName"
            FROM "User"
            WHERE role = 'MASTER'
            LIMIT 1
        `;

        let userId = "";

        if (masters && masters.length > 0) {
            userId = masters[0].id;
            await prisma.$executeRaw`
                UPDATE "User"
                SET name = ${name.trim()},
                    mobile = ${cleanMobile},
                    email = ${email?.trim() || null},
                    pin = ${cleanPin},
                    password = ${password || null},
                    "agencyName" = ${cleanAgencyName},
                    "updatedAt" = NOW()
                WHERE id = ${userId}
            `;
        } else {
            // Generate a random cuid-like ID
            userId = 'cm_' + Math.random().toString(36).substring(2, 12);
            await prisma.$executeRaw`
                INSERT INTO "User" (id, name, role, mobile, email, pin, password, "agencyName", "createdAt", "updatedAt")
                VALUES (
                    ${userId},
                    ${name.trim()},
                    'MASTER',
                    ${cleanMobile},
                    ${email?.trim() || null},
                    ${cleanPin},
                    ${password || null},
                    ${cleanAgencyName},
                    NOW(),
                    NOW()
                )
            `;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                name: name.trim(),
                role: 'MASTER',
                mobile: cleanMobile,
                email: email?.trim() || null,
                agencyName: cleanAgencyName,
            }
        });
    } catch (error: any) {
        console.error("Master Registration Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to register Master/Owner." },
            { status: 500 }
        );
    }
}
