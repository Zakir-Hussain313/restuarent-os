// Centralized PayFast env var access — read once here, everywhere else
// imports from this file instead of touching process.env directly.
// All three are optional at the env-validation layer (see src/lib/env.ts)
// since not every tenant has online payments enabled; this function is
// what actually enforces "all or nothing" at the moment PayFast is used.

export interface PayFastConfig {
    merchantId: string;
    securedKey: string;
    baseUrl: string;
}

export function getPayFastConfig(): PayFastConfig {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const securedKey = process.env.PAYFAST_SECURED_KEY;
    const baseUrl = process.env.PAYFAST_BASE_URL;

    if (!merchantId || !securedKey || !baseUrl) {
        throw new Error(
            "PayFast is not configured for this tenant. Set PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY, and PAYFAST_BASE_URL to enable online payments."
        );
    }

    return { merchantId, securedKey, baseUrl };
}