export type TableStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "inactive";

export type TableShape = "square" | "rectangle" | "circle" | "oval";

export interface TableSection {
  id: string;
  restaurantId: string;
  name: string; // "Indoor", "Outdoor", "VIP", "Rooftop"
  description?: string;
  isActive: boolean;
}

export interface Table {
  id: string;
  restaurantId: string;
  sectionId: string;
  tableNumber: string; // "T1", "A3", "VIP-1"
  capacity: number;
  shape: TableShape;
  status: TableStatus;
  currentOrderId?: string;
  currentReservationId?: string;
  positionX?: number; // for floor plan
  positionY?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  tableId: string;
  customerId?: string;
  customerPhone: string;
  partySize: number;
  reservedAt: string; // ISO datetime
  durationMinutes: number;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}


