"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { useLocationStore } from "@/store/useLocationStore";
import { usePublicBranchInfo } from "@/features/online-ordering/hooks/useOnlineOrdering";
import { createPublicOrderAction } from "@/features/online-ordering/actions";
import { formatCurrency } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCustomerCartStore((s) => s.items);
  const subtotal = useCustomerCartStore((s) => s.subtotal);
  const clearCart = useCustomerCartStore((s) => s.clearCart);

  const location = useLocationStore((s) => s.location);
  const { branchInfo, isLoading: branchInfoLoading } = usePublicBranchInfo();

  const resolvedBranchId =
    branchInfo?.branchCount === 1 ? branchInfo.singleBranch?.id : location?.branchId;

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [isPlacing, setIsPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (items.length === 0 && !orderPlaced) {
    router.replace("/order");
    return null;
  }

  if (!branchInfoLoading && !resolvedBranchId && !orderPlaced) {
    // No branch resolved — e.g. direct nav to /checkout without going
    // through the location picker first. Send them back to fix that.
    router.replace("/order");
    return null;
  }

  const estimatedDeliveryFee = 150; // display-only estimate; real fee comes from server response
  const estimatedTotal = subtotal() + estimatedDeliveryFee;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.address.trim()) e.address = "Delivery address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleConfirm() {
    if (!validate()) return;
    if (!resolvedBranchId) return;
    setServerError(null);
    setIsPlacing(true);

    const res = await createPublicOrderAction({
      branchId: resolvedBranchId,
      customerName: form.name.trim() || undefined,
      customerPhone: form.phone,
      deliveryAddress: form.address,
      city: location?.city ?? "",
      area: location?.area ?? "",
      items: items.map((ci) => ({
        menuItemId: ci.menuItem.id,
        variantId: ci.selectedVariant?.variantId,
        modifierOptionIds: ci.selectedModifiers.map((m) => m.optionId),
        quantity: ci.quantity,
      })),
    });

    setIsPlacing(false);

    if (!res.success) {
      setServerError(res.error);
      return;
    }

    setOrderPlaced(true);
    clearCart();
    sessionStorage.setItem("rns-last-order-phone", form.phone);
    router.push(`/order/confirmed?order=${res.order.orderNumber}`);
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/order"
          className="inline-flex items-center gap-2 text-sm text-[#8a8680] hover:text-[#1a1815] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to menu
        </Link>

        <h1 className="text-2xl font-bold text-[#1a1815] mb-8">Checkout</h1>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6">
            <h2 className="text-sm font-semibold text-[#1a1815] mb-4">
              Your Details
            </h2>
            <div className="flex flex-col gap-4">
              <Field label="Full Name" icon={<User className="w-4 h-4" />} error={errors.name}>
                <input
                  type="text"
                  placeholder="Ahmed Raza"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 placeholder:text-[#c4c0ba] text-[#1a1815]"
                />
              </Field>
              <Field label="Phone Number" icon={<Phone className="w-4 h-4" />} error={errors.phone}>
                <input
                  type="tel"
                  placeholder="+92 300 0000000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 placeholder:text-[#c4c0ba] text-[#1a1815]"
                />
              </Field>
              <Field label="Delivery Address" icon={<MapPin className="w-4 h-4" />} error={errors.address}>
                <textarea
                  rows={3}
                  placeholder="House 12, Block A"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 placeholder:text-[#c4c0ba] text-[#1a1815] resize-none"
                />
                {location && (
                  <p className="text-xs text-[#8a8680]">
                    Delivering to {location.area}, {location.city}
                  </p>
                )}
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6">
            <h2 className="text-sm font-semibold text-[#1a1815] mb-4">
              Order Summary
            </h2>
            <div className="divide-y divide-[#f4f2ef]">
              {items.map((ci) => (
                <div key={ci.cartItemId} className="flex justify-between py-2.5 text-sm">
                  <span className="text-[#4a4744]">
                    {ci.quantity}× {ci.menuItem.name}
                    {ci.selectedVariant && (
                      <span className="text-[#8a8680]"> ({ci.selectedVariant.variantName})</span>
                    )}
                  </span>
                  <span className="font-medium text-[#1a1815]">
                    {formatCurrency(ci.itemTotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#ebe9e4] space-y-2">
              <div className="flex justify-between text-sm text-[#8a8680]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal())}</span>
              </div>
              <div className="flex justify-between text-sm text-[#8a8680]">
                <span>Delivery fee</span>
                <span>{formatCurrency(estimatedDeliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1a1815] pt-2 border-t border-[#f4f2ef]">
                <span>Estimated Total</span>
                <span className="text-[#e8570e]">{formatCurrency(estimatedTotal)}</span>
              </div>
              <p className="text-xs text-[#8a8680] pt-1">
                Final total confirmed after order is placed.
              </p>
            </div>
          </div>

          {serverError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <p className="text-xs text-[#8a8680] text-center">
            💵 Cash on delivery — pay when your order arrives.
          </p>

          <button
            onClick={handleConfirm}
            disabled={isPlacing}
            className="w-full flex items-center justify-center gap-2 bg-[#e8570e] hover:bg-[#c44a0c] disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-sm transition-colors"
          >
            {isPlacing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Placing your order...
              </>
            ) : (
              "Confirm Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1a1815]">
        <span className="text-[#e8570e]">{icon}</span>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}