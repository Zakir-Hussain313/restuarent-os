"use server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";
import { PaymentService } from "@/lib/payments/PaymentService";

// Called right after a public order is created, only when the customer
// chose "Pay Now Online" at checkout. Starts a PayFast Web Checkout for
// the order's full total — no staff/auth involved, this is customer-facing.
export async function initiatePublicPaymentAction(
    orderId: string,
    customerEmail: string
): Promise < 
    | { success: true; checkoutForm: { url: string; fields: Record<string, string> } }
    | { success?: undefined; error: string }
> {
    const tenantId = getTenantId();

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order || order.tenantId !== tenantId) {
        return { error: "Order not found." };
    }
    if (order.status !== "pending") {
        return { error: "This order can no longer be paid online." };
    }

    try {
        const result = await PaymentService.initiate(
            {
                tenantId,
                branchId: order.branchId,
                orderId: order.id,
                amount: order.total,
                currency: "PKR",
                method: "card",
                // No real staff for a customer-facing payment — null FK,
                // matching ONLINE_ORDER_ACTOR pattern used elsewhere for
                // public orders (staffId: null there too).
                processedBy: null,
                processedByName: "Online Customer",
                customerEmail,
                customerPhone: order.customerPhone ?? undefined,
            },
            "payfast"
        );

        if (!result.checkoutForm) {
            return { error: "Online payment is not available right now." };
        }

        return { success: true, checkoutForm: result.checkoutForm };
    } catch (err) {
        return { error: (err as Error).message };
    }
}