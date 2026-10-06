import { useEffect, useState, useMemo } from "react";

export type ItemType = "Reusable Asset" | "Consumable Material";

export type InventoryCategory =
  | "All"
  | "Flowers"
  | "Decorative Materials"
  | "Signage"
  | "Equipment"
  | "Furniture & Props"
  | "Other Event Items"
  // Legacy categories for backward compatibility:
  | "Floral & Mandap"
  | "Lighting & Electrical"
  | "Drapes & Fabrics"
  | "Stage & Structure"
  | "Rigging & Structures"
  | "Audio & Special Effects";

export type InventoryUnit =
  | "Piece"
  | "Bunch"
  | "Set"
  | "Meter"
  | "Feet"
  | "Roll"
  | "Box"
  | "Kg"
  | "Other";

export type ItemCondition =
  | "Excellent"
  | "Good"
  | "Needs Repair"
  | "Under Maintenance"
  | "New"
  | "N/A - Consumable";

export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

// Legacy status compatibility
export type ItemStatusType = "Shortage" | "Fully Reserved" | "Partial" | "Low Stock" | "Good" | InventoryStatus;

export type VendorUnitConversion = {
  enabled: boolean;
  fromUnit: string; // e.g. "Bunch"
  toUnit: string;   // e.g. "Piece"
  factor: number;   // e.g. 20 (meaning 1 bunch = 20 pieces)
  notes?: string;
};

export type StockAdjustmentType =
  | "Stock Added"
  | "Stock Removed"
  | "Damaged"
  | "Lost"
  | "Returned"
  | "Manual Correction";

export type StockMovement = {
  id: string;
  inventory_item_id: string;
  movement_type: StockAdjustmentType;
  quantity: number; // positive magnitude of adjustment
  unit: string;
  previous_quantity: number;
  resulting_quantity: number;
  reason: string;
  reference_type?: string | undefined;
  reference_id?: string | undefined;
  created_by: string;
  created_at: string; // ISO timestamp
};

export type InventoryItem = {
  id: string;
  name: string;
  category: Exclude<InventoryCategory, "All">;
  itemType: ItemType;
  quantity: number; // total quantity owned
  unit: string;
  availableQuantity: number; // calculated: max(0, quantity - reservedQuantity - (inMaintenance || 0))
  reservedQuantity: number; // currently reserved
  minimumStockLevel: number; // threshold for low stock alert
  storageLocation: string;
  condition: ItemCondition;
  purchaseCost: number; // purchase/replenishment cost in local currency
  supplier: string; // vendor/wholesaler name
  image?: string | undefined;
  description: string;
  unitConversion?: VendorUnitConversion | undefined;
  flowerSubtype?: "Natural" | "Artificial" | "Mixed" | undefined;
  archived?: boolean | undefined;
  createdDate: string; // ISO timestamp
  updatedDate: string; // ISO timestamp

  // Backward compatibility aliases:
  sku: string;
  totalStock: number; // mirrors quantity
  reservedStock: number; // mirrors reservedQuantity
  inMaintenance: number;
  location: string; // mirrors storageLocation
  imageUrl?: string | undefined; // mirrors image
  rentalRate: number; // per-event rental rate
};

export type ConflictResolution =
  | "Unresolved"
  | "Sub-rented from Vendor"
  | "Substituted Alternative"
  | "Client Scope Adjusted";

export type ReservationConflict = {
  id: string;
  itemId: string;
  itemName: string;
  category: Exclude<InventoryCategory, "All">;
  conflictDate: string;
  shortage: number;
  available: number;
  required: number;
  status: ConflictResolution;
  resolutionNote?: string | undefined;
  conflictingFunctions: {
    functionId: string;
    client: string;
    functionType: string;
    qtyRequired: number;
    venue: string;
  }[];
};

export type SetupStatus =
  | "Not Started"
  | "Loading & Packing"
  | "Setup In Progress"
  | "Ready & Inspected"
  | "Teardown Pending"
  | "Completed & Restocked";

export type SetupChecklistItem = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  loaded: boolean;
  returned: boolean;
};

export type FunctionSetupTask = {
  id: string;
  functionId: string;
  clientName: string;
  functionType: string;
  eventDate: string;
  daysRemaining: number;
  venue: string;
  setupLead: string;
  crewCount: number;
  scheduledDispatch: string;
  completionDeadline: string;
  status: SetupStatus;
  checklist: SetupChecklistItem[];
  notes?: string;
};

/**
 * Automatically calculates item inventory status:
 * - "Out of Stock": available <= 0
 * - "Low Stock": 0 < available <= minimumStockLevel
 * - "In Stock": available > minimumStockLevel
 */
