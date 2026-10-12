/**
 * Décor Line Item Price Breakdown & Auto-generated Spec Summaries
 *
 * Implements the breakdown logic and data mapping for ceremonial décor line items:
 * - Collapsed auto-generated spec subtitle
 * - Expanded breakdown blocks (Structure, Florals, Priced Components, Base Design, Total)
 * - Strict mathematical invariant: base + platform + lighting + furniture = item total
 */

import type { DecorationSetupItem, DecorationSpecifications } from "./decoration-setups";
import { INITIAL_DECORATION_SETUPS, loadStoredSetups } from "./decoration-setups";

export interface PricedBreakdownComponent {
  id: string;
  name: string; // e.g. "Platform", "Lighting setup", "Furniture & props"
  specs: string; // e.g. "Square Platform · 16 × 1.1 ft · Colour: Gold"
  price: number;
  status: "priced" | "included" | "tbc";
  displayPrice: string; // "NPR 10,000" | "Included" | "To be confirmed"
}

export interface FloralBreakdownItem {
  name: string;
  variety?: string;
  colour?: string;
  display: string; // e.g. "Rose · Fresh · Pink"
}

export interface DecorItemBreakdown {
  itemName: string; // Title Case, e.g. "Royal Stage"
  itemTotal: number;
  pending: boolean;
  subtitle: string;
  imageUrl?: string | undefined;
  gallery?: string[] | undefined;
  structure?: {
    structureType: string;
    dimensions: string; // e.g. "16 ft (W) × 12 ft (H)"
    applicableEvents: string; // e.g. "Engagement"
  };
  florals?: {
    tag: string; // "Included in base design"
    flowerStyle?: string | undefined;
    varietyType?: string | undefined;
    flowers: FloralBreakdownItem[];
  };
  pricedComponents: PricedBreakdownComponent[];
  baseDesign: {
    label: string; // "Base design (structure + florals)"
    price: number;
    visible: boolean; // hide only if price === 0
  };
  totalRow: {
    label: string; // e.g. "Royal Stage total"
    note: string; // "Includes core base + confirmed add-ons"
    price: number;
  };
}

/**
 * Format numbers with Nepali/Indian digit grouping: e.g. 31000 -> "31,000"
 */
export function formatNepaliNumber(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + "," + last3;
}

/**
 * Convert string to Title Case: e.g. "royal stage" -> "Royal Stage"
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Auto-generate a one-line concise summary from element specifications.
 * Example output:
 * "Multi-tier Platform (Floral) · 16 × 12 ft · With Flowers · Square Platform (Gold) 1.1 ft · Warm Spotlights (1 piece)"
 */
export function generateDecorSummary(
  specs?: DecorationSpecifications | null,
  fallbackCategory?: string
): string {
  if (!specs) {
    return fallbackCategory ? `${fallbackCategory} theme arrangement` : "Full bespoke styling";
  }

  const parts: string[] = [];

  // 1. Structure + optional floral tag
  const structure = specs.structure_type || specs.main_structure;
  const hasFloralStyle =
    specs.flowers_used &&
    (specs.setup_styles?.length || specs.custom_setup_style);

  if (structure) {
    if (hasFloralStyle) {
      parts.push(`${structure} (Floral)`);
    } else {
      parts.push(structure);
    }
  }

  // 2. Dimensions: e.g. "16 × 12 ft"
  if (specs.dimensions?.width_ft && specs.dimensions?.height_ft) {
    parts.push(`${specs.dimensions.width_ft} × ${specs.dimensions.height_ft} ft`);
  }

  // 3. Flower usage: e.g. "With Flowers"
  if (specs.flowers_used) {
    parts.push("With Flowers");
  }

  // 4. Platform: e.g. "Square Platform (Gold) 1.1 ft"
  if (specs.platforms_used || specs.platform_shape || specs.platform_height) {
    const shape = specs.platform_shape || "Square";
    const colour = specs.platform_colour ? ` (${specs.platform_colour})` : "";
    const height = specs.platform_height ? ` ${specs.platform_height} ft` : "";
    parts.push(`${shape} Platform${colour}${height}`.trim());
  }

  // 5. Lighting: e.g. "Warm Spotlights (1 piece)"
  if (specs.lighting_used && specs.lighting && specs.lighting.length > 0) {
    const light = specs.lighting[0];
    if (light && light.type) {
      const qtyStr = light.quantity ? ` (${light.quantity} ${light.unit || "piece"})` : "";
      parts.push(`${light.type}${qtyStr}`);
    }
  } else if (specs.lighting_type) {
    parts.push(specs.lighting_type);
  }

  // 6. Furniture (only when primary category is furniture or no structure/platform)
  if (specs.furniture_used && specs.furniture_details && !structure && !specs.platforms_used) {
    parts.push(specs.furniture_details);
  }

  return parts.length > 0
    ? parts.join(" · ")
    : fallbackCategory
    ? `${fallbackCategory} theme arrangement`
    : "Bespoke ceremonial arrangement";
}

