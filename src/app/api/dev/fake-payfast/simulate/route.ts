import { NextRequest, NextResponse } from "next/server";
import { setOutcome } from "../_store";

// Hit when you click a button on the fake checkout page. Records which
// outcome you chose, then redirects to the real SUCCESS_URL/FAILURE_URL
// (your actual callback route), exactly like PayFast would.
export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Not available in production" }, { status: 404 });
    }

    const basketId = request.nextUrl.searchParams.get("basketId");
    const outcome = request.nextUrl.searchParams.get("outcome");
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");

    if (!basketId || !redirectTo || (outcome !== "paid" && outcome !== "failed")) {
        return NextResponse.json({ message: "Missing/invalid params" }, { status: 400 });
    }

    setOutcome(basketId, outcome);

    return NextResponse.redirect(redirectTo);
}