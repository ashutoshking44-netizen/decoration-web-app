import React, { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Flower2,
  Maximize2,
  Layers,
  PenLine,
  Eye,
  Trash2,
  ChevronDown,
  Check,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DecorationSetupItem } from "@/lib/decoration-setups";

export type DecorationCardStatus = "Live" | "Paused" | "Draft";

export interface StatusConfigItem {
  badgeClass: string;
  dotClass: string;
  label: string;
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  Live: {
    badgeClass: "bg-emerald-100/95 border-emerald-200/70 text-emerald-800 hover:bg-emerald-200/90",
    dotClass: "bg-emerald-600 animate-pulse",
    label: "Live",
  },
  Active: {
    badgeClass: "bg-emerald-100/95 border-emerald-200/70 text-emerald-800 hover:bg-emerald-200/90",
    dotClass: "bg-emerald-600 animate-pulse",
    label: "Live",
  },
  Paused: {
    badgeClass: "bg-amber-100/95 border-amber-200/70 text-amber-800 hover:bg-amber-200/90",
    dotClass: "bg-amber-600",
    label: "Paused",
  },
  Draft: {
    badgeClass: "bg-slate-100/95 border-slate-200/80 text-slate-700 hover:bg-slate-200/90",
    dotClass: "bg-slate-400",
    label: "Draft",
  },
};

const DEFAULT_STATUS_CONFIG: StatusConfigItem = STATUS_CONFIG["Live"]!;

export interface DecorationCatalogCardProps {
  /** Optional full decoration item from store */
  setup?: DecorationSetupItem;
  /** Explicit title override */
  name?: string;
  /** Category label override (e.g. "Mandap") */
  category?: string;
  /** Muted subtitle override (e.g. "Mandap · Floral") */
  subtitle?: string;
  /** Image URL override */
  imageUrl?: string;
  /** Status pill text (defaults to "Live") */
  status?: DecorationCardStatus | string;
  /** Callback when status is changed */
  onStatusChange?: (newStatus: DecorationCardStatus, setup?: DecorationSetupItem) => void;
  /** Whether to show the lock icon badge on top right */
  isLocked?: boolean;
  /** Dimensions spec (e.g. "14 × 14 ft") */
  dimensions?: string;
  /** Flower type spec (e.g. "Mixed Flowers") */
  flowerType?: string;
  /** Platform style spec (e.g. "Square (Pink)") */
  platformStyle?: string;
  /** Numeric price (e.g. 45000) */
  price?: number;
  /** Action callbacks */
  onViewDetails?: (setup?: DecorationSetupItem) => void;
  onCreateQuotation?: (setup?: DecorationSetupItem) => void;
  onEdit?: (setup?: DecorationSetupItem) => void;
  onDelete?: (setup?: DecorationSetupItem) => void;
  /** Custom wrapper styling */
  className?: string;
}

/**
 * Returns a human-friendly name if setup name is an ID or placeholder
 */
export function formatTitle(setup?: DecorationSetupItem, explicitName?: string): string {
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }
  if (!setup) return "Decoration Setup";

  const raw = (setup.name || "").trim();
  const isJunk =
    !raw ||
    raw.toLowerCase().startsWith("setup-") ||
    raw.toLowerCase().startsWith("lib-") ||
    raw.toLowerCase().startsWith("draft-") ||
    /^[A-Z]{3,4}-[A-Z0-9-]{3,}$/i.test(raw) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw) ||
    /^\d+$/.test(raw) ||
    raw === setup.id ||
    raw === setup.sku;

  if (!isJunk) {
    return raw;
  }

  const category = setup.category || "Stage";
  const event = setup.specifications?.applicable_events?.[0] || "Royal";
  const flower = setup.specifications?.flowers?.[0]?.name?.replace(
    /^(Natural |Fresh |Artificial |Silk )+/i,
    "",
  );

  if (flower) {
    return `${event} ${flower} ${category}`;
  }
  return `${event} ${category} Setup`;
}

/**
 * Derives the core specs (dimensions, flower type, platform style) from setup
 */
