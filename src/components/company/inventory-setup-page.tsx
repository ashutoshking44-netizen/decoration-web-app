import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Sparkles,
  Plus,
  Search,
  ArrowUpDown,
  Flower2,
  Layers,
  Boxes,
  ArrowLeft,
  X,
  Menu,
  Lightbulb,
  Armchair,
  PenLine,
  Trash2,
  TrendingUp,
  TrendingDown,
  FileText,
  LayoutGrid,
  List,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDecorationSetupsStore,
  loadSetupQuotationCounts,
  type DecorationSetupItem,
  type DecorationCategory,
} from "@/lib/decoration-setups";
import { useBookedClientsStore } from "@/lib/clients";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DecorationCatalogCard } from "./decoration-catalog-card";
import { DecorationCatalogListItem } from "./decoration-catalog-list-item";
import { DecorationDetailsModal } from "./decoration-details-modal";
import { PhotographerGallery } from "./photographer-gallery";
import { AddDecorationModal } from "./add-decoration-page";
import { usePhotographerGallery, type GalleryPhoto } from "@/lib/photographer-gallery";

const CATEGORIES: ("All" | DecorationCategory)[] = [
  "All",
  "Entrance Gate",
  "Welcome Board",
  "Mandap",
  "Stage",
  "Backdrop",
];

/** Display metadata for each category */
const CATEGORY_META: Record<string, { label: string; description: string }> = {
  All: {
    label: "Decorations Catalog",
    description: "All decoration setups across every category and style.",
  },
  "Entrance Gate": {
    label: "Entrance Gate Setups",
    description: "Grand entrance arches, floral gates, and welcoming entryway designs.",
  },
  "Welcome Board": {
    label: "Welcome Board Designs",
    description: "Elegant welcome signage, photo frames, and board arrangements.",
  },
  Mandap: {
    label: "Mandap Setups",
    description: "Traditional and modern mandap structures for wedding ceremonies.",
  },
  Stage: {
    label: "Stage Setups",
    description: "Reception stages, head-table backdrops, and event stage decor.",
  },
  Backdrop: {
    label: "Backdrop Designs",
    description: "Photo backdrops, wall panels, and floral curtain installations.",
  },
};

/**
 * Returns a clean, human-readable name for any decoration setup,
 * ensuring raw IDs, SKU placeholders, or messy strings are formatted naturally.
 */
function getHumanReadableName(setup: DecorationSetupItem): string {
  const raw = (setup.name || "").trim();

  // Detect raw IDs, SKU placeholders, or messy hashes
  const isJunk =
    !raw ||
    raw.toLowerCase().startsWith("setup-") ||
    raw.toLowerCase().startsWith("lib-") ||
    raw.toLowerCase().startsWith("draft-") ||
    /^[A-Z]{3,4}-[A-Z0-9-]{3,}$/i.test(raw) || // e.g. GATE-ROY-01
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw) || // UUID
    /^\d+$/.test(raw) || // purely numeric
    raw === setup.id ||
    raw === setup.sku;

  if (!isJunk) {
    return raw;
  }

  // Synthesize an intuitive, human-readable name
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

  if (flowerName) {
    return `${event} ${flowerName} ${category} Setup`;
  }
  if (
    structure &&
    structure.length < 32 &&
    !structure.toLowerCase().includes(category.toLowerCase())
  ) {
    return `${structure} ${category}`;
  }
  return `${event} ${hasFlowers ? "Floral " : ""}${category} Setup`;
}

/**
 * Extracts plain-text core specs (dimensions, flower type, platform style)
 * for clean, readable display without clutter.
 */
