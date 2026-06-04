import type { CustomerType } from "./customer";
import type { SelectedModifier, SelectedVariant } from "./menu";

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type OrderType = Exclude<CustomerType, "walk_in">;

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
  value: number;
  appliedAmount: number;
  appliedBy: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  selectedVariant?: SelectedVariant;
  selectedModifiers: SelectedModifier[];
  itemTotal: number;
  notes?: string;
  status: "pending" | "cancelled";
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  processedAt: string;
  processedBy: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  branchId: string;

  tableId?: string;
  tableNumber?: string;

  customerId?: string;
  customerPhone?: string;

  orderType: OrderType;
  status: OrderStatus;
  items: OrderItem[];

  subtotal: number;
  discounts: AppliedDiscount[];
  totalDiscount: number;
  deliveryFee: number;
  total: number;

  paymentStatus: PaymentStatus;
  payments: Payment[];
  totalPaid: number;
  balance: number;

  deliveryAddress?: string;
  estimatedDeliveryMinutes?: number;

  notes?: string;
  staffId: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string; 
}

export type OrderSummary = Pick<Order, "id" | "orderNumber" | "orderType" | "status" | "paymentStatus" | "total" | "tableNumber" | "items" | "staffId" | "createdAt">;