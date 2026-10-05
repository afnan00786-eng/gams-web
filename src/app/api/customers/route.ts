import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const hawkerId = searchParams.get('hawkerId');

        if (!hawkerId) {
            return NextResponse.json({ error: "hawkerId is required" }, { status: 400 });
        }

        const customers = await prisma.customer.findMany({
            where: { hawkerId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(customers);
    } catch (error) {
        console.error("GET Customers Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, mobile, address, hawkerId } = body;

        if (!name || !hawkerId) {
            return NextResponse.json({ error: "Name and hawkerId are required" }, { status: 400 });
        }

        const newCustomer = await prisma.customer.create({
            data: {
                name,
                mobile: mobile || null,
                address: address || null,
                hawkerId,
                emptyBal: 0,
                cashBal: 0
            }
        });

        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        console.error("POST Customer Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
