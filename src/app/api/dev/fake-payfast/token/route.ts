import { NextRequest, NextResponse } from "next/server";

// Fake stand-in for PayFast's real token endpoint. Auto-disabled in
// production builds (NODE_ENV check) so this can never accidentally ship.
export async function POST(_request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Not available in production" }, { status: 404 });
    }
    return NextResponse.json({ code: "00", token: "fake-dev-token" });
}