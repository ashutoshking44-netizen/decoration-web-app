import { fetchDecorationsFromSupabase, fetchDecorationByIdFromSupabase, upsertDecorationInSupabase, deleteDecorationFromSupabase, subscribeToDecorationsRealtime } from "./supabase-service";
import { useState, useEffect } from "react";
import { getCurrentCompanyId, getCompanyNameById, DEFAULT_COMPANY_ID } from "./current-company";

export type DecorationCategory = "Mandap" | "Entrance Gate" | "Welcome Board" | "Backdrop" | "Stage";

export type FloralType = "Natural / Fresh" | "Artificial / Silk" | "Mixed (Fresh & Silk)";

export type PricingType = "Fixed Price" | "Custom Quote";

// ─── Decoration Component (Bill of Materials) ───────────────────────────────
// A pure recipe/template. Creating or editing this NEVER reserves or consumes
// inventory stock. Stock changes happen later during Event Allocation.
export type DecorationComponentType = "Existing Inventory" | "Custom Material";

export type DecorationComponent = {
  id: string;
  decoration_design_id: string;
  component_type: DecorationComponentType;
  // Set when component_type === "Existing Inventory"
  inventory_item_id?: string | undefined;
  item_name: string;       // Display name (copied from inventory or entered manually)
  category?: string | undefined;
  quantity: number;
  unit: string;
  notes?: string | undefined;
};

export type EntranceGateSpecs = {
  compatibleEvents: string[];
  structureType: string;
  floralUsage: boolean;
  floralType?: FloralType | undefined;
  pricingType: PricingType;
  price: number | string;
};

export type WelcomeBoardSpecs = {
  materialType: string;
  customTextAllowed: boolean;
  personalizationNotes?: string | undefined;
  price: number | string;
};

export type MandapSpecs = {
  structureType: string;
  seatingIncluded: boolean;
  floralUsage: boolean;
  floralType?: FloralType | undefined;
  pricingType: PricingType;
  price: number | string;
};

export type BackdropSpecs = {
  backdropStyle: string;
  dimensions: string;
  integratedLighting: boolean;
  pricingType: PricingType;
  price: number | string;
};

export type StageSpecs = {
  structureType: string;
  dimensions?: string | undefined;
  platformIncluded?: boolean | undefined;
  lightingIncluded?: boolean | undefined;
  pricingType: PricingType;
  price: number | string;
};

export type SelectedFlowerItem = {
  inventory_item_id?: string | undefined;
  name: string;
  type: "natural" | "artificial" | "mixed";
  /** For "mixed" flowers: share that is natural, 0-100 (the rest is artificial). */
  natural_percent?: number | undefined;
  colour?: string | undefined;
  unit?: string | undefined;
  unit_price?: number | undefined;
  price?: number | undefined;
  quantity?: number | undefined;
};

export type PlatformItem = {
  id: string;
  type: string;
  size: { width: number; height: number };
  flex_colour: string;
  price: number;
  height_ft?: number | undefined;
  custom_type?: string | undefined;
  shape?: string | undefined;
  custom_shape?: string | undefined;
  colour?: string | undefined;
  custom_colour?: string | undefined;
};

export type LightingUnit = "piece" | "box" | "set" | "meter";

export type LightingItem = {
  id?: string;
  type: string;
  quantity?: number;
  unit?: LightingUnit | string;
  price?: number;
};

export type GenericMaterialItem = {
  inventory_item_id: string;
  name: string;
  unit?: string | undefined;
  quantity?: number | undefined;
};

export const MANDAP_PLATFORM_OPTIONS = [
  "Raised Wooden Deck",
  "Carpeted Stage Platform",
  "Glass-Top Deck",
  "Mirror / Acrylic Platform",
  "Traditional Chowki Platform",
  "Custom",
] as const;

export const PLATFORM_SHAPES = [
  "Square",
  "Rectangle",
  "Circle",
  "Semi-circle",
  "Oval",
  "Hexagon",
  "Custom",
] as const;

export const PLATFORM_COLOURS = [
  "White",
  "Ivory",
  "Gold",
  "Silver",
  "Mirror / Reflective",
  "Red",
  "Pink",
  "Peach",
  "Maroon",
  "Burgundy",
  "Yellow",
  "Orange",
  "Purple",
  "Lavender",
  "Blue",
  "Green",
  "Cream",
  "Brown",
  "Black",
  "Mixed / Multicolor",
  "Custom",
] as const;

export const MANDAP_PLATFORM_SHAPES = PLATFORM_SHAPES;
export const MANDAP_PLATFORM_COLOURS = PLATFORM_COLOURS;

export type DecorationSpecifications = {
  structure_type: string;
  /** Free-text custom type entered by the user, stored separately for clean round-tripping. */
  custom_structure_type?: string | undefined;
  main_structure?: string | undefined;
  custom_main_structure?: string | undefined;
  setup_styles?: string[] | undefined;
  custom_setup_style?: string | undefined;
  dimensions: { width_ft: number; height_ft: number };
  flowers_used?: boolean | undefined;
  flowers_confirmed?: boolean | undefined;
  flowers: SelectedFlowerItem[];
  overall_flowers_cost?: number | undefined;
  platforms_used?: boolean | undefined;
  platform_confirmed?: boolean | undefined;
  platform_shape?: string | undefined;
  custom_platform_shape?: string | undefined;
  platform_colour?: string | undefined;
  custom_platform_colour?: string | undefined;
  platform_height?: number | undefined;
  platform_price?: number | undefined;
  mandap_platform_used?: boolean | undefined;
  mandap_platform_type?: string | undefined;
  mandap_platform_shape?: string | undefined;
  custom_mandap_platform_shape?: string | undefined;
  mandap_platform_colour?: string | undefined;
  custom_mandap_platform_colour?: string | undefined;
  mandap_platform_height?: number | undefined;
  mandap_platform_price?: number | undefined;
  platforms?: PlatformItem[] | undefined;
  lighting_used?: boolean | undefined;
  lighting_confirmed?: boolean | undefined;
  lighting_type?: string | undefined;
  custom_lighting_type?: string | undefined;
  lighting?: LightingItem[] | undefined;
  overall_lighting_price?: number | undefined;
  overall_lighting_cost?: number | undefined;
  applicable_events?: string[] | undefined;
  color_theme?: string[] | undefined; // hex values
  floral_tag?: string | undefined;
  price_unit?: string | undefined;
  base_pricing_rate?: number | undefined;
  furniture_used?: boolean | undefined;
  furniture_details?: string | undefined;
  furniture_price?: number | undefined;
  furniture_confirmed?: boolean | undefined;
  total_addon_price?: number | undefined;
  other_materials?: GenericMaterialItem[] | undefined; // reference only
};