/**
 * Locate catalog setup by ID, SKU, or matching name
 */
export function findCatalogSetup(identifier?: string): DecorationSetupItem | null {
  if (!identifier) return null;
  const list = typeof window !== "undefined" ? loadStoredSetups() : INITIAL_DECORATION_SETUPS;
  const needle = identifier.trim().toLowerCase();

  // Try exact ID or SKU match
  const byId = list.find((s) => s.id.toLowerCase() === needle || s.sku?.toLowerCase() === needle);
  if (byId) return byId;

  // Try name match or fuzzy contains
  const byName = list.find((s) => s.name.toLowerCase() === needle);
  if (byName) return byName;

  const byFuzzy = list.find(
    (s) => s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase())
  );
  return byFuzzy || null;
}

/**
 * Construct the full 5-block price breakdown for an item, referencing its catalog specs.
 * Enforces the strict rule: base + platform + lighting + furniture = item total.
 */
export function getDecorItemBreakdown(
  item: {
    n: string;
    s?: string | undefined;
    p: number;
    pending?: boolean | undefined;
    setupId?: string | undefined;
    category?: string | undefined;
    imageUrl?: string | undefined;
    photo?: string | undefined;
  },
  catalogItemOverride?: DecorationSetupItem | null | undefined
): DecorItemBreakdown {
  const catalog =
    catalogItemOverride ??
    (item.setupId ? findCatalogSetup(item.setupId) : null) ??
    findCatalogSetup(item.n);

  const specs = catalog?.specifications;
  const titleCaseName = toTitleCase(item.n);
  const itemTotal = Number(item.p) || 0;
  const isPending = Boolean(item.pending || (itemTotal === 0 && !catalog));

  // Subtitle
  const subtitle = specs
    ? generateDecorSummary(specs, item.category || catalog?.category)
    : item.s || "Bespoke ceremonial arrangement";

  // Block 1: Structure
  let structure: DecorItemBreakdown["structure"] = undefined;
  if (specs?.structure_type || specs?.dimensions || specs?.applicable_events?.length) {
    const dim = specs.dimensions
      ? `${specs.dimensions.width_ft} ft (W) × ${specs.dimensions.height_ft} ft (H)`
      : "";
    const events = (specs.applicable_events && specs.applicable_events.length > 0)
      ? specs.applicable_events.join(", ")
      : "Engagement, Wedding";

    structure = {
      structureType: specs.structure_type || "Custom Structure Frame",
      dimensions: dim,
      applicableEvents: events,
    };
  }

  // Block 2: Floral specifications & style
  let florals: DecorItemBreakdown["florals"] = undefined;
  if (specs?.flowers_used) {
    const style = specs.setup_styles?.[0] || specs.custom_setup_style || "Rose Theme";
    // Check flower varieties
    const varietyType = specs.flowers?.some((f) => f.type === "natural")
      ? "Natural / Fresh"
      : specs.flowers?.some((f) => f.type === "artificial")
      ? "Artificial Silk"
      : "Natural / Fresh";

    const flowersList: FloralBreakdownItem[] = (specs.flowers && specs.flowers.length > 0)
      ? specs.flowers.map((f) => {
          const typeLabel =
            f.type === "natural"
              ? "Fresh"
              : f.type === "artificial"
                ? "Silk"
                : f.natural_percent !== undefined
                  ? `Mixed ${f.natural_percent}% fresh / ${100 - f.natural_percent}% silk`
                  : "Mixed";
          const colourLabel = f.colour || "Pink";
          return {
            name: f.name,
            variety: typeLabel,
            colour: colourLabel,
            display: `${f.name} · ${typeLabel} · ${colourLabel}`,
          };
        })
      : [
          {
            name: "Rose",
            variety: "Fresh",
            colour: "Pink",
            display: "Rose · Fresh · Pink",
          },
        ];

    florals = {
      tag: "Included in base design",
      flowerStyle: style,
      varietyType,
      flowers: flowersList,
    };
  }

  // Block 3: Priced components
  const pricedComponents: PricedBreakdownComponent[] = [];

  // Helper to format component price
  const formatCompPrice = (
    price?: number,
    isConfirmed?: boolean
  ): { status: "priced" | "included" | "tbc"; displayPrice: string; priceNum: number } => {
    if (price === undefined || price === null) {
      return { status: "tbc", displayPrice: "To be confirmed", priceNum: 0 };
    }
    if (price === 0) {
      return { status: "included", displayPrice: "Included", priceNum: 0 };
    }
    return {
      status: "priced",
      displayPrice: `NPR ${formatNepaliNumber(price)}`,
      priceNum: price,
    };
  };

  // 1. Platform component
  if (specs?.platforms_used) {
    const shape = specs.platform_shape || "Square";
    const width = specs.dimensions?.width_ft || 16;
    const height = specs.platform_height || 1.1;
    const colour = specs.platform_colour || "Gold";
    const specsLine = `${shape} Platform · ${width} × ${height} ft · Colour: ${colour}`;
    const priceInfo = formatCompPrice(specs.platform_price, specs.platform_confirmed);

    pricedComponents.push({
      id: "comp-platform",
      name: "Platform",
      specs: specsLine,
      price: priceInfo.priceNum,
      status: priceInfo.status,
      displayPrice: priceInfo.displayPrice,
    });
  }

  // 2. Lighting setup component
  if (specs?.lighting_used) {
    let lightingName = "Warm Spotlights";
    let qty = 1;
    let unit = "piece";
    let lightPrice = specs.overall_lighting_price;

    if (specs.lighting && specs.lighting.length > 0) {
      const primaryLight = specs.lighting[0];
      if (primaryLight) {
        lightingName = primaryLight.type || lightingName;
        qty = primaryLight.quantity || qty;
        unit = primaryLight.unit || unit;
        if (primaryLight.price !== undefined && lightPrice === undefined) {
          lightPrice = primaryLight.price;
        }
      }
    } else if (specs.lighting_type) {
      lightingName = specs.lighting_type;
    }

    const specsLine = `${lightingName} · Quantity: ${qty} ${unit}`;
    const priceInfo = formatCompPrice(lightPrice, specs.lighting_confirmed);

    pricedComponents.push({
      id: "comp-lighting",
      name: "Lighting setup",
      specs: specsLine,
      price: priceInfo.priceNum,
      status: priceInfo.status,
      displayPrice: priceInfo.displayPrice,
    });
  }

  // 3. Furniture & props component
  if (specs?.furniture_used) {
    const furnitureDetail = specs.furniture_details || "Sofa";
    const priceInfo = formatCompPrice(specs.furniture_price, specs.furniture_confirmed);

    pricedComponents.push({
      id: "comp-furniture",
      name: "Furniture & props",
      specs: furnitureDetail,
      price: priceInfo.priceNum,
      status: priceInfo.status,
      displayPrice: priceInfo.displayPrice,
    });
  }

  // Block 4: Base design row (structure + florals)
  // Math: base = item total - sum(priced components)
  const sumOfComponents = pricedComponents.reduce((acc, c) => acc + c.price, 0);
  const basePrice = Math.max(0, itemTotal - sumOfComponents);

  const baseDesign = {
    label: "Base design (structure + florals)",
    price: basePrice,
    visible: basePrice > 0,
  };

  // Block 5: Total row
  const totalRow = {
    label: `${titleCaseName} total`,
    note: "Includes core base + confirmed add-ons",
    price: itemTotal,
  };

  const bd: DecorItemBreakdown = {
    itemName: titleCaseName,
    itemTotal,
    pending: isPending,
    subtitle,
    pricedComponents,
    baseDesign,
    totalRow,
  };
  const img = item.imageUrl || item.photo || catalog?.imageUrl;
  if (img !== undefined) bd.imageUrl = img;
  if (catalog?.gallery !== undefined) bd.gallery = catalog.gallery;
  else if (img) bd.gallery = [img];
  if (structure !== undefined) bd.structure = structure;
  if (florals !== undefined) bd.florals = florals;
  return bd;
}

/**
 * Validates the invariant: base + platform + lighting + furniture === item total.
 * Returns true if valid, throws/returns descriptive info otherwise.
 */
export function validateBreakdownSum(breakdown: DecorItemBreakdown): {
  isValid: boolean;
  basePrice: number;
  componentsSum: number;
  itemTotal: number;
  difference: number;
} {
  const componentsSum = breakdown.pricedComponents.reduce((acc, c) => acc + c.price, 0);
  const calculatedSum = breakdown.baseDesign.price + componentsSum;
  const difference = calculatedSum - breakdown.itemTotal;
  return {
    isValid: difference === 0,
    basePrice: breakdown.baseDesign.price,
    componentsSum,
    itemTotal: breakdown.itemTotal,
    difference,
  };
}