export function extractSpecs(setup?: DecorationSetupItem) {
  if (!setup) {
    return {
      dimensions: "14 × 14 ft",
      flowerType: "Mixed Flowers",
      platformStyle: "Square (Pink)",
    };
  }

  const specs = setup.specifications;

  // 1. Dimensions
  let dimensions = "14 × 14 ft";
  if (specs?.dimensions?.width_ft && specs?.dimensions?.height_ft) {
    dimensions = `${specs.dimensions.width_ft} × ${specs.dimensions.height_ft} ft`;
  } else if (setup.backdropSpecs?.dimensions) {
    dimensions = setup.backdropSpecs.dimensions.replace(/\(.*\)/, "").trim();
  }

  // 2. Flower type
  let flowerType = "Structure Only";
  const hasFlowers = Boolean(
    (specs?.flowers_used && specs?.flowers && specs.flowers.length > 0) ||
    setup.entranceGateSpecs?.floralUsage ||
    setup.mandapSpecs?.floralUsage,
  );

  if (hasFlowers) {
    if (specs?.flowers && specs.flowers.length > 1) {
      flowerType = "Mixed Flowers";
    } else if (specs?.flowers && specs.flowers.length === 1) {
      const f = specs.flowers[0];
      const flowerName = f?.name?.replace(/^(Natural |Fresh |Artificial |Silk )+/i, "");
      flowerType = flowerName ? `${flowerName} Flowers` : "Fresh Flowers";
    } else if (setup.entranceGateSpecs?.floralType) {
      flowerType = setup.entranceGateSpecs.floralType.includes("Mixed")
        ? "Mixed Flowers"
        : setup.entranceGateSpecs.floralType;
    } else {
      flowerType = "Fresh Flowers";
    }
  }

  // 3. Platform style
  let platformStyle = "None";
  if (specs?.platforms && specs.platforms.length > 0) {
    const p = specs.platforms[0];
    const shape = p?.shape || p?.type || "Square";
    const cleanShape = shape.replace(/ Platform| Deck| Stage/gi, "").trim();
    const colour = p?.colour || p?.flex_colour;
    platformStyle = colour ? `${cleanShape} (${colour})` : cleanShape;
  } else if (specs?.platform_shape) {
    const cleanShape = specs.platform_shape.replace(/ Platform| Deck| Stage/gi, "").trim();
    const colour = specs.platform_colour;
    platformStyle = colour ? `${cleanShape} (${colour})` : cleanShape;
  } else if (specs?.mandap_platform_shape) {
    platformStyle = specs.mandap_platform_shape;
  } else if (setup.stageSpecs?.platformIncluded) {
    platformStyle = "Stage Deck";
  }

  return { dimensions, flowerType, platformStyle };
}

/**
 * Computes price accurately from setup
 */
export function extractPrice(setup?: DecorationSetupItem, explicitPrice?: number): number {
  if (typeof explicitPrice === "number") return explicitPrice;
  if (!setup) return 45000;

  if (typeof setup.total_price === "number" && setup.total_price > 0) {
    return setup.total_price;
  }

  const platformsTotal = (setup.specifications?.platforms || []).reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0,
  );

  const lightingTotal =
    typeof setup.specifications?.overall_lighting_price === "number"
      ? setup.specifications.overall_lighting_price
      : typeof setup.specifications?.overall_lighting_cost === "number"
        ? setup.specifications.overall_lighting_cost
        : (setup.specifications?.lighting || []).reduce(
            (sum, l) => sum + (Number(l.price) || 0),
            0,
          );

  const furnitureTotal = Number(setup.specifications?.furniture_price) || 0;
  const paidAddons = platformsTotal + lightingTotal + furnitureTotal;

  const basePrice =
    setup.specifications?.base_pricing_rate ??
    setup.entranceGateSpecs?.price ??
    setup.welcomeBoardSpecs?.price ??
    setup.mandapSpecs?.price ??
    setup.backdropSpecs?.price ??
    45000;

  return Number(basePrice) + paidAddons;
}