export function calculateInventoryStatus(
  availableQuantity: number,
  minimumStockLevel: number = 0,
): {
  status: InventoryStatus;
  label: string;
  badgeClass: string;
} {
  if (availableQuantity <= 0) {
    return {
      status: "Out of Stock",
      label: "Out of Stock",
      badgeClass: "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300",
    };
  }
  if (availableQuantity <= minimumStockLevel) {
    return {
      status: "Low Stock",
      label: "Low Stock",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }
  return {
    status: "In Stock",
    label: "In Stock",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300",
  };
}

/**
 * Compatibility wrapper for existing component lookups
 */
export function getItemStatus(item: InventoryItem): {
  status: InventoryStatus | ItemStatusType;
  label: string;
} {
  const avail = item.availableQuantity ?? Math.max(0, (item.quantity ?? item.totalStock ?? 0) - (item.reservedQuantity ?? item.reservedStock ?? 0) - (item.inMaintenance || 0));
  const min = item.minimumStockLevel ?? 5;
  const result = calculateInventoryStatus(avail, min);
  return { status: result.status, label: result.label };
}

/**
 * Normalizes an item ensuring both canonical new properties and compatibility fields exist
 */
export function normalizeInventoryItem(raw: any): InventoryItem {
  const quantity = Number(raw.quantity ?? raw.totalStock ?? 0);
  const reservedQuantity = Number(raw.reservedQuantity ?? raw.reservedStock ?? 0);
  const inMaintenance = Number(raw.inMaintenance ?? 0);
  const minimumStockLevel = Number(raw.minimumStockLevel ?? 5);
  const availableQuantity = Math.max(0, quantity - reservedQuantity - inMaintenance);

  // Infer item type if missing
  let itemType: ItemType = raw.itemType;
  if (!itemType) {
    const nameLower = (raw.name || "").toLowerCase();
    const catLower = (raw.category || "").toLowerCase();
    if (
      nameLower.includes("rose") ||
      nameLower.includes("foam") ||
      nameLower.includes("tape") ||
      nameLower.includes("ribbon") ||
      nameLower.includes("adhesive") ||
      catLower.includes("flower")
    ) {
      itemType = "Consumable Material";
    } else {
      itemType = "Reusable Asset";
    }
  }

  const storageLocation = raw.storageLocation || raw.location || "Warehouse Bay A";
  const image = raw.image || raw.imageUrl || "";

  return {
    id: raw.id || `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: raw.name || "Untitled Item",
    category: raw.category || "Decorative Materials",
    itemType,
    quantity,
    unit: raw.unit || "Piece",
    availableQuantity,
    reservedQuantity,
    minimumStockLevel,
    storageLocation,
    condition: raw.condition || (itemType === "Consumable Material" ? "N/A - Consumable" : "Good"),
    purchaseCost: Number(raw.purchaseCost ?? 0),
    supplier: raw.supplier || "Kathmandu Decor Suppliers",
    image,
    description: raw.description || "",
    unitConversion: raw.unitConversion,
    flowerSubtype: raw.flowerSubtype || ((raw.category === "Flowers" || raw.category === "Floral & Mandap") ? "Natural" : undefined),
    archived: Boolean(raw.archived),
    createdDate: raw.createdDate || raw.createdAt || new Date().toISOString(),
    updatedDate: raw.updatedDate || new Date().toISOString(),

    // Backward compatibility aliases:
    sku: raw.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`,
    totalStock: quantity,
    reservedStock: reservedQuantity,
    inMaintenance,
    location: storageLocation,
    imageUrl: image,
    rentalRate: Number(raw.rentalRate ?? 0),
  };
}

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  // ================= REUSABLE ASSETS =================
  {
    id: "inv-board-1",
    name: "Plain White Welcome Board",
    category: "Signage",
    itemType: "Reusable Asset",
    quantity: 12,
    unit: "Piece",
    availableQuantity: 12,
    reservedQuantity: 0,
    minimumStockLevel: 3,
    storageLocation: "Storage Unit 2",
    condition: "Excellent",
    purchaseCost: 2200,
    supplier: "Apex Display Solutions",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&auto=format&fit=crop&q=80",
    description: "Rigid heavy-duty 4x2.5 ft matte white acrylic board for personalized event lettering.",
    createdDate: "2026-03-01T10:00:00Z",
    updatedDate: "2026-03-01T10:00:00Z",
    sku: "SGN-BRD-01",
    totalStock: 12,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 2",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&auto=format&fit=crop&q=80",
    rentalRate: 1500,
  },
  {
    id: "inv-stand-1",
    name: "Dark Walnut Easel Board Stand",
    category: "Signage",
    itemType: "Reusable Asset",
    quantity: 10,
    unit: "Piece",
    availableQuantity: 10,
    reservedQuantity: 0,
    minimumStockLevel: 2,
    storageLocation: "Storage Unit 2",
    condition: "Good",
    purchaseCost: 1800,
    supplier: "Craft Wood Works",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80",
    description: "Adjustable height tripod easel stand finished in rich dark walnut stain.",
    createdDate: "2026-03-02T11:00:00Z",
    updatedDate: "2026-03-02T11:00:00Z",
    sku: "SGN-STN-02",
    totalStock: 10,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 2",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80",
    rentalRate: 800,
  },
  {
    id: "inv-arch-1",
    name: "Geometric Hexagon Metal Arch",
    category: "Decorative Materials",
    itemType: "Reusable Asset",
    quantity: 4,
    unit: "Set",
    availableQuantity: 4,
    reservedQuantity: 0,
    minimumStockLevel: 1,
    storageLocation: "Warehouse Bay A",
    condition: "Excellent",
    purchaseCost: 28000,
    supplier: "Everest Metal Fabrication",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&auto=format&fit=crop&q=80",
    description: "Gold powder-coated modular 7.5 ft hexagon metal arch structure for photo ops and gateways.",
    createdDate: "2026-03-03T09:30:00Z",
    updatedDate: "2026-03-03T09:30:00Z",
    sku: "DEC-ARC-01",
    totalStock: 4,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Warehouse Bay A",
    imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&auto=format&fit=crop&q=80",
    rentalRate: 8500,
  },
  {
    id: "inv-light-1",
    name: "Warm White LED Par Can Spotlight",
    category: "Equipment",
    itemType: "Reusable Asset",
    quantity: 30,
    unit: "Piece",
    availableQuantity: 30,
    reservedQuantity: 0,
    minimumStockLevel: 6,
    storageLocation: "Warehouse Bay B",
    condition: "Good",
    purchaseCost: 3500,
    supplier: "Bright Stage & Lighting",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80",
    description: "54x3W warm white wash stage light with adjustable beam angle and mounting bracket.",
    createdDate: "2026-03-04T14:00:00Z",
    updatedDate: "2026-03-04T14:00:00Z",
    sku: "EQP-PAR-01",
    totalStock: 30,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Warehouse Bay B",
    imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80",
    rentalRate: 500,
  },
  {
    id: "inv-silkflower-1",
    name: "Artificial Silk Hydrangea & Rose Swag",
    category: "Decorative Materials",
    itemType: "Reusable Asset",
    quantity: 16,
    unit: "Set",
    availableQuantity: 16,
    reservedQuantity: 0,
    minimumStockLevel: 4,
    storageLocation: "Warehouse Bay C",
    condition: "Excellent",
    purchaseCost: 4500,
    supplier: "Silk Flora International",
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=200&auto=format&fit=crop&q=80",
    description: "High-density reusable silk floral garland swags (6 ft) in ivory and blush pink.",
    createdDate: "2026-03-05T12:00:00Z",
    updatedDate: "2026-03-05T12:00:00Z",
    sku: "DEC-SLK-01",
    totalStock: 16,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Warehouse Bay C",
    imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=200&auto=format&fit=crop&q=80",
    rentalRate: 1800,
  },
  {
    id: "inv-chair-1",
    name: "Velvet Chiavari Banquet Chairs",
    category: "Furniture & Props",
    itemType: "Reusable Asset",
    quantity: 100,
    unit: "Piece",
    availableQuantity: 50,
    reservedQuantity: 50,
    minimumStockLevel: 20,
    storageLocation: "Storage Unit 4",
    condition: "Good",
    purchaseCost: 2800,
    supplier: "Royal Banquet Furniture",
    image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=200&auto=format&fit=crop&q=80",
    description: "Luxury champagne gold metal chiavari banquet chairs with detachable cream velvet cushions.",
    createdDate: "2026-03-06T10:00:00Z",
    updatedDate: "2026-03-06T10:00:00Z",
    sku: "FRN-CHV-01",
    totalStock: 100,
    reservedStock: 50,
    inMaintenance: 0,
    location: "Storage Unit 4",
    imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=200&auto=format&fit=crop&q=80",
    rentalRate: 250,
  },

  // ================= CONSUMABLE MATERIALS =================
  {
    id: "inv-rose-1",
    name: "Natural Fresh Dutch Red Roses",
    category: "Flowers",
    itemType: "Consumable Material",
    quantity: 25,
    unit: "Bunch",
    availableQuantity: 25,
    reservedQuantity: 0,
    minimumStockLevel: 5,
    storageLocation: "Cold Storage Bay",
    condition: "New",
    purchaseCost: 650,
    supplier: "Valley Flora Greenhouse Farm",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80",
    description: "Grade-A long stem fresh red roses imported for stage and mandap floral arrangement.",
    unitConversion: {
      enabled: true,
      fromUnit: "Bunch",
      toUnit: "Piece",
      factor: 20,
      notes: "1 bunch contains 20 individual stems",
    },
    createdDate: "2026-03-07T08:00:00Z",
    updatedDate: "2026-03-07T08:00:00Z",
    sku: "FLR-ROS-01",
    totalStock: 25,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Cold Storage Bay",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80",
    rentalRate: 1200,
  },
  {
    id: "inv-foam-1",
    name: "Green Oasis Floral Foam Bricks",
    category: "Decorative Materials",
    itemType: "Consumable Material",
    quantity: 15,
    unit: "Box",
    availableQuantity: 15,
    reservedQuantity: 0,
    minimumStockLevel: 4,
    storageLocation: "Storage Unit 1",
    condition: "New",
    purchaseCost: 1800,
    supplier: "Oasis Floral Supplies Ltd.",
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&auto=format&fit=crop&q=80",
    description: "High-water absorption green wet floral foam bricks for flower centerpieces.",
    unitConversion: {
      enabled: true,
      fromUnit: "Box",
      toUnit: "Piece",
      factor: 20,
      notes: "1 box contains 20 floral foam bricks",
    },
    createdDate: "2026-03-08T09:00:00Z",
    updatedDate: "2026-03-08T09:00:00Z",
    sku: "DEC-FOM-01",
    totalStock: 15,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 1",
    imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&auto=format&fit=crop&q=80",
    rentalRate: 2500,
  },
  {
    id: "inv-tape-1",
    name: "Waterproof Floral Stem Tape (Green)",
    category: "Decorative Materials",
    itemType: "Consumable Material",
    quantity: 40,
    unit: "Roll",
    availableQuantity: 40,
    reservedQuantity: 0,
    minimumStockLevel: 10,
    storageLocation: "Storage Unit 1",
    condition: "New",
    purchaseCost: 120,
    supplier: "Craft Corner Wholesale",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=80",
    description: "Self-sealing green floral tape for wrapping bouquets, boutonnieres, and wiring.",
    createdDate: "2026-03-09T10:30:00Z",
    updatedDate: "2026-03-09T10:30:00Z",
    sku: "DEC-TAP-01",
    totalStock: 40,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 1",
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=80",
    rentalRate: 200,
  },
  {
    id: "inv-ribbon-1",
    name: "Satin Ribbon (Champagne Gold 2-Inch)",
    category: "Decorative Materials",
    itemType: "Consumable Material",
    quantity: 35,
    unit: "Roll",
    availableQuantity: 35,
    reservedQuantity: 0,
    minimumStockLevel: 8,
    storageLocation: "Storage Unit 3",
    condition: "New",
    purchaseCost: 350,
    supplier: "Kathmandu Textile Importers",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80",
    description: "Luxe double-faced champagne gold satin ribbon roll (50 yards per roll).",
    unitConversion: {
      enabled: true,
      fromUnit: "Roll",
      toUnit: "Meter",
      factor: 45,
      notes: "1 roll is approximately 45.7 meters",
    },
    createdDate: "2026-03-10T11:15:00Z",
    updatedDate: "2026-03-10T11:15:00Z",
    sku: "DEC-RBN-01",
    totalStock: 35,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 3",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80",
    rentalRate: 500,
  },
  {
    id: "inv-adhesive-1",
    name: "Heavy Duty Multi-Surface Spray Adhesive",
    category: "Other Event Items",
    itemType: "Consumable Material",
    quantity: 8,
    unit: "Piece",
    availableQuantity: 8,
    reservedQuantity: 0,
    minimumStockLevel: 3,
    storageLocation: "Storage Unit 1",
    condition: "New",
    purchaseCost: 950,
    supplier: "Industrial Hardware House",
    image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=200&auto=format&fit=crop&q=80",
    description: "Aerosol high-strength bonding adhesive for fabric backdrop draping and foam boarding.",
    createdDate: "2026-03-11T13:45:00Z",
    updatedDate: "2026-03-11T13:45:00Z",
    sku: "MSC-ADH-01",
    totalStock: 8,
    reservedStock: 0,
    inMaintenance: 0,
    location: "Storage Unit 1",
    imageUrl: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=200&auto=format&fit=crop&q=80",
    rentalRate: 1200,
  },
  {
    id: "inv-lights-2",
    name: "Warm White Fairy String Lights (50m)",
    category: "Equipment",
    itemType: "Reusable Asset",
    quantity: 35,
    unit: "Roll",
    availableQuantity: 0,
    reservedQuantity: 40,
    minimumStockLevel: 5,
    storageLocation: "Warehouse Bay A",
    condition: "Good",
    purchaseCost: 1200,
    supplier: "Everest Lightings",
    image: "https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=200&auto=format&fit=crop&q=80",
    description: "Commercial copper wire warm fairy lights for ambient ceiling and canopy coverage.",
    createdDate: "2026-03-01T10:00:00Z",
    updatedDate: "2026-03-01T10:00:00Z",
    sku: "LGT-STR-01",
    totalStock: 35,
    reservedStock: 40,
    inMaintenance: 0,
    location: "Warehouse Bay A",
    imageUrl: "https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=200&auto=format&fit=crop&q=80",
    rentalRate: 1500,
  },
];

