import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/employees - Get all employees
export async function GET() {
    try {
        const employees = await prisma.user.findMany({
            where: {
                role: {
                    not: 'MASTER' // Exclude master from employee list
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(employees);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
    }
}

// POST /api/employees - Add new employee
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, role, mobile } = body;

        const newEmployee = await prisma.user.create({
            data: {
                name,
                role,
                mobile
            }
        });

        return NextResponse.json(newEmployee);
    } catch (error) {
        console.error("Add Employee Error:", error);
        return NextResponse.json({ error: "Failed to add employee" }, { status: 500 });
    }
}

// DELETE /api/employees - Remove employee
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
    }
}
