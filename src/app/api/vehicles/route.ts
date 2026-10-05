import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const vehicles = await prisma.vehicle.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        if (!data.number) {
            return NextResponse.json({ error: 'Vehicle number is required' }, { status: 400 });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                number: data.number,
                type: data.type || null,
            }
        });

        return NextResponse.json(vehicle, { status: 201 });
    } catch (error: any) {
        console.error('Error creating vehicle:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Vehicle with this number already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }
}
