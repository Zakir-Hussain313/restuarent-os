export type TableStatus = "available" | "occupied" | "reserved" | "out_of_service";
export type TableShape = "square" | "rectangle" | "circle" | "oval";
export type TableSeatingType = "chairs" | "sofa";
export type SofaSide = "top" | "bottom" | "left" | "right";
export interface ChairSeat {
  dx: number;
  dy: number;
  angleDeg: number;
}
export type TableColor = "oak" | "walnut" | "mahogany" | "espresso" | "cherry" | "ash";

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
  color: TableColor;
  seatingType: TableSeatingType;
  chairLayout?: ChairSeat[] | null;
  sofaLayout?: { openSides?: SofaSide[]; gaps?: SofaSide[] };
  currentOrderId?: string;
  currentReservationId?: string;
  positionX?: number; // for floor plan
  positionY?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = "pending" | "confirmed" | "seated" | "cancelled" | "no_show";

export interface Reservation {
  id: string;
  branchId: string;
  tableId: string;
  customerName?: string;
  customerPhone: string;
  partySize: number;
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}


