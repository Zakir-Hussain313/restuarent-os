export type TableStatus = "available" | "occupied" | "reserved";

export type TableShape = "square" | "rectangle" | "circle" | "oval";

export interface TableSection {
  id: string;
  branchId: string;
  name: string; 
  description?: string;
  isActive: boolean;
}

export interface Table {
  id: string;
  branchId: string;
  sectionId: string;
  tableNumber: string; 
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
  branchId: string;
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