export type DecorationSetupItem = {
  id: string;
  sku: string;
  name: string;
  category: DecorationCategory;
  description?: string | undefined;
  imageUrl?: string | undefined;
  gallery?: string[] | undefined;
  status?: "Live" | "Paused" | "Draft" | string | undefined;
  companyId?: string | undefined;
  companyName?: string | undefined;
  createdAt: string;
  updatedAt?: string | undefined;
  bookingCount?: number | undefined;
  applicable_events?: string[] | undefined;
  total_price?: number | undefined;
  priceUnit?: string | undefined;
  aliases?: string[] | undefined;
  inclusions?: string[] | undefined;
  style?: string | undefined;
  theme?: string | undefined;
  colours?: string | undefined;
  size?: string | undefined;
  dimensions?: string | undefined;
  specifications?: DecorationSpecifications | undefined;
  entranceGateSpecs?: EntranceGateSpecs | undefined;
  welcomeBoardSpecs?: WelcomeBoardSpecs | undefined;
  mandapSpecs?: MandapSpecs | undefined;
  backdropSpecs?: BackdropSpecs | undefined;
  stageSpecs?: StageSpecs | undefined;
  // Bill of materials — linked inventory items and custom materials
  components?: DecorationComponent[] | undefined;
};

export const ENTRANCE_GATE_STRUCTURES = [
  "Heavy-duty Aluminum Truss Structure",
  "Rustic Wooden Arch Frame",
  "Geometric Circular Metal Ring",
  "Grand Royal Mughal Pillar Arch",
  "Walkway Floral Tunnel Frame",
  "Fabric Draped Canopy Gateway",
];

export const ENTRANCE_GATE_EVENTS = [
  "Wedding",
  "Reception",
  "Sangeet & Haldi",
  "Engagement",
  "Anniversary",
  "Corporate Gala",
];

export const WELCOME_BOARD_MATERIALS = [
  "Clear Acrylic Sheet with Gold Lettering",
  "Frosted Acrylic Board",
  "Rustic Pine Wood & Chalkboard",
  "Vintage Ornate Mirror Glass Frame",
  "High-Density Foam Board (Matte)",
  "Canvas on Handcrafted Wooden Easel",
];

export const MANDAP_STRUCTURES = [
  "4-Pillar Traditional Carved Mandap",
  "6-Pillar Royal Dome Mandap",
  "Contemporary Minimalist Geometric Arch",
  "Floating Glass-Deck Mandap",
  "Rustic Botanical Canopy Mandap",
];

export const BACKDROP_STYLES = [
  "Full Luxe Floral Wall",
  "Shimmer Sequin & Velvet Draping Wall",
  "Neon Sign on Botanical Boxwood Hedge",
  "Geometric Mirror & Golden Mesh Grid",
  "Silk Drapes with Fairy String Waterfall",
];

export const BACKDROP_DIMENSIONS = [
  "8 x 8 ft (Standard Photo-op)",
  "10 x 10 ft (Stage / Cake Table)",
  "10 x 14 ft (Medium Stage Backdrop)",
  "12 x 20 ft (Grand Reception Stage)",
];

export const STANDARD_EVENT_TYPES = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Corporate",
  "Anniversary",
];

export const PRESET_COLOR_SWATCHES = [
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Champagne Gold", hex: "#F7E7CE" },
  { name: "Ivory White", hex: "#FFFFF0" },
  { name: "Royal Navy", hex: "#002366" },
  { name: "Emerald Green", hex: "#50C878" },
  { name: "Crimson Red", hex: "#DC143C" },
  { name: "Pastel Blush", hex: "#FFD1DC" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Sunshine Gold", hex: "#FFD700" },
  { name: "Terracotta", hex: "#E2725B" },
];

export const STRUCTURE_TYPES_BY_CATEGORY: Record<string, string[]> = {
  "Entrance Gate": [
    "Heavy-duty Aluminum Truss Structure",
    "Rustic Wooden Arch Frame",
    "Geometric Circular Metal Ring",
    "Grand Royal Mughal Pillar Arch",
    "Walkway Floral Tunnel Frame",
    "Fabric Draped Canopy Gateway",
  ],
  "Welcome Board": [
    "Clear Acrylic Sheet on Easel",
    "Frosted Acrylic Board with Stand",
    "Rustic Pine Wood & Chalkboard Easel",
    "Vintage Ornate Mirror Glass Frame",
    "High-Density Matte Foam Board on Tripod",
    "Brass Stand with Canvas Board",
  ],
  "Mandap": [
    "4-Pillar Traditional Carved Mandap",
    "6-Pillar Royal Dome Mandap",
    "Contemporary Minimalist Geometric Arch",
    "Floating Glass-Deck Mandap",
    "Rustic Botanical Canopy Mandap",
  ],
  "Backdrop": [
    "Full Luxe Floral Wall",
    "Shimmer Sequin & Velvet Draping Wall",
    "Neon Sign on Botanical Boxwood Hedge",
    "Geometric Mirror & Golden Mesh Grid",
    "Silk Drapes with Fairy String Waterfall",
    "Telescopic Pipe & Drape Rigging",
  ],
  "Stage": [
    "Grand Curved Truss Stage Frame",
    "Multi-Tiered Wooden Wedding Stage",
    "Royal Mughal Backdrop & Stage Arch",
    "Modern Sleek Minimalist Stage Platform Frame",
    "Floating Glass & Acrylic Stage Deck",
    "Fabric Draped Backdrop & Stage Truss",
  ],
  "Photobooth": [
    "360 Spin Video Platform Frame",
    "Enclosed Inflatable LED Photo Booth",
    "Open-Air Vintage Wood Box Booth",
    "Circular Ring Light & Mirror Station",
    "Themed Pop-up Selfie Pod Structure",
  ],
  "Photo Booth & Selfie Station": [
    "360 Spin Video Platform Frame",
    "Enclosed Inflatable LED Photo Booth",
    "Open-Air Vintage Wood Box Booth",
    "Circular Ring Light & Mirror Station",
    "Themed Pop-up Selfie Pod Structure",
  ],
};

export const PLATFORM_TYPES = [
  "Raised Wooden Platform",
  "Carpeted Stage Platform",
  "Glass-Top Illuminated Stage",
  "Rustic Wooden Pallet Deck",
  "Reinforced Steel Risers Platform",
  "Octagonal Sacred Mandap Deck",
];

export const PLATFORM_FLEX_COLOURS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#DC2626" },
  { name: "Maroon", hex: "#800000" },
  { name: "Green", hex: "#15803D" },
];