export function DecorationCatalogCard({
  setup,
  name,
  category,
  subtitle,
  imageUrl,
  status = "Live",
  onStatusChange,
  isLocked = true,
  dimensions: propDimensions,
  flowerType: propFlowerType,
  platformStyle: propPlatformStyle,
  price: propPrice,
  onViewDetails,
  onCreateQuotation,
  onEdit,
  onDelete,
  className,
}: DecorationCatalogCardProps) {
  const displayTitle = formatTitle(setup, name);
  const displayCategory = category || setup?.category || "Mandap";

  const initialStatus: DecorationCardStatus =
    (setup?.status as DecorationCardStatus) ||
    (status === "Active" ? "Live" : (status as DecorationCardStatus)) ||
    "Live";

  const [currentStatus, setCurrentStatus] = useState<DecorationCardStatus>(initialStatus);

  useEffect(() => {
    if (setup?.status) {
      setCurrentStatus(setup.status as DecorationCardStatus);
    } else if (status) {
      setCurrentStatus((status === "Active" ? "Live" : status) as DecorationCardStatus);
    }
  }, [setup?.status, status]);

  const handleStatusSelect = (newStatus: DecorationCardStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus, setup);
  };

  const activeConfig = STATUS_CONFIG[currentStatus] || DEFAULT_STATUS_CONFIG;

  const hasFlowers = Boolean(
    (setup?.specifications?.flowers_used && setup?.specifications?.flowers?.length) ||
    setup?.entranceGateSpecs?.floralUsage ||
    setup?.mandapSpecs?.floralUsage,
  );

  const displaySubtitle = subtitle || `${displayCategory} · ${hasFlowers ? "Floral" : "Structure"}`;

  const defaultSpecs = extractSpecs(setup);
  const displayDimensions = propDimensions || defaultSpecs.dimensions;
  const displayFlowerType = propFlowerType || defaultSpecs.flowerType;
  const displayPlatformStyle = propPlatformStyle || defaultSpecs.platformStyle;

  const displayPrice = extractPrice(setup, propPrice);

  const displayImage =
    imageUrl ||
    setup?.imageUrl ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80";

  return (
    <div
      className={cn(
        "group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-md hover:border-border/80 transition-all duration-200",
        className,
      )}
    >
      {/* ─── 1. Top Image Banner (2:1 clean landscape fit with rounded top corners & overlays) ─── */}
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-muted">
        <img
          src={displayImage}
          alt={displayTitle}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=80";
          }}
        />

        {/* Soft top gradient to enhance pill readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent pointer-events-none" />

        {/* Top-Left: Category Pill (Elevated Container: rounded-full bg-card border-border) */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center rounded-full bg-card/95 border border-border/60 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-soft backdrop-blur-xs">
            {displayCategory}
          </span>
        </div>

        {/* Top-Right: Interactive Status Dropdown Pill */}
        <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] font-semibold shadow-soft backdrop-blur-xs transition-all cursor-pointer hover:shadow-xs active:scale-95 select-none",
                  activeConfig.badgeClass,
                )}
                title="Change setup status"
              >
                <span className={cn("size-1.5 rounded-full shrink-0", activeConfig.dotClass)} />
                <span>{activeConfig.label}</span>
                <ChevronDown className="size-3 opacity-70 stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-32 rounded-xl border border-border bg-card p-1 text-xs shadow-soft z-50"
            >
              {(["Live", "Paused", "Draft"] as DecorationCardStatus[]).map((st) => {
                const cfg = STATUS_CONFIG[st] || DEFAULT_STATUS_CONFIG;
                const isSelected = currentStatus === st;
                return (
                  <DropdownMenuItem
                    key={st}
                    onClick={(e) => handleStatusSelect(st, e)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer py-1.5 px-2.5 rounded-lg font-medium transition-colors",
                      isSelected
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        cfg.dotClass.replace("animate-pulse", ""),
                      )}
                    />
                    <span>{cfg.label}</span>
                    {isSelected && <Check className="size-3.5 ml-auto text-primary stroke-[2.5]" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── 2. Card Content Body ─── */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
        {/* Title & Subtitle */}
        <div className="space-y-0.5">
          <h3
            className="text-[15px] sm:text-base font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors"
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          <p className="text-xs font-medium text-muted-foreground line-clamp-1">
            {displaySubtitle}
          </p>
        </div>

        {/* ─── 3. Specifications Row (Single compact horizontal row with icons) ─── */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-medium text-muted-foreground overflow-hidden whitespace-nowrap">
          {/* Dimensions */}
          <div
            className="inline-flex items-center gap-1.5 shrink-0"
            title={`Dimensions: ${displayDimensions}`}
          >
            <Maximize2 className="size-3.5 text-primary stroke-[1.8] shrink-0" />
            <span className="text-foreground/80">{displayDimensions}</span>
          </div>

          {/* Flower Type */}
          <div
            className="inline-flex items-center gap-1.5 shrink-0 truncate"
            title={`Flowers: ${displayFlowerType}`}
          >
            <Flower2 className="size-3.5 text-primary stroke-[1.8] shrink-0" />
            <span className="truncate max-w-[110px] text-foreground/80">{displayFlowerType}</span>
          </div>

          {/* Platform Style */}
          <div
            className="inline-flex items-center gap-1.5 shrink-0 truncate"
            title={`Platform: ${displayPlatformStyle}`}
          >
            <Layers className="size-3.5 text-primary stroke-[1.8] shrink-0" />
            <span className="truncate max-w-[110px] text-foreground/80">
              {displayPlatformStyle}
            </span>
          </div>
        </div>

        {/* ─── 4. Bottom Row: Price & Actions ─── */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/40">
          {/* Price with "Starting from" label */}
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10.5px] font-normal text-muted-foreground block leading-tight">
              Starting from
            </span>
            <span className="text-base sm:text-[17px] font-bold text-foreground tabular-nums tracking-tight block truncate">
              Rs. {displayPrice.toLocaleString()}
            </span>
          </div>

          {/* Actions: "View Details" button + Three-dot dropdown menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewDetails?.(setup)}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 shadow-soft hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              View Details
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary hover:border-border/80 hover:bg-muted/40 shadow-soft transition-colors cursor-pointer"
                  title="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 rounded-xl border border-border bg-card text-xs shadow-soft"
              >
                <DropdownMenuItem
                  onClick={() => onViewDetails?.(setup)}
                  className="gap-2 cursor-pointer py-2 font-medium"
                >
                  <Eye className="size-3.5 text-primary" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCreateQuotation?.(setup)}
                  className="gap-2 cursor-pointer py-2 font-medium text-foreground hover:text-primary"
                >
                  <FileText className="size-3.5 text-primary" />
                  <span>Create Quotation</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit?.(setup)}
                  className="gap-2 cursor-pointer py-2 font-medium"
                >
                  <PenLine className="size-3.5 text-muted-foreground" />
                  <span>Edit Setup</span>
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(setup)}
                    className="gap-2 cursor-pointer py-2 font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                    <span>Delete Setup</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
export default DecorationCatalogCard;
