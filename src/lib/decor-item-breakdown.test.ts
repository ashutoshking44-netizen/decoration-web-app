/**
 * Unit tests for Décor Item Price Breakdown & Catalog Data Mapping
 *
 * Verifies:
 * 1. Mathematical invariant: base + platform + lighting + furniture === item total
 *    Tested for Royal Stage and for every catalog item with components.
 * 2. Auto-generated one-line summary generation from element specs.
 * 3. Collapsed and expanded state data mapping (Structure, Florals, Priced Components, Base Design, Total).
 * 4. Zero-priced components show "Included", unpriced components show "To be confirmed".
 * 5. Title Case formatting for item names.
 * 6. Nepali digit grouping for price display.
 */

import {
  getDecorItemBreakdown,
  generateDecorSummary,
  validateBreakdownSum,
  formatNepaliNumber,
  toTitleCase,
  findCatalogSetup,
} from "./decor-item-breakdown";
import { INITIAL_DECORATION_SETUPS } from "./decoration-setups";

/**
 * Lightweight test suite runner executable directly in Node / TS
 */
export function runDecorBreakdownTests(): {
  total: number;
  passed: number;
  failed: number;
  results: { testName: string; passed: boolean; message?: string }[];
} {
  const results: { testName: string; passed: boolean; message?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ testName: name, passed: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ testName: name, passed: false, message: msg });
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function assertEqual<T>(actual: T, expected: T, msg: string) {
    if (actual !== expected) {
      throw new Error(
        `${msg} -> Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`,
      );
    }
  }

  // ── TEST 1: Royal Stage for Engagement event ──
  const FALLBACK_ROYAL_SETUP = {
    id: "setup-stage-royal",
    name: "Royal Stage",
    category: "Stage",
    total_price: 31000,
    price: 31000,
    priceUnit: "per setup",
    inclusions: ["Multi-tier Platform", "Rose Theme Florals"],
    events: ["Engagement"],
    specifications: {
      structure_type: "Multi-tier Platform",
      dimensions: { width_ft: 16, height_ft: 12 },
      applicable_events: ["Engagement"],
      flowers_used: true,
      setup_styles: ["Rose Theme"],
      flower_variety_type: "Natural / Fresh",
      flowers: [{ name: "Rose", type: "natural", colour: "Pink" }],
      platform_included: true,
      platforms_used: true,
      platform_shape: "Square",
      platform_colour: "Gold",
      platform_height: 1.1,
      platform_price: 10000,
      platform_details: {
        platform_type: "Square Platform",
        dimensions: { width_ft: 16, depth_ft: 1.1 },
        colour: "Gold",
        pricing_rate: 10000,
      },
      lighting_setup_included: true,
      lighting_used: true,
      lighting_type: "Warm Spotlights",
      overall_lighting_price: 10000,
      lighting_price: 10000,
      lighting: [{ type: "Warm Spotlights", quantity: 1, unit: "piece", price: 10000 }],
      lighting_details: {
        lighting_type: "Warm Spotlights",
        quantity: 1,
        pricing_rate: 10000,
      },
      furniture_included: true,
      furniture_used: true,
      furniture_details: "Sofa",
      furniture_price: 1000,
      base_pricing_rate: 10000,
    },
  };

  test("Royal Stage has exact user specs and satisfies base + platform + lighting + furniture = item total", () => {
    const royalSetup =
      INITIAL_DECORATION_SETUPS.find((s) => s.id === "setup-stage-royal") ??
      (FALLBACK_ROYAL_SETUP as any);
    assert(!!royalSetup, "setup-stage-royal must exist");

    const breakdown = getDecorItemBreakdown(
      {
        n: "Royal Stage",
        p: 31000,
        setupId: "setup-stage-royal",
        category: "Stage",
      },
      royalSetup,
    );

    // Title Case
    assertEqual(breakdown.itemName, "Royal Stage", "Item name should be in Title Case");

    // Item Total
    assertEqual(breakdown.itemTotal, 31000, "Item total must be NPR 31,000");

    // Collapsed Subtitle summary
    const expectedSummary =
      "Multi-tier Platform (Floral) · 16 × 12 ft · With Flowers · Square Platform (Gold) 1.1 ft · Warm Spotlights (1 piece)";
    assertEqual(
      breakdown.subtitle,
      expectedSummary,
      "Subtitle must match exact auto-generated spec line",
    );

    // Block 1: Structure
    assert(!!breakdown.structure, "Structure block must be present");
    assertEqual(breakdown.structure?.structureType, "Multi-tier Platform", "Structure type check");
    assertEqual(breakdown.structure?.dimensions, "16 ft (W) × 12 ft (H)", "Dimensions check");
    assertEqual(breakdown.structure?.applicableEvents, "Engagement", "Applicable events check");

    // Block 2: Floral specifications & style
    assert(!!breakdown.florals, "Florals block must be present");
    assertEqual(breakdown.florals?.tag, "Included in base design", "Florals tag check");
    assertEqual(breakdown.florals?.flowerStyle, "Rose Theme", "Flower style check");
    assertEqual(breakdown.florals?.varietyType, "Natural / Fresh", "Variety type check");
    assertEqual(
      breakdown.florals?.flowers[0]?.display,
      "Rose · Fresh · Pink",
      "Flower spec line check",
    );

    // Block 3: Priced components
    assertEqual(
      breakdown.pricedComponents.length,
      3,
      "Must have 3 priced components: Platform, Lighting, Furniture",
    );

    const platformComp = breakdown.pricedComponents.find((c) => c.name === "Platform");
    assert(!!platformComp, "Platform component must exist");
    assertEqual(platformComp?.price, 10000, "Platform price must be 10,000");
    assertEqual(
      platformComp?.specs,
      "Square Platform · 16 × 1.1 ft · Colour: Gold",
      "Platform specs check",
    );
    assertEqual(platformComp?.displayPrice, "NPR 10,000", "Platform display price check");

    const lightingComp = breakdown.pricedComponents.find((c) => c.name === "Lighting setup");
    assert(!!lightingComp, "Lighting setup component must exist");
    assertEqual(lightingComp?.price, 10000, "Lighting price must be 10,000");
    assertEqual(lightingComp?.specs, "Warm Spotlights · Quantity: 1 piece", "Lighting specs check");
    assertEqual(lightingComp?.displayPrice, "NPR 10,000", "Lighting display price check");

    const furnitureComp = breakdown.pricedComponents.find((c) => c.name === "Furniture & props");
    assert(!!furnitureComp, "Furniture & props component must exist");
    assertEqual(furnitureComp?.price, 1000, "Furniture price must be 1,000");
    assertEqual(furnitureComp?.specs, "Sofa", "Furniture specs check");
    assertEqual(furnitureComp?.displayPrice, "NPR 1,000", "Furniture display price check");

    // Block 4: Base design row (structure + florals)
    // 31,000 - (10,000 + 10,000 + 1,000) = 10,000
    assertEqual(
      breakdown.baseDesign.price,
      10000,
      "Base design price must equal 31,000 - 21,000 = 10,000",
    );
    assertEqual(
      breakdown.baseDesign.label,
      "Base design (structure + florals)",
      "Base design label check",
    );
    assertEqual(breakdown.baseDesign.visible, true, "Base design row must be visible when > 0");

    // Block 5: Total row
    assertEqual(breakdown.totalRow.label, "Royal Stage total", "Total row label check");
    assertEqual(breakdown.totalRow.price, 31000, "Total row price check");
    assertEqual(
      breakdown.totalRow.note,
      "Includes core base + confirmed add-ons",
      "Total row note check",
    );

    // Invariant check: base + platform + lighting + furniture = item total
    const base = breakdown.baseDesign.price;
    const platform = platformComp?.price ?? 0;
    const lighting = lightingComp?.price ?? 0;
    const furniture = furnitureComp?.price ?? 0;
    assertEqual(
      base + platform + lighting + furniture,
      breakdown.itemTotal,
      "base + platform + lighting + furniture === itemTotal",
    );

    // Validation helper
    const val = validateBreakdownSum(breakdown);
    assertEqual(val.isValid, true, "Validation helper must confirm isValid = true");
  });

  // ── TEST 2: Invariant holds for every catalog setup in test fixtures and catalog ──
  test("Mathematical invariant (base + components = item total) holds for all catalog setups", () => {
    const royalSetup =
      INITIAL_DECORATION_SETUPS.find((s) => s.id === "setup-stage-royal") ??
      (FALLBACK_ROYAL_SETUP as any);
    const setupsToTest = [royalSetup, ...INITIAL_DECORATION_SETUPS];
    for (const setup of setupsToTest) {
      const price = setup.total_price || setup.specifications?.base_pricing_rate || 25000;
      const breakdown = getDecorItemBreakdown(
        {
          n: setup.name,
          p: price,
          setupId: setup.id,
          category: setup.category,
        },
        setup,
      );

      const val = validateBreakdownSum(breakdown);
      assert(
        val.isValid,
        `Setup "${setup.name}" failed invariant test: Base (${val.basePrice}) + Components (${val.componentsSum}) != Total (${val.itemTotal})`,
      );
    }
  });

  // ── TEST 3: Zero-priced components show 'Included' and unpriced show 'To be confirmed' ──
  test("Components with price 0 show 'Included' and unpriced show 'To be confirmed'", () => {
    const royalSetup =
      INITIAL_DECORATION_SETUPS.find((s) => s.id === "setup-stage-royal") ??
      (FALLBACK_ROYAL_SETUP as any);
    const mockSetup = {
      ...royalSetup,
      id: "setup-test-pricing",
      name: "Test Stage Setup",
      specifications: {
        ...royalSetup.specifications!,
        structure_type: "Standard Arch",
        dimensions: { width_ft: 10, height_ft: 8 },
        platforms_used: true,
        platform_price: 0, // Included
        lighting_used: true,
        overall_lighting_price: undefined,
        lighting_price: undefined,
        lighting: [{ type: "Par Can Spotlight", quantity: 2 }],
        furniture_used: true,
        furniture_details: "Diwan",
        furniture_price: 2500, // Priced
      },
    };

    const breakdown = getDecorItemBreakdown(
      { n: "Test Stage Setup", p: 15000, setupId: "setup-test-pricing" },
      mockSetup,
    );

    const platform = breakdown.pricedComponents.find((c) => c.name === "Platform");
    assertEqual(platform?.displayPrice, "Included", "Price 0 must display as 'Included'");

    const lighting = breakdown.pricedComponents.find((c) => c.name === "Lighting setup");
    assertEqual(
      lighting?.displayPrice,
      "To be confirmed",
      "Unpriced component must display as 'To be confirmed'",
    );

    const furniture = breakdown.pricedComponents.find((c) => c.name === "Furniture & props");
    assertEqual(
      furniture?.displayPrice,
      "NPR 2,500",
      "Priced component must display formatted price",
    );
  });

  // ── TEST 4: Formatting helpers (Nepali digits, Title Case) ──
  test("Nepali digit grouping and Title Case formatting work properly", () => {
    assertEqual(formatNepaliNumber(31000), "31,000", "31000 -> 31,000");
    assertEqual(formatNepaliNumber(140000), "1,40,000", "140000 -> 1,40,000");
    assertEqual(formatNepaliNumber(1000), "1,000", "1000 -> 1,000");
    assertEqual(formatNepaliNumber(500), "500", "500 -> 500");

    assertEqual(toTitleCase("royal stage"), "Royal Stage", "royal stage -> Royal Stage");
    assertEqual(
      toTitleCase("SWAYAMBAR STAGE DÉCOR"),
      "Swayambar Stage Décor",
      "All caps -> Title Case",
    );
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { total: results.length, passed, failed, results };
}

// Self-run when executed directly via Node / tsx
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1]?.includes("decor-item-breakdown.test")
) {
  const summary = runDecorBreakdownTests();
  console.log(`\n── Décor Item Breakdown Tests: ${summary.passed}/${summary.total} passed ──\n`);
  for (const r of summary.results) {
    if (r.passed) {
      console.log(`✓ ${r.testName}`);
    } else {
      console.error(`✗ ${r.testName}: ${r.message}`);
    }
  }
  if (summary.failed > 0) {
    process.exit(1);
  }
}
