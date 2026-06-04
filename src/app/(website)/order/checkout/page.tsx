"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { useOrderStore } from "@/store/useOrderStore";
import { formatCurrency, generateId } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import type { Order, OrderItem, OrderStatus } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCustomerCartStore((s) => s.items);
  const subtotal = useCustomerCartStore((s) => s.subtotal);
  const clearCart = useCustomerCartStore((s) => s.clearCart);
  const addOrder = useOrderStore((s) => s.addOrder);

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [isPlacing, setIsPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (items.length === 0 && !orderPlaced) {
    router.replace("/order");
    return null;
  }

  const deliveryFee = RESTAURANT_CONFIG.defaultDeliveryFee;
  const total = subtotal() + deliveryFee;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.address.trim()) e.address = "Delivery address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleConfirm() {
    if (!validate()) return;
    setIsPlacing(true);

    await new Promise((r) => setTimeout(r, 800));

    const now = new Date().toISOString();
    const orderId = generateId("ord");

    const orderItems: OrderItem[] = items.map((ci) => ({
      id: generateId("oi"),
      orderId,
      menuItemId: ci.menuItem.id,
      menuItemName: ci.menuItem.name,
      categoryId: ci.menuItem.categoryId,
      categoryName: "",
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      selectedVariant: ci.selectedVariant,
      selectedModifiers: ci.selectedModifiers,
      itemTotal: ci.itemTotal,
      status: "pending",
      createdAt: now,
    }));

    const order: Order = {
      id: orderId,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      restaurantId: "rest_001",
      branchId: "branch_001",
      orderType: "delivery",
      status: "pending" as OrderStatus,
      customerPhone: form.phone,
      deliveryAddress: form.address,
      estimatedDeliveryMinutes: 40,
      items: orderItems,
      subtotal: subtotal(),
      discounts: [],
      totalDiscount: 0,
      deliveryFee,
      total,
      paymentStatus: "unpaid",
      payments: [],
      totalPaid: 0,
      balance: total,
      staffId: "customer",
      createdAt: now,
      updatedAt: now,
    };

    setOrderPlaced(true);
    addOrder(order);
    clearCart();
    router.push(`/order/confirmed?order=${order.orderNumber}&phone=${encodeURIComponent(form.phone)}`);
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
                  placeholder="House 12, Block A, Gulshan-e-Iqbal, Karachi"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#ebe9e4] rounded-xl bg-[#faf9f7] focus:outline-none focus:border-[#e8570e] focus:ring-1 focus:ring-[#e8570e]/20 placeholder:text-[#c4c0ba] text-[#1a1815] resize-none"
                />
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
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1a1815] pt-2 border-t border-[#f4f2ef]">
                <span>Total</span>
                <span className="text-[#e8570e]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

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