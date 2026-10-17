import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Flower2,
  CheckCircle2,
  Calendar,
  MapPin,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Share2,
  Check,
  Eye,
  Layers,
  ArrowRight,
  Info,
  Plus,
  Edit2,
  CheckCheck,
  ArrowUpDown,
  Upload,
  Camera,
  Trash2,
  Image as ImageIcon,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DecorationSetupItem } from "@/lib/decoration-setups";
import {
  useDecorationSetupsStore,
  loadStoredSetups,
  type DecorationCategory,
} from "@/lib/decoration-setups";
import { AddDecorationModal } from "./add-decoration-page";
import { DecorationDetailsModal } from "./decoration-details-modal";
import { ClientReferencePanel, type ClientReference } from "./client-reference-panel";

export interface CeremonyCardSelectionItem {
  id: string;
  name: string;
  dateBs: string;
  dateAd: string;
  venueLocation: string;
  venueClassification?: string | undefined;
  timing?: string | undefined;
  notes?: string | undefined;
}

/**
 * Safely normalizes selected cards for a ceremony into an array
 */
export function getCeremonyCardsList(
  map: Record<string, DecorationSetupItem[] | DecorationSetupItem | null> | undefined,
  ceremonyId: string,
): DecorationSetupItem[] {
  if (!map) return [];
  const val = map[ceremonyId];
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return [val];
}

const REQUEST_CATEGORIES: DecorationCategory[] = [
  "Stage",
  "Mandap",
  "Entrance Gate",
  "Backdrop",
  "Welcome Board",
];

/** First decoration category the client asked for, if any. */
function guessCategory(requirements?: string[]): DecorationCategory | undefined {
  return REQUEST_CATEGORIES.find((c) => requirements?.includes(c));
}

/** Maps a free-text event name onto the Add Decoration "Applicable events" options. */
function guessApplicableEvents(eventName: string): string[] {
  const n = eventName.toLowerCase();
  const out: string[] = [];
  if (n.includes("reception")) out.push("Reception");
  if (n.includes("wedding") && !n.includes("reception")) out.push("Wedding");
  if (n.includes("mehendi") || n.includes("mehndi")) out.push("Mehndi");
  if (n.includes("haldi")) out.push("Haldi");
  if (n.includes("sangeet") || n.includes("cocktail")) out.push("Sangeet");
  if (n.includes("engagement") || n.includes("ring")) out.push("Engagement");
  return out;
}

export interface MultiCeremonyCardSelectorProps {
  ceremonies: CeremonyCardSelectionItem[];
  selectedCards: Record<string, DecorationSetupItem[] | DecorationSetupItem | null>;
  onSelectCardForCeremony?:
    ((ceremonyId: string, setup: DecorationSetupItem | null) => void) | undefined;
  onToggleCardForCeremony?: ((ceremonyId: string, setup: DecorationSetupItem) => void) | undefined;
  onAddCeremony?: ((ceremonyName: string) => void) | undefined;
  onUpdateCeremonyDetails?:
    ((ceremonyId: string, dateBs: string, dateAd: string, venue: string) => void) | undefined;
  onUpdateCeremonyRequirements?:
    | ((
        ceremonyId: string,
        updates: {
          timing?: string;
          notes?: string;
          venueLocation?: string;
          venueClassification?: string;
        },
      ) => void)
    | undefined;
  onContinue: () => void;
  onBack: () => void;
  onOpenWhatsAppDispatch?: (() => void) | undefined;
  clientName?: string | undefined;
  discountAmount?: number | undefined;
  stepNumberDisplay?: string | undefined;
  activeCeremonyId?: string | undefined;
  onActiveCeremonyChange?: ((ceremonyId: string) => void) | undefined;
  sequentialMode?: boolean | undefined;
  activeEventIndex?: number | undefined;
  totalEvents?: number | undefined;
  /** Requirements, notes and photos the client gave on the enquiry form, keyed by ceremony id. */
  clientReferences?: Record<string, ClientReference> | undefined;
}