export const LIGHTING_TYPES = [
  "Warm Fairy String Lights",
  "LED Uplighting (RGB Par Cans)",
  "Chandelier Lights",
  "Neon Ambient Flex Strips",
  "Vintage Edison Bulb Canopy",
  "Halogen Focus Spotlights",
  "Cold Fire / Stage Pyrotechnics Sparkular",
];

export const FLOWER_PRESET_COLOURS = [
  { name: "Red", hex: "#D62839" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Pink", hex: "#E0559A" },
  { name: "Yellow", hex: "#F0C93A" },
  { name: "Mixed", hex: "#E0713F" },
];

export const INITIAL_DECORATION_SETUPS: DecorationSetupItem[] = [
  {
    id: "dec-c1-mandap",
    sku: "MAN-ROYAL-01",
    name: "Royal Carved Wooden Mandap",
    category: "Mandap",
    companyId: "company-1",
    companyName: "Company 1",
    description: "4-pillar handcrafted traditional carved mandap with natural marigold and rose garlands, warm chandeliers, and satin drapes.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80",
    ],
    status: "Live",
    total_price: 85000,
    createdAt: new Date().toISOString(),
    applicable_events: ["Wedding"],
    specifications: {
      structure_type: "4-Pillar Traditional Carved Mandap",
      main_structure: "4-Pillar Traditional Carved Mandap",
      setup_styles: ["Traditional Royal", "Temple Floral"],
      dimensions: { width_ft: 16, height_ft: 12 },
      floral_tag: "with_flowers",
      flowers_used: true,
      flowers: [
        { name: "Marigold", colour: "Yellow", type: "natural" },
        { name: "Rose", colour: "Red", type: "natural" },
      ],
      platforms_used: true,
      platform_shape: "Octagonal Sacred Mandap Deck",
      platform_colour: "Maroon",
      platform_height: 1,
      lighting_used: true,
      lighting: [
        { type: "Warm Chandeliers", quantity: 2, unit: "piece" },
        { type: "Warm Fairy String Lights", quantity: 6, unit: "piece" },
      ],
      furniture_used: true,
      furniture_details: "2 Royal Carved Wooden Chairs & 4 Bajot low seats",
    },
  },
  {
    id: "dec-c2-stage",
    sku: "STG-LUXE-02",
    name: "Luxe Floral Grand Reception Stage",
    category: "Stage",
    companyId: "company-2",
    companyName: "Royal Orchid Events",
    description: "Full luxe floral backdrop wall with pastel peonies, ambient fairy waterfall strings, and a raised velvet carpeted deck.",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80",
    ],
    status: "Live",
    total_price: 65000,
    createdAt: new Date().toISOString(),
    applicable_events: ["Reception", "Wedding"],
    specifications: {
      structure_type: "Grand Reception Stage",
      main_structure: "Grand Reception Stage",
      setup_styles: ["Modern Luxe", "Pastel Romance"],
      dimensions: { width_ft: 20, height_ft: 12 },
      floral_tag: "with_flowers",
      flowers_used: true,
      flowers: [
        { name: "Peonies & Hydrangeas", colour: "Blush Pink & Ivory", type: "mixed" },
      ],
      platforms_used: true,
      platform_shape: "Carpeted Stage Platform",
      platform_colour: "White",
      platform_height: 1.5,
      lighting_used: true,
      lighting: [
        { type: "LED Uplighting (RGB Par Cans)", quantity: 4, unit: "piece" },
        { type: "Neon Ambient Flex Strips", quantity: 2, unit: "piece" },
      ],
    },
  },
  {
    id: "dec-c2-fairy-lights-entrance",
    sku: "ENT-CRYSTAL-03",
    aliases: ["dec-c2-fairy-lights", "crystal-fairy-lights-entrance", "crystal-fairy-lights"],
    name: "Crystal Fairy Lights Entrance",
    category: "Entrance Gate",
    companyId: "company-2",
    companyName: "Royal Orchid Events",
    description: "Grand entrance gateway with heavy-duty aluminum truss structure, cascading crystal chandeliers, and warm white fairy string light curtains for an enchanting guest welcome.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    ],
    status: "Live",
    total_price: 45000,
    priceUnit: "per setup",
    createdAt: new Date().toISOString(),
    applicable_events: ["Wedding", "Reception", "Sangeet"],
    entranceGateSpecs: {
      structureType: "Heavy-duty Aluminum Truss Structure",
      compatibleEvents: ["Wedding", "Reception", "Sangeet"],
      floralUsage: false,
      pricingType: "Fixed Price",
      price: 45000,
    },
    specifications: {
      structure_type: "Heavy-duty Aluminum Truss Structure",
      main_structure: "Heavy-duty Aluminum Truss Structure",
      setup_styles: ["Glamour Crystal", "Warm Ambient"],
      dimensions: { width_ft: 20, height_ft: 10 },
      floral_tag: "structure_only",
      flowers_used: false,
      flowers: [],
      lighting_used: true,
      lighting: [
        { type: "Crystal Chandeliers", quantity: 3, unit: "piece" },
        { type: "Warm Fairy String Lights", quantity: 12, unit: "piece" },
        { type: "Amber LED Uplighting", quantity: 4, unit: "piece" },
      ],
      price_unit: "per setup",
      color_theme: ["Warm White", "Crystal Gold"],
      applicable_events: ["Wedding", "Reception", "Sangeet"],
    },
    inclusions: [
      "Heavy-duty Aluminum Truss Arch Gateway Frame (20 × 10 ft)",
      "3 Tiered Cascading Crystal Glass Chandeliers",
      "Warm White LED Fairy String Light Waterfall Curtains (12 Drops)",
      "4 Amber LED Par Can Uplights for Atmospheric Glow",
      "Ivory Sheer Drapes & Silk Ribbon Tie-backs",
    ],
  },
  {
    id: "dec-c2-fairy-lights",
    sku: "LGT-CRYSTAL-03",
    aliases: ["dec-c2-fairy-lights-entrance", "crystal-fairy-lights"],
    name: "Crystal Fairy Lights",
    category: "Entrance Gate",
    companyId: "company-2",
    companyName: "Royal Orchid Events",
    description: "Grand entrance gateway with heavy-duty aluminum truss structure, cascading crystal chandeliers, and warm white fairy string light curtains for an enchanting guest welcome.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    ],
    status: "Live",
    total_price: 45000,
    priceUnit: "per setup",
    createdAt: new Date().toISOString(),
    applicable_events: ["Wedding", "Reception", "Sangeet"],
    entranceGateSpecs: {
      structureType: "Heavy-duty Aluminum Truss Structure",
      compatibleEvents: ["Wedding", "Reception", "Sangeet"],
      floralUsage: false,
      pricingType: "Fixed Price",
      price: 45000,
    },
    specifications: {
      structure_type: "Heavy-duty Aluminum Truss Structure",
      main_structure: "Heavy-duty Aluminum Truss Structure",
      setup_styles: ["Glamour Crystal", "Warm Ambient"],
      dimensions: { width_ft: 20, height_ft: 10 },
      floral_tag: "structure_only",
      flowers_used: false,
      flowers: [],
      lighting_used: true,
      lighting: [
        { type: "Crystal Chandeliers", quantity: 3, unit: "piece" },
        { type: "Warm Fairy String Lights", quantity: 12, unit: "piece" },
        { type: "Amber LED Uplighting", quantity: 4, unit: "piece" },
      ],
      price_unit: "per setup",
      color_theme: ["Warm White", "Crystal Gold"],
      applicable_events: ["Wedding", "Reception", "Sangeet"],
    },
    inclusions: [
      "Heavy-duty Aluminum Truss Arch Gateway Frame (20 × 10 ft)",
      "3 Tiered Cascading Crystal Glass Chandeliers",
      "Warm White LED Fairy String Light Waterfall Curtains (12 Drops)",
      "4 Amber LED Par Can Uplights for Atmospheric Glow",
      "Ivory Sheer Drapes & Silk Ribbon Tie-backs",
    ],
  },
];

