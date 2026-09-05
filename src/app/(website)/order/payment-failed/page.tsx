"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, Phone, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import { initiatePublicPaymentAction } from "@/features/online-ordering/payment-actions";

function PaymentFailedContent() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const orderId = params.get("orderId");

  const [email, setEmail] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const message =
    reason === "verification_failed"
      ? "We couldn't confirm your payment with the gateway. If money was deducted, it will be refunded automatically within a few days."
      : "Your payment didn't go through. No amount has been charged.";

  async function handleRetry() {
    if (!orderId || !email.trim()) return;
    setRetryError(null);
    setIsRetrying(true);

    const res = await initiatePublicPaymentAction(orderId, email.trim());
    setIsRetrying(false);

    if (!res.success) {
      setRetryError(res.error);
      return;
    }

    const { url, fields } = res.checkoutForm;
    const formEl = document.createElement("form");
    formEl.method = "POST";
    formEl.action = url;
    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      formEl.appendChild(input);
    }
    document.body.appendChild(formEl);
    formEl.submit();
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-[#1a1815] mb-2">
          Payment Failed
        </h1>
        <p className="text-[#8a8680] text-sm mb-6">
          {message}
        </p>

        {orderId && (
          <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6 mb-4 text-left">
            <label className="text-xs font-semibold text-[#1a1815] mb-1.5 block">
              Email (for payment receipt)
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 placeholder:text-[#c4c0ba] text-[#1a1815] mb-2"
            />
            {retryError && <p className="text-xs text-destructive mb-2">{retryError}</p>}
            <button
              onClick={handleRetry}
              disabled={isRetrying || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#e8570e] hover:bg-[#c44a0c] disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Retry Payment"
              )}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6 mb-6 text-left">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-[#e8570e] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1a1815]">Need help?</p>
              <p className="text-xs text-[#8a8680]">
                Contact us and we&apos;ll sort out your order manually.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="w-full bg-white border border-[#ebe9e4] hover:bg-[#f4f2ef] text-[#1a1815] font-semibold py-3 rounded-xl text-sm transition-colors text-center block"
        >
          Back to Home
        </Link>

      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <PaymentFailedContent />
    </Suspense>
  );
}