import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { role, name, mobile } = body;

        // For MASTER, we might check a hardcoded value or special record
        if (role === "MASTER") {
            // In a real app, you'd check password hash. 
            // For this demo, we just return success like the mock did.
            return NextResponse.json({
                id: "master-id",
                name: name || "Master",
                role: "MASTER"
            });
        }

        // For Staff, find by mobile (since names might not be unique, but mobile should be)
        // Or if login is by name selection (as per current UI design), we need to find by name & role.
        // The current UI sends: { id, name, role } but backend needs to valid it.
        // Actually the current UI just mocks it. The new UI should probably ask for mobile for staff login
        // OR just select the user from a list if we want to keep it simple.

        // Let's support login by ID or just Return success for now to match current behavior, 
        // but eventually we should validate against DB.

        // For now, let's just create/upsert the user if it's a "selection" based login 
        // to ensure they exist in DB for foreign keys.

        // However, the proper way is: UI lists users -> User selects self -> Enters password/pin.
        // Current app: Select Role -> Enter Name -> Login.

        // Let's try to find an existing user with that Role and Name (partial match?)
        // Or just create a session.

        return NextResponse.json({
            id: "mock-session-id",
            name: name,
            role: role
        });

    } catch (error) {
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