function getSetupSpecsText(setup: DecorationSetupItem) {
  const specs = setup.specifications;

  // 1. Dimensions
  let dimensions = "12 × 10 ft (Standard)";
  if (specs?.dimensions?.width_ft && specs?.dimensions?.height_ft) {
    dimensions = `${specs.dimensions.width_ft} × ${specs.dimensions.height_ft} ft`;
  } else if (setup.backdropSpecs?.dimensions) {
    dimensions = setup.backdropSpecs.dimensions.replace(/\(.*\)/, "").trim();
  }

  // 2. Flower type
  let flowerType = "Structure only (No flowers)";
  if (specs?.flowers_used && specs?.flowers && specs.flowers.length > 0) {
    const f = specs.flowers[0];
    if (f) {
      const isFresh = f.type === "natural";
      const name = f.name?.replace(/^(Natural |Fresh |Artificial |Silk )+/i, "") || "Flowers";
      const count = specs.flowers.length;
      flowerType = `${isFresh ? "Fresh" : "Silk"} ${name}${count > 1 ? ` +${count - 1}` : ""}`;
    }
  } else if (setup.entranceGateSpecs?.floralUsage) {
    flowerType = setup.entranceGateSpecs.floralType || "Fresh & Silk Floral";
  } else if (setup.mandapSpecs?.floralUsage) {
    flowerType = setup.mandapSpecs.floralType || "Fresh & Silk Floral";
  }

  // 3. Platform style
  let platformStyle = "None (Floor level)";
  if (specs?.platforms && specs.platforms.length > 0) {
    const p = specs.platforms[0];
    if (p) {
      platformStyle = p.shape || p.type || "Raised Platform";
      if (p.colour) platformStyle += ` (${p.colour})`;
    }
  } else if (specs?.platform_shape) {
    platformStyle = `${specs.platform_shape} Platform`;
    if (specs?.platform_colour) platformStyle += ` (${specs.platform_colour})`;
  } else if (specs?.mandap_platform_shape) {
    platformStyle = `${specs.mandap_platform_shape} Platform`;
  } else if (setup.stageSpecs?.platformIncluded) {
    platformStyle = "Stage Platform (Included)";
  }

  return { dimensions, flowerType, platformStyle };
}

