import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = RESTAURANT_CONFIG.currencySymbol): string {
  return `${symbol} ${amount.toLocaleString(RESTAURANT_CONFIG.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(RESTAURANT_CONFIG.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(RESTAURANT_CONFIG.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)}, ${formatTime(dateString)}`;
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateOrderNumber(lastNumber: number): string {
  return `ORD-${String(lastNumber + 1).padStart(4, "0")}`;
}

export function calculateItemTotal(
  basePrice: number,
  variantAdjustment: number,
  modifierAdjustments: number[],
  quantity: number
): number {
  const unitPrice = basePrice + variantAdjustment + modifierAdjustments.reduce((a, b) => a + b, 0);
  return unitPrice * quantity;
}

export function calculateOrderTotals(
  subtotal: number,
  discountAmount: number,
  deliveryFee = 0
) {
  const afterDiscount = subtotal - discountAmount;
  const total = afterDiscount + deliveryFee;

  return { total };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}