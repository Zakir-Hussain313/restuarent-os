import type { CustomerType } from "./customer";
import type { SelectedModifier, SelectedVariant } from "./menu";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderType = CustomerType;

export type PaymentMethod =
  | "cash"
  | "card"
  | "jazzcash"
  | "easypaisa"
  | "bank_transfer"
  | "complimentary";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type DiscountType = "percentage" | "fixed";

export interface AppliedDiscount {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // percentage or fixed amount
  appliedAmount: number; // actual amount deducted
  appliedBy: string; // staffId
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string; // denormalized for history
  menuItemImage?: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number; // base price at time of order
  selectedVariant?: SelectedVariant;
  selectedModifiers: SelectedModifier[];
  itemTotal: number; // (unitPrice + variant + modifiers) * quantity
  notes?: string; // e.g. "no onions"
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string; // card last 4, transaction ID, etc.
  processedAt: string;
  processedBy: string; // staffId
}

export interface Order {
  id: string;
  orderNumber: string; // human-readable: "ORD-0042"
  restaurantId: string;
  branchId: string;
  tableId?: string;
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderType: OrderType;
  status: OrderStatus;
  items: OrderItem[];

  // Financials
  subtotal: number;
  discounts: AppliedDiscount[];
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  deliveryFee: number;
  total: number;

  // Payment
  paymentStatus: PaymentStatus;
  payments: Payment[];
  totalPaid: number;
  balance: number; // total - totalPaid

  // Delivery
  deliveryAddress?: string;
  estimatedDeliveryMinutes?: number;

  // Meta
  notes?: string;
  staffId: string; // who took/created the order
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Lightweight version for lists/tables
export type OrderSummary = Pick<
  Order,
  | "id"
  | "orderNumber"
  | "orderType"
  | "status"
  | "paymentStatus"
  | "total"
  | "tableNumber"
  | "customerName"
  | "items"
  | "staffId"
  | "createdAt"
>;