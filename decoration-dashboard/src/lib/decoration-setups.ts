import { useState, useEffect } from "react";

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
  createdAt: string;
  updatedAt?: string | undefined;
  bookingCount?: number | undefined;
  applicable_events?: string[] | undefined;
  total_price?: number | undefined;
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
    id: "setup-gate-1",
    sku: "GATE-ROY-01",
    name: "Royal Mughal Grand Entrance Gate",
    category: "Entrance Gate",
    description: "Opulent entrance arch with warm welcome lighting and regal floral cascades for luxury ceremonies.",
    imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-12T14:30:00Z",
    bookingCount: 24,
    specifications: {
      applicable_events: ["Wedding", "Reception", "Corporate"],
      structure_type: "Grand Royal Mughal Pillar Arch",
      dimensions: { width_ft: 12, height_ft: 10 },
      flowers_used: true,
      flowers: [
        {
          inventory_item_id: "inv-rose-1",
          name: "Dutch Red Roses",
          type: "natural",
          colour: "Red",
        },
        {
          inventory_item_id: "inv-silkflower-1",
          name: "Hydrangea & Rose Swag",
          type: "artificial",
          colour: "White",
        },
      ],
      color_theme: ["#DC143C", "#F7E7CE", "#B76E79"],
      base_pricing_rate: 21800,
      other_materials: [
        { inventory_item_id: "inv-arch-1", name: "Geometric Hexagon Metal Arch", unit: "Set", quantity: 1 },
      ],
    },
    entranceGateSpecs: {
      compatibleEvents: ["Wedding", "Reception", "Sangeet & Haldi"],
      structureType: "Grand Royal Mughal Pillar Arch",
      floralUsage: true,
      floralType: "Mixed (Fresh & Silk)",
      pricingType: "Fixed Price",
      price: 35000,
    },
    components: [
      {
        id: "comp-gate-1",
        decoration_design_id: "setup-gate-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-arch-1",
        item_name: "Geometric Hexagon Metal Arch",
        category: "Decorative Materials",
        quantity: 1,
        unit: "Set",
      },
      {
        id: "comp-gate-2",
        decoration_design_id: "setup-gate-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-silkflower-1",
        item_name: "Artificial Silk Hydrangea & Rose Swag",
        category: "Decorative Materials",
        quantity: 4,
        unit: "Set",
      },
      {
        id: "comp-gate-3",
        decoration_design_id: "setup-gate-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-rose-1",
        item_name: "Natural Fresh Dutch Red Roses",
        category: "Flowers",
        quantity: 5,
        unit: "Bunch",
      },
      {
        id: "comp-gate-4",
        decoration_design_id: "setup-gate-1",
        component_type: "Custom Material",
        item_name: "Champagne Sheer Draping Fabric",
        quantity: 20,
        unit: "Meter",
        notes: "Warm blush draping for pillar sides",
      },
    ],
  },
  {
    id: "setup-board-1",
    sku: "BRD-ACR-02",
    name: "Clear Acrylic Mirror Welcome Board",
    category: "Welcome Board",
    description: "Sleek personalized welcome board on dark walnut easel with delicate floral corner swag.",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-03-05T12:30:00Z",
    updatedAt: "2026-03-14T09:15:00Z",
    bookingCount: 15,
    specifications: {
      applicable_events: ["Wedding", "Reception", "Engagement"],
      structure_type: "Clear Acrylic Sheet on Easel",
      dimensions: { width_ft: 2.5, height_ft: 4 },
      flowers_used: false,
      flowers: [],
      color_theme: ["#FFFFF0", "#F7E7CE"],
      base_pricing_rate: 6500,
      other_materials: [
        { inventory_item_id: "inv-board-1", name: "Plain White Welcome Board", unit: "Piece", quantity: 1 },
        { inventory_item_id: "inv-stand-1", name: "Dark Walnut Easel Board Stand", unit: "Piece", quantity: 1 },
      ],
    },
    welcomeBoardSpecs: {
      materialType: "Clear Acrylic Sheet with Gold Lettering",
      customTextAllowed: true,
      personalizationNotes: "Custom couple names, date and monogram hashtag in mirror vinyl lettering.",
      price: 6500,
    },
    components: [
      {
        id: "comp-board-1",
        decoration_design_id: "setup-board-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-board-1",
        item_name: "Plain White Welcome Board",
        category: "Signage",
        quantity: 1,
        unit: "Piece",
      },
      {
        id: "comp-board-2",
        decoration_design_id: "setup-board-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-stand-1",
        item_name: "Dark Walnut Easel Board Stand",
        category: "Signage",
        quantity: 1,
        unit: "Piece",
      },
      {
        id: "comp-board-3",
        decoration_design_id: "setup-board-1",
        component_type: "Custom Material",
        item_name: "Custom Mirror Gold Lettering Decal",
        quantity: 1,
        unit: "Set",
        notes: "Couple names and wedding hashtag",
      },
    ],
  },
  {
    id: "setup-mandap-1",
    sku: "MAN-DOM-03",
    name: "Pastel Blossom 6-Pillar Dome Mandap",
    category: "Mandap",
    description: "Handcrafted 6-pillar mandap dome adorned with cascading pastel carnations and brass bell accents.",
    imageUrl: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-03-08T15:00:00Z",
    updatedAt: "2026-03-22T16:45:00Z",
    bookingCount: 42,
    specifications: {
      applicable_events: ["Wedding"],
      structure_type: "6-Pillar Royal Dome Mandap",
      dimensions: { width_ft: 14, height_ft: 12 },
      flowers_used: true,
      flowers: [
        {
          inventory_item_id: "inv-rose-1",
          name: "Dutch Red Roses",
          type: "natural",
          colour: "Red",
        },
      ],
      color_theme: ["#FFD1DC", "#F7E7CE", "#FFFFF0"],
      base_pricing_rate: 67000,
      other_materials: [
        { inventory_item_id: "inv-chair-1", name: "Velvet Chiavari Banquet Chairs", unit: "Piece", quantity: 4 },
        { inventory_item_id: "inv-foam-1", name: "Green Oasis Floral Foam Bricks", unit: "Box", quantity: 8 },
      ],
    },
    mandapSpecs: {
      structureType: "6-Pillar Royal Dome Mandap",
      seatingIncluded: true,
      floralUsage: true,
      floralType: "Natural / Fresh",
      pricingType: "Fixed Price",
      price: 85000,
    },
    components: [
      {
        id: "comp-mandap-1",
        decoration_design_id: "setup-mandap-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-chair-1",
        item_name: "Velvet Chiavari Banquet Chairs",
        category: "Furniture & Props",
        quantity: 4,
        unit: "Piece",
      },
      {
        id: "comp-mandap-2",
        decoration_design_id: "setup-mandap-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-rose-1",
        item_name: "Natural Fresh Dutch Red Roses",
        category: "Flowers",
        quantity: 15,
        unit: "Bunch",
      },
      {
        id: "comp-mandap-3",
        decoration_design_id: "setup-mandap-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-foam-1",
        item_name: "Green Oasis Floral Foam Bricks",
        category: "Decorative Materials",
        quantity: 8,
        unit: "Box",
      },
      {
        id: "comp-mandap-4",
        decoration_design_id: "setup-mandap-1",
        component_type: "Custom Material",
        item_name: "Hanging Brass Bell Kalire",
        quantity: 8,
        unit: "Piece",
        notes: "Traditional brass bell accents for dome",
      },
    ],
  },
  {
    id: "setup-backdrop-1",
    sku: "BCK-SHM-04",
    name: "Golden Champagne Shimmer Stage Backdrop",
    category: "Backdrop",
    description: "Dynamic champagne gold kinetic shimmer sequin wall with perimeter warm LED downlighting.",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-03-10T16:20:00Z",
    updatedAt: "2026-03-18T11:20:00Z",
    bookingCount: 31,
    specifications: {
      applicable_events: ["Reception", "Corporate", "Anniversary"],
      structure_type: "Shimmer Sequin & Velvet Draping Wall",
      dimensions: { width_ft: 14, height_ft: 10 },
      flowers_used: false,
      flowers: [],
      color_theme: ["#F7E7CE", "#FFD700"],
      base_pricing_rate: 24000,
      other_materials: [
        { inventory_item_id: "inv-lights-2", name: "Warm White Fairy String Lights (50m)", unit: "Roll", quantity: 2 },
        { inventory_item_id: "inv-light-1", name: "Warm White LED Par Can Spotlight", unit: "Piece", quantity: 4 },
      ],
    },
    backdropSpecs: {
      backdropStyle: "Shimmer Sequin & Velvet Draping Wall",
      dimensions: "10 x 14 ft (Medium Stage Backdrop)",
      integratedLighting: true,
      pricingType: "Fixed Price",
      price: 24000,
    },
    components: [
      {
        id: "comp-bck-1",
        decoration_design_id: "setup-backdrop-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-lights-2",
        item_name: "Warm White Fairy String Lights (50m)",
        category: "Equipment",
        quantity: 2,
        unit: "Roll",
      },
      {
        id: "comp-bck-2",
        decoration_design_id: "setup-backdrop-1",
        component_type: "Existing Inventory",
        inventory_item_id: "inv-light-1",
        item_name: "Warm White LED Par Can Spotlight",
        category: "Equipment",
        quantity: 4,
        unit: "Piece",
      },
      {
        id: "comp-bck-3",
        decoration_design_id: "setup-backdrop-1",
        component_type: "Custom Material",
        item_name: "Champagne Shimmer Sequin Panels",
        quantity: 8,
        unit: "Piece",
        notes: "Modular interlocking backdrop panels",
      },
    ],
  },
  {
    id: "setup-stage-royal-classic",
    sku: "STG-ROY-47",
    name: "Royal Classic Stage",
    category: "Stage",
    description: "Opulent grand wedding stage with royal curved backdrop arches, velvet draping, and cascading red roses.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z",
    bookingCount: 52,
    total_price: 47000,
    specifications: {
      applicable_events: ["Wedding", "Reception"],
      structure_type: "Grand Curved Truss Stage Frame",
      dimensions: { width_ft: 24, height_ft: 12 },
      flowers_used: true,
      flowers: [
        {
          inventory_item_id: "inv-rose-1",
          name: "Dutch Red Roses & White Hydrangeas",
          type: "natural",
          colour: "Red & White",
        },
      ],
      color_theme: ["#DC143C", "#FFFFF0", "#F7E7CE"],
      base_pricing_rate: 47000,
    },
    stageSpecs: {
      structureType: "Grand Curved Truss Stage Frame",
      dimensions: "24ft W x 14ft D x 12ft H",
      platformIncluded: true,
      lightingIncluded: true,
      pricingType: "Fixed Price",
      price: 47000,
    },
    components: [],
  },
  {
    id: "setup-mandap-white-2",
    sku: "MAN-WHT-75",
    name: "White Mandap 2.0",
    category: "Mandap",
    description: "Pure white modern floating mandap with geometric crystal pillars, cascading white carnations and sacred floral havankund.",
    imageUrl: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&auto=format&fit=crop&q=80",
    createdAt: "2026-03-16T12:00:00Z",
    updatedAt: "2026-03-22T12:00:00Z",
    bookingCount: 68,
    total_price: 75000,
    specifications: {
      applicable_events: ["Wedding"],
      structure_type: "4-Pillar Carved Floating Mandap",
      dimensions: { width_ft: 16, height_ft: 12 },
      flowers_used: true,
      flowers: [
        {
          inventory_item_id: "inv-carn-1",
          name: "Fresh White Carnations & Gypsophila",
          type: "natural",
          colour: "Pure White",
        },
      ],
      color_theme: ["#FFFFFF", "#F7E7CE"],
      base_pricing_rate: 75000,
    },
    mandapSpecs: {
      structureType: "4-Pillar Carved Floating Mandap",
      seatingIncluded: true,
      floralUsage: true,
      floralType: "Natural / Fresh",
      pricingType: "Fixed Price",
      price: 75000,
    },
    components: [],
  },
  {
    id: "setup-haldi-marigold-1",
    sku: "BCK-HLD-32",
    name: "Marigold Haldi Backdrop",
    category: "Backdrop",
    description: "Vibrant Haldi celebration setup featuring dense yellow & orange marigold curtains, brass urlis, and festive yellow drapes.",
    imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&auto=format&fit=crop&q=80",
    createdAt: "2026-03-18T14:00:00Z",
    updatedAt: "2026-03-25T14:00:00Z",
    bookingCount: 38,
    total_price: 32000,
    specifications: {
      applicable_events: ["Sangeet & Haldi", "Wedding"],
      structure_type: "Telescopic Pipe & Drape Rigging",
      dimensions: { width_ft: 12, height_ft: 8 },
      flowers_used: true,
      flowers: [
        {
          inventory_item_id: "inv-mari-1",
          name: "Fresh Yellow & Orange Marigold Garlands",
          type: "natural",
          colour: "Yellow & Orange",
        },
      ],
      color_theme: ["#FFD700", "#FF8C00"],
      base_pricing_rate: 32000,
    },
    backdropSpecs: {
      backdropStyle: "Marigold Draping Wall",
      dimensions: "12 x 8 ft (Haldi Ceremony Backdrop)",
      integratedLighting: false,
      pricingType: "Fixed Price",
      price: 32000,
    },
    components: [],
  },
  {
    id: "setup-stage-structure-only",
    sku: "STG-STR-38",
    name: "Minimalist Geometric Truss Stage",
    category: "Stage",
    description: "Modern architectural stage framework with clean geometric box trusses, acoustic draping, and heavy-duty rigging.",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop&q=80",
    createdAt: "2026-03-19T15:00:00Z",
    updatedAt: "2026-03-24T15:00:00Z",
    bookingCount: 19,
    total_price: 38000,
    specifications: {
      applicable_events: ["Reception", "Corporate", "Wedding"],
      structure_type: "Heavy-Duty Aluminum Truss Box Frame",
      dimensions: { width_ft: 20, height_ft: 10 },
      flowers_used: false,
      flowers: [],
      color_theme: ["#708090", "#000000"],
      base_pricing_rate: 38000,
    },
    stageSpecs: {
      structureType: "Heavy-Duty Aluminum Truss Box Frame",
      dimensions: "20ft W x 12ft D x 10ft H",
      platformIncluded: true,
      lightingIncluded: true,
      pricingType: "Fixed Price",
      price: 38000,
    },
    components: [],
  },
  {
    id: "setup-stage-royal",
    sku: "STG-ROY-31",
    name: "Royal Stage",
    category: "Stage",
    description: "Multi-tier floral stage arrangement with elevated gold square platform, fresh pink roses, warm spotlights, and regal lounge seating.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-26T12:00:00Z",
    bookingCount: 45,
    total_price: 31000,
    applicable_events: ["Engagement", "Wedding"],
    specifications: {
      applicable_events: ["Engagement"],
      structure_type: "Multi-tier Platform",
      dimensions: { width_ft: 16, height_ft: 12 },
      flowers_used: true,
      setup_styles: ["Rose Theme"],
      flowers: [
        {
          inventory_item_id: "inv-rose-pink",
          name: "Rose",
          type: "natural",
          colour: "Pink",
        },
      ],
      platforms_used: true,
      platform_shape: "Square",
      platform_colour: "Gold",
      platform_height: 1.1,
      platform_price: 10000,
      lighting_used: true,
      lighting_type: "Warm Spotlights",
      lighting: [
        {
          type: "Warm Spotlights",
          quantity: 1,
          unit: "piece",
          price: 10000,
        },
      ],
      overall_lighting_price: 10000,
      furniture_used: true,
      furniture_details: "Sofa",
      furniture_price: 1000,
      base_pricing_rate: 10000,
      color_theme: ["#FFD700", "#FFC0CB"],
    },
    stageSpecs: {
      structureType: "Multi-tier Platform",
      dimensions: "16ft W x 12ft H",
      platformIncluded: false,
      lightingIncluded: false,
      pricingType: "Fixed Price",
      price: 31000,
    },
    components: [],
  },
];

