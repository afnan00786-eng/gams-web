import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

let columnsEnsured = false;
async function ensureUserColumns() {
    if (columnsEnsured) return;
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowedSections" TEXT DEFAULT '[]';`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "agencyName" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pin" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;`);
        columnsEnsured = true;
    } catch (e) {
        console.warn("Could not ensure columns:", e);
    }
}

// GET /api/employees - Get all employees
export async function GET() {
    try {
        await ensureUserColumns();
        const employees = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, email, pin, "allowedSections", "createdAt"
            FROM "User"
            WHERE role != 'MASTER'
            ORDER BY "createdAt" DESC
        `;
        return NextResponse.json(employees);
    } catch (error) {
        console.error("Fetch Employees Error:", error);
        return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
    }
}

// POST /api/employees - Add new employee
export async function POST(request: Request) {
    try {
        await ensureUserColumns();
        const body = await request.json();
        const { name, role, mobile, allowedSections } = body;

        if (!name || !role) {
            return NextResponse.json({ error: "Name and Role are required" }, { status: 400 });
        }

        const cleanMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null;

        // Check if employee with same mobile exists
        if (cleanMobile) {
            const existing = await prisma.$queryRaw<any[]>`
                SELECT id, name, role FROM "User" WHERE mobile = ${cleanMobile} LIMIT 1
            `;
            if (existing && existing.length > 0) {
                return NextResponse.json(
                    { error: `User with mobile ${cleanMobile} already exists (${existing[0].name} - ${existing[0].role})` },
                    { status: 400 }
                );
            }
        }

        const sectionsJson = JSON.stringify(Array.isArray(allowedSections) ? allowedSections : []);
        const newId = 'emp_' + Math.random().toString(36).substring(2, 12);

        await prisma.$executeRaw`
            INSERT INTO "User" (id, name, role, mobile, "allowedSections", "createdAt", "updatedAt")
            VALUES (${newId}, ${name.trim()}, ${role}, ${cleanMobile}, ${sectionsJson}, NOW(), NOW())
        `;

        const created = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, "allowedSections" FROM "User" WHERE id = ${newId} LIMIT 1
        `;

        return NextResponse.json(created?.[0] || { id: newId, name, role, mobile: cleanMobile, allowedSections });
    } catch (error: any) {
        console.error("Add Employee Error:", error);
        return NextResponse.json({ error: error.message || "Failed to add employee" }, { status: 500 });
    }
}

// PATCH /api/employees - Update employee mobile, role, or allowed sections
export async function PATCH(request: Request) {
    try {
        await ensureUserColumns();
        const body = await request.json();
        const { id, mobile, name, role, allowedSections } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const cleanMobile = mobile !== undefined ? (mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null) : undefined;
        const sectionsJson = allowedSections !== undefined ? JSON.stringify(Array.isArray(allowedSections) ? allowedSections : []) : undefined;

        // Fetch current user
        const current = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, "allowedSections" FROM "User" WHERE id = ${id} LIMIT 1
        `;

        if (!current || current.length === 0) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const updatedName = name !== undefined ? name.trim() : current[0].name;
        const updatedRole = role !== undefined ? role : current[0].role;
        const updatedMobile = cleanMobile !== undefined ? cleanMobile : current[0].mobile;
        const updatedSections = sectionsJson !== undefined ? sectionsJson : (current[0].allowedSections || '[]');

        await prisma.$executeRaw`
            UPDATE "User"
            SET name = ${updatedName},
                role = ${updatedRole},
                mobile = ${updatedMobile},
                "allowedSections" = ${updatedSections},
                "updatedAt" = NOW()
            WHERE id = ${id}
        `;

        const result = await prisma.$queryRaw<any[]>`
            SELECT id, name, role, mobile, "allowedSections" FROM "User" WHERE id = ${id} LIMIT 1
        `;

        return NextResponse.json(result?.[0]);
    } catch (error: any) {
        console.error("Update Employee Error:", error);
        return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
    }
}

// DELETE /api/employees - Remove employee
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.$executeRaw`
            DELETE FROM "User" WHERE id = ${id}
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
    }
}