const DUMMY_SETUP_IDS = new Set([
  "setup-gate-1",
  "setup-backdrop-1",
  "setup-stage-royal-classic",
  "setup-stage-box-truss",
  "setup-stage-royal",
  "setup-mandap-1",
]);

const STORAGE_KEY = "decoration-portal:decoration-setups";
export const STORAGE_KEY_COMPONENTS = "decoration-portal:decoration-components";
export const STORAGE_KEY_QUOTATIONS_COUNT = "decoration-portal:setup-quotations";
export const STORAGE_KEY_DELETED = "decoration-portal:deleted-setups";

// The catalogue holds base64 photos (several MB). Parsing it from localStorage on
// every call made each decoration card re-read it on every render, so the parsed
// result is kept in memory until this file writes the keys again or another tab does.
let setupsCache: DecorationSetupItem[] | null = null;
let deletedIdsCache: Set<string> | null = null;
let setupsCacheVersion = 0;

function invalidateSetupsCache() {
  setupsCache = null;
  deletedIdsCache = null;
  setupsCacheVersion++;
}

/** Changes whenever the stored catalogue (or deleted-ids list) may have changed. */
export function getSetupsCacheVersion(): number {
  return setupsCacheVersion;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === STORAGE_KEY || e.key === STORAGE_KEY_DELETED) invalidateSetupsCache();
  });
}

export function loadDeletedSetupIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  if (deletedIdsCache) return new Set(deletedIdsCache);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DELETED);
    deletedIdsCache = raw ? new Set(JSON.parse(raw)) : new Set();
    return new Set(deletedIdsCache);
  } catch {
    return new Set();
  }
}

export function recordDeletedSetupId(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = loadDeletedSetupIds();
    set.add(id);
    window.localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify([...set]));
  } catch {}
  invalidateSetupsCache();
}

export function loadSetupQuotationCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_QUOTATIONS_COUNT);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordSetupQuotation(setupId: string) {
  if (typeof window === "undefined" || !setupId) return;
  try {
    const counts = loadSetupQuotationCounts();
    counts[setupId] = (counts[setupId] || 0) + 1;
    window.localStorage.setItem(STORAGE_KEY_QUOTATIONS_COUNT, JSON.stringify(counts));
    window.dispatchEvent(new Event("decoration-setups-updated"));
  } catch (err) {
    console.error("Failed to record setup quotation:", err);
  }
}

export function loadStoredComponents(): Record<string, DecorationComponent[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_COMPONENTS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DecorationComponent[]>;
  } catch {
    return {};
  }
}

export function saveStoredComponents(componentsMap: Record<string, DecorationComponent[]>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_COMPONENTS, JSON.stringify(componentsMap));
  } catch (err) {
    console.error("Failed to save components map to localStorage:", err);
  }
}

