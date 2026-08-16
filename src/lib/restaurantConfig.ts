export const RESTAURANT_CONFIG = {
  name: process.env.NEXT_PUBLIC_RESTAURANT_NAME!,
  currency: process.env.NEXT_PUBLIC_RESTAURANT_CURRENCY!,
  currencySymbol: process.env.NEXT_PUBLIC_RESTAURANT_CURRENCY_SYMBOL!,
  locale: process.env.NEXT_PUBLIC_RESTAURANT_LOCALE!,
  city: process.env.NEXT_PUBLIC_RESTAURANT_CITY!,
  country: process.env.NEXT_PUBLIC_RESTAURANT_COUNTRY!,
  timezone: process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE!,
} as const;