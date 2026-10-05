import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const bookings = await prisma.offlineBooking.findMany({
            orderBy: { timestamp: 'asc' }
        });
        return NextResponse.json(bookings);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        
        // Handle upsert to handle case where we sync a booking twice
        const booking = await prisma.offlineBooking.upsert({
            where: { id: data.id },
            update: {
                status: data.status,
                ...(data.priority ? { priority: data.priority } : {})
            },
            create: {
                id: data.id,
                areaId: data.areaId,
                priority: data.priority,
                name: data.name,
                date: data.date,
                cylinders: data.cylinders,
                isDirectOrder: data.isDirectOrder || false,
                address: data.address,
                mobile: data.mobile,
                status: data.status || "UD",
                timestamp: data.timestamp,
            }
        });
        return NextResponse.json(booking);
    } catch (e) {
        console.error("Create Booking Error:", e);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();
        const booking = await prisma.offlineBooking.update({
            where: { id: data.id },
            data: {
                ...(data.status ? { status: data.status } : {}),
                ...(data.priority ? { priority: data.priority } : {})
            }
        });
        return NextResponse.json(booking);
    } catch (e) {
        console.error("Update Booking Error:", e);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }
}
