export type CustomerType = "dine_in" | "takeaway" | "delivery" | "walk_in";

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string; // "Home", "Work", "Other"
  street: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone: string;
  addresses: CustomerAddress[];
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderAt?: string;
  notes?: string;
  isBlacklisted: boolean;
  createdAt: string;
  updatedAt: string;
}