export const INITIAL_CONFLICTS: ReservationConflict[] = [
  {
    id: "conf-1",
    itemId: "inv-lights-2",
    itemName: "Warm White Fairy String Lights (50m)",
    category: "Equipment",
    conflictDate: "Sep 16 (Today)",
    shortage: 5,
    available: 35,
    required: 40,
    status: "Unresolved",
    conflictingFunctions: [
      {
        functionId: "aarav-riya-wedding",
        client: "Aarav & Riya",
        functionType: "Wedding Reception",
        qtyRequired: 25,
        venue: "The Soaltee, Kathmandu",
      },
      {
        functionId: "shrestha-reception",
        client: "Shrestha Family",
        functionType: "Private Pre-Wedding",
        qtyRequired: 15,
        venue: "Hotel Himalaya, Lalitpur",
      },
    ],
  },
];

export const INITIAL_SETUP_TASKS: FunctionSetupTask[] = [
  {
    id: "setup-1",
    functionId: "aarav-riya-wedding",
    clientName: "Aarav & Riya",
    functionType: "Wedding Reception",
    eventDate: "Sep 16 (Today)",
    daysRemaining: 0,
    venue: "The Soaltee, Kathmandu (Grand Ballroom)",
    setupLead: "Ramesh Thapa",
    crewCount: 6,
    scheduledDispatch: "08:00 AM",
    completionDeadline: "04:30 PM",
    status: "Setup In Progress",
    notes: "Client requested mandap flower alignment inspection by 3:00 PM.",
    checklist: [
      {
        id: "chk-1-1",
        itemId: "inv-arch-1",
        itemName: "Geometric Hexagon Metal Arch",
        quantity: 1,
        unit: "Set",
        loaded: true,
        returned: false,
      },
      {
        id: "chk-1-2",
        itemId: "inv-lights-2",
        itemName: "Warm White Fairy String Lights (50m)",
        quantity: 25,
        unit: "Roll",
        loaded: true,
        returned: false,
      },
      {
        id: "chk-1-3",
        itemId: "inv-chair-1",
        itemName: "Velvet Chiavari Banquet Chairs",
        quantity: 50,
        unit: "Piece",
        loaded: true,
        returned: false,
      },
    ],
  },
  {
    id: "setup-2",
    functionId: "karki-mehendi",
    clientName: "Anisha Karki",
    functionType: "Mehendi Ceremony",
    eventDate: "Sep 19 (+3 Days)",
    daysRemaining: 3,
    venue: "Heritage Garden, Bhaktapur",
    setupLead: "Suman Maharjan",
    crewCount: 4,
    scheduledDispatch: "09:30 AM",
    completionDeadline: "03:00 PM",
    status: "Loading & Packing",
    notes: "Outdoor lawn setup. Extra canopy weights required.",
    checklist: [
      {
        id: "chk-2-1",
        itemId: "inv-board-1",
        itemName: "Plain White Welcome Board",
        quantity: 1,
        unit: "Piece",
        loaded: true,
        returned: false,
      },
      {
        id: "chk-2-2",
        itemId: "inv-stand-1",
        itemName: "Dark Walnut Easel Board Stand",
        quantity: 1,
        unit: "Piece",
        loaded: true,
        returned: false,
      },
      {
        id: "chk-2-3",
        itemId: "inv-rose-1",
        itemName: "Natural Fresh Dutch Red Roses",
        quantity: 10,
        unit: "Bunch",
        loaded: true,
        returned: false,
      },
    ],
  },
  {
    id: "setup-3",
    functionId: "shrestha-reception",
    clientName: "Shrestha Family",
    functionType: "Reception Gala",
    eventDate: "Sep 23 (+7 Days)",
    daysRemaining: 7,
    venue: "Hotel Himalaya, Lalitpur",
    setupLead: "Nisha Gurung",
    crewCount: 5,
    scheduledDispatch: "07:00 AM",
    completionDeadline: "02:00 PM",
    status: "Not Started",
    notes: "Includes ceiling fairy light canopy and floral wall backdrop.",
    checklist: [
      {
        id: "chk-3-1",
        itemId: "inv-lights-2",
        itemName: "Warm White Fairy String Lights (50m)",
        quantity: 15,
        unit: "Roll",
        loaded: false,
        returned: false,
      },
      {
        id: "chk-3-2",
        itemId: "inv-silkflower-1",
        itemName: "Artificial Silk Hydrangea & Rose Swag",
        quantity: 6,
        unit: "Set",
        loaded: false,
        returned: false,
      },
    ],
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: "mov-init-1",
    inventory_item_id: "inv-flower-1", // Natural Red Dutch Roses
    movement_type: "Stock Added",
    quantity: 180,
    unit: "Piece",
    previous_quantity: 0,
    resulting_quantity: 180,
    reason: "Initial wholesale intake from Royal Florals Wholesale",
    reference_type: "Purchase Order",
    reference_id: "PO-2026-081",
    created_by: "Suman Maharjan (Warehouse Lead)",
    created_at: "2026-03-01T09:00:00Z",
  },
  {
    id: "mov-init-2",
    inventory_item_id: "inv-board-1", // Plain White Welcome Board
    movement_type: "Stock Added",
    quantity: 10,
    unit: "Piece",
    previous_quantity: 0,
    resulting_quantity: 10,
    reason: "Procurement of stage signage welcome boards",
    reference_type: "Initial Inventory",
    reference_id: "INIT-2026-001",
    created_by: "Pooja Sharma (Logistics Manager)",
    created_at: "2026-03-02T10:30:00Z",
  },
  {
    id: "mov-init-3",
    inventory_item_id: "inv-lights-2", // Warm White Fairy String Lights
    movement_type: "Stock Added",
    quantity: 35,
    unit: "Roll",
    previous_quantity: 0,
    resulting_quantity: 35,
    reason: "Procurement for spring wedding season",
    reference_type: "Purchase Order",
    reference_id: "PO-2026-094",
    created_by: "Ramesh Thapa (Lead Electrician)",
    created_at: "2026-03-05T14:15:00Z",
  },
  {
    id: "mov-init-4",
    inventory_item_id: "inv-flower-1", // Natural Red Dutch Roses
    movement_type: "Stock Added",
    quantity: 20,
    unit: "Piece",
    previous_quantity: 180,
    resulting_quantity: 200,
    reason: "Batch replenishment for upcoming banquet bookings",
    reference_type: "Vendor Delivery",
    reference_id: "DEL-2026-441",
    created_by: "Suman Maharjan (Warehouse Lead)",
    created_at: "2026-03-14T11:20:00Z",
  },
];

