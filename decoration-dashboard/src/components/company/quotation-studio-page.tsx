import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePaymentQrs } from "@/lib/payment-qr";
import { useNavigate } from "@tanstack/react-router";
import {
  Printer,
  MessageCircle,
  Mail,
  Copy,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  Flower2,
  Lightbulb,
  Layers,
  Armchair,
  Maximize2,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  X,
  Share2,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyProfile } from "@/lib/company-profile";
import { EVENT_TYPE_OPTIONS } from "@/lib/company-profile";
import {
  type DecorationCategory,
  type DecorationSetupItem,
  recordSetupQuotation,
  useDecorationSetupsStore,
} from "@/lib/decoration-setups";
import {
  EVENT_LOCATION_OPTIONS,
  loadQuotationIntake,
  saveQuotationIntake,
  type QuotationIntakeState,
} from "@/lib/quotation-intake";
import {
  useBookedClientsStore,
  parseEventDate,
  findClientById,
  upsertStoredBookedClient,
  type BookedClient,
  type ClientCeremonyItem,
} from "@/lib/clients";
import { loadStoredEnquiries } from "@/lib/enquiries";
import { loadEnquiryPhotos } from "@/lib/enquiry-photos";
import type { ClientReference } from "./client-reference-panel";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import {
  EventDateStep,
  createEventDateEntry,
  entriesToSchedule,
  type EventDateEntry,
} from "./event-date-step";
import { NameEventsStep } from "./name-events-step";
import {
  type EventScheduleItem,
  createDefaultSchedule,
  loadStoredEventSchedule,
  saveStoredEventSchedule,
  convertAdToBs,
} from "@/lib/event-schedule";
import { DecorationCatalogCard } from "./decoration-catalog-card";
import { MultiCeremonyCardSelector, getCeremonyCardsList } from "./multi-ceremony-card-selector";
import { ProposalDispatchModal } from "./proposal-dispatch-modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface QuotationItem {
  id: string;
  category: "lighting" | "platform" | "furniture" | "custom";
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface FloralSpecification {
  flowerStyle: string; // e.g. "Mixed Floral Styling", "Rose Floral Theme"
  flowerType: string;  // e.g. "Natural Fresh Flowers", "Artificial Silk Flowers", "Mixed"
  colourTheme: string; // e.g. "Red & White"
  flowers: { name: string; type: string; colour?: string | undefined }[];
  summary: string;
  hasFlowers: boolean;
}

export interface QuotationStudioPageProps {
  initialSetup?: DecorationSetupItem | null | undefined;
  clientId?: string | undefined;
  initialStep?: number | undefined;
  from?: string | undefined;
  onExit?: (() => void) | undefined;
}

/**
 * Design tokens strictly following user specifications:
 * - Page Background: #f0ede8 (warm off-white)
 * - Cards & Inner Panels Surface: #faf8f7
 * - Elevated Containers: #ffffff
 * - Primary Accent (Rose): Default hsl(350, 80%, 65%), Dark hsl(350, 80%, 45%), Light hsl(350, 80%, 92%)
 * - Secondary Accent (Gold): Background hsl(38, 80%, 92%), Text hsl(38, 80%, 50%)
 * - Text & Borders: Primary text #1a1614, Secondary text #6b5f5c, Borders rgba(180, 150, 140, 0.2)
 */
const TOKENS = {
  bg: "#fdfbf7",
  surface: "#faf8f7",
  card: "#ffffff",
  textPrimary: "#1a1614",
  textSecondary: "#6b5f5c",
  border: "rgba(180, 150, 140, 0.25)",
  rose: {
    default: "hsl(350, 80%, 65%)",
    dark: "hsl(350, 80%, 45%)",
    light: "hsl(350, 80%, 92%)",
  },
  gold: {
    bg: "hsl(38, 80%, 92%)",
    text: "hsl(38, 80%, 50%)",
  },
};

export interface DynamicWizardStep {
  stepNumber: number;
  key: string;
  type: "client" | "dates" | "name_events" | "event_setup" | "pricing" | "payment";
  title: string;
  caption: string;
  eventIndex?: number;
  eventId?: string;
  eventName?: string;
}

const QUICK_CATEGORY_OPTIONS: DecorationCategory[] = [
  "Stage",
  "Mandap",
  "Entrance Gate",
  "Backdrop",
  "Welcome Board",
];

const QUICK_STYLE_OPTIONS = ["Traditional", "Floral", "Royal", "Minimal", "Boho", "Contemporary"];

function formatSetupTitle(setup?: DecorationSetupItem | null): string {
  if (!setup) return "Custom Decoration Setup";
  const raw = (setup.name || "").trim();
  const isJunk =
    !raw ||
    raw.toLowerCase().startsWith("setup-") ||
    raw.toLowerCase().startsWith("lib-") ||
    raw.toLowerCase().startsWith("draft-") ||
    /^[A-Z]{3,4}-[A-Z0-9-]{3,}$/i.test(raw) ||
    raw === setup.id ||
    raw === setup.sku;

  if (!isJunk) return raw;

  const category = setup.category || "Stage";
  const event = setup.specifications?.applicable_events?.[0] || "Royal";
  const flower = setup.specifications?.flowers?.[0]?.name?.replace(/\s*\([^)]*\)/g, "").trim();

  if (flower) return `${flower} Floral ${category} Setup`;
  return `${event} ${category} Setup`;
}

function getSetupDimensions(setup?: DecorationSetupItem | null): string {
  if (!setup) return "14 × 14 ft";
  const specs = setup.specifications as any;
  if (specs?.stage_dimensions) {
    return `${specs.stage_dimensions.width} × ${specs.stage_dimensions.depth} ft`;
  }
  if (setup.backdropSpecs?.dimensions) {
    return setup.backdropSpecs.dimensions.replace(/\(.*\)/, "").trim();
  }
  return "Standard Setup Dimensions";
}

/**
 * Extracts flower specifications from a setup item.
 * Flowers do NOT have individual prices and are included in the base setup design.
 */
function extractFloralSpecification(
  setup?: DecorationSetupItem | null
): FloralSpecification {
  const flowerList = setup?.specifications?.flowers || [];
  const hasFlowers = flowerList.length > 0;

  if (!hasFlowers) {
    return {
      flowerStyle: "Structure Framework (No Floral Styling)",
      flowerType: "None",
      colourTheme: "Neutral",
      flowers: [],
      summary: "Structure Framework Only",
      hasFlowers: false,
    };
  }

  const primaryFlower = flowerList[0];
  const flowerName = primaryFlower?.name
    ? primaryFlower.name.replace(/\s*\([^)]*\)/g, "").trim()
    : "Mixed Floral";

  const flowerType = primaryFlower?.type
    ? primaryFlower.type.toLowerCase() === "natural"
      ? "Natural Fresh Flowers"
      : primaryFlower.type.toLowerCase() === "artificial"
      ? "Artificial Silk Flowers"
      : "Mixed Varieties"
    : "Natural Fresh Flowers";

  const flowerStyle = `${flowerName} Floral Theme`;

  const colourTheme =
    primaryFlower?.colour
      ? primaryFlower.colour
      : setup?.specifications?.color_theme && setup.specifications.color_theme.length > 0
      ? setup.specifications.color_theme.join(" & ")
      : "Multi-colour";

  const mappedFlowers = flowerList.map((f) => ({
    name: (f.name || "Flower").replace(/\s*\([^)]*\)/g, "").trim(),
    type: f.type || "Natural",
    colour: f.colour || undefined,
  }));

  const summary = `Flower Style: ${flowerStyle} · Flower Type: ${flowerType}${
    colourTheme ? ` · Colour: ${colourTheme}` : ""
  }`;

  return {
    flowerStyle,
    flowerType,
    colourTheme,
    flowers: mappedFlowers,
    summary,
    hasFlowers: true,
  };
}

/**
 * Extracts initial base price and itemized paid add-ons.
 * Notice: Floral styling is strictly included in base price.
 */
function extractInitialData(setup: DecorationSetupItem | null): {
  basePrice: number;
  items: QuotationItem[];
} {
  if (!setup) {
    return { basePrice: 45000, items: [] };
  }

  const items: QuotationItem[] = [];
  const specs = setup.specifications;

  // Platform add-on (paid item)
  if (specs?.platform_price && specs.platform_price > 0) {
    items.push({
      id: `platform-${Date.now()}-1`,
      category: "platform",
      name: `Riser Stage Platform (${specs.platform_shape || "Custom"} Shape)`,
      description: specs.platform_height
        ? `${specs.platform_height} ft elevation deck with carpet finish`
        : "Standard elevation platform deck with carpet finish",
      quantity: 1,
      unit: "Deck",
      unitPrice: specs.platform_price,
    });
  }

  // Lighting add-ons (paid items). Lighting rows from the setup form only carry
  // {type, quantity, unit} — the price is a single combined "overall" figure —
  // so per-item prices are a bonus path, not the primary one.
  let lightingPriced = false;
  if (specs?.lighting && specs.lighting.length > 0) {
    specs.lighting.forEach((light, idx) => {
      if (light.price && light.price > 0) {
        items.push({
          id: `lighting-${Date.now()}-${idx}`,
          category: "lighting",
          name: light.type ? `${light.type} Fixtures` : "Accent Event Lighting",
          description: "Professional atmospheric warm focus illumination",
          quantity: light.quantity || 1,
          unit: light.unit || "Set",
          unitPrice: light.price,
        });
        lightingPriced = true;
      }
    });
  }
  const overallLightingPrice = specs?.overall_lighting_price || specs?.overall_lighting_cost;
  if (!lightingPriced && overallLightingPrice && overallLightingPrice > 0) {
    const lightingTypes = (specs?.lighting || []).map((l) => l.type).filter(Boolean).join(", ");
    items.push({
      id: `lighting-${Date.now()}-overall`,
      category: "lighting",
      name: lightingTypes ? `${lightingTypes} Fixtures` : "Event Lighting Setup",
      description: "Professional atmospheric warm focus illumination",
      quantity: 1,
      unit: "Set",
      unitPrice: overallLightingPrice,
    });
  }

  // Furniture add-on (paid item)
  if (specs?.furniture_price && specs.furniture_price > 0) {
    items.push({
      id: `furniture-${Date.now()}-1`,
      category: "furniture",
      name: "Stage Furniture & Premium Props Set",
      description: specs.furniture_details || "Throne chairs and decorative props",
      quantity: 1,
      unit: "Set",
      unitPrice: specs.furniture_price,
    });
  }

  const paidAddonsTotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  let basePrice = 35000;
  if (typeof specs?.base_pricing_rate === "number" && specs.base_pricing_rate > 0) {
    basePrice = specs.base_pricing_rate;
  } else if (typeof setup.total_price === "number" && setup.total_price > 0) {
    if (setup.total_price > paidAddonsTotal && paidAddonsTotal > 0) {
      basePrice = setup.total_price - paidAddonsTotal;
    } else {
      basePrice = setup.total_price;
    }
  } else {
    const rawPrice = Number(
      setup.entranceGateSpecs?.price ??
      setup.welcomeBoardSpecs?.price ??
      setup.mandapSpecs?.price ??
      setup.backdropSpecs?.price ??
      0
    );
    if (rawPrice > 0) {
      basePrice = rawPrice;
    }
  }

  return { basePrice, items };
}

function WizardSectionLabel({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <h3
      className={cn(
        "text-xs font-bold uppercase tracking-wider",
        tone === "accent" && "text-slate-800"
      )}
      style={{ color: tone === "accent" ? TOKENS.rose.dark : TOKENS.textPrimary }}
    >
      {children}
    </h3>
  );
}

function WizardPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none",
        selected
          ? "border-transparent text-white shadow-xs font-semibold scale-102"
          : "border-stone-200/90 text-slate-700 bg-white hover:border-slate-300 hover:bg-stone-50"
      )}
      style={
        selected
          ? {
              backgroundColor: TOKENS.rose.default,
              borderColor: TOKENS.rose.default,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Keys as published by nepali-date-converter's dateConfigMap, in month order.
const BS_MONTH_KEYS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];
// Conventional display spelling (matches how these months are usually written).
const BS_MONTH_DISPLAY = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

function isoFromJsDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CalendarDayCell {
  iso: string;
  label: number;
  bsLabel: string;
}

/**
 * Event date picker for Step 2 — a real BS/AD toggleable month grid (via the
 * `nepali-date-converter` package, verified against known reference dates)
 * with "Today" and "already-booked" indicators pulled from this studio's
 * own client bookings (`useBookedClientsStore`). There's no multi-studio
 * marketplace data in this app, so "demand" badges only ever reflect this
 * studio's own calendar — never a fabricated cross-studio figure.
 */
function WizardCalendarPicker({
  value,
  onChange,
  bookings,
}: {
  value: string;
  onChange: (iso: string) => void;
  bookings: BookedClient[];
}) {
  const [system, setSystem] = useState<"BS" | "AD">("BS");
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const todayIso = isoFromJsDate(today);
  const todayBs = useMemo(() => new NepaliDate(today), [todayIso]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookedClient[]>();
    bookings.forEach((c) => {
      const adDate = parseEventDate(c.event_date).adDate;
      if (!adDate) return;
      map.set(adDate, [...(map.get(adDate) || []), c]);
    });
    return map;
  }, [bookings]);

  const { monthLabel, leadingBlanks, days } = useMemo(() => {
    if (system === "AD") {
      const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const year = base.getFullYear();
      const month = base.getMonth();
      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cells: CalendarDayCell[] = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const jsDate = new Date(year, month, d);
        return { iso: isoFromJsDate(jsDate), label: d, bsLabel: new NepaliDate(jsDate).format("DD MMMM YYYY") };
      });
      return {
        monthLabel: base.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        leadingBlanks: firstWeekday,
        days: cells,
      };
    }

    let bsYear = todayBs.getYear();
    let bsMonth = todayBs.getMonth() + monthOffset;
    while (bsMonth < 0) {
      bsMonth += 12;
      bsYear -= 1;
    }
    while (bsMonth > 11) {
      bsMonth -= 12;
      bsYear += 1;
    }
    const daysInMonth = dateConfigMap[String(bsYear)]?.[BS_MONTH_KEYS[bsMonth] as keyof (typeof dateConfigMap)[string]] ?? 30;
    const firstWeekday = new NepaliDate(bsYear, bsMonth, 1).getDay();
    const cells: CalendarDayCell[] = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const bsDate = new NepaliDate(bsYear, bsMonth, d);
      return {
        iso: isoFromJsDate(bsDate.toJsDate()),
        label: d,
        bsLabel: `${d} ${BS_MONTH_DISPLAY[bsMonth]} ${bsYear}`,
      };
    });
    return {
      monthLabel: `${BS_MONTH_DISPLAY[bsMonth]} ${bsYear}`,
      leadingBlanks: firstWeekday,
      days: cells,
    };
  }, [system, monthOffset, today, todayBs]);

  const selectedCell = days.find((d) => d.iso === value);
  const selectedBookings = value ? bookingsByDate.get(value) || [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-2xs w-full max-w-sm"
        style={{ backgroundColor: TOKENS.card, borderColor: TOKENS.border }}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className="size-7 inline-flex items-center justify-center rounded-full border border-stone-200 text-slate-500 hover:bg-stone-100 cursor-pointer shrink-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h4 className="text-sm font-bold text-center flex-1" style={{ color: TOKENS.textPrimary }}>
            {monthLabel}
          </h4>
          <div
            className="inline-flex p-0.5 rounded-full border shrink-0"
            style={{ borderColor: TOKENS.border }}
          >
            {(["BS", "AD"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSystem(opt);
                  setMonthOffset(0);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                  system === opt ? "text-white" : "text-slate-500"
                )}
                style={{ backgroundColor: system === opt ? TOKENS.rose.default : "transparent" }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className="size-7 inline-flex items-center justify-center rounded-full border border-stone-200 text-slate-500 hover:bg-stone-100 cursor-pointer shrink-0"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
          {WEEKDAY_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((cell) => {
            const isSelected = cell.iso === value;
            const isToday = cell.iso === todayIso;
            const dayBookings = bookingsByDate.get(cell.iso) || [];
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => onChange(cell.iso)}
                title={dayBookings.length > 0 ? `${dayBookings.length} booking(s) on this date` : undefined}
                className={cn(
                  "relative aspect-square rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer",
                  isSelected
                    ? "text-white shadow-sm"
                    : isToday
                    ? "border text-slate-900"
                    : "text-slate-700 hover:bg-stone-100"
                )}
                style={{
                  backgroundColor: isSelected ? TOKENS.rose.default : undefined,
                  borderColor: !isSelected && isToday ? TOKENS.rose.default : undefined,
                }}
              >
                {cell.label}
                {dayBookings.length > 0 && (
                  <span
                    className="absolute bottom-1 size-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? "#fff" : TOKENS.rose.default }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border" style={{ borderColor: TOKENS.rose.default }} />
            Today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: TOKENS.rose.default }} />
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: TOKENS.rose.default }} />
            Already booked (this studio)
          </span>
        </div>
      </div>

      {/* Date Insights — real data only: this studio's own bookings, no cross-studio figures */}
      {selectedCell && (
        <div
          className="rounded-2xl border p-4 sm:p-5 shadow-2xs"
          style={{ backgroundColor: TOKENS.surface, borderColor: TOKENS.border }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: TOKENS.textSecondary }}>
            Date Insights
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold" style={{ color: TOKENS.rose.dark }}>
                {selectedCell.bsLabel}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(value + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {selectedBookings.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Booked · {selectedBookings.length} event{selectedBookings.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                Free — no bookings yet
              </span>
            )}
          </div>
          {selectedBookings.length > 0 && (
            <ul className="mt-2.5 space-y-1 text-xs text-slate-600">
              {selectedBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-rose-400" />
                  {b.client_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function cleanDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length >= 12) {
    return digits.slice(3);
  }
  return digits;
}

function areNumbersIdentical(phone1?: string, phone2?: string): boolean {
  if (!phone1 || !phone2) return false;
  const t1 = phone1.trim();
  const t2 = phone2.trim();
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;
  const d1 = cleanDigits(t1);
  const d2 = cleanDigits(t2);
  return d1.length > 0 && d1 === d2;
}

function isNepaliMobileValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const localDigits = digits.startsWith("977") && digits.length === 13 ? digits.slice(3) : digits;
  return /^(97|98|96)\d{8}$/.test(localDigits);
}

export function QuotationStudioPage({
  initialSetup = null,
  clientId,
  initialStep,
  from = "/company",
  onExit,
}: QuotationStudioPageProps) {
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const { clients: bookedClients } = useBookedClientsStore();

  const [setup, setSetup] = useState<DecorationSetupItem | null>(initialSetup);

  // Which wizard step is currently active (defaults to 1, clamped to dynamicSteps.length)
  const [wizardStep, setWizardStep] = useState(() => {
    if (typeof initialStep === "number" && initialStep >= 1) {
      return initialStep;
    }
    return 1;
  });

  // Loading state when finishing & saving quotation
  const [isSaving, setIsSaving] = useState(false);

  // Quotation Reference Number (auto-generated)
  const [quotationNumber, setQuotationNumber] = useState("");

  // ── Step 1: Client & Contact Details ──
  const [clientName, setClientName] = useState("");
  const [source, setSource] = useState("INSTAGRAM");
  const [eventLocationType, setEventLocationType] = useState("Inside Kathmandu");
  const [city, setCity] = useState("Kathmandu");
  const [handler, setHandler] = useState("suvash mukhiya");
  const [clientPhone, setClientPhone] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+977");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [hasSubmittedStep1, setHasSubmittedStep1] = useState(false);

  const handleToggleSameAsMobile = (checked: boolean) => {
    if (!clientPhone.trim() && checked) return;
    setSameAsMobile(checked);
    if (checked) {
      setWhatsappNumber(clientPhone);
      setWhatsappCountryCode("+977");
    }
  };

  const handleClientPhoneChange = (val: string) => {
    setClientPhone(val);
    if (sameAsMobile) {
      if (!val.trim()) {
        setSameAsMobile(false);
        setWhatsappNumber("");
      } else {
        setWhatsappNumber(val);
      }
    }
  };

  const showMobileError = Boolean(
    (clientPhone.trim() || sameAsMobile) &&
      !isNepaliMobileValid(clientPhone) &&
      (sameAsMobile || mobileTouched || clientPhone.replace(/\D/g, "").length >= 10 || hasSubmittedStep1)
  );

  const [intake, setIntake] = useState<QuotationIntakeState>(() => loadQuotationIntake());
  const [newSourceDraft, setNewSourceDraft] = useState("");
  const [newHandlerDraft, setNewHandlerDraft] = useState("");
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddHandler, setShowAddHandler] = useState(false);

  // ── Step 2: Event Schedule & Function Dates ──
  const [eventSchedule, setEventSchedule] = useState<EventScheduleItem[]>(() => {
    return loadStoredEventSchedule() || createDefaultSchedule();
  });
  const [functionType, setFunctionType] = useState("");
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [dateEntries, setDateEntries] = useState<EventDateEntry[]>([]);
  const [dateFromEnquiry, setDateFromEnquiry] = useState(false);
  const datePrefilled = useRef(false);
  // Most of the app (WhatsApp/Email/PDF text, the booking record created on
  // dispatch) still works off a single primary date — the first one picked.
  const eventDate = eventDates[0] || "";
  const toggleEventDate = (iso: string) => {
    setEventDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
    setPendingDates((prev) => prev.filter((d) => d !== iso));
  };
  const togglePendingDate = (iso: string) => {
    if (eventDates.includes(iso)) return;
    setPendingDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
  };
  const [venueLocation, setVenueLocation] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // ── Step 3: Multi-Ceremony Catalog Card Selection ──
  const { setups: catalogSetups } = useDecorationSetupsStore();
  const [multiCeremonyCards, setMultiCeremonyCards] = useState<Record<string, DecorationSetupItem[]>>({});
  const [catalogItemOverrides, setCatalogItemOverrides] = useState<
    Record<string, { unitPrice?: number; quantity?: number }>
  >({});
  const [configuringEventIndex, setConfiguringEventIndex] = useState(0);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const { qrs: paymentQrs } = usePaymentQrs();
  // Which saved bank/QR accounts this client may pay to: one "main" and any "optional"
  const [paymentRoles, setPaymentRoles] = useState<Record<string, "main" | "optional">>({});

  // ── Steps 3–8: Quick decoration configuration (used when no setup is preselected) ──
  const [quickCategory, setQuickCategory] = useState<DecorationCategory | "">("");
  const [quickStructureType, setQuickStructureType] = useState("");
  const [quickSetupStyle, setQuickSetupStyle] = useState("");
  const [quickFlowersUsed, setQuickFlowersUsed] = useState<boolean | null>(null);
  const [quickFlowerName, setQuickFlowerName] = useState("");
  const [quickFlowerVariety, setQuickFlowerVariety] = useState<"Natural" | "Artificial" | "Mixed">(
    "Natural"
  );
  const [quickFlowerColour, setQuickFlowerColour] = useState("");

  const [notes, setNotes] = useState(
    "Setup includes on-site framework installation, specified floral styling, rigging, and complete dismantling post-event."
  );

  // Financials: Base Setup Rate + Paid Add-on Items
  const [basePrice, setBasePrice] = useState<number>(45000);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Floral specification: derived from catalog `setup` or Step 5 quick answers
  const floralSpec = useMemo<FloralSpecification>(() => {
    if (setup) return extractFloralSpecification(setup);
    if (!quickFlowersUsed) {
      return {
        flowerStyle: "Structure Framework (No Floral Styling)",
        flowerType: "None",
        colourTheme: "Neutral",
        flowers: [],
        summary: "Structure Framework Only",
        hasFlowers: false,
      };
    }
    const name = quickFlowerName.trim() || "Mixed";
    const flowerType =
      quickFlowerVariety === "Natural"
        ? "Natural Fresh Flowers"
        : quickFlowerVariety === "Artificial"
        ? "Artificial Silk Flowers"
        : "Mixed Varieties";
    return {
      flowerStyle: `${name} Floral Theme`,
      flowerType,
      colourTheme: quickFlowerColour.trim() || "Standard Palette",
      flowers: [
        { name, type: quickFlowerVariety, colour: quickFlowerColour.trim() || undefined },
      ],
      summary: `Flower Style: ${name} Floral Theme · Flower Type: ${flowerType}`,
      hasFlowers: true,
    };
  }, [setup, quickFlowersUsed, quickFlowerName, quickFlowerVariety, quickFlowerColour]);

  // Initial population of quotation data on mount (strictly once)
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const now = new Date();
    const ref = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    setQuotationNumber(ref);

    const { basePrice: initBase, items: initItems } = extractInitialData(setup);
    setBasePrice(initBase);
    setItems(initItems);
    setDiscountAmount(0);

    // Default upcoming date (14 days ahead)
    const nextMonth = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const defaultIso = nextMonth.toISOString().split("T")[0];
    setEventDates((prev) => (prev.length > 0 ? prev : defaultIso ? [defaultIso] : []));
    setPendingDates([]);

    const savedIntake = loadQuotationIntake();
    setIntake(savedIntake);
    setSource(savedIntake.lastSource || "INSTAGRAM");
    setHandler(savedIntake.lastHandler || "suvash mukhiya");
    setCity(savedIntake.lastCity || profile?.city || "Kathmandu");
    setEventLocationType(savedIntake.lastEventLocation || "Inside Kathmandu");
  }, []);

  // ── Enquiry → quotation hand-off ──
  // When this quotation was started from a client enquiry, the dates and event
  // names the client already gave are filled in (Steps 2 & 3), and their
  // requirements / note / reference photos show up while choosing decorations.
  const enquiryApplied = useRef(false);
  const [enquiryRefs, setEnquiryRefs] = useState<Record<string, ClientReference>>({});
  const [enquiryPhotos, setEnquiryPhotos] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!clientId || enquiryApplied.current) return;
    const enq = loadStoredEnquiries(true).find((e) => e.id === clientId);
    if (!enq || !enq.events || enq.events.length === 0) return;
    // A quotation that already has decorations assigned is restored by the
    // existing logic below; don't overwrite it from the enquiry.
    const existing = bookedClients.find((c) => c.id === clientId) || findClientById(clientId);
    if (existing?.ceremonies?.some((c) => c.setupName)) return;

    const entries: EventDateEntry[] = [];
    const schedule: EventScheduleItem[] = [];
    const refs: Record<string, ClientReference> = {};
    let pending = 0;
    enq.events.forEach((ev, i) => {
      let iso = ev.date_iso || "";
      if (!iso) {
        const d = new Date(ev.date_ad);
        if (!Number.isNaN(d.getTime())) {
          iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
      if (!iso) {
        pending += 1; // month-only date: the studio needs an exact day
        return;
      }
      const id = `enq-${enq.id}-${i}`;
      entries.push({ id, dateAd: iso });
      const bs = convertAdToBs(iso);
      schedule.push({
        id,
        name: ev.name,
        isCustom: true,
        dateAd: iso,
        dateBs: bs ? bs.formatted : "",
        venueClassification: "Banquet & Ballroom",
        venueLocation: ev.venue && ev.venue !== "Venue to be decided" ? ev.venue : "",
        sameAsPreviousVenue: false,
        ...(ev.note ? { notes: ev.note } : {}),
      });
      refs[id] = {
        requirements: ev.requirements ?? [],
        note: ev.note ?? "",
        photos: [],
        categoryDetails: ev.category_details,
      };
    });
    if (entries.length === 0) return;

    enquiryApplied.current = true;
    datePrefilled.current = true;
    setDateEntries(entries);
    setEventSchedule(schedule);
    saveStoredEventSchedule(schedule);
    setEventDates(entries.map((e) => e.dateAd).sort());
    setPendingDates([]);
    setDateFromEnquiry(true);
    if (enq.email) setClientEmail(enq.email);
    setEnquiryRefs(refs);
    if (pending > 0) {
      toast.info(
        `${pending} event${pending > 1 ? "s have" : " has"} no exact date yet — add ${pending > 1 ? "them" : "it"} in the Dates step.`
      );
    }
  }, [clientId, bookedClients]);

  // Reference photos live in IndexedDB (one entry per event).
  useEffect(() => {
    if (!clientId) return;
    const enq = loadStoredEnquiries(true).find((e) => e.id === clientId);
    if (!enq) return;
    let cancelled = false;
    const put = (key: string, photos: string[]) => {
      if (cancelled || photos.length === 0) return;
      setEnquiryPhotos((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...photos] }));
    };
    (enq.events ?? []).forEach((ev, i) => {
      if ((ev.photo_count ?? 0) > 0) {
        void loadEnquiryPhotos(`${enq.id}#${i}`).then((p) => put(`enq-${enq.id}-${i}`, p));
      }
    });
    // Older enquiries stored one flat list; attach it to the first event.
    const hasPerEvent = (enq.events ?? []).some((e) => (e.photo_count ?? 0) > 0);
    if (!hasPerEvent) {
      if (enq.reference_images?.length) put(`enq-${enq.id}-0`, enq.reference_images);
      if ((enq.reference_photo_count ?? 0) > 0) {
        void loadEnquiryPhotos(enq.id).then((p) => put(`enq-${enq.id}-0`, p));
      }
    }
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const clientReferences = useMemo(() => {
    const out: Record<string, ClientReference> = {};
    for (const [id, ref] of Object.entries(enquiryRefs)) {
      out[id] = { ...ref, photos: enquiryPhotos[id] ?? [] };
    }
    return out;
  }, [enquiryRefs, enquiryPhotos]);

  // When the quotation starts from an enquiry that already has an event date,
  // preselect it so the vendor doesn't have to enter it again.
  useEffect(() => {
    if (!clientId || datePrefilled.current) return;
    const client = bookedClients.find((c) => c.id === clientId) || findClientById(clientId);
    if (!client?.event_date) return;
    const text = client.event_date.split("(")[0]?.trim() ?? "";
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return;
    const iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    datePrefilled.current = true;
    setDateEntries([createEventDateEntry(iso)]);
    setDateFromEnquiry(true);
    if (client.venue) setVenueLocation(client.venue);
  }, [clientId, bookedClients]);

  // Pre-load client data and custom multi-ceremony cards if clientId is passed
  useEffect(() => {
    if (!clientId) return;
    const client = bookedClients.find((c) => c.id === clientId) || findClientById(clientId);
    if (!client) return;

    if (client.client_name) setClientName(client.client_name);

    const matchingEnquiry = loadStoredEnquiries().find(
      (e) => e.id === clientId || (client.client_name && e.client_name?.toLowerCase() === client.client_name.toLowerCase())
    );
    const savedMobile = matchingEnquiry?.phone || client.phone || "";
    const savedWhatsapp = matchingEnquiry?.whatsapp_number || (client as any)?.whatsapp_number || "";

    if (savedMobile) setClientPhone(savedMobile);

    if (savedMobile && savedWhatsapp && areNumbersIdentical(savedMobile, savedWhatsapp)) {
      setSameAsMobile(true);
      setWhatsappNumber(savedMobile);
      setWhatsappCountryCode("+977");
    } else {
      setSameAsMobile(false);
      if (savedWhatsapp) {
        setWhatsappNumber(savedWhatsapp.replace(/[^0-9]/g, ""));
      } else if (client.phone) {
        setWhatsappNumber(client.phone.replace(/[^0-9]/g, ""));
      }
    }

    if (client.handler) setHandler(client.handler);
    if (client.proposal_id) setQuotationNumber(client.proposal_id);

    if (client.ceremonies && client.ceremonies.length > 0 && !enquiryApplied.current) {
      const scheduleFromClient: EventScheduleItem[] = client.ceremonies.map((c, idx) => ({
        id: c.id || `c-${idx + 1}`,
        name: c.name,
        isCustom: false,
        dateBs: c.date,
        dateAd: "",
        venueClassification: "Banquet & Ballroom",
        venueLocation: c.venue,
        sameAsPreviousVenue: false,
      }));
      setEventSchedule(scheduleFromClient);

      const cardsMap: Record<string, DecorationSetupItem[]> = {};
      client.ceremonies.forEach((c, idx) => {
        const cid = c.id || `c-${idx + 1}`;
        if (c.setupName) {
          const match = catalogSetups.find(
            (s) => s.id === c.setupId || s.name.toLowerCase() === c.setupName?.toLowerCase()
          );
          if (match) {
            cardsMap[cid] = [match];
          } else {
            cardsMap[cid] = [
              {
                id: c.setupId || `custom-${cid}`,
                sku: `DEC-CUST-${idx + 1}`,
                name: c.setupName,
                category: (c.category as DecorationCategory) || "Stage",
                description: `Custom decoration setup design for ${c.name}`,
                imageUrl:
                  c.setupImage ||
                  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
                createdAt: new Date().toISOString(),
                total_price: c.setupPrice || 45000,
              },
            ];
          }
        } else {
          cardsMap[cid] = [];
        }
      });
      setMultiCeremonyCards(cardsMap);

      const sumPrice = Object.values(cardsMap)
        .flat()
        .reduce(
          (acc, item) => acc + (item ? Number(item.total_price || 45000) : 0),
          0
        );
      if (sumPrice > 0) {
        setBasePrice(sumPrice);
      } else if (client.total_amount > 0) {
        setBasePrice(client.total_amount);
      }
    }
  }, [clientId, bookedClients, catalogSetups]);

  // Auto-persist Step 1 selections as new defaults
  useEffect(() => {
    setIntake((prev) => {
      const next: QuotationIntakeState = {
        ...prev,
        lastSource: source || prev.lastSource || undefined,
        lastHandler: handler || prev.lastHandler || undefined,
        lastCity: city || prev.lastCity || undefined,
        lastEventLocation: eventLocationType || prev.lastEventLocation || undefined,
      };
      saveQuotationIntake(next);
      return next;
    });
  }, [source, handler, city, eventLocationType]);

  const handleExit = () => {
    if (onExit) {
      onExit();
      return;
    }
    if (from) {
      navigate({ to: from as any });
    } else {
      navigate({ to: "/company" });
    }
  };

  const applySavedDefaults = () => {
    const saved = loadQuotationIntake();
    setSource(saved.lastSource || source);
    setHandler(saved.lastHandler || handler);
    setCity(saved.lastCity || city);
    setEventLocationType(saved.lastEventLocation || eventLocationType);
    toast.success("Applied your saved intake defaults");
  };

  const addCustomSource = () => {
    const value = newSourceDraft.trim();
    if (!value) return;
    setIntake((prev) => {
      if (prev.sourceOptions.includes(value)) return prev;
      const next = { ...prev, sourceOptions: [...prev.sourceOptions, value] };
      saveQuotationIntake(next);
      return next;
    });
    setSource(value);
    setNewSourceDraft("");
    setShowAddSource(false);
  };

  const addCustomHandler = () => {
    const value = newHandlerDraft.trim();
    if (!value) return;
    setIntake((prev) => {
      if (prev.handlerOptions.includes(value)) return prev;
      const next = { ...prev, handlerOptions: [...prev.handlerOptions, value] };
      saveQuotationIntake(next);
      return next;
    });
    setHandler(value);
    setNewHandlerDraft("");
    setShowAddHandler(false);
  };

  // ── Carried-Over Catalog Setup Items across all events ──
  const selectedCatalogItems = useMemo(() => {
    const list: Array<{
      id: string;
      ceremonyId: string;
      ceremonyName: string;
      ceremonyDate: string;
      ceremonyVenue: string;
      card: DecorationSetupItem;
      name: string;
      category: string;
      description: string;
      quantity: number;
      unit: string;
      defaultRate: number;
      rate: number;
      imageUrl?: string | undefined;
    }> = [];

    eventSchedule.forEach((ev) => {
      const cards = getCeremonyCardsList(multiCeremonyCards, ev.id);
      cards.forEach((card) => {
        const key = `${ev.id}-${card.id}`;
        const defaultRate = Number(
          card.total_price ||
            card.stageSpecs?.price ||
            card.mandapSpecs?.price ||
            card.backdropSpecs?.price ||
            card.entranceGateSpecs?.price ||
            45000
        );
        const override = catalogItemOverrides[key];
        const rate = override?.unitPrice !== undefined ? override.unitPrice : defaultRate;
        const quantity = override?.quantity !== undefined ? override.quantity : 1;

        const dimensions =
          card.stageSpecs?.dimensions ||
          card.backdropSpecs?.dimensions ||
          (card.specifications?.dimensions
            ? `${card.specifications.dimensions.width_ft}ft W × ${card.specifications.dimensions.height_ft}ft H`
            : "");
        const flower =
          card.specifications?.flowers?.[0]?.name?.replace(/\s*\([^)]*\)/g, "").trim();

        const scopeParts = [
          dimensions,
          flower ? `${flower} Floral Theme` : "",
          card.description,
        ].filter(Boolean);

        list.push({
          id: key,
          ceremonyId: ev.id,
          ceremonyName: ev.name,
          ceremonyDate: ev.dateBs || ev.dateAd || "",
          ceremonyVenue: ev.venueLocation || "",
          card,
          name: card.name,
          category: card.category || "Stage",
          description: scopeParts.join(" · "),
          quantity,
          unit: "Setup",
          defaultRate,
          rate,
          imageUrl: card.imageUrl,
        });
      });
    });

    return list;
  }, [eventSchedule, multiCeremonyCards, catalogItemOverrides]);

  const catalogSubtotal = useMemo(() => {
    return selectedCatalogItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
      0
    );
  }, [selectedCatalogItems]);

  const handleUpdateCatalogItemRate = (key: string, rate: number) => {
    setCatalogItemOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], unitPrice: Math.max(0, rate) },
    }));
  };

  const handleUpdateCatalogItemQty = (key: string, quantity: number) => {
    setCatalogItemOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], quantity: Math.max(1, quantity) },
    }));
  };

  const handleRemoveCatalogItem = (ceremonyId: string, cardId: string) => {
    setMultiCeremonyCards((prev) => {
      const existing = prev[ceremonyId] || [];
      return {
        ...prev,
        [ceremonyId]: existing.filter((c) => c.id !== cardId),
      };
    });
    setCatalogItemOverrides((prev) => {
      const copy = { ...prev };
      delete copy[`${ceremonyId}-${cardId}`];
      return copy;
    });
  };

  // Sync basePrice with catalogSubtotal when catalog items exist
  useEffect(() => {
    if (selectedCatalogItems.length > 0) {
      setBasePrice(catalogSubtotal);
    }
  }, [selectedCatalogItems.length, catalogSubtotal]);

  // Subtotals and Grand Total
  const addOnsSubtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0
    );
  }, [items]);

  const subtotalBeforeDiscount = useMemo(() => {
    if (selectedCatalogItems.length > 0) {
      return catalogSubtotal + addOnsSubtotal;
    }
    return (Number(basePrice) || 0) + addOnsSubtotal;
  }, [selectedCatalogItems.length, catalogSubtotal, addOnsSubtotal, basePrice]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotalBeforeDiscount - (Number(discountAmount) || 0));
  }, [subtotalBeforeDiscount, discountAmount]);

  // ── Dynamic Multi-Step Generation scaling with selected events ──
  const dynamicSteps: DynamicWizardStep[] = useMemo(() => {
    const steps: DynamicWizardStep[] = [
      {
        stepNumber: 1,
        key: "client",
        type: "client",
        title: "Client & Contact Details",
        caption: "Client, location, handler and contact",
      },
      {
        stepNumber: 2,
        key: "dates",
        type: "dates",
        title: "Select Event Dates",
        caption: "Choose one or more dates for this quotation",
      },
      {
        stepNumber: 3,
        key: "name_events",
        type: "name_events",
        title: "Name Your Events",
        caption: "Give each selected date an event name.",
      },
    ];

    // Generate individual sequential configuration steps for each event
    const eventsList =
      eventSchedule.length > 0
        ? eventSchedule
        : [
            {
              id: "event-1",
              name: "Wedding Day",
              dateBs: "Mangsir 2083",
              dateAd: "2026-11-27",
              venueLocation: "Kathmandu Venue",
              venueClassification: "Banquet & Ballroom",
              sameAsPreviousVenue: false,
            },
          ];

    eventsList.forEach((ev, idx) => {
      const stepNum = steps.length + 1;
      const evName = ev.name?.trim() || `Event ${idx + 1}`;
      steps.push({
        stepNumber: stepNum,
        key: `event_${ev.id || idx}`,
        type: "event_setup",
        eventIndex: idx,
        eventId: ev.id,
        eventName: evName,
        title: `Configure Event ${idx + 1}: ${evName}`,
        caption: `Configure decoration and specific requirements for ${ev.dateBs || ev.dateAd || "this event"}.`,
      });
    });

    // Notes & Dispatch Step (Final Step)
    steps.push({
      stepNumber: steps.length + 1,
      key: "pricing",
      type: "pricing",
      title: "Pricing & Add-ons",
      caption: "Review the setup price and add optional paid rentals",
    });

    // Advance payment step (final step): choose the bank/QR accounts for this client
    steps.push({
      stepNumber: steps.length + 1,
      key: "payment",
      type: "payment",
      title: "Advance Payment",
      caption: "Choose which bank QR the client pays the advance to",
    });

    return steps;
  }, [eventSchedule]);

  const currentStep: DynamicWizardStep = useMemo(() => {
    return (
      dynamicSteps.find((s) => s.stepNumber === wizardStep) ||
      dynamicSteps[0] || {
        stepNumber: 1,
        key: "client",
        type: "client" as const,
        title: "Client & Contact Details",
        caption: "Client, location, handler and contact",
      }
    );
  }, [dynamicSteps, wizardStep]);

  // Clamp wizardStep if event count changes dynamically
  useEffect(() => {
    if (wizardStep > dynamicSteps.length) {
      setWizardStep(dynamicSteps.length);
    }
  }, [dynamicSteps.length, wizardStep]);

  const goToStep = (stepNum: number) => {
    if (stepNum < 1 || stepNum > dynamicSteps.length) return;
    setWizardStep(stepNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    if (wizardStep < dynamicSteps.length) {
      setWizardStep((prev) => Math.min(prev + 1, dynamicSteps.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => Math.max(prev - 1, 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Validation for Pricing & Discount before finishing
  const validatePricingAndDiscount = (): { valid: boolean; error?: string } => {
    if (!clientName.trim()) {
      return { valid: false, error: "Please enter the client name to finish the quotation." };
    }
    if (isNaN(discountAmount) || discountAmount < 0) {
      return { valid: false, error: "Discount amount cannot be negative or invalid." };
    }
    if (discountAmount > subtotalBeforeDiscount) {
      return {
        valid: false,
        error: `Discount (Rs. ${discountAmount.toLocaleString()}) cannot exceed the gross subtotal (Rs. ${subtotalBeforeDiscount.toLocaleString()}).`,
      };
    }
    if (isNaN(basePrice) || basePrice < 0) {
      return { valid: false, error: "Base setup price cannot be negative or invalid." };
    }
    if (subtotalBeforeDiscount <= 0 && grandTotal <= 0) {
      return {
        valid: false,
        error: "Quotation total must be greater than zero. Please set a base price or select ceremony setups.",
      };
    }
    for (const item of items) {
      if (!item.name || !item.name.trim()) {
        return { valid: false, error: "All paid add-on items must have a name." };
      }
      if (isNaN(item.quantity) || item.quantity <= 0) {
        return { valid: false, error: `Quantity for "${item.name}" must be at least 1.` };
      }
      if (isNaN(item.unitPrice) || item.unitPrice < 0) {
        return { valid: false, error: `Rate for "${item.name}" cannot be negative.` };
      }
    }
    return { valid: true };
  };

  // Final Step Finish Quotation Handler
  const handleFinishQuotation = async () => {
    const validation = validatePricingAndDiscount();
    if (!validation.valid) {
      toast.error(validation.error || "Please correct pricing errors before finishing.");
      return;
    }

    setIsSaving(true);
    try {
      // Artificial UX delay for visible saving state
      await new Promise((resolve) => setTimeout(resolve, 550));

      const now = new Date();
      const finalClientId =
        clientId ||
        `bk-${clientName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 16)}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;
      const finalProposalId =
        quotationNumber ||
        `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

      const existingClient = clientId
        ? bookedClients.find((c) => c.id === clientId) || findClientById(clientId)
        : undefined;

      const formattedCeremonies: ClientCeremonyItem[] = eventSchedule.map((ev, idx) => {
        const cards = getCeremonyCardsList(multiCeremonyCards, ev.id);
        const primaryCard = cards[0];
        const combinedPrice = cards.reduce((sum, c) => sum + Number(c.total_price || 45000), 0);
        return {
          id: ev.id || `ceremony-${idx + 1}`,
          name: ev.name || `Ceremony ${idx + 1}`,
          date: ev.dateBs || ev.dateAd || "Date TBD",
          venue: ev.venueLocation || venueLocation || "Kathmandu Venue",
          setupId: primaryCard?.id,
          setupName: cards.length > 1 ? cards.map((c) => c.name).join(" + ") : primaryCard?.name,
          setupPrice: combinedPrice || (primaryCard ? Number(primaryCard.total_price || 45000) : 0),
          category: primaryCard?.category,
          setupImage: primaryCard?.imageUrl,
          items: cards.map((c) => ({
            id: c.id,
            name: c.name,
            price: Number(c.total_price || 45000),
            setupId: c.id,
            category: c.category,
            imageUrl: c.imageUrl,
          })),
        };
      });

      const primaryEventType =
        functionType ||
        (eventSchedule.length > 1
          ? `${eventSchedule[0]?.name || "Wedding"} + ${eventSchedule.length - 1} Events`
          : eventSchedule[0]?.name || "Grand Wedding Journey");

      const primaryEventDate =
        eventDate ||
        (eventSchedule[0]?.dateBs
          ? `${eventSchedule[0]?.dateBs}${eventSchedule[0]?.dateAd ? ` (${eventSchedule[0]?.dateAd})` : ""}`
          : "Scheduled Dates");

      const primaryVenue = venueLocation || eventSchedule[0]?.venueLocation || "Kathmandu Venue";

      const savedClient: BookedClient = {
        id: finalClientId,
        client_name: clientName.trim(),
        event_type: primaryEventType,
        event_date: primaryEventDate,
        venue: primaryVenue,
        stage: existingClient?.stage || "confirmed",
        payment_status: existingClient?.payment_status || "balance_due",
        payment_note:
          existingClient?.payment_note ||
          `Quotation finalized · Grand Total Rs. ${grandTotal.toLocaleString()}`,
        total_amount: grandTotal,
        paid_amount: existingClient?.paid_amount || 0,
        balance_due: Math.max(0, grandTotal - (existingClient?.paid_amount || 0)),
        days_to_event: existingClient?.days_to_event ?? 14,
        needs_attention: false,
        phone: clientPhone.trim() || whatsappNumber.trim(),
        handler: handler,
        events_count: eventSchedule.length,
        quotation_status: existingClient?.quotation_status || "Draft",
        proposal_id: finalProposalId,
        ceremonies: formattedCeremonies,
        paid_addons: items.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          price: (it.quantity || 1) * (it.unitPrice || 0),
          category: it.category,
          description: it.description,
        })),
        notes: notes.trim(),
        payment_accounts: Object.entries(paymentRoles).map(([id, role]) => ({ id, role })),
      };

      // Persist to store
      upsertStoredBookedClient(savedClient);

      // Record setup quotation analytics
      if (setup?.id) {
        recordSetupQuotation(setup.id);
      }
      selectedCatalogItems.forEach((item) => {
        if (item.card?.id) recordSetupQuotation(item.card.id);
      });

      // Save user intake defaults
      saveQuotationIntake({
        ...intake,
        lastSource: source,
        lastHandler: handler,
        lastCity: city,
        lastEventLocation: eventLocationType,
      });

      toast.success("Quotation finished and saved successfully!");

      if (onExit) {
        onExit();
      } else {
        navigate({
          to: "/booked-clients",
          search: { client: savedClient.id, view: "table" } as any,
        });
      }
    } catch (err: any) {
      console.error("Failed to finish quotation:", err);
      toast.error(err?.message || "Failed to save quotation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueClick = () => {
    if (wizardStep >= dynamicSteps.length || currentStep.type === "payment") {
      handleFinishQuotation();
      return;
    }
    if (currentStep.type === "client") {
      setHasSubmittedStep1(true);
      if (!clientName.trim()) {
        toast.error("Please enter full client name to proceed");
        return;
      }
      if (sameAsMobile) {
        if (!clientPhone.trim()) {
          toast.error("Please enter mobile number to proceed");
          return;
        }
        if (!isNepaliMobileValid(clientPhone)) {
          toast.error("Please enter a valid Nepali mobile number (10 digits starting with 97, 98, or 96)");
          return;
        }
      } else {
        if (clientPhone.trim() && !isNepaliMobileValid(clientPhone)) {
          toast.error("Please enter a valid Nepali mobile number (10 digits starting with 97, 98, or 96)");
          return;
        }
        if (!whatsappNumber.trim()) {
          toast.error("Please enter WhatsApp number to proceed");
          return;
        }
      }
    }
    goNext();
  };

  const platformItems = items.filter((it) => it.category === "platform");
  const lightingItems = items.filter((it) => it.category === "lighting");
  const furnitureItems = items.filter((it) => it.category === "furniture");

  const canContinue = useMemo(() => {
    if (!currentStep) return true;
    switch (currentStep.type) {
      case "client":
        if (sameAsMobile) {
          return clientName.trim().length > 1 && isNepaliMobileValid(clientPhone);
        }
        return (
          clientName.trim().length > 1 &&
          whatsappNumber.trim().length > 5 &&
          (!clientPhone.trim() || isNepaliMobileValid(clientPhone))
        );
      case "dates":
        return eventSchedule.length > 0;
      case "name_events":
        return eventSchedule.length > 0;
      case "event_setup":
        return true;
      case "pricing":
        return true;
      case "payment":
        return true;
      default:
        return true;
    }
  }, [currentStep, clientName, whatsappNumber, clientPhone, sameAsMobile, eventSchedule]);

  // Item Management for paid add-ons
  const handleUpdateItem = (id: string, updates: Partial<QuotationItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddItem = (category: QuotationItem["category"]) => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      category,
      name:
        category === "lighting"
          ? "Warm Focus Floodlight Fixture"
          : category === "platform"
          ? "Extended Riser Platform Deck"
          : category === "furniture"
          ? "Royal Diwan / Accent Chairs"
          : "Custom Decor Service",
      description:
        category === "lighting"
          ? "Spot illumination & backdrop warm wash"
          : category === "platform"
          ? "Carpeted wooden deck extension"
          : category === "furniture"
          ? "Seating set & premium matching props"
          : "Specialized service specified by client",
      quantity: 1,
      unit: category === "lighting" ? "Set" : category === "platform" ? "Deck" : "Unit",
      unitPrice:
        category === "lighting"
          ? 3500
          : category === "platform"
          ? 4500
          : category === "furniture"
          ? 6000
          : 2500,
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`Added new ${category} add-on`);
  };

  // WhatsApp Sender
  const handleSendWhatsApp = () => {
    if (!whatsappNumber.trim()) {
      toast.error("Please enter a WhatsApp number to send the quotation");
      return;
    }

    const companyName = profile?.name || "Decoration Studio & Events";
    const companyPhone = profile?.phone || "+977 9801234567";
    const setupName = formatSetupTitle(setup);
    const category = setup?.category || quickCategory || "Decoration";

    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://decorportal.com";
    const trackingUrl = `${origin}/proposal/${quotationNumber}`;

    const hasMultiCards = Object.values(multiCeremonyCards).some(
      (val) => Array.isArray(val) ? val.length > 0 : Boolean(val)
    );
    const ceremonyDetails = hasMultiCards
      ? eventSchedule
          .map((ev) => {
            const cards = getCeremonyCardsList(multiCeremonyCards, ev.id);
            if (cards.length === 0) {
              return `• *${ev.name}* (${ev.dateBs || ev.dateAd})\n  📍 ${ev.venueLocation}\n  ✨ Setup: *Bespoke Ceremony Setup*`;
            }
            const cardLines = cards
              .map((c) => {
                const cat = c.category ? ` (${c.category})` : "";
                const price = ` — Rs. ${Number(c.total_price || 45000).toLocaleString()}`;
                return `    - *${c.name}*${cat}${price}`;
              })
              .join("\n");
            return `• *${ev.name}* (${ev.dateBs || ev.dateAd})\n  📍 ${ev.venueLocation}\n  ✨ Setups (${cards.length}):\n${cardLines}`;
          })
          .join("\n\n")
      : `*${setupName}* (${category})\nDimensions: ${getSetupDimensions(setup)}`;

    const message = `🌸 *OFFICIAL MULTI-CEREMONY DECORATION PROPOSAL* 🌸
*${companyName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━
*Proposal Ref:* ${quotationNumber}
*Date:* ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

👤 *Prepared For:* ${clientName || "Valued Client"}
📞 *Contact:* ${clientPhone || whatsappNumber}
📅 *Event Journey:* ${eventSchedule.length} Booked Ceremonies

━━━━━━━━━━━━━━━━━━━━━━
💍 *CEREMONY ITINERARY & SETUPS:*
━━━━━━━━━━━━━━━━━━━━━━
${ceremonyDetails}

${floralSpec.hasFlowers && !hasMultiCards ? `🌸 *Floral Styling:* ${floralSpec.summary} [Included in Base Setup]\n` : ""}📋 *INVESTMENT BREAKDOWN:*
• Base Multi-Ceremony Setup: Rs. ${basePrice.toLocaleString()}
${items
  .map(
    (it) =>
      `• [Add-On] ${it.name} (${it.quantity} ${it.unit}): Rs. ${(
        it.quantity * it.unitPrice
      ).toLocaleString()}`
  )
  .join("\n")}
━━━━━━━━━━━━━━━━━━━━━━
🏷️ *Subtotal:* Rs. ${subtotalBeforeDiscount.toLocaleString()}
${discountAmount > 0 ? `🎁 *Special Courtesy Discount:* -Rs. ${discountAmount.toLocaleString()}\n` : ""}💎 *GRAND TOTAL:* Rs. ${grandTotal.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━

🔗 *VIEW LIVE INTERACTIVE PROPOSAL:*
${trackingUrl}
_(Includes high-res moodboards, setup dimensions, floral recipes & booking breakdown)_

📝 *Terms & Inclusions:*
• 50% advance booking deposit required to lock dates.
• Balance due prior to on-site dispatch.
• Includes installation, floral design styling, crew & post-event teardown.

📞 *Questions? Contact us at:*
${companyPhone} | ${profile?.email || "events@decorportal.com"}
Thank you for letting us make your milestone unforgettable!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    if (setup?.id) recordSetupQuotation(setup.id);
    window.open(url, "_blank");
    toast.success("WhatsApp opened with prefilled multi-ceremony quotation proposal!");
  };

  // Email Sender
  const handleSendEmail = () => {
    const companyName = profile?.name || "Decoration Studio & Events";
    const setupName = formatSetupTitle(setup);
    const subject = `Official Decoration Proposal: ${setupName} - ${clientName || "Quotation"} (${eventDate})`;

    const emailBody = `Dear ${clientName || "Valued Client"},

Thank you for your interest in our decoration and styling services. Please find below the official quotation for your upcoming event on ${eventDate || "your scheduled date"}.

--------------------------------------------------
OFFICIAL QUOTATION SUMMARY: ${quotationNumber}
--------------------------------------------------
Company: ${companyName}
Client: ${clientName || "Client"}
Contact: ${clientPhone || whatsappNumber || "N/A"}
Venue: ${venueLocation || "TBD"}
Event Date: ${eventDate || "TBD"}

SELECTED DESIGN & SPECIFICATIONS:
- Setup Name: ${setupName}
- Category: ${setup?.category || quickCategory || "Decoration"}
- Dimensions: ${getSetupDimensions(setup)}
${floralSpec.hasFlowers ? `- Floral Styling: ${floralSpec.summary} (Included in Base Setup)\n` : ""}
PRICE BREAKDOWN:
- Base Framework, Floral Styling & Setup: Rs. ${basePrice.toLocaleString()}
${items
  .map(
    (it) =>
      `- [Add-on] ${it.name} (${it.quantity} ${it.unit} @ Rs. ${it.unitPrice}): Rs. ${(
        it.quantity * it.unitPrice
      ).toLocaleString()}`
  )
  .join("\n")}

--------------------------------------------------
Subtotal: Rs. ${subtotalBeforeDiscount.toLocaleString()}
${discountAmount > 0 ? `Discount: -Rs. ${discountAmount.toLocaleString()}\n` : ""}GRAND TOTAL: Rs. ${grandTotal.toLocaleString()}
--------------------------------------------------

TERMS & NOTES:
${notes}
- Quotation is valid for 14 calendar days.
- 50% advance deposit to reserve team and equipment.

Warm regards,
${profile?.ownerName || "The Events Team"}
${companyName}
Phone: ${profile?.phone || "+977 9801234567"}
Email: ${profile?.email || "events@decorportal.com"}
`;

    const mailtoUrl = `mailto:${clientEmail || ""}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(emailBody)}`;
    if (setup?.id) recordSetupQuotation(setup.id);
    window.location.href = mailtoUrl;
    toast.success("Email client launched!");
  };

  // Copy Quotation Summary
  const handleCopySummary = () => {
    const companyName = profile?.name || "Decoration Studio & Events";
    const setupName = formatSetupTitle(setup);
    const text = `QUOTATION SUMMARY (${quotationNumber})
${companyName}
------------------------------------------
Client: ${clientName || "Client"}
Phone: ${clientPhone || whatsappNumber || "N/A"}
Event Date: ${eventDate || "TBD"}
Venue: ${venueLocation || "TBD"}

Setup: ${setupName}
Floral Style: ${floralSpec.flowerStyle} (${floralSpec.flowerType}) [Included]
Base Setup Price: Rs. ${basePrice.toLocaleString()}
Paid Add-ons: Rs. ${addOnsSubtotal.toLocaleString()}
${discountAmount > 0 ? `Discount: -Rs. ${discountAmount.toLocaleString()}\n` : ""}Grand Total: Rs. ${grandTotal.toLocaleString()}
------------------------------------------
Valid for 14 days.`;

    navigator.clipboard.writeText(text);
    if (setup?.id) recordSetupQuotation(setup.id);
    toast.success("Quotation text copied to clipboard!");
  };

  // PDF Generator
  const handleGeneratePdf = () => {
    if (setup?.id) recordSetupQuotation(setup.id);
    const companyName = profile?.name || "Decoration Studio & Events";
    const companyOwner = profile?.ownerName || "Authorized Designer";
    const companyPhone = profile?.phone || "+977 9801234567";
    const companyEmail = profile?.email || "info@decorportal.com";
    const companyCity = profile?.city || "Kathmandu, Nepal";
    const setupName = formatSetupTitle(setup);
    const setupImage =
      setup?.imageUrl ||
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80";

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quotation_${quotationNumber}_${(clientName || "Client").replace(/\s+/g, "_")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1614;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.45;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid hsl(350, 80%, 65%);
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .company-title {
      font-size: 20pt;
      font-weight: 800;
      color: #1a1614;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .company-meta {
      font-size: 9pt;
      color: #6b5f5c;
      margin: 0;
    }
    .quote-badge {
      text-align: right;
    }
    .quote-badge h1 {
      font-size: 16pt;
      font-weight: 800;
      color: hsl(350, 80%, 45%);
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }
    .quote-badge p {
      font-size: 9pt;
      color: #6b5f5c;
      margin: 2px 0;
      font-family: monospace;
    }
    .two-col {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .panel {
      flex: 1;
      background: #faf8f7;
      border: 1px solid rgba(180, 150, 140, 0.3);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .panel-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: hsl(350, 80%, 45%);
      margin-bottom: 6px;
    }
    .panel-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }
    .panel-label {
      color: #6b5f5c;
    }
    .panel-val {
      font-weight: 600;
      color: #1a1614;
      text-align: right;
    }
    .setup-strip {
      display: flex;
      background: #faf8f7;
      border: 1px solid rgba(180, 150, 140, 0.3);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 18px;
    }
    .setup-img {
      width: 130px;
      height: 95px;
      object-fit: cover;
    }
    .setup-info {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
    }
    .setup-name {
      font-size: 13pt;
      font-weight: 700;
      color: #1a1614;
      margin: 0 0 4px 0;
    }
    .setup-tags {
      font-size: 8.5pt;
      color: #6b5f5c;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 9.5pt;
    }
    th {
      background: hsl(350, 80%, 92%);
      color: hsl(350, 80%, 45%);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border: 1px solid rgba(180, 150, 140, 0.3);
      text-align: left;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    th.text-center, td.text-center {
      text-align: center;
    }
    td {
      padding: 7px 10px;
      border: 1px solid rgba(180, 150, 140, 0.25);
      color: #1a1614;
    }
    tr:nth-child(even) {
      background: #faf8f7;
    }
    .item-desc {
      font-size: 8pt;
      color: #6b5f5c;
      margin-top: 1px;
    }
    .cat-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: #fcedd8;
      color: hsl(38, 80%, 40%);
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    .totals-table {
      width: 320px;
      border: none;
      margin: 0;
    }
    .totals-table td {
      border: none;
      padding: 4px 6px;
      font-size: 9.5pt;
    }
    .totals-table .grand-row td {
      border-top: 2px solid hsl(350, 80%, 65%);
      font-size: 13pt;
      font-weight: 800;
      color: hsl(350, 80%, 45%);
      padding-top: 8px;
    }
    .terms-box {
      background: #faf8f7;
      border: 1px dashed rgba(180, 150, 140, 0.4);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 8.5pt;
      color: #6b5f5c;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .terms-title {
      font-weight: 700;
      color: #1a1614;
      margin-bottom: 3px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 14px;
    }
    .sig-col {
      width: 200px;
      border-top: 1px solid #1a1614;
      text-align: center;
      padding-top: 6px;
      font-size: 8.5pt;
      color: #6b5f5c;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <h1 class="company-title">${companyName}</h1>
      <p class="company-meta">${companyCity} · Phone: ${companyPhone}</p>
      <p class="company-meta">Email: ${companyEmail}</p>
    </div>
    <div class="quote-badge">
      <h1>QUOTATION</h1>
      <p>Ref: <strong>${quotationNumber}</strong></p>
      <p>Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      <p>Validity: 14 Days</p>
    </div>
  </div>

  <div class="two-col">
    <div class="panel">
      <div class="panel-title">Prepared For (Client)</div>
      <div class="panel-row">
        <span class="panel-label">Name:</span>
        <span class="panel-val">${clientName || "Honorable Client"}</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Phone:</span>
        <span class="panel-val">${clientPhone || whatsappNumber || "—"}</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Email:</span>
        <span class="panel-val">${clientEmail || "—"}</span>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Event Specifications</div>
      <div class="panel-row">
        <span class="panel-label">Function Type:</span>
        <span class="panel-val">${functionType || "Celebration"}</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Event Date:</span>
        <span class="panel-val">${eventDate || "Date TBD"}</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">Venue:</span>
        <span class="panel-val">${venueLocation || "On-site Venue"}</span>
      </div>
    </div>
  </div>

  <div class="setup-strip">
    <img src="${setupImage}" class="setup-img" alt="${setupName}" />
    <div class="setup-info">
      <div class="setup-name">${setupName}</div>
      <div class="setup-tags">
        Category: <strong>${setup?.category || quickCategory || "Decoration"}</strong> · Dimensions: <strong>${getSetupDimensions(setup)}</strong>
      </div>
      ${
        floralSpec.hasFlowers
          ? `<div class="setup-tags" style="color: hsl(350, 80%, 45%); margin-top: 3px;">
              🌸 <strong>Floral Design Specification:</strong> ${floralSpec.summary}
             </div>`
          : ""
      }
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 32px;" class="text-center">#</th>
        <th>Item &amp; Scope Description</th>
        <th class="text-center" style="width: 90px;">Category</th>
        <th class="text-center" style="width: 70px;">Qty</th>
        <th class="text-right" style="width: 110px;">Rate (NPR)</th>
        <th class="text-right" style="width: 120px;">Amount (NPR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center">1</td>
        <td>
          <strong>Base Setup Framework, Floral Styling &amp; Draping</strong>
          <div class="item-desc">
            Complete framework structure, drapery, floral styling specifications (${floralSpec.flowerStyle}), on-site delivery, professional installation, mounting &amp; teardown post-event.
          </div>
        </td>
        <td class="text-center"><span class="cat-badge">Base Setup</span></td>
        <td class="text-center">1 Set</td>
        <td class="text-right">Rs. ${basePrice.toLocaleString()}</td>
        <td class="text-right"><strong>Rs. ${basePrice.toLocaleString()}</strong></td>
      </tr>
      ${items
        .map(
          (it, i) => `
        <tr>
          <td class="text-center">${i + 2}</td>
          <td>
            <strong>${it.name}</strong>
            ${it.description ? `<div class="item-desc">${it.description}</div>` : ""}
          </td>
          <td class="text-center"><span class="cat-badge">${it.category}</span></td>
          <td class="text-center">${it.quantity} ${it.unit}</td>
          <td class="text-right">Rs. ${it.unitPrice.toLocaleString()}</td>
          <td class="text-right"><strong>Rs. ${(it.quantity * it.unitPrice).toLocaleString()}</strong></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals-area">
    <table class="totals-table">
      <tr>
        <td>Base Setup (Floral Included):</td>
        <td class="text-right">Rs. ${basePrice.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Paid Add-on Services:</td>
        <td class="text-right">Rs. ${addOnsSubtotal.toLocaleString()}</td>
      </tr>
      <tr>
        <td><strong>Gross Subtotal:</strong></td>
        <td class="text-right"><strong>Rs. ${subtotalBeforeDiscount.toLocaleString()}</strong></td>
      </tr>
      ${
        discountAmount > 0
          ? `
        <tr style="color: hsl(350, 80%, 45%);">
          <td>Courtesy Discount:</td>
          <td class="text-right">-Rs. ${discountAmount.toLocaleString()}</td>
        </tr>
      `
          : ""
      }
      <tr class="grand-row">
        <td>GRAND TOTAL:</td>
        <td class="text-right">Rs. ${grandTotal.toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div class="terms-box">
    <div class="terms-title">Terms &amp; Booking Conditions</div>
    • <strong>Floral Inclusions:</strong> Floral design (type: ${floralSpec.flowerType}, style: ${floralSpec.flowerStyle}) is a core design specification included in the Base Setup Price.<br>
    • <strong>Deposit:</strong> 50% advance booking deposit required to lock event dates.<br>
    • <strong>Balance:</strong> Remaining balance must be cleared prior to crew deployment or on-site delivery.<br>
    • <strong>Scope:</strong> Includes complete delivery, professional installation, on-site setup, and teardown.<br>
    • <strong>Validity:</strong> This quotation remains valid for 14 calendar days from the date of issuance.
  </div>

  <div class="signatures">
    <div class="sig-col">
      Client Acceptance Signature
    </div>
    <div class="sig-col">
      For ${companyName} (${companyOwner})
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      toast.success("Print dialog opened! Select 'Save as PDF' to save.");
    } else {
      toast.error("Pop-up blocked. Please allow pop-ups for this site to generate PDF.");
    }
  };

  const setupTitle = formatSetupTitle(setup);
  const setupDimensions = getSetupDimensions(setup);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* ─── TOP SECTION: HEADER + STEP CONTENT ─── */}
      <div className="w-full px-6 sm:px-10 lg:px-14 pt-4 sm:pt-6">
        {/* ─── TOP HEADER ROW ─── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-[#e15b74] uppercase">
              STEP {String(currentStep.stepNumber).padStart(2, "0")} OF {String(dynamicSteps.length).padStart(2, "0")}
              {currentStep.type === "event_setup" && (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  EVENT {(currentStep.eventIndex ?? 0) + 1} OF {eventSchedule.length}
                </>
              )}
            </div>
            <h1 className="font-['Cormorant_Garamond',serif] text-3xl sm:text-[34px] font-semibold text-slate-900 tracking-tight mt-0.5 leading-tight">
              {currentStep.title}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              {currentStep.caption}
            </p>
          </div>

          {/* Right: DEFAULTS & Close buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {currentStep.type === "client" && (
              <button
                type="button"
                onClick={applySavedDefaults}
                className="h-8 px-3.5 rounded-xl border border-indigo-200 bg-[#eef2ff] text-[#4f46e5] font-bold uppercase text-[11px] tracking-wider flex items-center gap-1.5 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer select-none"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>DEFAULTS</span>
              </button>
            )}
            {currentStep.stepNumber > 1 && (
              <div className="text-right hidden sm:block mr-1">
                <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider leading-none">
                  Estimated
                </span>
                <span className="font-extrabold text-xs tabular-nums text-[#e14b68]">
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleExit}
              title="Close"
              className="size-8 rounded-xl border border-stone-200 bg-white text-stone-400 flex items-center justify-center hover:text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer select-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── STEP PROGRESS BAR (scales dynamically based on event count) ─── */}
        <div
          className="grid gap-2 sm:gap-2.5 w-full mt-4"
          style={{ gridTemplateColumns: `repeat(${dynamicSteps.length}, minmax(0, 1fr))` }}
        >
          {dynamicSteps.map((s) => {
            const isPassed = s.stepNumber <= wizardStep;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => goToStep(s.stepNumber)}
                title={`Step ${s.stepNumber}: ${s.title}`}
                className="h-[5px] rounded-full transition-all cursor-pointer relative"
                style={{
                  backgroundColor: isPassed ? "#f97316" : "#e5e2dc",
                }}
              />
            );
          })}
        </div>

        {/* ─── FORM STEP BODY ─── */}
        <div className="space-y-8 mt-8">
          {/* ─── STEP 1: Client & Contact Details ─── */}
          {currentStep.type === "client" && (
            <div className="w-full">
              {/* 1. CLIENT NAME * */}
              <div>
                <label className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2">
                  CLIENT NAME <span className="text-[#e14b68]">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter full client name"
                  className="w-full h-11 px-4 text-sm font-medium text-stone-900 bg-[#f3f2ee] rounded-xl border border-transparent placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#e14b68] transition-all"
                />
              </div>

              {/* 2. SOURCE */}
              <div className="mt-6">
                <label className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2">
                  SOURCE
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {intake.sourceOptions.map((opt) => {
                    const isSelected = source.toUpperCase() === opt.toUpperCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSource(opt)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[#e14b68] text-white shadow-md shadow-pink-500/20"
                            : "bg-white border border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {showAddSource ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={newSourceDraft}
                        onChange={(e) => setNewSourceDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomSource()}
                        placeholder="Source name"
                        className="h-8 w-32 px-3 text-xs rounded-xl bg-[#f3f2ee] border border-transparent text-stone-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addCustomSource}
                        className="h-8 px-3 rounded-xl text-xs bg-[#e14b68] text-white font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddSource(true)}
                      className="text-xs font-semibold text-[#e15b74] hover:underline ml-1 cursor-pointer flex items-center gap-1 select-none"
                    >
                      + Add source
                    </button>
                  )}
                </div>
              </div>

              {/* 3. EVENT LOCATION */}
              <div className="mt-6">
                <label className="text-[11px] font-bold tracking-wider uppercase text-[#e15b74] block mb-2">
                  EVENT LOCATION
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {EVENT_LOCATION_OPTIONS.map((opt) => {
                    const isSelected = eventLocationType === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEventLocationType(opt)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[#e14b68] text-white font-semibold shadow-md shadow-pink-500/20"
                            : "bg-white border border-stone-200 text-stone-700 font-medium hover:border-stone-300 hover:bg-stone-50"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    title="Event Location Information"
                    className="size-6 rounded-full border border-rose-300 text-rose-400 flex items-center justify-center text-xs ml-0.5 hover:bg-rose-50 transition-colors cursor-pointer select-none"
                  >
                    <span className="font-serif italic text-xs leading-none">i</span>
                  </button>
                </div>
              </div>

              {/* 4. CITY */}
              <div className="mt-6">
                <label className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2">
                  CITY
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kathmandu"
                    className="w-full h-11 px-4 pr-10 text-sm font-medium text-stone-800 bg-[#f3f2ee] rounded-xl border border-transparent placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#e14b68] transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                    <ChevronsUpDown className="size-4" />
                  </div>
                </div>
              </div>

              {/* 5. INQUIRY DETAILS */}
              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold tracking-wider text-[#e15b74] uppercase shrink-0">
                    INQUIRY DETAILS
                  </span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2">
                    HANDLER
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {intake.handlerOptions.map((opt) => {
                      const isSelected = handler === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setHandler(opt)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none",
                            isSelected
                              ? "bg-[#e14b68] text-white font-semibold shadow-md shadow-pink-500/20"
                              : "bg-white border border-stone-200 text-stone-700 font-medium hover:border-stone-300 hover:bg-stone-50"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {showAddHandler ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={newHandlerDraft}
                          onChange={(e) => setNewHandlerDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCustomHandler()}
                          placeholder="Handler name"
                          className="h-8 w-32 px-3 text-xs rounded-xl bg-[#f3f2ee] border border-transparent text-stone-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addCustomHandler}
                          className="h-8 px-3 rounded-xl text-xs bg-[#e14b68] text-white font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddHandler(true)}
                        className="text-xs font-semibold text-[#e15b74] hover:underline ml-1 cursor-pointer flex items-center gap-1 select-none"
                      >
                        + Add handler
                      </button>
                    )}
                    <button
                      type="button"
                      title="Handler Information"
                      className="size-6 rounded-full border border-rose-300 text-rose-400 flex items-center justify-center text-xs ml-0.5 hover:bg-rose-50 transition-colors cursor-pointer select-none"
                    >
                      <span className="font-serif italic text-xs leading-none">i</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. CONTACT DETAILS */}
              <div className="mt-8">
                <div className="text-[11px] font-bold tracking-wider text-[#e15b74] uppercase mb-4">
                  CONTACT DETAILS
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* Left: Mobile Number */}
                  <div>
                    <label
                      htmlFor="client-mobile-number"
                      className="text-[11px] font-bold tracking-wider text-stone-500 uppercase block mb-2"
                    >
                      MOBILE NUMBER <span className="text-[10px] font-normal tracking-normal text-stone-400 ml-1.5 uppercase">(REACHABLE NEPALI NUMBER)</span>
                    </label>
                    <input
                      id="client-mobile-number"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => handleClientPhoneChange(e.target.value)}
                      onBlur={() => setMobileTouched(true)}
                      placeholder="98XXXXXXXX"
                      className={cn(
                        "w-full h-11 px-4 text-sm font-medium text-stone-800 rounded-xl border placeholder:text-stone-400 focus:outline-none transition-all",
                        showMobileError
                          ? "bg-rose-50/40 border-[#e14b68] focus:ring-1 focus:ring-[#e14b68]"
                          : "bg-[#f3f2ee] border-transparent focus:ring-1 focus:ring-[#e14b68]"
                      )}
                    />
                    {showMobileError && (
                      <p className="text-[11px] text-[#e14b68] mt-1.5 font-medium flex items-center gap-1">
                        <span>Must be a 10-digit number starting with 97, 98, or 96</span>
                      </p>
                    )}
                  </div>

                  {/* Right: WhatsApp Number */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label
                        htmlFor="client-whatsapp-number"
                        className="text-[11px] font-bold tracking-wider text-stone-500 uppercase"
                      >
                        WHATSAPP NUMBER <span className="text-[#e14b68]">*</span>
                      </label>
                      <label
                        htmlFor="same-as-mobile-checkbox"
                        className={cn(
                          "inline-flex items-center gap-1.5 select-none transition-opacity",
                          !clientPhone.trim() ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <input
                          id="same-as-mobile-checkbox"
                          type="checkbox"
                          checked={sameAsMobile}
                          disabled={!clientPhone.trim()}
                          onChange={(e) => handleToggleSameAsMobile(e.target.checked)}
                          className="size-3.5 sm:size-4 rounded border-stone-300 text-[#e14b68] accent-[#e14b68] focus:ring-1 focus:ring-[#e14b68] cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-stone-500">
                          Same as mobile number
                        </span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-11 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0 select-none transition-all",
                          sameAsMobile
                            ? "bg-[#ebe8e2] border border-stone-200/60 text-stone-400 cursor-not-allowed"
                            : "bg-white border border-stone-200/90 text-stone-700 cursor-pointer"
                        )}
                      >
                        <span>NP {whatsappCountryCode}</span>
                        <ChevronDown className={cn("size-3.5", sameAsMobile ? "text-stone-300" : "text-stone-400")} />
                      </div>
                      <input
                        id="client-whatsapp-number"
                        type="tel"
                        value={whatsappNumber}
                        readOnly={sameAsMobile}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="WhatsApp number"
                        className={cn(
                          "flex-1 h-11 px-4 text-sm font-medium rounded-xl border placeholder:text-stone-400 transition-all",
                          sameAsMobile
                            ? "bg-[#ebe8e2] text-stone-500 border-stone-200/60 cursor-not-allowed select-none focus:outline-none"
                            : "bg-[#f3f2ee] text-stone-800 border-transparent focus:outline-none focus:ring-1 focus:ring-[#e14b68]"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

            {/* ─── STEP 2: Select event date(s) ─── */}
            {currentStep.type === "dates" && (
              <EventDateStep
                entries={dateEntries}
                onEntriesChange={setDateEntries}
                venue={venueLocation}
                onVenueChange={setVenueLocation}
                fromEnquiry={dateFromEnquiry}
                onBack={goBack}
                onContinue={() => {
                  const schedule = entriesToSchedule(dateEntries, venueLocation, eventSchedule);
                  setEventSchedule(schedule);
                  saveStoredEventSchedule(schedule);
                  setEventDates(
                    dateEntries
                      .map((e) => e.dateAd)
                      .filter(Boolean)
                      .sort()
                  );
                  goNext();
                }}
              />
            )}

            {/* ─── STEP 3: Name Your Events ─── */}
            {currentStep.type === "name_events" && (
              <NameEventsStep
                schedule={eventSchedule}
                onScheduleChange={(updated) => {
                  setEventSchedule(updated);
                  saveStoredEventSchedule(updated);
                }}
                onBack={goBack}
                onContinue={() => {
                  goNext();
                }}
              />
            )}

            {/* ─── DYNAMIC EVENT CONFIGURATION STEPS (Step 4+: Event 1, Event 2, ...) ─── */}
            {currentStep.type === "event_setup" && (
              <MultiCeremonyCardSelector
                ceremonies={eventSchedule.map((ev) => ({
                  id: ev.id,
                  name: ev.name,
                  dateBs: ev.dateBs,
                  dateAd: ev.dateAd,
                  venueLocation: ev.venueLocation,
                  venueClassification: ev.venueClassification,
                  timing: ev.timing,
                  notes: ev.notes,
                }))}
                selectedCards={multiCeremonyCards}
                onToggleCardForCeremony={(ceremonyId, card) => {
                  setMultiCeremonyCards((prev) => {
                    const existing = prev[ceremonyId] || [];
                    const isAlreadySelected = existing.some((c) => c.id === card.id);
                    const updatedForCeremony = isAlreadySelected
                      ? existing.filter((c) => c.id !== card.id)
                      : [...existing, card];

                    const next = { ...prev, [ceremonyId]: updatedForCeremony };
                    const sum = Object.values(next)
                      .flat()
                      .reduce(
                        (s, c) =>
                          s +
                          (c
                            ? Number(
                                c.total_price ||
                                  c.stageSpecs?.price ||
                                  c.mandapSpecs?.price ||
                                  c.backdropSpecs?.price ||
                                  c.entranceGateSpecs?.price ||
                                  45000
                              )
                            : 0),
                        0
                      );
                    if (sum > 0) {
                      setBasePrice(sum);
                    }
                    return next;
                  });
                  setSetup(card);
                }}
                onSelectCardForCeremony={(ceremonyId, card) => {
                  if (!card) {
                    setMultiCeremonyCards((prev) => {
                      const next = { ...prev, [ceremonyId]: [] };
                      return next;
                    });
                    return;
                  }
                  setMultiCeremonyCards((prev) => {
                    const existing = prev[ceremonyId] || [];
                    const isAlreadySelected = existing.some((c) => c.id === card.id);
                    const updatedForCeremony = isAlreadySelected
                      ? existing.filter((c) => c.id !== card.id)
                      : [...existing, card];

                    const next = { ...prev, [ceremonyId]: updatedForCeremony };
                    const sum = Object.values(next)
                      .flat()
                      .reduce(
                        (s, c) =>
                          s +
                          (c
                            ? Number(
                                c.total_price ||
                                  c.stageSpecs?.price ||
                                  c.mandapSpecs?.price ||
                                  c.backdropSpecs?.price ||
                                  c.entranceGateSpecs?.price ||
                                  45000
                              )
                            : 0),
                        0
                      );
                    if (sum > 0) {
                      setBasePrice(sum);
                    }
                    return next;
                  });
                  setSetup(card);
                }}
                onUpdateCeremonyRequirements={(ceremonyId, updates) => {
                  setEventSchedule((prev) => {
                    const updated = prev.map((ev) =>
                      ev.id === ceremonyId ? { ...ev, ...updates } : ev
                    );
                    saveStoredEventSchedule(updated);
                    return updated;
                  });
                }}
                onContinue={() => {
                  // Synchronize base price from assigned cards
                  const sum = Object.values(multiCeremonyCards)
                    .flat()
                    .reduce(
                      (s, c) =>
                        s +
                        (c
                          ? Number(
                              c.total_price ||
                                c.stageSpecs?.price ||
                                c.mandapSpecs?.price ||
                                c.backdropSpecs?.price ||
                                c.entranceGateSpecs?.price ||
                                45000
                            )
                          : 0),
                      0
                    );
                  if (sum > 0) {
                    setBasePrice(sum);
                  }
                  goNext();
                }}
                onBack={goBack}
                onOpenWhatsAppDispatch={() => setShowDispatchModal(true)}
                clientName={clientName}
                discountAmount={discountAmount}
                sequentialMode={true}
                clientReferences={clientReferences}
                activeEventIndex={currentStep.eventIndex ?? 0}
                totalEvents={eventSchedule.length}
                activeCeremonyId={currentStep.eventId || eventSchedule[currentStep.eventIndex ?? 0]?.id}
                onActiveCeremonyChange={(id) => {
                  const target = dynamicSteps.find((s) => s.type === "event_setup" && s.eventId === id);
                  if (target) {
                    goToStep(target.stepNumber);
                  }
                }}
              />
            )}





            {/* ─── DYNAMIC PRICING & ADD-ONS STEP ─── */}
            {currentStep.type === "pricing" && (
              <div className="space-y-6">
                {/* Snapshot card */}
                <div
                  className="rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4"
                  style={{
                    backgroundColor: TOKENS.surface,
                    borderColor: TOKENS.border,
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-black/5 shadow-2xs">
                        <img
                          src={
                            selectedCatalogItems[0]?.imageUrl ||
                            setup?.imageUrl ||
                            "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80"
                          }
                          alt={selectedCatalogItems[0]?.name || setupTitle}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: TOKENS.rose.light,
                              color: TOKENS.rose.dark,
                            }}
                          >
                            {selectedCatalogItems.length > 0
                              ? `${selectedCatalogItems.length} Setup Designs Selected`
                              : setup?.category || quickCategory || "Decoration"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {selectedCatalogItems.length > 0
                              ? `${eventSchedule.length} Events`
                              : setup?.sku || "CUSTOM"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {selectedCatalogItems.length > 0
                            ? selectedCatalogItems.length === 1
                              ? selectedCatalogItems[0]?.name
                              : `${selectedCatalogItems.length} Selected Ceremony Setups`
                            : setupTitle}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="size-3 text-slate-400" />
                            {selectedCatalogItems.length > 0
                              ? `${selectedCatalogItems.map((c) => c.name).slice(0, 2).join(", ")}${selectedCatalogItems.length > 2 ? ` +${selectedCatalogItems.length - 2} more` : ""}`
                              : setupDimensions}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60">
                      <span className="text-[11px] text-slate-400">Grand Total</span>
                      <span
                        className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight"
                        style={{ color: TOKENS.rose.dark }}
                      >
                        Rs. {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {floralSpec.hasFlowers && (
                    <div className="rounded-xl border border-[rgba(180,150,140,0.25)] bg-white p-3.5 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Flower2 className="size-4 text-[#eb5e7b]" />
                          Floral Design Inclusions
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Included in Base Setup
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="bg-[#faf8f7] border border-stone-200 px-3 py-1 rounded-lg text-slate-700">
                          <span className="text-slate-400">Style: </span>
                          <strong>{floralSpec.flowerStyle}</strong>
                        </div>
                        <div className="bg-[#faf8f7] border border-stone-200 px-3 py-1 rounded-lg text-slate-700">
                          <span className="text-slate-400">Type: </span>
                          <strong>{floralSpec.flowerType}</strong>
                        </div>
                        {floralSpec.colourTheme && (
                          <div className="bg-[#faf8f7] border border-stone-200 px-3 py-1 rounded-lg text-slate-700">
                            <span className="text-slate-400">Palette: </span>
                            <strong>{floralSpec.colourTheme}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Table Container */}
                <div
                  className="rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4"
                  style={{
                    backgroundColor: TOKENS.card,
                    borderColor: TOKENS.border,
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-100">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-900">
                        <Receipt className="size-3.5 text-slate-500" />
                        Setup Items &amp; Paid Rentals
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Base setup rate covers framework &amp; floral styling. Add optional paid rental items below.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddItem("lighting")}
                        className="h-8 text-xs rounded-xl px-3 gap-1.5 bg-[#faf8f7] border-stone-200 hover:bg-stone-100 text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <Lightbulb className="size-3 text-amber-500" />
                        <span>+ Lighting</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddItem("platform")}
                        className="h-8 text-xs rounded-xl px-3 gap-1.5 bg-[#faf8f7] border-stone-200 hover:bg-stone-100 text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <Layers className="size-3 text-slate-600" />
                        <span>+ Platform</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddItem("furniture")}
                        className="h-8 text-xs rounded-xl px-3 gap-1.5 bg-[#faf8f7] border-stone-200 hover:bg-stone-100 text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <Armchair className="size-3 text-slate-600" />
                        <span>+ Furniture</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddItem("custom")}
                        className="h-8 text-xs rounded-xl px-3 gap-1.5 bg-[#faf8f7] border-stone-200 hover:bg-stone-100 text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <Plus className="size-3 text-emerald-600" />
                        <span>+ Custom</span>
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-stone-200/80">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: TOKENS.surface,
                            borderBottom: `1px solid ${TOKENS.border}`,
                          }}
                        >
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-10 text-center">#</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 min-w-[240px]">Item &amp; Scope</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-28 text-center">Category</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-20 text-center">Qty</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-24">Unit</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-32 text-right">Rate (Rs.)</th>
                          <th className="py-3 px-3.5 font-semibold text-slate-600 w-36 text-right">Total (Rs.)</th>
                          <th className="py-3 px-3 font-semibold text-slate-600 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {/* Fallback base setup row if no catalog items selected */}
                        {selectedCatalogItems.length === 0 && (
                          <tr className="bg-white hover:bg-stone-50/60 transition-colors">
                            <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">1</td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-900 text-sm">
                                Base Setup Framework, Floral Styling &amp; Draping
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Framework, floral styling specifications ({floralSpec.flowerStyle}), mounting &amp; teardown
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{
                                  backgroundColor: TOKENS.gold.bg,
                                  color: TOKENS.gold.text,
                                  borderColor: "rgba(230, 153, 25, 0.3)",
                                }}
                              >
                                Base Setup
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center text-slate-600 font-medium">1</td>
                            <td className="py-3 px-3.5 text-slate-600">Setup</td>
                            <td className="py-3 px-3.5 text-right">
                              <Input
                                type="number"
                                min="0"
                                value={basePrice}
                                onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value) || 0))}
                                className="h-8 text-xs text-right font-medium rounded-lg w-28 ml-auto bg-[#faf8f7] border-stone-200"
                              />
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                              Rs. {basePrice.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-300">—</td>
                          </tr>
                        )}

                        {/* Carried-over selected catalog items */}
                        {selectedCatalogItems.map((item, idx) => {
                          const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                          return (
                            <tr key={item.id} className="bg-white hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3.5">
                                <div className="flex items-start gap-3">
                                  {item.imageUrl && (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="size-11 rounded-lg object-cover border border-black/5 shrink-0 mt-0.5"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                        {item.name}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-[#e14b68] border border-rose-200/70">
                                        {item.ceremonyName}
                                        {item.ceremonyDate ? ` · ${item.ceremonyDate}` : ""}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="text-[11px] text-slate-500 line-clamp-1">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-stone-100 text-slate-700">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateCatalogItemQty(item.id, Number(e.target.value))
                                  }
                                  className="h-8 text-xs text-center font-medium rounded-lg w-16 mx-auto bg-[#faf8f7] border-stone-200"
                                />
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="text-xs text-slate-600 font-medium px-1">Setup</span>
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) =>
                                    handleUpdateCatalogItemRate(item.id, Number(e.target.value))
                                  }
                                  className="h-8 text-xs text-right font-medium rounded-lg w-28 ml-auto bg-[#faf8f7] border-stone-200"
                                />
                              </td>
                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                                Rs. {lineTotal.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCatalogItem(item.ceremonyId, item.card.id)}
                                  className="size-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title={`Remove ${item.name} from ${item.ceremonyName}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Paid add-ons */}
                        {items.map((item, idx) => {
                          const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                          const rowNum = (selectedCatalogItems.length || 1) + idx + 1;
                          return (
                            <tr key={item.id} className="bg-white hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">{rowNum}</td>
                              <td className="py-3 px-3.5">
                                <Input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                  className="h-8 text-xs font-semibold text-slate-800 rounded-lg bg-[#faf8f7] border-stone-200 mb-1"
                                />
                                {item.description && (
                                  <span className="text-[11px] text-slate-400 block px-1">
                                    {item.description}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-stone-100 text-slate-700">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                                  className="h-8 text-xs text-center font-medium rounded-lg w-16 mx-auto bg-[#faf8f7] border-stone-200"
                                />
                              </td>
                              <td className="py-3 px-3.5">
                                <Input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                                  className="h-8 text-xs rounded-lg w-20 bg-[#faf8f7] border-stone-200"
                                />
                              </td>
                              <td className="py-3 px-3.5 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                                  className="h-8 text-xs text-right font-medium rounded-lg w-28 ml-auto bg-[#faf8f7] border-stone-200"
                                />
                              </td>
                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                                Rs. {lineTotal.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="size-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove row"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {selectedCatalogItems.length === 0 && items.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-slate-400">
                              No paid add-on rentals added. Flower styling is included in the base setup price. Use buttons above to add extra lighting, platform decks, or furniture rentals.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs" style={{ color: TOKENS.textSecondary }}>
                    <span>Gross Subtotal (Base + Paid Add-ons)</span>
                    <span className="font-bold text-sm tabular-nums" style={{ color: TOKENS.textPrimary }}>
                      Rs. {subtotalBeforeDiscount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}


            {/* ─── Advance Payment: choose bank QR accounts ─── */}
            {currentStep.type === "payment" && (
              <div
                className="w-full overflow-hidden rounded-2xl border shadow-2xs"
                style={{ backgroundColor: TOKENS.card, borderColor: TOKENS.border }}
              >
                <div className="border-b border-rose-100 bg-gradient-to-r from-[#FFF3F1] to-white px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8546F]">
                    Advance payment
                  </p>
                  <h3 className="font-display text-xl font-semibold text-stone-900">
                    Choose the bank for this client
                  </h3>
                </div>
                <div className="space-y-4 p-5">
                  <p className="text-xs leading-relaxed text-stone-600">
                    Pick a <strong>Main</strong> bank &mdash; the client then sees a{" "}
                    <strong>Pay advance</strong> button instead of &ldquo;Respond via WhatsApp&rdquo;.
                    They scan the QR, upload the receipt, and once verified the client is booked
                    automatically and the money is recorded in that bank. Mark others as{" "}
                    <strong>Optional</strong> to offer them as alternatives.
                  </p>

                  {paymentQrs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-xs text-stone-500">
                      No payment QR codes added yet.{" "}
                      <a
                        href="/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#E8546F] underline"
                      >
                        Add them in Settings
                      </a>{" "}
                      and come back.
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {paymentQrs.map((q) => {
                        const role = paymentRoles[q.id];
                        const pick = (next: "main" | "optional") =>
                          setPaymentRoles((prev) => {
                            const copy = { ...prev };
                            if (copy[q.id] === next) {
                              delete copy[q.id];
                              return copy;
                            }
                            if (next === "main") {
                              for (const k of Object.keys(copy)) {
                                if (copy[k] === "main") copy[k] = "optional";
                              }
                            }
                            copy[q.id] = next;
                            return copy;
                          });
                        return (
                          <div
                            key={q.id}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border bg-white p-3 transition",
                              role === "main"
                                ? "border-[#E8546F] ring-1 ring-[#E8546F]/30"
                                : "border-stone-200",
                            )}
                          >
                            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
                              {q.image ? (
                                <img src={q.image} alt="QR" className="size-full object-contain" />
                              ) : (
                                <span className="text-[9px] text-stone-400">No QR</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-stone-900">
                                {q.label || "Bank account"}
                              </p>
                              <p className="truncate text-[11px] uppercase text-stone-500">
                                {q.ownerName || "—"}
                                {q.accountNumber ? ` · ${q.accountNumber}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              {(["main", "optional"] as const).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => pick(r)}
                                  className={cn(
                                    "rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition cursor-pointer",
                                    role === r
                                      ? "border-[#E8546F] bg-[#E8546F] text-white"
                                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50",
                                  )}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {paymentQrs.length > 0 &&
                    (Object.values(paymentRoles).includes("main") ? (
                      <p className="text-xs font-medium text-emerald-700">
                        The client will see a Pay advance button with the Main bank&apos;s QR.
                      </p>
                    ) : (
                      <p className="text-xs text-[#D6415C]">
                        No <strong>Main</strong> account selected &mdash; the first selected bank
                        will be used as Main.
                      </p>
                    ))}
                </div>
              </div>
            )}

        </div>
      </div>

      {/* ─── BOTTOM ACTION BAR ─── */}
      <div className="w-full px-6 sm:px-10 lg:px-14 pb-8 sm:pb-10 pt-6">
        {currentStep.type === "pricing" || currentStep.type === "payment" ? (
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Back to previous event */}
            <button
              type="button"
              onClick={goBack}
              disabled={isSaving}
              className="h-11 px-6 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-stone-50 transition-colors cursor-pointer shrink-0 select-none shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </button>

            {/* Primary Action: Finish Quotation */}
            <button
              type="button"
              onClick={currentStep.type === "pricing" ? goNext : handleFinishQuotation}
              disabled={isSaving}
              className="h-11 px-8 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer hover:opacity-95 active:scale-[0.99] select-none disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#db7f90",
              }}
            >
              {currentStep.type === "pricing" ? (
                <>
                  <span>Continue</span>
                  <ChevronRight className="size-4" />
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Quotation...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Finish Quotation</span>
                </>
              )}
            </button>
          </div>
        ) : currentStep.type === "client" ? (
          <div className="flex items-center gap-3 w-full">
            {/* Back / Exit */}
            <button
              type="button"
              onClick={handleExit}
              className="h-11 px-5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-stone-50 transition-colors cursor-pointer shrink-0 select-none shadow-2xs"
            >
              <ChevronLeft className="size-4" />
              <span>Exit</span>
            </button>

            {/* Continue */}
            <button
              type="button"
              onClick={handleContinueClick}
              className="h-11 flex-1 rounded-xl text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer hover:opacity-95 select-none"
              style={{
                backgroundColor: "#db7f90",
              }}
            >
              <span>Continue</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* WhatsApp Link Dispatch Modal */}
      <ProposalDispatchModal
        open={showDispatchModal}
        onOpenChange={setShowDispatchModal}
        client={{
          id: clientId || `bk-temp-${Math.floor(1000 + Math.random() * 9000)}`,
          client_name: clientName || "Valued Client",
          event_type: functionType || "Grand Wedding Journey",
          event_date: eventDate || "Scheduled Auspicious Dates",
          venue: venueLocation || "Kathmandu Venue",
          stage: "confirmed",
          payment_status: "balance_due",
          payment_note: "50% advance deposit to lock dates",
          total_amount: grandTotal,
          paid_amount: 0,
          balance_due: grandTotal,
          days_to_event: 14,
          needs_attention: false,
          phone: clientPhone || whatsappNumber,
          handler: handler,
          events_count: eventSchedule.length,
          quotation_status: "Sent via WhatsApp",
          proposal_id: quotationNumber,
          ceremonies: eventSchedule.map((ev) => {
            const cards = getCeremonyCardsList(multiCeremonyCards, ev.id);
            const primaryCard = cards[0];
            const combinedPrice = cards.reduce((sum, c) => sum + Number(c.total_price || 45000), 0);
            return {
              id: ev.id,
              name: ev.name,
              date: ev.dateBs || ev.dateAd,
              venue: ev.venueLocation,
              setupId: primaryCard?.id,
              setupName: cards.length > 1 ? cards.map((c) => c.name).join(" + ") : primaryCard?.name,
              setupPrice: combinedPrice || (primaryCard ? Number(primaryCard.total_price || 45000) : 0),
              category: primaryCard?.category,
              setupImage: primaryCard?.imageUrl,
            };
          }),
        }}
      />
    </div>
  );
}

export default QuotationStudioPage;
