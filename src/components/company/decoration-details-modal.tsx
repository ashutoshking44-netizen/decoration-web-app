/**
 * DecorationDetailsModal — Shared reusable details view for a DecorationSetupItem.
 *
 * Shows a rich specs panel (Structure Type, Dimensions, Applicable Events,
 * Floral Materials with Natural/Artificial tags, Platforms, Lighting, Furniture,
 * and a Total Price banner) in a Dialog overlay.
 *
 * Props:
 *   setup          — The item to display, or null/undefined to close.
 *   open           — Controlled open state.
 *   onOpenChange   — Called when user dismisses the dialog.
 *   onSelect       — Optional: when provided renders a primary "Select" CTA button.
 *   isSelected     — Optional: shows "Selected" checkmark state on the CTA.
 *   extraActions   — Optional additional action buttons rendered at the bottom.
 */
import React from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flower2,
  Layers,
  Lightbulb,
  Armchair,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecorationSetupItem } from "@/lib/decoration-setups";

/* ────────────────────────────────────────────────────────────
   Internal helpers
──────────────────────────────────────────────────────────── */

function getDisplayName(setup: DecorationSetupItem): string {
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

  if (!isJunk) return raw;

  const category = setup.category || "Stage";
  const event = setup.specifications?.applicable_events?.[0] || "Royal";
  const hasFlowers = Boolean(
    (setup.specifications?.flowers_used && setup.specifications?.flowers?.length) ||
    setup.entranceGateSpecs?.floralUsage ||
    setup.mandapSpecs?.floralUsage,
  );
  const flowerName = setup.specifications?.flowers?.[0]?.name
    ? setup.specifications.flowers[0].name.replace(/^(Natural |Fresh |Artificial |Silk )+/i, "")
    : "";

  const structure = setup.specifications?.structure_type || "";
  if (flowerName) return `${event} ${flowerName} ${category} Setup`;
  if (
    structure &&
    structure.length < 32 &&
    !structure.toLowerCase().includes(category.toLowerCase())
  ) {
    return `${structure} ${category}`;
  }
  return `${event} ${hasFlowers ? "Floral " : ""}${category} Setup`;
}