const STORAGE_KEYS = {
  ITEMS: "decoration-portal:inventory-items",
  CONFLICTS: "decoration-portal:reservation-conflicts",
  SETUPS: "decoration-portal:setup-tasks",
  MOVEMENTS: "decoration-portal:stock-movements",
};

export function loadStoredItems(): InventoryItem[] {
  if (typeof window === "undefined") return INITIAL_INVENTORY_ITEMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) return INITIAL_INVENTORY_ITEMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_INVENTORY_ITEMS;
    return parsed.map((item) => normalizeInventoryItem(item));
  } catch {
    return INITIAL_INVENTORY_ITEMS;
  }
}

export function saveStoredItems(items: InventoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
}

export function loadStoredConflicts(): ReservationConflict[] {
  if (typeof window === "undefined") return INITIAL_CONFLICTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CONFLICTS);
    return raw ? JSON.parse(raw) : INITIAL_CONFLICTS;
  } catch {
    return INITIAL_CONFLICTS;
  }
}

export function saveStoredConflicts(conflicts: ReservationConflict[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
}

export function loadStoredSetups(): FunctionSetupTask[] {
  if (typeof window === "undefined") return INITIAL_SETUP_TASKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SETUPS);
    return raw ? JSON.parse(raw) : INITIAL_SETUP_TASKS;
  } catch {
    return INITIAL_SETUP_TASKS;
  }
}