export function loadStoredSetups(): DecorationSetupItem[] {
  if (typeof window === "undefined") return INITIAL_DECORATION_SETUPS;
  if (setupsCache) return [...setupsCache];
  const result = readStoredSetups();
  if (result !== INITIAL_DECORATION_SETUPS) setupsCache = result;
  return [...result];
}

function readStoredSetups(): DecorationSetupItem[] {
  try {
    const deletedIds = loadDeletedSetupIds();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = INITIAL_DECORATION_SETUPS.filter((s) => !deletedIds.has(s.id));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw) as DecorationSetupItem[];
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((s) => !DUMMY_SETUP_IDS.has(s.id) && !deletedIds.has(s.id));
      let hadMigration = false;
      const migrated = cleaned.map((s) => {
        let changed = false;
        let cId = s.companyId;
        let cName = s.companyName;
        if (!cId || cId === "comp-1") {
          cId = DEFAULT_COMPANY_ID;
          changed = true;
        } else if (cId === "comp-2") {
          cId = "company-2";
          changed = true;
        }
        if (!cName || cName === "Company 1") {
          cName = getCompanyNameById(cId);
          changed = true;
        }
        if (changed) hadMigration = true;
        return changed ? { ...s, companyId: cId, companyName: cName } : s;
      });

      // Synchronize missing canonical presets from INITIAL_DECORATION_SETUPS (unless deleted)
      const missing = INITIAL_DECORATION_SETUPS.filter(
        (s) => !migrated.some((m) => m.id === s.id) && !deletedIds.has(s.id)
      );
      if (missing.length > 0) {
        migrated.push(...missing);
        hadMigration = true;
      }

      // Also ensure existing presets have rich specs and gallery if cached from earlier sessions
      for (const initial of INITIAL_DECORATION_SETUPS) {
        const existing = migrated.find((m) => m.id === initial.id);
        if (existing && (!existing.specifications || !existing.gallery?.length || !existing.inclusions?.length)) {
          Object.assign(existing, {
            ...initial,
            ...existing,
            aliases: initial.aliases || existing.aliases,
            inclusions: (existing.inclusions && existing.inclusions.length > 0) ? existing.inclusions : initial.inclusions,
            specifications: existing.specifications || initial.specifications,
            entranceGateSpecs: existing.entranceGateSpecs || initial.entranceGateSpecs,
            mandapSpecs: existing.mandapSpecs || initial.mandapSpecs,
            stageSpecs: existing.stageSpecs || initial.stageSpecs,
            gallery: (existing.gallery && existing.gallery.length > 0) ? existing.gallery : initial.gallery,
          });
          hadMigration = true;
        }
      }

      if (cleaned.length !== parsed.length || hadMigration) {
        // Only write back when the migration really changed something; some
        // presets re-trigger it on every read, which rewrote megabytes each time.
        const next = JSON.stringify(migrated);
        if (next !== raw) window.localStorage.setItem(STORAGE_KEY, next);
      }
      return migrated;
    }
    return INITIAL_DECORATION_SETUPS;
  } catch {
    return INITIAL_DECORATION_SETUPS;
  }
}

export interface PublicDecorationRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  priceUnit?: string | undefined;
  photo?: string | undefined;
  gallery: string[];
  inclusions: string[];
  style?: string | undefined;
  theme?: string | undefined;
  colours?: string | undefined;
  size?: string | undefined;
  dimensions?: string | undefined;
  structure?: string | undefined;
  lighting?: string | undefined;
  platform?: string | undefined;
  flowers?: string | undefined;
  seating?: string | undefined;
  customText?: string | undefined;
  events?: string | undefined;
  companyId: string;
  companyName: string;
  entranceGateSpecs?: EntranceGateSpecs | undefined;
  welcomeBoardSpecs?: WelcomeBoardSpecs | undefined;
  mandapSpecs?: MandapSpecs | undefined;
  backdropSpecs?: BackdropSpecs | undefined;
  stageSpecs?: StageSpecs | undefined;
}

/**
 * Builds public inclusions and category-specific fields for EVERY decoration category
 * (Stage, Entrance Gate, Mandap, Welcome Board, Backdrop, Table, Floral, Lighting, etc.)
 */
