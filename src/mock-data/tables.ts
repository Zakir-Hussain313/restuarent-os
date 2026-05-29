import type { Table, TableSection } from "@/types";

export const mockTableSections: TableSection[] = [
  {
    id: "sec_001",
    restaurantId: "rest_001",
    name: "Main Hall",
    description: "Air-conditioned main dining area",
    isActive: true,
  },
  {
    id: "sec_002",
    restaurantId: "rest_001",
    name: "Outdoor",
    description: "Open-air seating with garden view",
    isActive: true,
  },
  {
    id: "sec_003",
    restaurantId: "rest_001",
    name: "VIP Room",
    description: "Private dining room for special occasions",
    isActive: true,
  },
];

export const mockTables: Table[] = [
  // Main Hall
  { id: "tbl_001", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T1", capacity: 4, shape: "square", status: "occupied", currentOrderId: "ord_001", positionX: 1, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_002", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T2", capacity: 4, shape: "square", status: "available", positionX: 2, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_003", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T3", capacity: 6, shape: "rectangle", status: "occupied", currentOrderId: "ord_002", positionX: 3, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_004", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T4", capacity: 2, shape: "circle", status: "reserved", positionX: 1, positionY: 2, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_005", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T5", capacity: 4, shape: "square", status: "available", positionX: 2, positionY: 2, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_006", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T6", capacity: 8, shape: "rectangle", status: "cleaning", positionX: 3, positionY: 2, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_007", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T7", capacity: 4, shape: "square", status: "occupied", currentOrderId: "ord_003", positionX: 1, positionY: 3, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_008", restaurantId: "rest_001", sectionId: "sec_001", tableNumber: "T8", capacity: 4, shape: "square", status: "available", positionX: 2, positionY: 3, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  // Outdoor
  { id: "tbl_009", restaurantId: "rest_001", sectionId: "sec_002", tableNumber: "O1", capacity: 4, shape: "circle", status: "available", positionX: 1, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_010", restaurantId: "rest_001", sectionId: "sec_002", tableNumber: "O2", capacity: 4, shape: "circle", status: "occupied", currentOrderId: "ord_004", positionX: 2, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_011", restaurantId: "rest_001", sectionId: "sec_002", tableNumber: "O3", capacity: 6, shape: "rectangle", status: "available", positionX: 3, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_012", restaurantId: "rest_001", sectionId: "sec_002", tableNumber: "O4", capacity: 8, shape: "rectangle", status: "available", positionX: 1, positionY: 2, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  // VIP
  { id: "tbl_013", restaurantId: "rest_001", sectionId: "sec_003", tableNumber: "VIP1", capacity: 10, shape: "oval", status: "available", positionX: 1, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
  { id: "tbl_014", restaurantId: "rest_001", sectionId: "sec_003", tableNumber: "VIP2", capacity: 8, shape: "rectangle", status: "reserved", positionX: 2, positionY: 1, isActive: true, createdAt: "2022-01-15T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
];