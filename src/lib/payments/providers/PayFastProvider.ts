import { db } from "@/db";
import { payments, paymentRefunds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPayFastConfig } from "./payfastConfig";
import type {
    PaymentProvider,
    InitiatePaymentInput,
    InitiatePaymentResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
    RefundPaymentInput,
    RefundPaymentResult,
    DbClient,
} from "../types";

// Phase 3 provider — PayFast's hosted Web Checkout. The customer's browser
// is auto-submitted (via an HTML form POST) to PayFast's own payment page —
// our server NEVER receives card numbers, CVV, or bank account details.
// This keeps us out of PCI-DSS scope entirely (see project context §11/§22).
//
// IMPORTANT — FIELD NAMES NOT YET CONFIRMED: PayFast's public docs only
// confirm TXNAMT, BASKET_ID, and CURRENCY_CODE as mandatory checkout form
// fields. The remaining field names below (SUCCESS_URL, FAILURE_URL, etc.)
// are our best reconstruction from public integration guides — they have
// NOT been verified against a real PayFast sandbox. The first thing to do
// once real credentials arrive is confirm every field name here against
// PayFast's actual integration guide / dashboard docs, before trusting any
// live test result.
function log(event: string, data: Record<string, unknown>) {
    console.log(`[PayFastProvider] ${event}`, JSON.stringify(data));
}

async function getAccessToken(customerIp: string): Promise<string> {
    const { merchantId, securedKey, baseUrl } = getPayFastConfig();

    const body = new URLSearchParams({
        merchant_id: merchantId,
        secured_key: securedKey,
        grant_type: "client_credentials",
        customer_ip: customerIp,
    });

    const res = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const json = await res.json();
    log("getAccessToken response", { status: res.status, code: json.code });

    if (!res.ok || !json.token) {
        throw new Error(`PayFast auth failed: ${json.message ?? res.statusText}`);
    }

    return json.token as string;
}

export class PayFastProvider implements PaymentProvider {
    readonly id = "payfast";

    async initiate(input: InitiatePaymentInput, dbClient: DbClient = db): Promise<InitiatePaymentResult> {
        const { merchantId, baseUrl } = getPayFastConfig();

        log("initiate called", { orderId: input.orderId, amount: input.amount });

        // customer_ip is required by PayFast's token API but we don't have
        // the real customer IP at this layer (server action, not a request
        // handler) — using a placeholder is a known gap, flagged here
        // rather than silently guessed correct. Revisit once we confirm
        // whether PayFast actually validates this value strictly.
        const token = await getAccessToken("0.0.0.0");

        // Insert a "pending" payment row FIRST, before redirecting the
        // customer anywhere — so if they abandon checkout or the webhook
        // never arrives, we still have a record to reconcile against
        // instead of a payment that only ever existed in PayFast's system.
        const [row] = await dbClient
            .insert(payments)
            .values({
                tenantId: input.tenantId,
                branchId: input.branchId,
                orderId: input.orderId,
                method: input.method,
                amount: input.amount,
                currency: input.currency,
                provider: this.id,
                status: "pending",
                clientPaymentId: input.clientPaymentId ?? null,
                metadata: input.metadata ?? null,
                initiatedAt: new Date(),
                processedBy: input.processedBy,
                processedByName: input.processedByName,
            })
            .returning();

        log("payment row created", { paymentId: row.id, status: row.status });

        // basket_id ties PayFast's transaction back to OUR payment row —
        // use the payment id, not the order id, since one order can have
        // multiple payments (split bills).
        const basketId = row.id;
        const orderDate = new Date().toISOString().slice(0, 19).replace("T", " ");

        return {
            paymentId: row.id,
            status: row.status,
            checkoutForm: {
                // GUESS — confirm real endpoint path against PayFast docs
                // once sandbox access is available.
                url: `${baseUrl}/Ecommerce/api/Transaction/PostTransaction`,
                fields: {
                    MERCHANT_ID: merchantId,
                    TOKEN: token,
                    BASKET_ID: basketId,
                    TXNAMT: String(input.amount),
                    CURRENCY_CODE: input.currency,
                    ORDER_DATE: orderDate,
                    // GUESS — field names not confirmed against real docs.
                    SUCCESS_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/payfast/callback?paymentId=${row.id}&result=success`,
                    FAILURE_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/payfast/callback?paymentId=${row.id}&result=failure`,
                    CUSTOMER_EMAIL_ADDRESS: input.customerEmail ?? "",
                    CUSTOMER_MOBILE_NO: input.customerPhone ?? "",
                },
            },
        };
    }

    async verify(input: VerifyPaymentInput, dbClient: DbClient = db): Promise<VerifyPaymentResult> {
        const { baseUrl } = getPayFastConfig();

        const row = await dbClient.query.payments.findFirst({
            where: (p, { eq }) => eq(p.id, input.paymentId),
        });
        if (!row) throw new Error(`Payment not found: ${input.paymentId}`);

        // Never trust a browser redirect alone — always re-check status
        // directly against PayFast's server using our own basket_id.
        const token = await getAccessToken("0.0.0.0");
        const res = await fetch(`${baseUrl}/transaction/basket_id/${row.id}?order_date=${encodeURIComponent(row.initiatedAt?.toISOString() ?? "")}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        log("verify response", { paymentId: row.id, status_code: json.status_code });

        // GUESS — PayFast's exact success status_code value ("00" per their
        // error code table = "Processed OK") needs confirming against a
        // real response before trusting this mapping in production.
        const isPaid = json.status_code === "00";
        const newStatus = isPaid ? "paid" : "failed";
        const now = new Date();

        await dbClient
            .update(payments)
            .set({
                status: newStatus,
                providerTransactionId: json.transaction_id ?? null,
                verifiedAt: isPaid ? now : null,
                failedAt: isPaid ? null : now,
            })
            .where(eq(payments.id, row.id));

        return { status: newStatus, verifiedAt: isPaid ? now : undefined };
    }

    async refund(input: RefundPaymentInput, dbClient: DbClient = db): Promise<RefundPaymentResult> {
        const { baseUrl } = getPayFastConfig();

        const payment = await dbClient.query.payments.findFirst({
            where: (p, { eq }) => eq(p.id, input.paymentId),
        });
        if (!payment) throw new Error(`Payment not found: ${input.paymentId}`);
        if (!payment.providerTransactionId) {
            throw new Error("Cannot refund a PayFast payment with no confirmed transaction id.");
        }

        const token = await getAccessToken("0.0.0.0");
        const res = await fetch(`${baseUrl}/transaction/refund/${payment.providerTransactionId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${token}`,
            },
            body: new URLSearchParams({
                txnamt: String(input.amount),
                refund_reason: input.reason ?? "Refund",
                customer_ip: "0.0.0.0",
            }),
        });
        const json = await res.json();
        log("refund response", { paymentId: input.paymentId, code: json.code });

        const status = json.code === "00" ? "refunded" : "failed";

        const [refundRow] = await dbClient
            .insert(paymentRefunds)
            .values({
                tenantId: input.tenantId,
                paymentId: input.paymentId,
                amount: input.amount,
                reason: input.reason ?? null,
                status,
                providerRefundId: payment.providerTransactionId,
                createdBy: input.createdBy,
                createdByName: input.createdByName,
            })
            .returning();

        if (status === "refunded") {
            await dbClient
                .update(payments)
                .set({
                    status: input.amount >= payment.amount ? "refunded" : "partially_refunded",
                })
                .where(eq(payments.id, input.paymentId));
        }

        return { refundId: refundRow.id, status: refundRow.status };
    }
}