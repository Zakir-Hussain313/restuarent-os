export type CurrencyCode = "PKR" | "USD" | "GBP" | "AED" | "SAR";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface OperatingHours {
  day: DayOfWeek;
  isOpen: boolean;
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  description: string;
  cuisine: string[];
  phone: string;
  email: string;
  website?: string;
  address: Address;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  taxRate: number; // percentage e.g. 17
  serviceChargeRate: number; // percentage
  operatingHours: OperatingHours[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email: string;
  address: Address;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}