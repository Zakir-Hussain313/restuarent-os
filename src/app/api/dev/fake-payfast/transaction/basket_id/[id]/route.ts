import { NextRequest, NextResponse } from "next/server";
import { getOutcome } from "../../../_store";

// Fake stand-in for PayFast's verify/status-check endpoint. This is what
// your real callback route calls to re-confirm payment status server-side
// (never trusting the browser redirect alone).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Not available in production" }, { status: 404 });
    }

    const { id } = await params;
    const outcome = getOutcome(id) ?? "failed";

    return NextResponse.json({
        status_code: outcome === "paid" ? "00" : "01",
        transaction_id: outcome === "paid" ? `fake-txn-${id}` : null,
    });
}