export function InventorySetupPage() {
  const navigate = useNavigate();
  // Read category from URL search param (?category=Entrance+Gate)
  const search = useSearch({ from: "/inventory" }) as { category?: string };
  const { setups, updateSetup, deleteSetup } = useDecorationSetupsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | DecorationCategory>("All");
  const [floralFilter, setFloralFilter] = useState<"all" | "with-flowers" | "without-flowers">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "popular" | "newest" | "updated" | "name" | "name-desc" | "price-asc" | "price-desc"
  >("newest");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Left-bar view: the decoration catalog, or the photographer gallery
  const [view, setView] = useState<"catalog" | "gallery">("catalog");
  const gallery = usePhotographerGallery();
  const [createFromPhoto, setCreateFromPhoto] = useState<GalleryPhoto | null>(null);

  // View Mode: "grid" (default) or "list" - persisted across categories and sessions
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("decor_catalog_view_mode");
      if (saved === "grid" || saved === "list") return saved;
    }
    return "grid";
  });

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("decor_catalog_view_mode", mode);
    }
  };

  // Sync URL param → state on mount and navigation
  useEffect(() => {
    const urlCat = search.category;
    if (urlCat && CATEGORIES.includes(urlCat as "All" | DecorationCategory)) {
      setSelectedCategory(urlCat as "All" | DecorationCategory);
    } else if (!urlCat) {
      setSelectedCategory("All");
    }
  }, [search.category]);

  /** Change category — updates state AND pushes clean URL */
  const selectCategory = (cat: "All" | DecorationCategory) => {
    setView("catalog");
    setSelectedCategory(cat);
    setFloralFilter("all");
    navigate({
      to: "/inventory",
      search: cat === "All" ? {} : { category: cat },
      replace: true,
    });
  };

  const handleStatusChange = (
    newStatus: "Live" | "Paused" | "Draft",
    setup?: DecorationSetupItem,
  ) => {
    if (!setup) return;
    updateSetup(setup.id, { status: newStatus });
    toast.success(`"${getHumanReadableName(setup)}" is now ${newStatus}`);
  };

  // Modal states
  const [selectedSetupForView, setSelectedSetupForView] = useState<DecorationSetupItem | null>(
    null,
  );
  const [setupToDelete, setSetupToDelete] = useState<DecorationSetupItem | null>(null);

  // Helper to compute total display price for a setup
  const getSetupPrice = (setup: DecorationSetupItem): number => {
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
  };

  // Clients store & quotation tracker for "Most Booked / Popular" sorting
  const { clients } = useBookedClientsStore();
  const quotationCounts = useMemo(() => {
    return loadSetupQuotationCounts();
  }, [setups]);

  const getBookingAndQuotationCount = (setup: DecorationSetupItem): number => {
    let count = typeof setup.bookingCount === "number" ? setup.bookingCount : 0;

    const nameLower = (setup.name || "").toLowerCase().trim();
    const humanNameLower = getHumanReadableName(setup).toLowerCase().trim();
    const skuLower = (setup.sku || "").toLowerCase().trim();

    if (clients && clients.length > 0) {
      clients.forEach((c) => {
        const matched = c.decorations?.some((d) => {
          const dName = (d.name || "").toLowerCase().trim();
          if (!dName) return false;
          if (dName === nameLower || dName === humanNameLower) return true;
          if (skuLower && dName === skuLower) return true;
          if (
            (nameLower.length > 8 && dName.includes(nameLower)) ||
            (dName.length > 8 && nameLower.includes(dName)) ||
            (humanNameLower.length > 8 && dName.includes(humanNameLower)) ||
            (dName.length > 8 && humanNameLower.includes(dName))
          ) {
            return true;
          }
          return false;
        });
        if (matched) count += 1;
      });
    }

    if (setup.id) {
      const qCount = quotationCounts[setup.id];
      if (typeof qCount === "number") {
        count += qCount;
      }
    }

    return count;
  };

  // Filter & Sort Setups
  const filteredSetups = useMemo(() => {
    return setups
      .filter((setup) => {
        // Category filter
        if (selectedCategory !== "All" && setup.category !== selectedCategory) {
          return false;
        }

        // Floral filter
        const hasFlowers =
          Boolean(setup.specifications?.flowers_used && setup.specifications?.flowers?.length) ||
          Boolean(setup.entranceGateSpecs?.floralUsage) ||
          Boolean(setup.mandapSpecs?.floralUsage);
        if (floralFilter === "with-flowers" && !hasFlowers) return false;
        if (floralFilter === "without-flowers" && hasFlowers) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (setup.name || "").toLowerCase().includes(q);
          const matchHumanName = getHumanReadableName(setup).toLowerCase().includes(q);
          const matchSku = (setup.sku || "").toLowerCase().includes(q);
          const matchCat = (setup.category || "").toLowerCase().includes(q);
          const matchDesc = setup.description?.toLowerCase().includes(q) ?? false;
          const matchStructure =
            setup.specifications?.structure_type?.toLowerCase().includes(q) ?? false;
          const matchEvents =
            setup.specifications?.applicable_events?.some((e) => e.toLowerCase().includes(q)) ??
            false;

          if (
            !matchName &&
            !matchHumanName &&
            !matchSku &&
            !matchCat &&
            !matchDesc &&
            !matchStructure &&
            !matchEvents
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "popular") {
          const diff = getBookingAndQuotationCount(b) - getBookingAndQuotationCount(a);
          if (diff !== 0) return diff;
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "updated") {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        }
        if (sortBy === "name") {
          return getHumanReadableName(a).localeCompare(getHumanReadableName(b), undefined, {
            sensitivity: "base",
            numeric: true,
          });
        }
        if (sortBy === "name-desc") {
          return getHumanReadableName(b).localeCompare(getHumanReadableName(a), undefined, {
            sensitivity: "base",
            numeric: true,
          });
        }
        if (sortBy === "price-asc") {
          return getSetupPrice(a) - getSetupPrice(b);
        }
        if (sortBy === "price-desc") {
          return getSetupPrice(b) - getSetupPrice(a);
        }
        return 0;
      });
  }, [setups, selectedCategory, floralFilter, searchQuery, sortBy, clients, quotationCounts]);

  const handleDeleteConfirm = () => {
    if (!setupToDelete) return;
    deleteSetup(setupToDelete.id);
    toast.success(`Removed "${getHumanReadableName(setupToDelete)}" from catalog`);
    setSetupToDelete(null);
    if (selectedSetupForView?.id === setupToDelete.id) {
      setSelectedSetupForView(null);
    }
  };

  // ─── Dynamic Category-Specific Metrics ───
  const categoryMetrics = useMemo(() => {
    const categorySetups =
      selectedCategory === "All" ? setups : setups.filter((s) => s.category === selectedCategory);

    const totalDesigns = categorySetups.length;
    const floralCount = categorySetups.filter((s) => {
      return (
        Boolean(s.specifications?.flowers_used && s.specifications?.flowers?.length) ||
        Boolean(s.entranceGateSpecs?.floralUsage) ||
        Boolean(s.mandapSpecs?.floralUsage)
      );
    }).length;
    const structureCount = totalDesigns - floralCount;
    const totalSum = categorySetups.reduce((acc, s) => acc + getSetupPrice(s), 0);
    const avgPrice = totalDesigns > 0 ? Math.round(totalSum / totalDesigns) : 0;

    // Active setups respecting current category and floral filter
    const activeSetups = categorySetups.filter((s) => {
      const hasFloral =
        Boolean(s.specifications?.flowers_used && s.specifications?.flowers?.length) ||
        Boolean(s.entranceGateSpecs?.floralUsage) ||
        Boolean(s.mandapSpecs?.floralUsage);
      if (floralFilter === "with-flowers" && !hasFloral) return false;
      if (floralFilter === "without-flowers" && hasFloral) return false;
      return true;
    });

    const prices = activeSetups
      .map((s) => getSetupPrice(s))
      .filter((p) => typeof p === "number" && !isNaN(p) && p > 0);

    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      totalDesigns,
      floralCount,
      structureCount,
      avgPrice,
      lowestPrice,
      highestPrice,
      activePriceCount: prices.length,
    };
  }, [setups, selectedCategory, floralFilter]);

  const summaryMetrics = categoryMetrics;

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      {/* ─── Mobile Overlay Backdrop ─── */}
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-xs lg:hidden cursor-pointer"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* ═══ FAR-LEFT FULL-HEIGHT STRUCTURAL SIDEBAR ═══ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 xl:w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Top Header Row: Back to Dashboard */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
          <Link
            to="/company"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Brand / Portal Identifier */}
        <div className="flex h-18 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <img
            src="/assets/app-logo.png"
            alt="Decorations Catalog"
            className="size-10 shrink-0 rounded-xl object-cover shadow-soft border border-border"
          />
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold leading-tight text-foreground">
              Decorations
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Catalog &amp; Designs
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav
          className="scrollbar-thin flex-1 overflow-y-auto p-3 space-y-4"
          aria-label="Catalog categories"
        >
          {/* Browse by Type */}
          <div>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Browse by Type
            </p>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isSelected = view === "catalog" && selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      selectCategory(cat);
                      setMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-soft"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="truncate">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Photos — pinned to the bottom of the sidebar */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          {/* Photographer Gallery */}
          <div>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Photos
            </p>
            <button
              type="button"
              onClick={() => {
                setView("gallery");
                setMobileSidebarOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer",
                view === "gallery"
                  ? "bg-primary text-primary-foreground font-semibold shadow-soft"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Camera className="size-3.5 shrink-0" />
              <span className="flex-1 truncate">Photographer Gallery</span>
              {gallery.photos.length > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    view === "gallery" ? "bg-white/25" : "bg-muted text-muted-foreground",
                  )}
                >
                  {gallery.photos.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT COLUMN (RIGHT) ═══ */}
      <main className="min-h-screen lg:ml-60 xl:ml-64 flex flex-col bg-canvas text-foreground transition-[margin] duration-300">
        {/* Top App Bar with Breadcrumbs & Navigation */}
        {selectedCategory === "All" && view === "catalog" ? (
          <header className="sticky top-0 z-20 border-b border-sidebar-border/80 bg-card/80 backdrop-blur-md">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Open category sidebar"
                >
                  <Menu className="size-4" />
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Link
                    to="/company"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-foreground">Decorations</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/company"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Link>
              </div>
            </div>
          </header>
        ) : (
          /* Category View Pages: completely clean top header without breadcrumbs or duplicate back button */
          <header className="lg:hidden sticky top-0 z-20 border-b border-sidebar-border/80 bg-card/80 backdrop-blur-md">
            <div className="w-full px-4 py-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs"
                aria-label="Open category sidebar"
              >
                <Menu className="size-4" />
                <span>Categories</span>
              </button>
            </div>
          </header>
        )}

        {/* Page Content Body */}
        {view === "gallery" ? (
          <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-6 pb-16 sm:pb-24 max-w-[1600px] mx-auto">
            <PhotographerGallery
              photos={gallery.photos}
              ready={gallery.ready}
              onAdd={gallery.addPhotos}
              onRemove={gallery.removePhoto}
              onCreateDecoration={setCreateFromPhoto}
            />
          </div>
        ) : (
          <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-6 pb-16 sm:pb-24 space-y-4 sm:space-y-5 max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div
              className={cn(
                "flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4",
                selectedCategory === "All" ? "sm:items-start" : "sm:items-center",
              )}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {CATEGORY_META[selectedCategory]?.label ?? `${selectedCategory} Setups`}
                  </h1>
                  <span className="rounded-full bg-card border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-2xs tabular-nums">
                    {filteredSetups.length} {filteredSetups.length === 1 ? "setup" : "setups"}
                  </span>
                </div>
                {selectedCategory === "All" && (
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {categoryMetrics.totalDesigns} decoration setups across all catalog categories
                    {searchQuery && ` · matching "${searchQuery}"`}
                    {floralFilter === "with-flowers" && " · with flowers"}
                    {floralFilter === "without-flowers" && " · structure only"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  onClick={() =>
                    navigate({ to: "/add-decoration", search: { from: "/inventory" } })
                  }
                  className={cn(
                    "gap-1.5 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-primary-foreground shadow-soft transition-all active:scale-[0.98] cursor-pointer",
                    selectedCategory === "All"
                      ? "h-10 px-4 sm:px-5 text-xs sm:text-sm"
                      : "h-9 px-3.5 sm:px-4 text-xs",
                  )}
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>
                    {selectedCategory === "All"
                      ? "+ Upload New Decoration"
                      : `+ Upload ${selectedCategory}`}
                  </span>
                </Button>
              </div>
            </div>

            {/* 4 Summary Metric Cards — Visible ONLY on the main "All" catalog overview page */}
            {selectedCategory === "All" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 transition-all duration-200 animate-in fade-in-50">
                {/* 1. Total Designs */}
                <div className="border border-border bg-card transition-all flex items-center justify-between rounded-2xl p-4 sm:p-5 shadow-soft hover:shadow-md hover:border-border/80">
                  <div className="space-y-1 sm:space-y-1.5 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate leading-tight">
                      Total Designs
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums leading-tight">
                      {categoryMetrics.totalDesigns}
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground/80 truncate leading-tight">
                      Active catalog setups
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-rose-light border border-border/80 text-primary shrink-0 size-11 shadow-soft">
                    <Sparkles className="size-5" />
                  </div>
                </div>

                {/* 2. Floral Setups */}
                <div className="border border-border bg-card transition-all flex items-center justify-between rounded-2xl p-4 sm:p-5 shadow-soft hover:shadow-md hover:border-border/80">
                  <div className="space-y-1 sm:space-y-1.5 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate leading-tight">
                      Floral Setups
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums leading-tight">
                      {categoryMetrics.floralCount}
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground/80 truncate leading-tight">
                      {categoryMetrics.totalDesigns > 0
                        ? `${Math.round((categoryMetrics.floralCount / categoryMetrics.totalDesigns) * 100)}% floral styles`
                        : "0% floral styles"}
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-rose-light border border-border/80 text-primary shrink-0 size-11 shadow-soft">
                    <Flower2 className="size-5" />
                  </div>
                </div>

                {/* 3. Structure Only */}
                <div className="border border-border bg-card transition-all flex items-center justify-between rounded-2xl p-4 sm:p-5 shadow-soft hover:shadow-md hover:border-border/80">
                  <div className="space-y-1 sm:space-y-1.5 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate leading-tight">
                      Structure Only
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums leading-tight">
                      {categoryMetrics.structureCount}
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground/80 truncate leading-tight">
                      {categoryMetrics.totalDesigns > 0
                        ? `${Math.round((categoryMetrics.structureCount / categoryMetrics.totalDesigns) * 100)}% frameworks`
                        : "0% frameworks"}
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-muted/70 border border-border/80 text-amber-600 shrink-0 size-11 shadow-soft">
                    <Boxes className="size-5" />
                  </div>
                </div>

                {/* 4. Price Range (Lowest & Highest Price) */}
                <div className="flex flex-col h-full gap-2.5 sm:gap-3">
                  {/* Top Mini-Card: Lowest Price */}
                  <div
                    className="flex-1 min-h-0 border border-border bg-card rounded-xl px-4 py-2.5 sm:px-4.5 sm:py-3 shadow-soft hover:shadow-md hover:border-border/80 transition-all flex items-center justify-between"
                    title={
                      categoryMetrics.activePriceCount > 0
                        ? `Lowest starting price: Rs. ${categoryMetrics.lowestPrice.toLocaleString()}`
                        : "No setups"
                    }
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground block truncate text-[10px] sm:text-[11px] leading-tight">
                        Lowest Price
                      </span>
                      <div className="font-extrabold text-foreground tracking-tight tabular-nums text-base sm:text-lg leading-tight truncate">
                        {categoryMetrics.activePriceCount > 0
                          ? `Rs. ${categoryMetrics.lowestPrice.toLocaleString()}`
                          : "Rs. 0"}
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 size-7 sm:size-8 shadow-2xs ml-2">
                      <TrendingDown className="size-3.5 sm:size-4" />
                    </div>
                  </div>

                  {/* Bottom Mini-Card: Highest Price */}
                  <div
                    className="flex-1 min-h-0 border border-border bg-card rounded-xl px-4 py-2.5 sm:px-4.5 sm:py-3 shadow-soft hover:shadow-md hover:border-border/80 transition-all flex items-center justify-between"
                    title={
                      categoryMetrics.activePriceCount > 0
                        ? `Highest starting price: Rs. ${categoryMetrics.highestPrice.toLocaleString()}`
                        : "No setups"
                    }
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground block truncate text-[10px] sm:text-[11px] leading-tight">
                        Highest Price
                      </span>
                      <div className="font-extrabold text-foreground tracking-tight tabular-nums text-base sm:text-lg leading-tight truncate">
                        {categoryMetrics.activePriceCount > 0
                          ? `Rs. ${categoryMetrics.highestPrice.toLocaleString()}`
                          : "Rs. 0"}
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-full bg-rose-light border border-border/80 text-primary shrink-0 size-7 sm:size-8 shadow-2xs ml-2">
                      <TrendingUp className="size-3.5 sm:size-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search & Sort Bar */}
            <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-soft transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search setups by name, category, dimensions, or event..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 pr-9 w-full rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:bg-card focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      title="Clear search"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl border border-border bg-card text-xs font-semibold text-foreground gap-1.5 px-3 hover:bg-muted/40 hover:text-foreground cursor-pointer shadow-2xs"
                      >
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        <span>
                          {sortBy === "popular" && "Most Booked / Popular"}
                          {sortBy === "newest" && "Newest First"}
                          {sortBy === "updated" && "Recently Updated"}
                          {sortBy === "name" && "Alphabetical (A - Z)"}
                          {sortBy === "name-desc" && "Alphabetical (Z - A)"}
                          {sortBy === "price-asc" && "Price: Low to High"}
                          {sortBy === "price-desc" && "Price: High to Low"}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 text-xs rounded-xl border border-border bg-card shadow-soft p-1.5"
                    >
                      <DropdownMenuItem
                        onClick={() => setSortBy("popular")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "popular" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Most Booked / Popular
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("newest")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "newest" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Newest First
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("updated")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "updated" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Recently Updated
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("name")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "name" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Alphabetical (A - Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("name-desc")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "name-desc" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Alphabetical (Z - A)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("price-asc")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "price-asc" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Price: Low to High
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("price-desc")}
                        className={cn(
                          "cursor-pointer rounded-lg px-2.5 py-2",
                          sortBy === "price-desc" && "font-semibold text-primary bg-primary/10",
                        )}
                      >
                        Price: High to Low
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Quick-filter pill: All */}
                  <button
                    type="button"
                    onClick={() => setFloralFilter("all")}
                    className={cn(
                      "hidden lg:inline-flex items-center gap-1.5 h-10 rounded-xl px-3.5 text-xs font-semibold transition-all cursor-pointer border shadow-2xs",
                      floralFilter === "all"
                        ? "bg-primary border-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:bg-muted/40 hover:border-border/80",
                    )}
                  >
                    <Layers
                      className={cn(
                        "size-3.5",
                        floralFilter === "all" ? "text-primary-foreground" : "text-primary",
                      )}
                    />
                    <span>All</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFloralFilter(floralFilter === "with-flowers" ? "all" : "with-flowers")
                    }
                    className={cn(
                      "hidden lg:inline-flex items-center gap-1.5 h-10 rounded-xl px-3.5 text-xs font-semibold transition-all cursor-pointer border shadow-2xs",
                      floralFilter === "with-flowers"
                        ? "bg-primary border-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:bg-muted/40 hover:border-border/80",
                    )}
                  >
                    <Flower2
                      className={cn(
                        "size-3.5",
                        floralFilter === "with-flowers"
                          ? "text-primary-foreground"
                          : "text-primary",
                      )}
                    />
                    <span>With Flowers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFloralFilter(
                        floralFilter === "without-flowers" ? "all" : "without-flowers",
                      )
                    }
                    className={cn(
                      "hidden lg:inline-flex items-center gap-1.5 h-10 rounded-xl px-3.5 text-xs font-semibold transition-all cursor-pointer border shadow-2xs",
                      floralFilter === "without-flowers"
                        ? "bg-primary border-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:bg-muted/40 hover:border-border/80",
                    )}
                  >
                    <Boxes
                      className={cn(
                        "size-3.5",
                        floralFilter === "without-flowers"
                          ? "text-primary-foreground"
                          : "text-amber-600",
                      )}
                    />
                    <span>Structure Only</span>
                  </button>

                  {/* View Mode Toggle (Grid vs List) */}
                  <div className="flex items-center p-1 rounded-xl border border-border bg-card shadow-2xs shrink-0 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("grid")}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg transition-all cursor-pointer",
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                      title="Grid View"
                      aria-label="Grid View"
                    >
                      <LayoutGrid className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("list")}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg transition-all cursor-pointer",
                        viewMode === "list"
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                      title="List View"
                      aria-label="List View"
                    >
                      <List className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile-only: horizontal category pills */}
              <div className="flex lg:hidden flex-wrap items-center justify-start gap-2 mt-3 pt-3 border-t border-border/40">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count =
                    cat === "All" ? setups.length : setups.filter((s) => s.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => selectCategory(cat)}
                      className={cn(
                        "inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-soft"
                          : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shadow-2xs",
                      )}
                    >
                      <span>{cat}</span>
                    </button>
                  );
                })}
                <div className="h-4 w-px bg-border/60 self-center" />
                <button
                  type="button"
                  onClick={() => setFloralFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                    floralFilter === "all"
                      ? "bg-primary border-primary text-primary-foreground shadow-soft"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shadow-2xs",
                  )}
                >
                  <Layers
                    className={cn(
                      "size-3",
                      floralFilter === "all" ? "text-primary-foreground" : "text-primary",
                    )}
                  />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFloralFilter(floralFilter === "with-flowers" ? "all" : "with-flowers")
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                    floralFilter === "with-flowers"
                      ? "bg-primary border-primary text-primary-foreground shadow-soft"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shadow-2xs",
                  )}
                >
                  <Flower2 className="size-3" />
                  <span>With Flowers</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFloralFilter(floralFilter === "without-flowers" ? "all" : "without-flowers")
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                    floralFilter === "without-flowers"
                      ? "bg-primary border-primary text-primary-foreground shadow-soft"
                      : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shadow-2xs",
                  )}
                >
                  <Boxes className="size-3" />
                  <span>Structure Only</span>
                </button>
              </div>
            </div>

            {/* Product Cards Grid */}
            {filteredSetups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-light text-primary">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">
                  No decoration setups found
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {searchQuery || selectedCategory !== "All" || floralFilter !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for."
                    : "Your catalog is empty. Start by uploading your first decoration setup design."}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  {(searchQuery || selectedCategory !== "All" || floralFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFloralFilter("all");
                        selectCategory("All");
                      }}
                      className="rounded-xl text-xs h-9 cursor-pointer"
                    >
                      Clear Filters
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({ to: "/add-decoration", search: { from: "/inventory" } })
                    }
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-4 h-9 shadow-soft cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" />+ Upload New Decoration
                  </Button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSetups.map((setup) => (
                  <DecorationCatalogCard
                    key={setup.id}
                    setup={setup}
                    className="h-full"
                    onStatusChange={(status, s) => handleStatusChange(status, s || setup)}
                    onViewDetails={(s) => setSelectedSetupForView(s || setup)}
                    onCreateQuotation={(s) => {
                      const target = s || setup;
                      navigate({
                        to: "/quotations/new",
                        search: { setupId: target.id, from: "/inventory" },
                      });
                    }}
                    onEdit={(s) =>
                      navigate({
                        to: "/add-decoration",
                        search: { editId: (s || setup).id, from: "/inventory" },
                      })
                    }
                    onDelete={(s) => setSetupToDelete(s || setup)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSetups.map((setup) => (
                  <DecorationCatalogListItem
                    key={setup.id}
                    setup={setup}
                    onStatusChange={(status, s) => handleStatusChange(status, s || setup)}
                    onViewDetails={(s) => setSelectedSetupForView(s || setup)}
                    onCreateQuotation={(s) => {
                      const target = s || setup;
                      navigate({
                        to: "/quotations/new",
                        search: { setupId: target.id, from: "/inventory" },
                      });
                    }}
                    onEdit={(s) =>
                      navigate({
                        to: "/add-decoration",
                        search: { editId: (s || setup).id, from: "/inventory" },
                      })
                    }
                    onDelete={(s) => setSetupToDelete(s || setup)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODAL: Create a decoration from a photographer photo ─── */}
      {createFromPhoto && (
        <AddDecorationModal
          key={createFromPhoto.id}
          open
          onOpenChange={(o) => {
            if (!o) setCreateFromPhoto(null);
          }}
          initialPhotoUrl={createFromPhoto.src}
          {...(createFromPhoto.event ? { initialName: createFromPhoto.event } : {})}
        />
      )}

      {/* ─── MODAL: View Setup Details & Specifications ─── */}
      <DecorationDetailsModal
        setup={selectedSetupForView}
        open={Boolean(selectedSetupForView)}
        onOpenChange={(open) => !open && setSelectedSetupForView(null)}
        extraActions={
          selectedSetupForView ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const toDelete = selectedSetupForView;
                  setSelectedSetupForView(null);
                  setSetupToDelete(toDelete);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer h-9 px-3 gap-1.5"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const targetSetup = selectedSetupForView;
                  setSelectedSetupForView(null);
                  if (targetSetup) {
                    navigate({
                      to: "/quotations/new",
                      search: { setupId: targetSetup.id, from: "/inventory" },
                    });
                  }
                }}
                className="rounded-xl border border-border bg-card text-foreground hover:bg-muted/40 hover:text-primary text-xs font-semibold px-3 h-9 gap-1.5 shadow-soft cursor-pointer transition-colors"
              >
                <FileText className="size-3.5 text-primary" />
                <span>Quotation</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const id = selectedSetupForView.id;
                  setSelectedSetupForView(null);
                  navigate({
                    to: "/add-decoration",
                    search: { editId: id, from: "/inventory" },
                  });
                }}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-3 h-9 gap-1.5 shadow-soft cursor-pointer"
              >
                <PenLine className="size-3.5" />
                <span>Edit Setup</span>
              </Button>
            </>
          ) : null
        }
      />

      {/* ─── MODAL: Delete Confirmation ─── */}
      <Dialog
        open={Boolean(setupToDelete)}
        onOpenChange={(open) => !open && setSetupToDelete(null)}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border bg-card shadow-soft">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete Decoration Setup?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Are you sure you want to remove{" "}
              <strong className="text-slate-900">
                "{setupToDelete ? getHumanReadableName(setupToDelete) : ""}"
              </strong>{" "}
              from your catalog? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetupToDelete(null)}
              className="rounded-xl text-xs h-9 cursor-pointer bg-[#fff] hover:bg-[#faf8f7]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold px-4 h-9 cursor-pointer shadow-sm"
            >
              Delete Setup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
