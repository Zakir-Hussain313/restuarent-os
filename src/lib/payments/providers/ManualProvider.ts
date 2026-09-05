import { db } from "@/db";
import { payments, paymentRefunds } from "@/db/schema";
import { eq } from "drizzle-orm";
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

// Phase 1 provider — no external API, no gateway credentials. Staff record
// cash/card/bank payments themselves; recording = considered paid immediately.
// This is intentionally the ONLY provider wired up right now (see §11/§22
// in project context) — a real PayFastProvider comes in Phase 3 once
// sandbox credentials arrive. Do not fabricate a fake gateway call here.
export class ManualProvider implements PaymentProvider {
    readonly id = "manual";

    async initiate(input: InitiatePaymentInput, dbClient: DbClient = db): Promise<InitiatePaymentResult> {
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
                status: "paid",
                terminalId: input.terminalId ?? null,
                clientPaymentId: input.clientPaymentId ?? null,
                metadata: input.metadata ?? null,
                initiatedAt: new Date(),
                verifiedAt: new Date(),
                processedBy: input.processedBy,
                processedByName: input.processedByName,
            })
            .returning();

        return { paymentId: row.id, status: row.status };
    }

    async verify(input: VerifyPaymentInput, dbClient: DbClient = db): Promise<VerifyPaymentResult> {
        // Manual payments have no external state to reconcile against —
        // whatever status is already in the DB is authoritative.
        const row = await dbClient.query.payments.findFirst({
            where: (p, { eq }) => eq(p.id, input.paymentId),
        });
        if (!row) throw new Error(`Payment not found: ${input.paymentId}`);
        return { status: row.status, verifiedAt: row.verifiedAt ?? undefined };
    }

    async refund(input: RefundPaymentInput, dbClient: DbClient = db): Promise<RefundPaymentResult> {
        // No gateway to call — a manual refund is just a record of the
        // fact, actioned by staff outside the app (e.g. giving cash back).
        const payment = await dbClient.query.payments.findFirst({
            where: (p, { eq }) => eq(p.id, input.paymentId),
        });
        if (!payment) throw new Error(`Payment not found: ${input.paymentId}`);

        const [row] = await dbClient
            .insert(paymentRefunds)
            .values({
                tenantId: input.tenantId,
                paymentId: input.paymentId,
                amount: input.amount,
                reason: input.reason ?? null,
                status: "refunded",
                createdBy: input.createdBy,
                createdByName: input.createdByName,
            })
            .returning();

        await dbClient
            .update(payments)
            .set({
                status: input.amount >= payment.amount ? "refunded" : "partially_refunded",
            })
            .where(eq(payments.id, input.paymentId));

        return { refundId: row.id, status: row.status };
    }
}