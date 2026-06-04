"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { Suspense } from "react";

function ConfirmedContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order") ?? "—";

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-[#1a1815] mb-2">
          Order Placed!
        </h1>
        <p className="text-[#8a8680] text-sm mb-6">
          Your order has been received. We&apos;ll get it to you as soon as possible.
        </p>

        <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6 mb-6 text-left space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8a8680] font-medium uppercase tracking-wide">
              Order Number
            </span>
            <span className="font-mono text-sm font-bold text-[#1a1815]">
              {orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-[#f4f2ef]">
            <Clock className="w-4 h-4 text-[#e8570e] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1a1815]">
                Estimated delivery
              </p>
              <p className="text-xs text-[#8a8680]">30–45 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-[#e8570e] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1a1815]">
                Payment
              </p>
              <p className="text-xs text-[#8a8680]">Cash on delivery</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/order"
            className="w-full bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold py-3 rounded-xl text-sm transition-colors text-center block"
          >
            Order More
          </Link>
          <Link
            href="/"
            className="w-full bg-white border border-[#ebe9e4] hover:bg-[#f4f2ef] text-[#1a1815] font-semibold py-3 rounded-xl text-sm transition-colors text-center block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmedPage() {
  return (
    <Suspense>
      <ConfirmedContent />
    </Suspense>
  );
}