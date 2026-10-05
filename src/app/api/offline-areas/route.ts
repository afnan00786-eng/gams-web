import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const areas = await prisma.offlineArea.findMany();
        return NextResponse.json(areas);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch areas" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const area = await prisma.offlineArea.create({
            data: {
                id: data.id,
                name: data.name,
                hawker: data.hawker,
            }
        });
        return NextResponse.json(area);
    } catch (e) {
        console.error("Create Area Error:", e);
        return NextResponse.json({ error: "Failed to create area" }, { status: 500 });
    }
}
