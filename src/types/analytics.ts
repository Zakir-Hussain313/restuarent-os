export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export interface RevenueDataPoint {
  date: string; // "YYYY-MM-DD"
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface TopMenuItem {
  menuItemId: string;
  name: string;
  categoryName: string;
  image?: string;
  quantitySold: number;
  revenue: number;
  rank: number;
}

export interface OrderTypeBreakdown {
  orderType: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface HourlyData {
  hour: number; // 0-23
  orders: number;
  revenue: number;
}

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number; // % vs previous period
  totalOrders: number;
  ordersChange: number;
  averageOrderValue: number;
  aovChange: number;
  totalCustomers: number;
  customersChange: number;
  tablesOccupied: number;
  totalTables: number;
}

export interface AnalyticsReport {
  dateRange: DateRange;
  stats: DashboardStats;
  revenueChart: RevenueDataPoint[];
  topItems: TopMenuItem[];
  orderTypeBreakdown: OrderTypeBreakdown[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  hourlyData: HourlyData[];
}