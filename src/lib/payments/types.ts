import type { paymentMethodEnum, paymentStatusLifecycleEnum } from "@/db/schema/enums";
import type { db } from "@/db";

export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatusLifecycle = (typeof paymentStatusLifecycleEnum.enumValues)[number];

// A provider method can run against the top-level db client or an existing
// transaction — this lets callers like completeBillAction keep the payment
// insert atomic with their own order-update transaction, while callers that
// don't need that (e.g. a future standalone payment endpoint) just omit it.
export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Input to initiate a payment against an order. Shape is provider-agnostic —
// a real gateway adapter (PayFast, Phase 3) will use amount/currency/orderId
// to build its own checkout/API payload; ManualProvider just records it.
export interface InitiatePaymentInput {
    tenantId: string;
    branchId: string | null;
    orderId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    terminalId?: string;
    clientPaymentId?: string;
    processedBy: string;
    processedByName: string;
    metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
    paymentId: string;
    status: PaymentStatusLifecycle;
    // Present only for redirect-based gateways (e.g. PayFast checkout URL).
    // ManualProvider never sets this.
    redirectUrl?: string;
}

// Input to verify/reconcile a payment already recorded (e.g. from a webhook,
// or a manual "check status" action). ManualProvider treats this as a no-op
// since manual payments are considered final the moment they're recorded.
export interface VerifyPaymentInput {
    paymentId: string;
    providerTransactionId?: string;
}

export interface VerifyPaymentResult {
    status: PaymentStatusLifecycle;
    verifiedAt?: Date;
}

export interface RefundPaymentInput {
    paymentId: string;
    tenantId: string;
    amount: number;
    reason?: string;
    createdBy: string;
    createdByName: string;
}

export interface RefundPaymentResult {
    refundId: string;
    status: PaymentStatusLifecycle;
}

// Every gateway adapter (ManualProvider now, PayFastProvider in Phase 3)
// implements this. PaymentService never talks to a provider's real API
// directly — only through this interface.
export interface PaymentProvider {
    readonly id: string; // "manual" | "payfast" | ...
    initiate(input: InitiatePaymentInput, dbClient?: DbClient): Promise<InitiatePaymentResult>;
    verify(input: VerifyPaymentInput, dbClient?: DbClient): Promise<VerifyPaymentResult>;
    refund(input: RefundPaymentInput, dbClient?: DbClient): Promise<RefundPaymentResult>;
}