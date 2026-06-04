import type { Restaurant } from "@/types";

export const mockRestaurant: Restaurant = {
  id: "rest_001",
  name: "Zaiqa Restaurant",
  slug: "zaiqa-restaurant",
  logo: "/images/logo.png",
  coverImage: "/images/cover.jpg",
  description:
    "Authentic Pakistani cuisine crafted with family recipes passed down through generations. Experience the rich flavors of Lahori, Karachi, and Peshawar cuisines under one roof.",
  cuisine: ["Pakistani", "Mughlai", "BBQ", "Continental"],
  phone: "+92 300 1234567",
  email: "info@zaiqarestaurant.pk",
  website: "https://zaiqarestaurant.pk",
  address: {
    street: "Plot 45, Block 6, PECHS",
    city: "Karachi",
    state: "Sindh",
    postalCode: "75400",
    country: "Pakistan",
    coordinates: { lat: 24.8607, lng: 67.0011 },
  },
  currencyCode: "PKR",
  currencySymbol: "Rs.",
  operatingHours: [
    { day: "monday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
    { day: "tuesday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
    { day: "wednesday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
    { day: "thursday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
    { day: "friday", isOpen: true, openTime: "13:30", closeTime: "00:00" },
    { day: "saturday", isOpen: true, openTime: "11:00", closeTime: "00:00" },
    { day: "sunday", isOpen: true, openTime: "11:00", closeTime: "23:30" },
  ],
  isActive: true,
  createdAt: "2022-01-15T10:00:00Z",
  updatedAt: "2024-11-01T08:00:00Z",
};