export function extractPublicCategoryDetails(found: any) {
  const inclusions: string[] = [];
  if (Array.isArray(found.inclusions) && found.inclusions.length > 0) {
    inclusions.push(...found.inclusions.filter((x: any) => typeof x === "string" && Boolean(x.trim())));
  }

  const specs = found.specifications || {};

  // 1. Structure / Frame
  let structure: string | undefined = undefined;
  if (specs.main_structure?.trim()) structure = specs.main_structure.trim();
  else if (specs.structure_type?.trim()) structure = specs.structure_type.trim();
  else if (found.entranceGateSpecs?.structureType?.trim()) structure = found.entranceGateSpecs.structureType.trim();
  else if (found.mandapSpecs?.structureType?.trim()) structure = found.mandapSpecs.structureType.trim();
  else if (found.stageSpecs?.structureType?.trim()) structure = found.stageSpecs.structureType.trim();
  else if (found.welcomeBoardSpecs?.materialType?.trim()) structure = found.welcomeBoardSpecs.materialType.trim();
  else if (found.backdropSpecs?.backdropStyle?.trim()) structure = found.backdropSpecs.backdropStyle.trim();

  // 2. Flowers / Floral
  let flowers: string | undefined = undefined;
  const hasFloral = Boolean(
    specs.floral_tag === "with_flowers" ||
    specs.flowers_used ||
    found.entranceGateSpecs?.floralUsage ||
    found.mandapSpecs?.floralUsage
  );
  if (hasFloral) {
    if (Array.isArray(specs.flowers) && specs.flowers.length > 0) {
      flowers = specs.flowers
        .map((f: any) => `${f.name || "Flower"}${f.colour ? ` (${f.colour})` : ""}`)
        .join(", ");
    } else if (found.entranceGateSpecs?.floralType) {
      flowers = found.entranceGateSpecs.floralType;
    } else if (found.mandapSpecs?.floralType) {
      flowers = found.mandapSpecs.floralType;
    } else {
      flowers = "Fresh & Silk Floral Arrangement Included";
    }
  }

  // 3. Platform / Deck
  let platform: string | undefined = undefined;
  if (specs.platforms_used || specs.mandap_platform_used || found.stageSpecs?.platformIncluded) {
    const parts = [
      specs.mandap_platform_type || specs.platform_shape || (found.stageSpecs?.platformIncluded ? "Stage Platform" : "Raised Deck"),
      specs.platform_colour ? `(${specs.platform_colour})` : specs.mandap_platform_colour ? `(${specs.mandap_platform_colour})` : "",
      specs.platform_height ? `${specs.platform_height}ft height` : specs.mandap_platform_height ? `${specs.mandap_platform_height}ft height` : "",
    ].filter(Boolean);
    platform = parts.join(" ") || "Raised Platform Deck";
  }

  // 4. Lighting
  let lighting: string | undefined = undefined;
  if (specs.lighting_used || found.backdropSpecs?.integratedLighting || found.stageSpecs?.lightingIncluded) {
    if (Array.isArray(specs.lighting) && specs.lighting.length > 0) {
      lighting = specs.lighting
        .map((l: any) => `${l.type || "Lighting"}${l.quantity ? ` × ${l.quantity}${l.unit ? ` ${l.unit}` : ""}` : ""}`)
        .join(", ");
    } else {
      lighting = "Integrated Ambient Lighting & Spotlights";
    }
  }

  // 5. Furniture / Seating
  let seating: string | undefined = undefined;
  if (specs.furniture_used && specs.furniture_details?.trim()) {
    seating = specs.furniture_details.trim();
  } else if (found.mandapSpecs?.seatingIncluded) {
    seating = "2 Royal Wooden Chairs & 4 Low Seating Bajot";
  }

  // 6. Custom Text / Personalization (Welcome Board)
  let customText: string | undefined = undefined;
  if (found.welcomeBoardSpecs?.customTextAllowed) {
    customText = found.welcomeBoardSpecs.personalizationNotes?.trim() || "Custom Couple Names & Event Date Vinyl Print";
  }

  // 7. Applicable Events
  let events: string | undefined = undefined;
  const evList = found.applicable_events || specs.applicable_events || found.entranceGateSpecs?.compatibleEvents;
  if (Array.isArray(evList) && evList.length > 0) {
    events = evList.join(", ");
  }

  // If inclusions was not explicitly given, synthesize from the extracted category specs
  if (inclusions.length === 0) {
    if (structure) inclusions.push(`Structure / Frame: ${structure}`);
    if (flowers) inclusions.push(`Floral Work: ${flowers}`);
    if (platform) inclusions.push(`Platform: ${platform}`);
    if (lighting) inclusions.push(`Lighting: ${lighting}`);
    if (seating) inclusions.push(`Seating / Furniture: ${seating}`);
    if (customText) inclusions.push(`Personalization: ${customText}`);
  }

  return {
    inclusions,
    structure,
    platform,
    lighting,
    flowers,
    seating,
    customText,
    events,
  };
}

/**
 * Looks up a decoration in the shared catalogue (which includes every company's decorations)
 * through the repository layer.
 * Strips out private/internal fields (internal costs, BOM items, profit margins, internal notes)
 * and returns only the public catalogue fields shown to clients.
 */
// Lookups are pure for a given catalogue version, and cards ask for the same
// snapshot on every render, so results are cached per snapshot object/id.
const sharedLookupByItem = new WeakMap<object, { v: number; id: string; r: PublicDecorationRecord | null }>();
const sharedLookupById = new Map<string, { v: number; r: PublicDecorationRecord | null }>();

export function getSharedPublicDecoration(
  decId?: string | null,
  contextItem?: any
): PublicDecorationRecord | null {
  const id = String(decId ?? "");
  const v = setupsCacheVersion;
  if (contextItem && typeof contextItem === "object") {
    const hit = sharedLookupByItem.get(contextItem);
    if (hit && hit.v === v && hit.id === id) return hit.r;
    const r = lookupSharedPublicDecoration(decId, contextItem);
    sharedLookupByItem.set(contextItem, { v, id, r });
    return r;
  }
  const hit = sharedLookupById.get(id);
  if (hit && hit.v === v) return hit.r;
  const r = lookupSharedPublicDecoration(decId, contextItem);
  sharedLookupById.set(id, { v, r });
  return r;
}

