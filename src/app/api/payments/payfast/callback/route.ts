import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PaymentService } from "@/lib/payments/PaymentService";
import { broadcastChange } from "@/lib/realtime/broadcast";

// PayFast redirects the customer's browser back here after checkout —
// success or failure. We NEVER trust this redirect alone to mark a payment
// paid (a customer could hand-craft this URL) — we always re-verify the
// real status directly against PayFast's server via PaymentService.verify().
export async function GET(request: NextRequest) {
    const paymentId = request.nextUrl.searchParams.get("paymentId");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!paymentId) {
        return NextResponse.redirect(`${appUrl}/order/payment-failed?reason=missing_payment_id`);
    }

    try {
        const payment = await db.query.payments.findFirst({
            where: (p, { eq: eqOp }) => eqOp(p.id, paymentId),
        });
        if (!payment) {
            return NextResponse.redirect(`${appUrl}/order/payment-failed?reason=payment_not_found`);
        }

        const verifyResult = await PaymentService.verify({ paymentId }, "payfast");

        if (verifyResult.status === "paid") {
            const order = await db.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
            if (order) {
                const now = new Date();
                const newTotalPaid = order.totalPaid + payment.amount;
                const willFullyPay = newTotalPaid >= order.total;

                await db
                    .update(orders)
                    .set({
                        paymentStatus: willFullyPay ? "paid" : "partial",
                        totalPaid: newTotalPaid,
                        balance: order.total - newTotalPaid,
                        updatedAt: now,
                    })
                    .where(eq(orders.id, order.id));

                await broadcastChange(order.branchId, "orders");

                return NextResponse.redirect(`${appUrl}/order/confirmed?order=${order.orderNumber}`);
            }

            return NextResponse.redirect(`${appUrl}/order/payment-failed?reason=order_not_found`);
        }

        return NextResponse.redirect(`${appUrl}/order/payment-failed?orderId=${payment.orderId}`);
        // Note: orderId is already included above — kept as-is, this line
        // is unchanged. Retry logic lives in the payment-failed page itself.
    } catch (err) {
        console.error("[PayFast callback] error", err);
        return NextResponse.redirect(`${appUrl}/order/payment-failed?reason=verification_failed`);
    }
}