export function MultiCeremonyCardSelector({
  ceremonies,
  selectedCards,
  onSelectCardForCeremony,
  onToggleCardForCeremony,
  onAddCeremony,
  onUpdateCeremonyDetails,
  onUpdateCeremonyRequirements,
  onContinue,
  onBack,
  onOpenWhatsAppDispatch,
  clientName = "Client",
  discountAmount = 0,
  stepNumberDisplay = "Decorations · One setup per ceremony",
  activeCeremonyId: propActiveCeremonyId,
  onActiveCeremonyChange,
  sequentialMode = false,
  activeEventIndex = 0,
  totalEvents = 1,
  clientReferences,
}: MultiCeremonyCardSelectorProps) {
  const navigate = useNavigate();
  const { setups: storeSetups } = useDecorationSetupsStore();

  // Active ceremony tab (supports external control in sequential mode)
  const [internalActiveCeremonyId, setInternalActiveCeremonyId] = useState<string>(() => {
    return ceremonies[0]?.id || "ceremony-1";
  });

  const activeCeremonyId =
    propActiveCeremonyId !== undefined ? propActiveCeremonyId : internalActiveCeremonyId;

  const setActiveCeremonyId = (id: string) => {
    if (onActiveCeremonyChange) {
      onActiveCeremonyChange(id);
    }
    setInternalActiveCeremonyId(id);
  };

  // Ensure active ceremony exists (in sequentialMode, pins to activeEventIndex)
  const activeCeremony = useMemo(() => {
    if (sequentialMode && ceremonies[activeEventIndex]) {
      return ceremonies[activeEventIndex];
    }
    return (
      ceremonies.find((c) => c.id === activeCeremonyId) ||
      ceremonies[0] || {
        id: "ceremony-1",
        name: "Wedding Day",
        dateBs: "Mangsir 2083",
        dateAd: "2026-11-27",
        venueLocation: "Kathmandu Venue",
      }
    );
  }, [ceremonies, activeCeremonyId, sequentialMode, activeEventIndex]);

  // Filters: All, With Flowers, Structure Only
  const [floralFilter, setFloralFilter] = useState<"all" | "with_flowers" | "structure_only">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc"
  >("default");

  // In-place Upload Decoration modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  // When set, the upload modal opens pre-loaded with this client reference photo
  const [uploadFromPhoto, setUploadFromPhoto] = useState<string | null>(null);

  // Details view modal state
  const [selectedSetupForView, setSelectedSetupForView] = useState<DecorationSetupItem | null>(
    null,
  );

  // Quick ceremony addition modal state
  const [showAddCeremonyModal, setShowAddCeremonyModal] = useState(false);
  const [customCeremonyName, setCustomCeremonyName] = useState("");

  // Quick edit date/venue modal state
  const [showEditCeremonyModal, setShowEditCeremonyModal] = useState(false);
  const [editDateBs, setEditDateBs] = useState(activeCeremony.dateBs);
  const [editDateAd, setEditDateAd] = useState(activeCeremony.dateAd);
  const [editVenue, setEditVenue] = useState(activeCeremony.venueLocation);

  // Sync edit modal state when active ceremony changes
  React.useEffect(() => {
    setEditDateBs(activeCeremony.dateBs);
    setEditDateAd(activeCeremony.dateAd);
    setEditVenue(activeCeremony.venueLocation);
  }, [activeCeremony]);

  // All catalog setups
  const allSetups = useMemo(() => {
    if (storeSetups && storeSetups.length > 0) return storeSetups;
    return loadStoredSetups();
  }, [storeSetups]);

  // Filtered setups for grid
  const filteredSetups = useMemo(() => {
    return allSetups.filter((item) => {
      // Floral filter: With Flowers vs Structure Only
      const hasFlowers = Boolean(
        item.specifications?.flowers_used ||
        (item.specifications?.flowers && item.specifications.flowers.length > 0) ||
        item.mandapSpecs?.floralUsage ||
        item.entranceGateSpecs?.floralUsage,
      );

      if (floralFilter === "with_flowers" && !hasFlowers) return false;
      if (floralFilter === "structure_only" && hasFlowers) return false;

      // Category filter
      if (categoryFilter !== "All" && item.category !== categoryFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchFlower = (item.specifications?.flowers || []).some((f) =>
          f.name.toLowerCase().includes(q),
        );
        if (!matchName && !matchCat && !matchDesc && !matchFlower) return false;
      }

      return true;
    });
  }, [allSetups, floralFilter, categoryFilter, searchQuery]);

  // Filtered and sorted setups for grid
  const sortedSetups = useMemo(() => {
    const list = [...filteredSetups];
    if (sortBy === "price_asc") {
      return list.sort((a, b) => {
        const pA = Number(
          a.total_price ||
            a.stageSpecs?.price ||
            a.mandapSpecs?.price ||
            a.backdropSpecs?.price ||
            a.entranceGateSpecs?.price ||
            45000,
        );
        const pB = Number(
          b.total_price ||
            b.stageSpecs?.price ||
            b.mandapSpecs?.price ||
            b.backdropSpecs?.price ||
            b.entranceGateSpecs?.price ||
            45000,
        );
        return pA - pB;
      });
    }
    if (sortBy === "price_desc") {
      return list.sort((a, b) => {
        const pA = Number(
          a.total_price ||
            a.stageSpecs?.price ||
            a.mandapSpecs?.price ||
            a.backdropSpecs?.price ||
            a.entranceGateSpecs?.price ||
            45000,
        );
        const pB = Number(
          b.total_price ||
            b.stageSpecs?.price ||
            b.mandapSpecs?.price ||
            b.backdropSpecs?.price ||
            b.entranceGateSpecs?.price ||
            45000,
        );
        return pB - pA;
      });
    }
    if (sortBy === "name_asc") {
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortBy === "name_desc") {
      return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }
    return list;
  }, [filteredSetups, sortBy]);

  // Calculate pricing across multiple cards per ceremony
  const ceremonySubtotals = useMemo(() => {
    return ceremonies.map((c) => {
      const cards = getCeremonyCardsList(selectedCards, c.id);
      const price = cards.reduce(
        (sum, card) =>
          sum +
          Number(
            card.total_price ||
              card.mandapSpecs?.price ||
              card.backdropSpecs?.price ||
              card.stageSpecs?.price ||
              card.entranceGateSpecs?.price ||
              45000,
          ),
        0,
      );
      return {
        ceremonyId: c.id,
        name: c.name,
        date: c.dateBs || c.dateAd,
        venue: c.venueLocation,
        cards,
        price,
      };
    });
  }, [ceremonies, selectedCards]);

  const totalCardsPrice = useMemo(() => {
    return ceremonySubtotals.reduce((sum, item) => sum + item.price, 0);
  }, [ceremonySubtotals]);

  const grandTotalNpr = Math.max(0, totalCardsPrice - (discountAmount || 0));

  const configuredCount = useMemo(() => {
    return ceremonies.filter((c) => getCeremonyCardsList(selectedCards, c.id).length > 0).length;
  }, [ceremonies, selectedCards]);

  const activeAssignedCards = useMemo(() => {
    return getCeremonyCardsList(selectedCards, activeCeremony.id);
  }, [selectedCards, activeCeremony.id]);

  const handleToggleCard = (setup: DecorationSetupItem) => {
    if (onToggleCardForCeremony) {
      onToggleCardForCeremony(activeCeremony.id, setup);
    } else if (onSelectCardForCeremony) {
      const isAlready = activeAssignedCards.some((c) => c.id === setup.id);
      if (isAlready) {
        onSelectCardForCeremony(activeCeremony.id, null);
      } else {
        onSelectCardForCeremony(activeCeremony.id, setup);
      }
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in-50 duration-300">
      {/* ─── STEPPER / CEREMONY NAVIGATION ─── */}
      {sequentialMode ? null : (
        <>
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e14b68] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  {stepNumberDisplay}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-slate-600">
                  {configuredCount} of {ceremonies.length} Ceremonies Configured
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                Ceremony &amp; Decoration Card Selection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign independent catalog decoration cards to each distinct ceremony booked by{" "}
                {clientName} (e.g. Card A for Haldi Day and Card B for Wedding Day).
              </p>
            </div>

            {onOpenWhatsAppDispatch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenWhatsAppDispatch}
                className="rounded-xl border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold gap-1.5 shrink-0 shadow-2xs"
              >
                <Share2 className="size-3.5" />
                <span>Preview WhatsApp Dispatch</span>
              </Button>
            )}
          </div>

          {/* 1. Ceremony Tabs (Horizontal Scrollable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Ceremony Tabs:
              </label>
              {onAddCeremony && (
                <button
                  type="button"
                  onClick={() => setShowAddCeremonyModal(true)}
                  className="text-xs font-bold text-[#e14b68] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>+ Add Ceremony</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {ceremonies.map((c, index) => {
                const isActive = c.id === activeCeremony.id;
                const assignedList = getCeremonyCardsList(selectedCards, c.id);
                const hasAssigned = assignedList.length > 0;
                const isHaldi = c.name.toLowerCase().includes("haldi");
                const isMehendi = c.name.toLowerCase().includes("mehendi");
                const isWedding = c.name.toLowerCase().includes("wedding");
                const isReception = c.name.toLowerCase().includes("reception");

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCeremonyId(c.id)}
                    className={cn(
                      "relative flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer select-none shrink-0 min-w-[210px] sm:min-w-[240px]",
                      isActive
                        ? "bg-white border-[#e14b68] shadow-md ring-2 ring-[#e14b68]/20"
                        : "bg-[#faf8f7] border-stone-200 hover:border-slate-300 hover:bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2.5 rounded-full shrink-0",
                            isHaldi
                              ? "bg-amber-500"
                              : isMehendi
                                ? "bg-emerald-500"
                                : isWedding
                                  ? "bg-rose-500"
                                  : isReception
                                    ? "bg-purple-500"
                                    : "bg-slate-400",
                          )}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {index + 1}. {c.name}
                        </span>
                      </div>

                      {hasAssigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          <Check className="size-2.5 stroke-[3]" />
                          <span>
                            {assignedList.length} {assignedList.length === 1 ? "Setup" : "Setups"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Needs Setup
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate">
                      {c.dateBs || c.dateAd} · {c.venueLocation.split(",")[0]}
                    </div>

                    {hasAssigned ? (
                      <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                          {assignedList.length === 1
                            ? assignedList[0]?.name || "Setup"
                            : `${assignedList.length} Setups Selected`}
                        </span>
                        <span className="font-bold text-[#e14b68] tabular-nums shrink-0">
                          Rs.{" "}
                          {assignedList
                            .reduce((s, a) => s + Number(a.total_price || 45000), 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1.5 pt-1.5 border-t border-stone-100 text-[10px] text-slate-400 italic">
                        Click setup card below to assign
                      </div>
                    )}
                  </button>
                );
              })}

              {onAddCeremony && (
                <button
                  type="button"
                  onClick={() => setShowAddCeremonyModal(true)}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-stone-300 bg-[#faf8f7] hover:bg-stone-100 text-xs font-bold text-stone-600 hover:text-slate-900 transition-all cursor-pointer shrink-0 min-w-[140px] h-[78px]"
                >
                  <Plus className="size-4 text-[#e14b68]" />
                  <span>+ Add Day</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── FULL-WIDTH MAIN CONFIGURATION AREA ─── */}
      <div className="w-full space-y-6 pb-28 sm:pb-32">
        {/* Client's enquiry: requirements, note and reference photos for this event */}
        {clientReferences?.[activeCeremony.id] && (
          <ClientReferencePanel
            clientName={clientName === "Client" ? undefined : clientName}
            eventName={activeCeremony.name}
            reference={clientReferences[activeCeremony.id]!}
            onPickCategory={(cat) => setCategoryFilter(cat)}
            onPickFlowers={() => setFloralFilter("with_flowers")}
            onCreateFromPhoto={(url) => {
              setUploadFromPhoto(url);
              setShowUploadModal(true);
            }}
          />
        )}

        {/* Visual Catalog Grid: Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 bg-[#faf8f7] p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs">
          {/* Top row: Floral Filter toggles + Search + Upload Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Floral filter pill group */}
            <div className="flex items-center gap-1.5 bg-stone-200/60 p-1 rounded-xl shrink-0 overflow-x-auto">
              {(
                [
                  { id: "all", label: "All Setups" },
                  { id: "with_flowers", label: "🌸 With Flowers" },
                  { id: "structure_only", label: "🏛️ Structure Only" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFloralFilter(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0",
                    floralFilter === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Controls: Search box & Prominent + Upload Decoration button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog designs..."
                  className="h-8 pl-8 pr-7 text-xs rounded-xl bg-white border-stone-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="h-8 rounded-xl bg-gradient-to-r from-[#e14b68] to-[#d43d5a] hover:from-[#d43d5a] hover:to-[#c02f4a] text-white text-xs font-bold gap-1.5 shrink-0 shadow-sm shadow-[#e14b68]/20 cursor-pointer px-3.5 select-none"
                title="Upload New Decoration Design to Master Catalog"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                <span>+ Upload Decoration</span>
              </Button>
            </div>
          </div>

          {/* Bottom row: Category Chips (left) & Sort by Dropdown (right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-200/60">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
                Category:
              </span>
              {["All", "Stage", "Mandap", "Entrance Gate", "Backdrop", "Welcome Board"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer select-none shrink-0",
                      categoryFilter === cat
                        ? "bg-[#e14b68] text-white font-semibold shadow-xs"
                        : "bg-white border border-stone-200 text-slate-700 hover:bg-stone-50",
                    )}
                  >
                    {cat}
                  </button>
                ),
              )}
            </div>

            {/* Sort by dropdown neatly aligned on the right */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pl-2">
              <div className="flex items-center gap-1.5 bg-white border border-stone-200/90 rounded-xl px-2.5 h-8 shadow-2xs">
                <ArrowUpDown className="size-3 text-stone-400 shrink-0" />
                <span className="text-[11px] font-semibold text-stone-500 shrink-0">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="default">Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Active selection summary banner (if designs selected for current event) */}
        {activeAssignedCards.length > 0 && (
          <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200/90 rounded-2xl px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-emerald-950 font-medium">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{activeAssignedCards.length}</strong>{" "}
                {activeAssignedCards.length === 1 ? "design setup" : "design setups"} selected for{" "}
                <strong>{activeCeremony.name}</strong>
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-800 tabular-nums">
              Event Subtotal: Rs.{" "}
              {activeAssignedCards
                .reduce(
                  (s, c) =>
                    s +
                    Number(
                      c.total_price ||
                        c.stageSpecs?.price ||
                        c.mandapSpecs?.price ||
                        c.backdropSpecs?.price ||
                        c.entranceGateSpecs?.price ||
                        45000,
                    ),
                  0,
                )
                .toLocaleString()}
            </span>
          </div>
        )}

        {/* 2. Visual Catalog Grid (4-cards-in-a-line uniform height layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4.5 items-stretch">
          {sortedSetups.map((setup) => {
            const isSelectedForActive = activeAssignedCards.some((c) => c.id === setup.id);
            // Check if used in another ceremony
            const otherCeremonyUsage = ceremonies.find(
              (c) =>
                c.id !== activeCeremony.id &&
                getCeremonyCardsList(selectedCards, c.id).some((item) => item.id === setup.id),
            );

            const hasFlowers = Boolean(
              setup.specifications?.flowers_used ||
              (setup.specifications?.flowers && setup.specifications.flowers.length > 0) ||
              setup.mandapSpecs?.floralUsage ||
              setup.entranceGateSpecs?.floralUsage,
            );

            const price = Number(
              setup.total_price ||
                setup.stageSpecs?.price ||
                setup.mandapSpecs?.price ||
                setup.backdropSpecs?.price ||
                setup.entranceGateSpecs?.price ||
                45000,
            );

            // Dimensions formatted
            const dimensionsText =
              setup.stageSpecs?.dimensions ||
              setup.backdropSpecs?.dimensions ||
              (setup.specifications?.dimensions
                ? `${setup.specifications.dimensions.width_ft}ft W × ${setup.specifications.dimensions.height_ft}ft H`
                : "16ft W × 10ft H");

            // Flower or structure detail text
            const flowerDetailText =
              setup.specifications?.flowers?.[0]?.name?.replace(/\s*\([^)]*\)/g, "") ||
              (hasFlowers ? "Fresh Floral Cascades" : "");

            const structureDetailText =
              setup.stageSpecs?.structureType ||
              setup.mandapSpecs?.structureType ||
              setup.specifications?.structure_type ||
              "Truss Framework Rigging";

            return (
              <div
                key={setup.id}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden flex flex-col h-full bg-white shadow-2xs hover:shadow-md",
                  isSelectedForActive
                    ? "ring-2 ring-emerald-600 border-transparent shadow-sm bg-emerald-50/10"
                    : "border-stone-200/90 hover:border-slate-300",
                )}
              >
                {/* Card Thumbnail & Badge Header: 16:9 aspect ratio with constrained height */}
                <div className="relative aspect-[16/9] w-full max-h-44 sm:max-h-48 bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={
                      setup.imageUrl ||
                      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={setup.name}
                    className="size-full object-cover transition-transform duration-500 hover:scale-105"
                  />

                  {/* Category & Flower Tag Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 backdrop-blur shadow-2xs">
                      {setup.category}
                    </span>
                    {hasFlowers ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100/95 text-[#C33A56] backdrop-blur shadow-2xs flex items-center gap-1">
                        <Flower2 className="size-2.5" />
                        <span>With Flowers</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100/95 text-stone-700 backdrop-blur shadow-2xs">
                        Structure Only
                      </span>
                    )}
                  </div>

                  {/* Active Selected Stamp */}
                  {isSelectedForActive && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                        <Check className="size-3 stroke-[3]" />
                        <span>Selected</span>
                      </span>
                    </div>
                  )}

                  {otherCeremonyUsage && !isSelectedForActive && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/90 text-white backdrop-blur shadow-2xs">
                        Assigned to {otherCeremonyUsage.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body: Title, Dimensions, Flower/Structure Specs */}
                <div className="p-3 sm:p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">
                      {setup.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed mt-0.5 min-h-[2rem] sm:min-h-[2.25rem]">
                      {setup.description ||
                        "Handcrafted wedding setup styling with complete framework rigging and decorative draping."}
                    </p>
                  </div>

                  {/* Dimensions & Specs Row */}
                  <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                      <span className="text-stone-400 font-normal">Dim:</span>
                      <strong className="font-semibold truncate max-w-[105px]">
                        {dimensionsText}
                      </strong>
                    </span>
                    {hasFlowers ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md truncate max-w-[130px] font-medium text-[10px]">
                        <Flower2 className="size-2.5 text-[#e14b68] shrink-0" />
                        <span className="truncate">
                          {flowerDetailText || "Fresh Florals Included"}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-stone-100 px-2 py-0.5 rounded-md truncate max-w-[130px] font-medium text-[10px]">
                        <Layers className="size-2.5 text-slate-500 shrink-0" />
                        <span className="truncate">{structureDetailText}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Starting Price + Details + Compact [Select / Selected] Button */}
                <div className="mt-auto p-3 bg-[#faf8f7] border-t border-stone-100 flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0 pr-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none mb-0.5">
                      Starting Price
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 tabular-nums truncate block">
                      Rs. {price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Details button — opens full spec modal */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSetupForView(setup);
                      }}
                      className="h-7 sm:h-7.5 px-2.5 text-[11px] sm:text-xs font-semibold rounded-xl cursor-pointer border-stone-300 text-slate-700 hover:bg-stone-100 gap-1 shadow-2xs"
                    >
                      <Eye className="size-3 shrink-0" />
                      <span>Details</span>
                    </Button>

                    {/* Select / Selected button */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleCard(setup);
                      }}
                      className={cn(
                        "h-7 sm:h-7.5 px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold rounded-xl cursor-pointer transition-all gap-1.5 select-none shadow-2xs",
                        isSelectedForActive
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "bg-[#e14b68] hover:bg-[#cf3e5a] text-white",
                      )}
                    >
                      {isSelectedForActive ? (
                        <>
                          <Check className="size-3.5 stroke-[2.5]" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedSetups.length === 0 && (
          <div className="text-center py-12 bg-[#faf8f7] rounded-2xl border border-dashed border-stone-200 space-y-3">
            <Sparkles className="size-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No decoration setups found matching filters
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Try resetting search filters or upload your own setup directly.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFloralFilter("all");
                  setCategoryFilter("All");
                  setSortBy("default");
                }}
                className="text-xs rounded-xl"
              >
                Reset filters
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="text-xs rounded-xl bg-[#e14b68] hover:bg-[#cf3e5a] text-white font-semibold gap-1 cursor-pointer"
              >
                <Plus className="size-3" />
                <span>+ Upload New Setup</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM STICKY FOOTER NAVIGATION BAR ─── */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-stone-200/90 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="w-full px-6 sm:px-10 lg:px-14 py-3 sm:py-3.5">
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 shadow-2xs select-none"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95 shadow-xs select-none"
              style={{ backgroundColor: "#e14b68" }}
            >
              <span>
                {sequentialMode
                  ? activeEventIndex < totalEvents - 1
                    ? `Save & Configure Event ${activeEventIndex + 2} (${ceremonies[activeEventIndex + 1]?.name || "Next Event"})`
                    : "Save All Events & Continue to Pricing"
                  : "Save Selections & Continue"}
              </span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Ceremony Modal Dialog */}
      <Dialog open={showAddCeremonyModal} onOpenChange={setShowAddCeremonyModal}>
        <DialogContent className="sm:max-w-md bg-white text-[#2B2320]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Plus className="size-5 text-[#e14b68]" />
              <span>Add Booked Function</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Add another ceremony to {clientName}&apos;s schedule to assign an independent setup
              card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-bold text-stone-700 block">Quick Presets:</label>
            <div className="flex flex-wrap gap-2">
              {[
                "Haldi Day",
                "Mehendi Day",
                "Wedding Day",
                "Pre-Reception / Reception Day",
                "Sangeet Night",
                "Engagement Day",
              ].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    if (onAddCeremony) {
                      onAddCeremony(name);
                      setShowAddCeremonyModal(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-[#e14b68] hover:bg-rose-50 text-xs font-semibold text-stone-800 cursor-pointer transition-all"
                >
                  + {name}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Or enter custom ceremony name:
              </label>
              <Input
                type="text"
                placeholder="e.g. Traditional Bratabandha, Ring Ceremony"
                value={customCeremonyName}
                onChange={(e) => setCustomCeremonyName(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCeremonyModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!customCeremonyName.trim()}
              onClick={() => {
                if (onAddCeremony && customCeremonyName.trim()) {
                  onAddCeremony(customCeremonyName.trim());
                  setCustomCeremonyName("");
                  setShowAddCeremonyModal(false);
                }
              }}
              className="text-xs bg-[#e14b68] hover:bg-[#cf3e5a] text-white"
            >
              Add Ceremony Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Ceremony Details Modal Dialog */}
      <Dialog open={showEditCeremonyModal} onOpenChange={setShowEditCeremonyModal}>
        <DialogContent className="sm:max-w-md bg-white text-[#2B2320]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-[#e14b68]" />
              <span>Edit Ceremony Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Update schedule dates and venue for {activeCeremony.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Nepali Date (BS):
              </label>
              <Input
                type="text"
                placeholder="e.g. Mangsir 14, 2083"
                value={editDateBs}
                onChange={(e) => setEditDateBs(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                English Date (AD):
              </label>
              <Input
                type="text"
                placeholder="e.g. 2026-11-30"
                value={editDateAd}
                onChange={(e) => setEditDateAd(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Venue Location:</label>
              <Input
                type="text"
                placeholder="e.g. Majestic Grand, Kathmandu"
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditCeremonyModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (onUpdateCeremonyDetails) {
                  onUpdateCeremonyDetails(activeCeremony.id, editDateBs, editDateAd, editVenue);
                }
                setShowEditCeremonyModal(false);
              }}
              className="text-xs bg-[#e14b68] hover:bg-[#cf3e5a] text-white"
            >
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD/UPLOAD DECORATION MODAL OVERLAY ─── */}
      {showUploadModal && (
        <AddDecorationModal
          open={showUploadModal}
          onOpenChange={(o) => {
            setShowUploadModal(o);
            if (!o) setUploadFromPhoto(null);
          }}
          {...(uploadFromPhoto
            ? {
                initialPhotoUrl: uploadFromPhoto,
                initialName: `${activeCeremony.name} setup (client reference)`,
                ...(guessCategory(clientReferences?.[activeCeremony.id]?.requirements)
                  ? {
                      initialCategory: guessCategory(
                        clientReferences?.[activeCeremony.id]?.requirements,
                      )!,
                    }
                  : {}),
                initialEvents: guessApplicableEvents(activeCeremony.name),
              }
            : {})}
          onSetupCreated={(newItem) => {
            setUploadFromPhoto(null);
            // Reset filters so the new item is immediately visible in the catalog
            setCategoryFilter("All");
            setFloralFilter("all");
            setSearchQuery("");
            // Auto-select the newly created item for the active ceremony
            handleToggleCard(newItem);
            toast.success(`"${newItem.name}" added to ${activeCeremony.name}!`);
          }}
        />
      )}

      {/* ─── DECORATION DETAILS MODAL ─── */}
      <DecorationDetailsModal
        setup={selectedSetupForView}
        open={selectedSetupForView !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSetupForView(null);
        }}
        onSelect={(setup) => {
          handleToggleCard(setup);
          setSelectedSetupForView(null);
        }}
        isSelected={
          selectedSetupForView !== null &&
          activeAssignedCards.some((c) => c.id === selectedSetupForView.id)
        }
      />
    </div>
  );
}