const STORAGE_KEY = "decoration-portal:decoration-setups";
export const STORAGE_KEY_COMPONENTS = "decoration-portal:decoration-components";
export const STORAGE_KEY_QUOTATIONS_COUNT = "decoration-portal:setup-quotations";

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
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const standaloneMap = loadStoredComponents();

    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DECORATION_SETUPS));
      // Also seed standalone components map
      const initialMap: Record<string, DecorationComponent[]> = {};
      INITIAL_DECORATION_SETUPS.forEach((s) => {
        if (s.components) initialMap[s.id] = s.components;
      });
      saveStoredComponents(initialMap);
      return INITIAL_DECORATION_SETUPS;
    }

    const parsed = JSON.parse(raw) as (DecorationSetupItem & {
      title?: string;
      primaryImage?: string;
      compatibleEvents?: string[];
      gallery?: string[];
    })[];
    // Backfill components and normalize properties if missing in older/wizard localStorage entries
    const normalized = parsed.map((s, idx) => {
      const name = s.name || s.title || "Custom Decoration Setup";
      const imageUrl =
        s.imageUrl ||
        s.primaryImage ||
        s.gallery?.[0] ||
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80";
      const sku = s.sku || `DEC-${String(100 + idx).padStart(3, "0")}`;
      const applicable_events = s.applicable_events || s.compatibleEvents || ["Wedding"];

      let components = s.components;
      if (!components || components.length === 0) {
        const standalone = standaloneMap[s.id];
        if (standalone && standalone.length > 0) {
          components = standalone;
        } else {
          const defaultSetup = INITIAL_DECORATION_SETUPS.find((init) => init.id === s.id);
          if (defaultSetup?.components) components = defaultSetup.components;
        }
      }

      const defaultSetup = INITIAL_DECORATION_SETUPS.find((init) => init.id === s.id);
      const updatedAt = s.updatedAt || defaultSetup?.updatedAt || s.createdAt;
      const bookingCount = typeof s.bookingCount === "number" ? s.bookingCount : (defaultSetup?.bookingCount ?? 0);

      return {
        ...s,
        name,
        imageUrl,
        sku,
        applicable_events,
        components,
        updatedAt,
        bookingCount,
      };
    });

    const missingDefaults = INITIAL_DECORATION_SETUPS.filter(
      (init) => !parsed.some((p) => p.id === init.id)
    );
    return [...normalized, ...missingDefaults];
  } catch {
    return INITIAL_DECORATION_SETUPS;
  }
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
  if (typeof window === "undefined") return;
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

