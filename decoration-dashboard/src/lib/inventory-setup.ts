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

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const INITIAL_CONFLICTS: ReservationConflict[] = [];

export const INITIAL_SETUP_TASKS: FunctionSetupTask[] = [];

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