export function saveStoredSetups(setups: FunctionSetupTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.SETUPS, JSON.stringify(setups));
}

export function loadStoredMovements(): StockMovement[] {
  if (typeof window === "undefined") return INITIAL_STOCK_MOVEMENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (!raw) return INITIAL_STOCK_MOVEMENTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_STOCK_MOVEMENTS;
    return parsed;
  } catch {
    return INITIAL_STOCK_MOVEMENTS;
  }
}

export function saveStoredMovements(movements: StockMovement[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
}

export function useInventoryStore() {
  const [items, setItems] = useState<InventoryItem[]>(() => loadStoredItems());
  const [conflicts, setConflicts] = useState<ReservationConflict[]>(() => loadStoredConflicts());
  const [setups, setSetups] = useState<FunctionSetupTask[]>(() => loadStoredSetups());
  const [movements, setMovements] = useState<StockMovement[]>(() => loadStoredMovements());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setItems(loadStoredItems());
    setConflicts(loadStoredConflicts());
    setSetups(loadStoredSetups());
    setMovements(loadStoredMovements());
    setIsLoaded(true);
  }, []);

  // Active (non-archived) items in catalog
  const totalItems = useMemo(() => items.filter((i) => !i.archived).length, [items]);

  // Available units ready for use across active items
  const availableUnits = useMemo(() => {
    return items
      .filter((i) => !i.archived)
      .reduce((acc, curr) => {
        const avail = Math.max(0, (curr.quantity ?? curr.totalStock ?? 0) - (curr.reservedQuantity ?? curr.reservedStock ?? 0) - (curr.inMaintenance || 0));
        return acc + avail;
      }, 0);
  }, [items]);

  // Reserved units for upcoming events across active items
  const reservedUnits = useMemo(() => {
    return items
      .filter((i) => !i.archived)
      .reduce((acc, curr) => {
        const total = curr.quantity ?? curr.totalStock ?? 0;
        const res = curr.reservedQuantity ?? curr.reservedStock ?? 0;
        return acc + Math.min(total, res);
      }, 0);
  }, [items]);

  // Low stock count (active items where 0 < available <= minimumStockLevel)
  const lowStockCount = useMemo(() => {
    return items.filter((item) => {
      if (item.archived) return false;
      const avail = Math.max(0, (item.quantity ?? item.totalStock ?? 0) - (item.reservedQuantity ?? item.reservedStock ?? 0) - (item.inMaintenance || 0));
      const min = item.minimumStockLevel ?? 5;
      return avail > 0 && avail <= min;
    }).length;
  }, [items]);

  // Out of stock count (active items where available <= 0)
  const outOfStockCount = useMemo(() => {
    return items.filter((item) => {
      if (item.archived) return false;
      const avail = Math.max(0, (item.quantity ?? item.totalStock ?? 0) - (item.reservedQuantity ?? item.reservedStock ?? 0) - (item.inMaintenance || 0));
      return avail <= 0;
    }).length;
  }, [items]);

  // Items needing operational attention (Out of Stock or Low Stock)
  const needsAttentionCount = lowStockCount + outOfStockCount;

  const activeConflictsCount = useMemo(() => {
    return conflicts.filter((c) => c.status === "Unresolved").length;
  }, [conflicts]);

  /**
   * IMPORTANT: Adding an item establishes the stock record only.
   * It does NOT automatically reserve or consume stock.
   */
  const addItem = (
    itemData: Omit<InventoryItem, "id" | "availableQuantity" | "reservedQuantity" | "createdDate" | "updatedDate" | "reservedStock">,
  ) => {
    const qty = Number(itemData.quantity ?? itemData.totalStock ?? 0);
    const now = new Date().toISOString();
    const id = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newItem: InventoryItem = normalizeInventoryItem({
      ...itemData,
      id,
      quantity: qty,
      totalStock: qty,
      reservedQuantity: 0,
      reservedStock: 0,
      availableQuantity: qty,
      inMaintenance: 0,
      createdDate: now,
      updatedDate: now,
    });

    const updated = [newItem, ...items];
    setItems(updated);
    saveStoredItems(updated);
    return newItem;
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const merged = { ...it, ...updates, updatedDate: now };
      return normalizeInventoryItem(merged);
    });
    setItems(updated);
    saveStoredItems(updated);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    saveStoredItems(updated);
  };

  const archiveItem = (id: string) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => (it.id === id ? { ...it, archived: true, updatedDate: now } : it));
    setItems(updated);
    saveStoredItems(updated);
  };

  const unarchiveItem = (id: string) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => (it.id === id ? { ...it, archived: false, updatedDate: now } : it));
    setItems(updated);
    saveStoredItems(updated);
  };

  const adjustStock = (id: string, newTotal: number, newMaintenance: number) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const total = Math.max(0, newTotal);
      const maint = Math.max(0, newMaintenance);
      const res = it.reservedQuantity ?? it.reservedStock ?? 0;
      const avail = Math.max(0, total - res - maint);

      return {
        ...it,
        quantity: total,
        totalStock: total,
        inMaintenance: maint,
        availableQuantity: avail,
        condition: (maint > 0 ? "Needs Repair" : it.condition) as ItemCondition,
        updatedDate: now,
      };
    });
    setItems(updated);
    saveStoredItems(updated);
  };

  const getItemMovements = (itemId: string): StockMovement[] => {
    return movements.filter((m) => m.inventory_item_id === itemId);
  };

  const recordStockAdjustment = (params: {
    itemId: string;
    adjustmentType: StockAdjustmentType;
    quantity: number;
    reason: string;
    referenceType?: string | undefined;
    referenceId?: string | undefined;
    createdBy?: string | undefined;
    correctionDirection?: "add" | "remove" | undefined;
  }): { success: boolean; error?: string; movement?: StockMovement } => {
    const { itemId, adjustmentType, quantity, reason, referenceType, referenceId, createdBy, correctionDirection } = params;

    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, error: "Item not found in inventory catalog." };
    }

    const qty = Math.abs(Number(quantity));
    if (isNaN(qty) || qty <= 0) {
      return { success: false, error: "Please specify a valid adjustment quantity greater than 0." };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "An adjustment reason is required for the audit record." };
    }

    const prevTotal = item.quantity ?? item.totalStock ?? 0;
    const reserved = item.reservedQuantity ?? item.reservedStock ?? 0;
    const maint = item.inMaintenance || 0;

    let delta = 0;
    switch (adjustmentType) {
      case "Stock Added":
      case "Returned":
        delta = qty;
        break;
      case "Stock Removed":
      case "Damaged":
      case "Lost":
        delta = -qty;
        break;
      case "Manual Correction":
        delta = correctionDirection === "remove" ? -qty : qty;
        break;
      default:
        delta = qty;
    }

    const resultingTotal = prevTotal + delta;
    if (resultingTotal < 0) {
      return {
        success: false,
        error: `Cannot reduce stock by ${qty} ${item.unit}. Total stock would drop below zero.`,
      };
    }

    if (resultingTotal < reserved) {
      return {
        success: false,
        error: `Cannot reduce total stock to ${resultingTotal} ${item.unit}. ${reserved} ${item.unit} are currently reserved for event bookings.`,
      };
    }

    const newAvail = Math.max(0, resultingTotal - reserved - maint);
    const now = new Date().toISOString();

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      inventory_item_id: item.id,
      movement_type: adjustmentType,
      quantity: qty,
      unit: item.unit,
      previous_quantity: prevTotal,
      resulting_quantity: resultingTotal,
      reason: reason.trim(),
      reference_type: referenceType?.trim() || (referenceId?.trim() ? "Supplier / Purchase Reference" : "Manual Adjustment"),
      reference_id: referenceId?.trim() || undefined,
      created_by: createdBy?.trim() || "Staff / Warehouse Lead",
      created_at: now,
    };

    const updatedItems = items.map((it) => {
      if (it.id !== item.id) return it;
      return {
        ...it,
        quantity: resultingTotal,
        totalStock: resultingTotal,
        availableQuantity: newAvail,
        updatedDate: now,
      };
    });

    const updatedMovements = [newMovement, ...movements];

    setItems(updatedItems);
    saveStoredItems(updatedItems);

    setMovements(updatedMovements);
    saveStoredMovements(updatedMovements);

    return { success: true, movement: newMovement };
  };

  const releaseReservation = (id: string, qtyToRelease: number) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const currentRes = it.reservedQuantity ?? it.reservedStock ?? 0;
      const newRes = Math.max(0, currentRes - qtyToRelease);
      const total = it.quantity ?? it.totalStock ?? 0;
      const maint = it.inMaintenance || 0;
      const avail = Math.max(0, total - newRes - maint);

      return {
        ...it,
        reservedQuantity: newRes,
        reservedStock: newRes,
        availableQuantity: avail,
        updatedDate: now,
      };
    });
    setItems(updated);
    saveStoredItems(updated);
  };

  const markDamaged = (id: string, qtyDamaged: number) => {
    const now = new Date().toISOString();
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const newMaint = (it.inMaintenance || 0) + qtyDamaged;
      const total = it.quantity ?? it.totalStock ?? 0;
      const res = it.reservedQuantity ?? it.reservedStock ?? 0;
      const avail = Math.max(0, total - res - newMaint);

      return {
        ...it,
        inMaintenance: newMaint,
        availableQuantity: avail,
        condition: (newMaint > 0 ? "Needs Repair" : it.condition) as ItemCondition,
        updatedDate: now,
      };
    });
    setItems(updated);
    saveStoredItems(updated);
  };

  const moveStorage = (id: string, newLocation: string) => {
    const now = new Date().toISOString();
    const updated = items.map((it) =>
      it.id === id ? { ...it, storageLocation: newLocation, location: newLocation, updatedDate: now } : it,
    );
    setItems(updated);
    saveStoredItems(updated);
  };

  const resolveConflict = (conflictId: string, resolution: ConflictResolution, note?: string) => {
    const updated = conflicts.map((c) =>
      c.id === conflictId ? { ...c, status: resolution, resolutionNote: note } : c,
    );
    setConflicts(updated);
    saveStoredConflicts(updated);
  };

  const updateSetupStatus = (setupId: string, status: SetupStatus) => {
    const updated = setups.map((s) => (s.id === setupId ? { ...s, status } : s));
    setSetups(updated);
    saveStoredSetups(updated);
  };

  const toggleChecklist = (setupId: string, checklistId: string, field: "loaded" | "returned") => {
    const updated = setups.map((s) => {
      if (s.id !== setupId) return s;
      const updatedList = s.checklist.map((chk) => {
        if (chk.id !== checklistId) return chk;
        return { ...chk, [field]: !chk[field] };
      });
      return { ...s, checklist: updatedList };
    });
    setSetups(updated);
    saveStoredSetups(updated);
  };

  const addItemToEvent = (
    setupId: string,
    itemId: string,
    quantity: number,
  ): { success: boolean; error?: string } => {
    if (quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero." };
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, error: "Item not found in catalog." };
    }

    const total = item.quantity ?? item.totalStock ?? 0;
    const reserved = item.reservedQuantity ?? item.reservedStock ?? 0;
    const maint = item.inMaintenance || 0;
    const available = Math.max(0, total - reserved - maint);

    if (quantity > available) {
      return {
        success: false,
        error: `Requested quantity (${quantity}) exceeds available stock (${available} ${item.unit}). Cannot reserve.`,
      };
    }

    // 1. Update item's reserved stock (decreases available stock)
    const newReserved = reserved + quantity;
    const newAvail = Math.max(0, total - newReserved - maint);
    const updatedItems = items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            reservedQuantity: newReserved,
            reservedStock: newReserved,
            availableQuantity: newAvail,
            updatedDate: new Date().toISOString(),
          }
        : i,
    );
    setItems(updatedItems);
    saveStoredItems(updatedItems);

    // 2. Add or increment item in setup checklist
    const updatedSetups = setups.map((s) => {
      if (s.id !== setupId && s.functionId !== setupId) return s;

      const existingIndex = s.checklist.findIndex((chk) => chk.itemId === itemId);
      let updatedChecklist: SetupChecklistItem[];

      if (existingIndex >= 0) {
        updatedChecklist = s.checklist.map((chk, idx) =>
          idx === existingIndex ? { ...chk, quantity: chk.quantity + quantity } : chk,
        );
      } else {
        const newChecklistItem: SetupChecklistItem = {
          id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemId: item.id,
          itemName: item.name,
          quantity,
          unit: item.unit,
          loaded: false,
          returned: false,
        };
        updatedChecklist = [...s.checklist, newChecklistItem];
      }

      return { ...s, checklist: updatedChecklist };
    });

    setSetups(updatedSetups);
    saveStoredSetups(updatedSetups);

    return { success: true };
  };

  const resetToDefault = () => {
    setItems(INITIAL_INVENTORY_ITEMS);
    setConflicts(INITIAL_CONFLICTS);
    setSetups(INITIAL_SETUP_TASKS);
    setMovements(INITIAL_STOCK_MOVEMENTS);
    saveStoredItems(INITIAL_INVENTORY_ITEMS);
    saveStoredConflicts(INITIAL_CONFLICTS);
    saveStoredSetups(INITIAL_SETUP_TASKS);
    saveStoredMovements(INITIAL_STOCK_MOVEMENTS);
  };

  return {
    items,
    conflicts,
    setups,
    stockMovements: movements,
    isLoaded,
    totalItems,
    availableUnits,
    reservedUnits,
    totalReserved: reservedUnits,
    lowStockCount,
    outOfStockCount,
    needsAttentionCount,
    activeConflictsCount,
    addItem,
    updateItem,
    deleteItem,
    archiveItem,
    unarchiveItem,
    adjustStock,
    recordStockAdjustment,
    getItemMovements,
    releaseReservation,
    markDamaged,
    moveStorage,
    resolveConflict,
    updateSetupStatus,
    toggleChecklist,
    addItemToEvent,
    resetToDefault,
  };
}
