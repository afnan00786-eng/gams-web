import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const customerId = params.id;

        const transactions = await prisma.customerTransaction.findMany({
            where: { customerId },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("GET Ledger Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const customerId = params.id;
        const body = await request.json();
        const { type, cylinders, amount, note, tripId } = body;

        // Valid types: "GIVEN_FULL", "RECEIVED_EMPTY", "CASH_PAYMENT", "CASH_DUE", "ADJUST"
        if (!type) {
            return NextResponse.json({ error: "Transaction type is required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer) throw new Error("Customer not found");

            let emptyChange = 0;
            let cashChange = 0;

            if (type === "GIVEN_FULL") {
                emptyChange = cylinders || 0;
                cashChange = amount || 0;
            } else if (type === "RECEIVED_EMPTY") {
                emptyChange = -(cylinders || 0);
            } else if (type === "CASH_PAYMENT") {
                cashChange = -(amount || 0);
            } else if (type === "CASH_DUE") {
                cashChange = amount || 0;
            } else if (type === "ADJUST") {
                emptyChange = cylinders || 0; // Positive or Negative
                cashChange = amount || 0;
            }

            const transaction = await tx.customerTransaction.create({
                data: {
                    customerId,
                    type,
                    cylinders: cylinders || 0,
                    amount: amount || 0,
                    note: note || null,
                    tripId: tripId || null
                }
            });

            const updatedCustomer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    emptyBal: { increment: emptyChange },
                    cashBal: { increment: cashChange }
                }
            });

            return { transaction, updatedCustomer };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error("POST Ledger Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