function lookupSharedPublicDecoration(
  decId?: string | null,
  contextItem?: any
): PublicDecorationRecord | null {
  if (!decId && !contextItem) return null;

  const targetId = String(decId || contextItem?.decorationId || contextItem?.id || "").trim().toLowerCase();
  const targetName = String(contextItem?.name || contextItem?.title || "").trim().toLowerCase();
  const deletedIds = loadDeletedSetupIds();

  // 1. Shared catalogue in localStorage (includes all companies' live & saved setups)
  const stored = loadStoredSetups();

  // Matcher function supporting ID normalization, SKU, aliases, cross-id mappings, and names
  const matchSetup = (s: any) => {
    if (deletedIds.has(s.id)) return false;
    const sId = String(s.id).trim().toLowerCase();
    const sSku = String(s.sku || "").trim().toLowerCase();
    const sName = String(s.name || "").trim().toLowerCase();

    // Exact ID or SKU match
    if (targetId && (sId === targetId || sSku === targetId)) return true;

    // Aliases match
    if (targetId && Array.isArray(s.aliases) && s.aliases.some((a: string) => a.trim().toLowerCase() === targetId)) {
      return true;
    }

    // Cross-match fairy lights IDs and variations
    if (
      (targetId === "dec-c2-fairy-lights" && sId === "dec-c2-fairy-lights-entrance") ||
      (targetId === "dec-c2-fairy-lights-entrance" && sId === "dec-c2-fairy-lights") ||
      (targetId === "crystal-fairy-lights" && (sId === "dec-c2-fairy-lights" || sId === "dec-c2-fairy-lights-entrance")) ||
      (targetId === "crystal-fairy-lights-entrance" && (sId === "dec-c2-fairy-lights" || sId === "dec-c2-fairy-lights-entrance"))
    ) {
      return true;
    }

    // Name match
    if (targetName && sName) {
      if (sName === targetName) return true;
      if (
        (targetName.includes("crystal fairy lights") && sName.includes("crystal fairy lights")) ||
        (targetName.includes("carved wooden mandap") && sName.includes("carved wooden mandap")) ||
        (targetName.includes("luxe floral grand") && sName.includes("luxe floral grand"))
      ) {
        return true;
      }
    }

    // Slug match
    const slug = sName.replace(/[^a-z0-9]+/g, "-");
    if (targetId && slug === targetId) return true;

    return false;
  };

  let found: any = stored.find(matchSetup);

  // 2. Fallback to static seed presets if not in localStorage
  if (!found) {
    found = INITIAL_DECORATION_SETUPS.find(matchSetup);
  }

  if (!found) return null;

  // Extract public details using the shared category-agnostic logic
  const catDetails = extractPublicCategoryDetails(found);

  // Cover photo and gallery
  const photo = found.imageUrl || (Array.isArray(found.gallery) ? found.gallery[0] : undefined);
  const rawGallery = Array.isArray(found.gallery) && found.gallery.length > 0
    ? found.gallery
    : (photo ? [photo] : []);
  const gallery: string[] = Array.from(
    new Set(rawGallery.filter((u: any): u is string => typeof u === "string" && Boolean(u.trim())))
  );

  // Price and priceUnit
  const price = Number(found.total_price ?? found.specifications?.base_pricing_rate ?? found.price) || 0;
  const priceUnit = found.priceUnit || (found.specifications as any)?.price_unit || "per setup";

  // Style
  let style: string | undefined = undefined;
  if (found.style?.trim()) {
    style = found.style.trim();
  } else if (Array.isArray(found.specifications?.setup_styles) && found.specifications.setup_styles.length > 0) {
    style = found.specifications.setup_styles.join(", ");
  } else if (found.backdropSpecs?.backdropStyle) {
    style = found.backdropSpecs.backdropStyle;
  }

  // Colours
  let colours: string | undefined = undefined;
  if (found.colours?.trim()) {
    colours = found.colours.trim();
  } else if (Array.isArray(found.specifications?.color_theme) && found.specifications.color_theme.length > 0) {
    colours = found.specifications.color_theme.join(", ");
  } else if (Array.isArray(found.specifications?.flowers) && found.specifications.flowers.length > 0) {
    const clr = [...new Set(found.specifications.flowers.map((f: any) => f.colour).filter(Boolean))];
    if (clr.length > 0) colours = clr.join(", ");
  }

  // Dimensions / Size
  let size: string | undefined = undefined;
  if (found.dimensions?.trim()) {
    size = found.dimensions.trim();
  } else if (found.size?.trim()) {
    size = found.size.trim();
  } else if (found.specifications?.dimensions?.width_ft && found.specifications?.dimensions?.height_ft) {
    size = `${found.specifications.dimensions.width_ft} × ${found.specifications.dimensions.height_ft} ft`;
  } else if (found.backdropSpecs?.dimensions) {
    size = found.backdropSpecs.dimensions;
  } else if (found.stageSpecs?.dimensions) {
    size = found.stageSpecs.dimensions;
  }

  let compId = found.companyId || "company-1";
  if (compId === "comp-1") compId = "company-1";
  if (compId === "comp-2") compId = "company-2";

  let compName = found.companyName;
  if (!compName || compName === "Company 1") {
    compName = getCompanyNameById(compId);
  }

  return {
    id: found.id,
    name: found.name || "Decoration Setup",
    category: found.category || "Stage",
    description: found.description || "",
    price,
    priceUnit,
    photo,
    gallery,
    inclusions: catDetails.inclusions,
    style,
    theme: found.theme || undefined,
    colours,
    size,
    dimensions: size,
    structure: catDetails.structure,
    platform: catDetails.platform,
    lighting: catDetails.lighting,
    flowers: catDetails.flowers,
    seating: catDetails.seating,
    customText: catDetails.customText,
    events: catDetails.events,
    companyId: compId,
    companyName: compName,
    entranceGateSpecs: found.entranceGateSpecs,
    welcomeBoardSpecs: found.welcomeBoardSpecs,
    mandapSpecs: found.mandapSpecs,
    backdropSpecs: found.backdropSpecs,
    stageSpecs: found.stageSpecs,
  };
}

export async function compressImage(
  fileOrDataUrl: File | string,
  maxWidth = 1200,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
      }
    };
    img.onerror = () => {
      resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
    };

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || "";
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