export function useDecorationSetupsStore() {
  const [setups, setSetups] = useState<DecorationSetupItem[]>(() => {
    return loadStoredSetups();
  });
  const [isLoaded, setIsLoaded] = useState(true);

  useEffect(() => {
    const handleSync = () => {
      setSetups(loadStoredSetups());
      setIsLoaded(true);
    };
    handleSync();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleSync);
      window.addEventListener("decoration-setups-updated", handleSync);
      return () => {
        window.removeEventListener("storage", handleSync);
        window.removeEventListener("decoration-setups-updated", handleSync);
      };
    }
    return undefined;
  }, []);

  const addSetup = (setup: Omit<DecorationSetupItem, "id" | "createdAt">) => {
    const newSetup: DecorationSetupItem = {
      ...setup,
      id: `setup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

    return newSetup;
  };

  const updateSetup = (id: string, updatedFields: Partial<DecorationSetupItem>) => {
    const current = loadStoredSetups();
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() } : item
    );
    setSetups(updated);
    saveStoredSetups(updated);
  };

  const deleteSetup = (id: string) => {
    const updated = setups.filter((s) => s.id !== id);
    setSetups(updated);
    saveStoredSetups(updated);

    const compMap = loadStoredComponents();
    if (compMap[id]) {
      delete compMap[id];
      saveStoredComponents(compMap);
    }
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
    setSetups(INITIAL_DECORATION_SETUPS);
    saveStoredSetups(INITIAL_DECORATION_SETUPS);
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