function computeDisplayPrice(setup: DecorationSetupItem): number {
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

/* ────────────────────────────────────────────────────────────
   Props
──────────────────────────────────────────────────────────── */
export interface DecorationDetailsModalProps {
  setup: DecorationSetupItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, renders a primary "Select / Selected" button in the modal footer */
  onSelect?: (setup: DecorationSetupItem) => void;
  /** If true, renders the "Selected" checkmark state instead of "Select" */
  isSelected?: boolean;
  /** Any additional action buttons to render alongside "Close" */
  extraActions?: React.ReactNode;
}

/* ────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────── */
export function DecorationDetailsModal({
  setup,
  open,
  onOpenChange,
  onSelect,
  isSelected = false,
  extraActions,
}: DecorationDetailsModalProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  // Which of the decoration's photos is showing (0 = cover)
  const [photoIdx, setPhotoIdx] = React.useState(0);
  React.useEffect(() => {
    setPhotoIdx(0);
  }, [setup?.id, open]);

  // Close lightbox on Escape key without propagating to parent Dialog
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setLightboxOpen(false);
      }
    };
    // Use capture phase so we catch Escape before any bubbling document listeners
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [lightboxOpen]);

  // Reset lightbox if parent dialog closes
  React.useEffect(() => {
    if (!open) {
      setLightboxOpen(false);
    }
  }, [open]);

  if (!setup) return null;

  const displayName = getDisplayName(setup);
  const totalPrice = computeDisplayPrice(setup);
  const specs = setup.specifications;

  const fallbackPhoto =
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&auto=format&fit=crop&q=85";
  // Cover first, then the rest of the gallery, without duplicates
  const photos = [setup.imageUrl, ...(setup.gallery ?? [])].filter(
    (u, i, all): u is string => Boolean(u) && all.indexOf(u) === i,
  );
  if (photos.length === 0) photos.push(fallbackPhoto);
  const currentIdx = Math.min(photoIdx, photos.length - 1);
  const heroImageUrl = photos[currentIdx] ?? fallbackPhoto;
  const stepPhoto = (dir: number) =>
    setPhotoIdx((currentIdx + dir + photos.length) % photos.length);

  const colorDot = (colour: string) => {
    const map: Record<string, string> = {
      white: "#ffffff",
      red: "#dc2626",
      pink: "#ec4899",
      yellow: "#eab308",
      orange: "#f97316",
      purple: "#a855f7",
      blue: "#3b82f6",
      green: "#22c55e",
    };
    return map[colour.toLowerCase()] ?? colour;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onEscapeKeyDown={(e) => {
            // If the lightbox is currently open, dismiss ONLY the lightbox, keeping Details modal open
            if (lightboxOpen) {
              e.preventDefault();
              setLightboxOpen(false);
            }
          }}
          onPointerDownOutside={(e) => {
            // Prevent outside clicks on the lightbox from closing the Details modal
            if (lightboxOpen) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            // Prevent interaction outside from dismissing Details modal while lightbox is open
            if (lightboxOpen) {
              e.preventDefault();
            }
          }}
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-border bg-card shadow-soft"
        >
          {/* Accessibility labels */}
          <DialogTitle className="sr-only">{displayName} — Setup Details</DialogTitle>
          <DialogDescription className="sr-only">
            Full specifications for {displayName} including structure, dimensions, florals, and
            pricing.
          </DialogDescription>

          {/* ── Header Image Banner (Taller hero, reduced bottom-only gradient, click-to-zoom) ── */}
          <div
            onClick={() => setLightboxOpen(true)}
            className="group relative h-72 sm:h-80 w-full overflow-hidden bg-muted shrink-0 cursor-zoom-in select-none"
            title="Click to view photo full size"
          >
            <img
              src={heroImageUrl}
              alt={displayName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepPhoto(-1);
                  }}
                  className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 cursor-pointer"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepPhoto(1);
                  }}
                  className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 cursor-pointer"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                  {currentIdx + 1} / {photos.length}
                </span>
              </>
            )}

            {/* Concentrated thin gradient band at the very bottom only — keeps florals & middle area 100% visible */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            {/* Top Right: Click-to-Zoom Indicator Pill */}
            <div className="absolute top-3.5 right-12 sm:right-14 z-10 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-black/55 text-white/95 backdrop-blur-md border border-white/20 shadow-md">
                <ZoomIn className="size-3.5 text-white" />
                <span>Click to zoom</span>
              </span>
            </div>

            {/* Bottom Info: Category badge, title, and SKU */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between text-white pointer-events-none">
              <div>
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-0.5 rounded-full border-0 shadow-soft">
                  {setup.category}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1.5 text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]">
                  {displayName}
                </h2>
              </div>
              {setup.sku && (
                <span className="font-mono text-xs text-white/95 bg-black/60 px-2.5 py-1 rounded-full border border-white/25 backdrop-blur-sm shadow-sm">
                  {setup.sku}
                </span>
              )}
            </div>
          </div>

          {photos.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto bg-muted/40 px-6 py-3"
              role="group"
              aria-label="Decoration photos"
            >
              {photos.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  aria-label={`Show photo ${i + 1} of ${photos.length}`}
                  aria-current={i === currentIdx}
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer",
                    i === currentIdx
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* ── Modal Body ── */}
          <div className="p-6 space-y-5 text-xs text-foreground">
            {/* Description */}
            {setup.description && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-3 leading-relaxed">
                "{setup.description}"
              </p>
            )}

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Structure Type
                </span>
                <p className="font-semibold text-foreground text-xs mt-1">
                  {specs?.structure_type ||
                    specs?.main_structure ||
                    setup.entranceGateSpecs?.structureType ||
                    setup.mandapSpecs?.structureType ||
                    "Standard Custom Framework"}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Dimensions
                </span>
                <p className="font-semibold text-foreground text-xs mt-1">
                  {specs?.dimensions
                    ? `${specs.dimensions.width_ft} ft (W) × ${specs.dimensions.height_ft} ft (H)`
                    : setup.backdropSpecs?.dimensions || "12 × 10 ft (Standard Size)"}
                </p>
              </div>

              {specs?.applicable_events && specs.applicable_events.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Applicable Events
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {specs.applicable_events.map((e) => (
                      <span
                        key={e}
                        className="rounded-full bg-card border border-border px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-2xs"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Floral Section */}
            {specs?.flowers_used && specs.flowers && specs.flowers.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3 shadow-soft">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Flower2 className="size-3.5 text-primary" />
                    Floral Specifications &amp; Style
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Included in Base Design
                  </span>
                </div>

                {/* Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-card border border-border/80 rounded-lg px-2.5 py-1 text-foreground shadow-2xs">
                    <span className="text-muted-foreground font-normal">Flower Style:</span>
                    <strong className="text-foreground">
                      {specs.flowers.length > 1
                        ? "Mixed Floral Arrangement"
                        : `${(specs.flowers[0]?.name || "Floral").replace(/^(Natural |Fresh |Artificial |Silk )+/i, "")} Theme`}
                    </strong>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-card border border-border/80 rounded-lg px-2.5 py-1 text-foreground shadow-2xs">
                    <span className="text-muted-foreground font-normal">Variety Type:</span>
                    <strong className="text-foreground capitalize">
                      {specs.flowers.every((f) => f.type === "natural")
                        ? "Natural / Fresh"
                        : specs.flowers.every((f) => f.type === "artificial")
                          ? "Artificial / Silk"
                          : "Mixed Varieties"}
                    </strong>
                  </div>
                </div>

                {/* Flower Rows */}
                <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                  {specs.flowers.map((f, i) => {
                    const cleanName = f.name.replace(/^(Natural |Fresh |Artificial |Silk )+/i, "");
                    const varietyLabel =
                      f.type === "natural"
                        ? "Fresh"
                        : f.type === "artificial"
                          ? "Silk / Artificial"
                          : f.natural_percent !== undefined
                            ? `Mixed (${f.natural_percent}% fresh · ${100 - f.natural_percent}% silk)`
                            : "Mixed";
                    return (
                      <div
                        key={i}
                        className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {cleanName || f.name}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                f.type === "natural"
                                  ? "bg-emerald-50 border-emerald-200/70 text-emerald-800"
                                  : f.type === "artificial"
                                    ? "bg-amber-50 border-amber-200/70 text-amber-800"
                                    : "bg-purple-50 border-purple-200/70 text-purple-800",
                              )}
                            >
                              {varietyLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Variety: <strong className="text-foreground">{varietyLabel}</strong>
                            </span>
                            {f.colour && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  Color:{" "}
                                  <strong className="text-foreground flex items-center gap-1">
                                    <span
                                      className="size-2.5 rounded-full border border-black/15 shrink-0 inline-block"
                                      style={{ backgroundColor: colorDot(f.colour) }}
                                    />
                                    {f.colour}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 border border-border/80 px-2.5 py-1 rounded-md shrink-0">
                          Base Style Spec
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Platforms Section */}
            {specs?.platforms_used && specs.platforms && specs.platforms.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3 shadow-soft">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="size-3.5 text-muted-foreground" />
                  Platform Details
                </span>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                  {specs.platforms.map((p, i) => (
                    <div
                      key={i}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-foreground">
                          {p.type || p.shape || "Platform"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {p.size?.width || 12} × {p.size?.height || 8} ft · Colour:{" "}
                          {p.colour || p.flex_colour || "Standard"}
                        </span>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums">
                        Rs. {Number(p.price || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lighting Section */}
            {specs?.lighting_used && specs.lighting && specs.lighting.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="size-3.5 text-amber-500" />
                    Lighting Setup
                  </span>
                  {(() => {
                    const overallPrice =
                      specs.overall_lighting_price ?? specs.overall_lighting_cost;
                    return typeof overallPrice === "number" && overallPrice > 0 ? (
                      <span className="text-xs font-bold text-foreground">
                        Rs. {overallPrice.toLocaleString()}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
                  {specs.lighting.map((l, i) => (
                    <div
                      key={i}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-foreground">{l.type}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Quantity: {l.quantity || 1} {l.unit || "piece"}
                        </span>
                      </div>
                      {typeof l.price === "number" && l.price > 0 && (
                        <span className="font-semibold text-foreground tabular-nums">
                          Rs. {Number(l.price).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Furniture Section */}
            {specs?.furniture_details && (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-2 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Armchair className="size-3.5 text-muted-foreground" />
                    Furniture &amp; Props
                  </span>
                  {typeof specs.furniture_price === "number" && specs.furniture_price > 0 && (
                    <span className="text-xs font-bold text-foreground">
                      Rs. {specs.furniture_price.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground bg-card p-2.5 rounded-xl border border-border/70 shadow-2xs">
                  {specs.furniture_details}
                </p>
              </div>
            )}

            {/* Total Price Banner */}
            <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between shadow-soft">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Starting Price
                </span>
                <span className="text-xs text-muted-foreground">
                  Includes core base + confirmed add-ons
                </span>
              </div>
              <span className="text-xl font-extrabold text-primary tabular-nums">
                Rs. {totalPrice.toLocaleString()}
              </span>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">{extraActions}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                >
                  <X className="size-3.5 mr-1" />
                  Close
                </Button>
                {onSelect && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelect(setup);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "rounded-xl text-xs h-9 px-4 font-semibold cursor-pointer gap-1.5 shadow-sm",
                      isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-[#e14b68] hover:bg-[#cf3e5a] text-white shadow-[#e14b68]/25",
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="size-3.5 stroke-[2.5]" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5 stroke-[2.5]" />
                        Select This Setup
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── FULL-SCREEN LIGHTBOX OVERLAY (Click-to-zoom / Lightbox) ─── */}
      {lightboxOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Full-screen photo view for ${displayName}`}
            className="pointer-events-auto fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in-0 duration-200 cursor-zoom-out select-none"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLightboxOpen(false);
            }}
          >
            {/* Top Bar with Close Button & ESC hint */}
            <div
              className="absolute top-4 right-4 z-10 flex items-center gap-3"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 hidden sm:inline-block">
                Click anywhere or press Esc to close
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLightboxOpen(false);
                }}
                className="size-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-lg focus:outline-none"
                aria-label="Close full-screen image preview"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Clean Full-Size Image Container (Strictly NO text overlay on the photo) */}
            <div
              className="relative max-w-[95vw] max-h-[92vh] flex items-center justify-center"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={heroImageUrl}
                alt={displayName}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl transition-transform"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => stepPhoto(-1)}
                    className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25 cursor-pointer"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => stepPhoto(1)}
                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25 cursor-pointer"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                    {currentIdx + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