export function saveStoredSetups(setups: DecorationSetupItem[]) {
  setups = setups.filter((s) => !DUMMY_SETUP_IDS.has(s.id));
  if (typeof window === "undefined") return;
  // Re-read on next load, before "decoration-setups-updated" listeners run.
  invalidateSetupsCache();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
    window.dispatchEvent(new Event("decoration-setups-updated"));
  } catch (err) {
    console.warn("Failed to save full setups to localStorage, attempting fallback with reduced images:", err);
    try {
      // Fallback: strip extra gallery images from older setups to save quota
      const lightweight = setups.map((s, idx) => {
        if (idx === 0) return s; // keep newest intact
        return {
          ...s,
          gallery: s.gallery && s.gallery.length > 0 ? [s.gallery[0] || s.imageUrl] : [s.imageUrl],
        };
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
      window.dispatchEvent(new Event("decoration-setups-updated"));
    } catch (err2) {
      console.error("Critical: Could not save decoration setups even with fallback:", err2);
      try {
        const minimal = setups.slice(0, 10).map((s) => ({
          ...s,
          gallery: [s.imageUrl],
        }));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
        window.dispatchEvent(new Event("decoration-setups-updated"));
      } catch (err3) {
        console.error("Emergency save failed:", err3);
      }
    }
  }
}

// ── Shared Supabase sync for the catalogue ───────────────────────────────────
// Several components on one page use the store (four on the dashboard alone),
// and each used to download the whole table on mount (and again under React
// StrictMode). One shared request now serves them all, refreshed when stale.
const SETUPS_FRESH_MS = 60_000;
let setupsRemoteLoad: Promise<void> | null = null;
let setupsRemoteLoadedAt = 0;
let setupsRemoteLoadedOnce = false;

function refreshSetupsFromSupabase(force = false): Promise<void> {
  if (setupsRemoteLoad) return setupsRemoteLoad;
  if (!force && Date.now() - setupsRemoteLoadedAt < SETUPS_FRESH_MS) return Promise.resolve();
  setupsRemoteLoad = fetchDecorationsFromSupabase()
    .then((data) => {
      setupsRemoteLoadedAt = Date.now();
      setupsRemoteLoadedOnce = true;
      saveStoredSetups(data);
    })
    .catch((err) => {
      // Keep the cached catalogue; a failed request is not an empty catalogue.
      console.warn("[decoration-setups] Loading decorations from Supabase failed:", err);
    })
    .finally(() => {
      setupsRemoteLoad = null;
    });
  return setupsRemoteLoad;
}

/** Applies one changed decoration from realtime (fetches just that row). */
function applyRemoteSetupChange(id: string) {
  fetchDecorationByIdFromSupabase(id)
    .then((row) => {
      const current = loadStoredSetups();
      const idx = current.findIndex((s) => s.id === id);
      if (row) {
        const next = [...current];
        if (idx >= 0) next[idx] = row;
        else next.unshift(row);
        saveStoredSetups(next);
      } else if (idx >= 0) {
        saveStoredSetups(current.filter((s) => s.id !== id));
      }
    })
    .catch((err) => console.warn(`[decoration-setups] Loading decoration ${id} failed:`, err));
}

export function useDecorationSetupsStore() {
  const [setups, setSetups] = useState<DecorationSetupItem[]>(loadStoredSetups);
  const [isLoaded, setIsLoaded] = useState(setupsRemoteLoadedOnce);

  useEffect(() => {
    let active = true;
    // Shared, deduplicated fetch from Supabase (skipped while still fresh)
    void refreshSetupsFromSupabase().then(() => {
      if (active) setIsLoaded(true);
    });

    // Shared Supabase Realtime Subscription: only the changed row is fetched
    const unsubscribe = subscribeToDecorationsRealtime(
      (change) => applyRemoteSetupChange(change.id),
      () => void refreshSetupsFromSupabase(true),
    );

    const handleSync = () => {
      setSetups(loadStoredSetups());
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("decoration-setups-updated", handleSync);
    handleSync(); // pick up a load that finished before this listener was attached

    return () => {
      active = false;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("decoration-setups-updated", handleSync);
      unsubscribe();
    };
  }, []);

  const addSetup = (setup: Omit<DecorationSetupItem, "id" | "createdAt">) => {
    const compId = setup.companyId || getCurrentCompanyId();
    const compName = setup.companyName || getCompanyNameById(compId);
    const newSetup: DecorationSetupItem = {
      ...setup,
      id: `setup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId: compId,
      companyName: compName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bookingCount: setup.bookingCount ?? 0,
    };
    const current = loadStoredSetups();
    const updated = [newSetup, ...current.filter((item) => item.id !== newSetup.id)];
    setSetups(updated);
    saveStoredSetups(updated);

    if (newSetup.components && newSetup.components.length > 0) {
      const compMap = loadStoredComponents();
      compMap[newSetup.id] = newSetup.components;
      saveStoredComponents(compMap);
    }

    void upsertDecorationInSupabase(newSetup);
    return newSetup;
  };

  const updateSetup = (id: string, updatedFields: Partial<DecorationSetupItem>) => {
    const current = loadStoredSetups();
    const updated = current.map((item) =>
      item.id === id
        ? {
            ...item,
            ...updatedFields,
            companyId: updatedFields.companyId || item.companyId || getCurrentCompanyId(),
            companyName:
              updatedFields.companyName ||
              item.companyName ||
              getCompanyNameById(updatedFields.companyId || item.companyId || getCurrentCompanyId()),
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    setSetups(updated);
    saveStoredSetups(updated);
    const target = updated.find((item) => item.id === id);
    if (target) void upsertDecorationInSupabase(target);
  };

  const deleteSetup = (id: string) => {
    recordDeletedSetupId(id);
    const updated = setups.filter((s) => s.id !== id);
    setSetups(updated);
    saveStoredSetups(updated);

    const compMap = loadStoredComponents();
    if (compMap[id]) {
      delete compMap[id];
      saveStoredComponents(compMap);
    }
    void deleteDecorationFromSupabase(id);
  };

  /**
   * Replace the component list (bill of materials) for a decoration design.
   * This is purely a template operation — no inventory stock is touched.
   */
  const updateSetupComponents = (setupId: string, components: DecorationComponent[]) => {
    const updated = setups.map((s) =>
      s.id === setupId ? { ...s, components, updatedAt: new Date().toISOString() } : s
    );
    setSetups(updated);
    saveStoredSetups(updated);

    const compMap = loadStoredComponents();
    compMap[setupId] = components;
    saveStoredComponents(compMap);
  };

  const getSetupComponents = (setupId: string): DecorationComponent[] => {
    const fromSetup = setups.find((s) => s.id === setupId)?.components;
    if (fromSetup && fromSetup.length > 0) return fromSetup;
    const fromStorage = loadStoredComponents()[setupId];
    return fromStorage ?? [];
  };

  const resetSetups = () => {
    setSetups([]);
    saveStoredSetups([]);
    const initialMap: Record<string, DecorationComponent[]> = {};
    INITIAL_DECORATION_SETUPS.forEach((s) => {
      if (s.components) initialMap[s.id] = s.components;
    });
    saveStoredComponents(initialMap);
  };

  return {
    setups,
    isLoaded,
    addSetup,
    updateSetup,
    deleteSetup,
    updateSetupComponents,
    getSetupComponents,
    resetSetups,
  };
}
