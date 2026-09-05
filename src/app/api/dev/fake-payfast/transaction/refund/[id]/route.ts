import { NextRequest, NextResponse } from "next/server";

// Fake stand-in for PayFast's refund endpoint — always succeeds.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Not available in production" }, { status: 404 });
    }

    const { id } = await params;
    return NextResponse.json({ code: "00", transaction_id: id });
}