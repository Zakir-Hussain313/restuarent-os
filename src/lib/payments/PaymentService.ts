import { ManualProvider } from "./providers/ManualProvider";
import type {
    PaymentProvider,
    InitiatePaymentInput,
    InitiatePaymentResult,
    VerifyPaymentInput,
    VerifyPaymentResult,
    RefundPaymentInput,
    RefundPaymentResult,
    DbClient,
} from "./types";

// Registry of available providers, keyed by provider id. Phase 3 adds
// "payfast": new PayFastProvider() here — nothing else in this file, or
// in any caller, needs to change.
const providers: Record<string, PaymentProvider> = {
    manual: new ManualProvider(),
};

function resolveProvider(id: string): PaymentProvider {
    const provider = providers[id];
    if (!provider) {
        throw new Error(`Unknown payment provider: "${id}"`);
    }
    return provider;
}

// Public entry point — every payment-related server action goes through
// this, never through a provider class directly. `providerId` defaults to
// "manual" since that's the only live provider in Phase 1; once PayFast is
// wired up, callers will pass it explicitly based on tenant_settings.
// `dbClient` is optional — pass a transaction to keep this atomic with
// other writes (e.g. completeBillAction's order update); omit it to use
// the top-level db client.
export const PaymentService = {
    async initiate(
        input: InitiatePaymentInput,
        providerId: string = "manual",
        dbClient?: DbClient
    ): Promise<InitiatePaymentResult> {
        return resolveProvider(providerId).initiate(input, dbClient);
    },

    async verify(
        input: VerifyPaymentInput,
        providerId: string = "manual",
        dbClient?: DbClient
    ): Promise<VerifyPaymentResult> {
        return resolveProvider(providerId).verify(input, dbClient);
    },

    async refund(
        input: RefundPaymentInput,
        providerId: string = "manual",
        dbClient?: DbClient
    ): Promise<RefundPaymentResult> {
        return resolveProvider(providerId).refund(input, dbClient);
    },
};