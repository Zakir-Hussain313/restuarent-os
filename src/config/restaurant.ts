export const RESTAURANT_CONFIG = {
  name: process.env.NEXT_PUBLIC_RESTAURANT_NAME,
  tagline: "Taste the Tradition",
  currency: process.env.NEXT_PUBLIC_RESTAURANT_CURRENCY || "PKR",
  currencySymbol: process.env.NEXT_PUBLIC_RESTAURANT_CURRENCY_SYMBOL || "Rs.",
  locale: process.env.NEXT_PUBLIC_RESTAURANT_LOCALE || "en-PK",
  defaultDeliveryFee: 150,
  freeDeliveryThreshold: 2000,
  enableFreeDelivery: false,
  maxTableCapacity: 20,
  orderNumberPrefix: "ORD",
  address: process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS,
  phone: process.env.NEXT_PUBLIC_RESTAURANT_PHONE,
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "yellow",
  confirmed: "blue",
  preparing: "orange",
  ready: "green",
  served: "teal",
  completed: "gray",
  cancelled: "red",
  refunded: "purple",
};

export const TABLE_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
  inactive: "Inactive",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  bank_transfer: "Bank Transfer",
  complimentary: "Complimentary",
};