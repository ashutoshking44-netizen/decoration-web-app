import "./client.css";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from "react";
import { SearchAutocomplete } from "./components/SearchAutocomplete";
import { ProfileButton } from "./components/ProfileButton";
import { SendRequestPreview } from "./components/SendRequestPreview";
import { FilterBottomSheet } from "./components/FilterBottomSheet";
import { SortBottomSheet } from "./components/SortBottomSheet";
import { FeaturedCarousel } from "./components/FeaturedCarousel";
import { QuotationCompanyPicker } from "./components/QuotationCompanyPicker";
import { PlanEventModal } from "./components/PlanEventModal";
import { ResponsiveModal } from "./components/ResponsiveModal";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { absoluteImage, fetchLiveDecorations, submitEnquiry, type ApiDecoration } from "./api";
import { CacheKeys, peekCache, subscribeCacheInvalidation } from "../lib/cache";
import { CATEGORIES } from "./data/decorations";
import { getDecorationSlug } from "./lib/slug";
import { scrollChildIntoContainerX } from "./lib/scrollWithinContainer";
import { CardImage } from "./components/CardImage";
import { SKELETON_KEYS } from "./lib/loadingSkeleton";
import {
  getStoredQuotation,
  saveStoredQuotation,
  subscribeQuotation,
  type PlannedEvent,
} from "./lib/quotationStorage";

// Catalog types live in ./types (single source of truth); re-exported for existing importers.
import type { DecorationItem, DecorationSpecs } from "./types";
export type { DecorationItem, DecorationSpecs };

interface PlanMeta {
  venue: string;
}

export type { PlannedEvent };

const COS: Record<number, string> = {};

export const getSpecs = (item: DecorationItem): DecorationSpecs => {
  if (item.specs) return item.specs;
  return {
    summary: item.d || "Elegant event decoration setup",
    structure: item.cat || "Standard",
    dimensions: "16 × 12 ft",
    events: ["Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Sangeet"],
    floral: {
      style: "Floral Decor",
      varietyType: "Fresh",
      flowers: [{ name: "Rose", kind: "Fresh", colour: "Pink" }],
      variety: "Fresh",
      color: "Pink",
    },
    basePrice: item.p,
  };
};

// ── Decorations uploaded from the dashboard ────────────────────────────────
const API_CAT: Record<string, string> = {
  "Entrance Gate": "Entrance",
  Backdrop: "Backdrops",
  "Photo Booth & Selfie Station": "Photobooth",
};
const CAT_EMOJI: Record<string, string> = {
  Stage: "🛋️",
  Entrance: "🌸",
  Mandap: "🛕",
  Backdrops: "📸",
  "Welcome Board": "🪧",
  Photobooth: "📷",
};
const FALLBACK_G: [string, string] = ["#8a2b2b", "#f0b9a0"];

/** Stable positive number for a dashboard id (the page keys items by number). */
export const numericId = (sid: string) => {
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) | 0;
  return 1000 + Math.abs(h);
};

export const formatDimensions = (dims: unknown): string => {
  if (!dims) return "";
  if (typeof dims === "string") return dims;
  if (typeof dims === "object" && dims !== null) {
    const d = dims as {
      summary?: unknown;
      width_ft?: unknown;
      height_ft?: unknown;
      width?: unknown;
      height?: unknown;
    };
    if (d.summary) return String(d.summary);
    if (d.width_ft && d.height_ft) return `${d.width_ft} × ${d.height_ft} ft`;
    if (d.width && d.height) return `${d.width} × ${d.height} ft`;
  }
  return "";
};

export const fromApi = (d: ApiDecoration): DecorationItem => {
  const id = numericId(d.id);
  const ownerCompanyId = d.ownerCompanyId || "company-1";
  const ownerCompanyName = d.ownerCompanyName || d.vendor || "Everest Events & Decor";
  COS[id] = ownerCompanyName;
  const formattedDims = formatDimensions(d.dimensions);
  const floralStyleStr =
    typeof d.floral?.style === "string" && d.floral.style
      ? d.floral.style
      : typeof d.flowers === "string" && d.flowers
        ? d.flowers
        : "Floral Decor";

  const summary = [
    d.structure,
    formattedDims && `Dimensions: ${formattedDims}`,
    floralStyleStr && `Floral: ${floralStyleStr}`,
    d.platform && d.platform !== "None" && `Platform: ${d.platform}`,
  ]
    .filter(Boolean)
    .join(". ");
  const cat = API_CAT[d.category] || d.category || "Stage";
  const images =
    Array.isArray(d.images) && d.images.length > 0
      ? d.images.map(absoluteImage).filter(Boolean)
      : [];

  return {
    id,
    sid: d.id,
    ownerCompanyId,
    ownerCompanyName,
    styles: Array.isArray(d.styles) ? d.styles : [],
    colors: Array.isArray(d.colors) ? d.colors : [],
    cat,
    t: d.name || "Untitled Decoration",
    d: d.description || summary,
    p: Number(d.price) || 0,
    g: FALLBACK_G,
    e: CAT_EMOJI[cat] || "✨",
    img: images[0] || "",
    images,
    specs: {
      summary,
      structure: typeof d.structure === "string" && d.structure ? d.structure : cat,
      dimensions: formattedDims,
      events:
        Array.isArray(d.events) && d.events.length > 0
          ? d.events
          : ["Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Sangeet"],
      floral: {
        style: floralStyleStr,
        varietyType: String(d.floral?.varietyType || ""),
        flowers: Array.isArray(d.floral?.flowers)
          ? d.floral.flowers.map((f: any) => ({
              name: String(f.name || "Flower"),
              kind: String(f.kind || f.type || "Fresh"),
              colour: f.colour || f.color ? String(f.colour || f.color) : "",
            }))
          : [],
        variety: "",
        color: "",
      },
      ...(Array.isArray(d.addons) ? { addons: d.addons } : {}),
      basePrice: Number(d.price) || 0,
    },
  };
};

const PRICE_RANGES = [
  { id: "u25", label: "Under Rs. 25,000", min: 0, max: 25000 },
  { id: "25-50", label: "Rs. 25,000 - 50,000", min: 25000, max: 50000 },
  { id: "50-100", label: "Rs. 50,000 - 1,00,000", min: 50000, max: 100000 },
  { id: "o100", label: "Above Rs. 1,00,000", min: 100000, max: Infinity },
];

const fmt = (n: number) => "Rs. " + n.toLocaleString("en-IN");
/** Items without a fixed price (dashboard "Custom Quote") show as a custom quote. */
const fmtItem = (n: number) => (n > 0 ? fmt(n) : "Custom quote");

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(+(y || 0), +(m || 1) - 1, +(d || 1));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

const ICONS: Record<string, string> = {
  All: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/>',
  Stage:
    '<path d="M4 5h16M5 5v14M19 5v14M5 19h14M8 19v-4h8v4M8 15v-2h8v2M5 5c2 2 2 5 1 8M19 5c-2 2-2 5-1 8"/>',
  Entrance: '<path d="M5 20V11a7 7 0 0 1 14 0v9M9 20v-9a3 3 0 0 1 6 0v9M3 20h18"/>',
  Mandap: '<path d="M12 3v2M5 9l7-4 7 4M4 9h16M7 9v10M12 9v10M17 9v10M5 19h14M9 9v2M15 9v2"/>',
  Table: '<path d="M4 9l1.5-3h13L20 9M4 9h16M6 9v10M18 9v10M9 13h6"/>',
  Floral:
    '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="6.5" r="2.7"/><circle cx="17.2" cy="10.3" r="2.7"/><circle cx="15.2" cy="16.4" r="2.7"/><circle cx="8.8" cy="16.4" r="2.7"/><circle cx="6.8" cy="10.3" r="2.7"/>',
  Lighting:
    '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.9 10.6c.7.7 1 1.4 1 2.4h5.8c0-1 .3-1.7 1-2.4A6 6 0 0 0 12 3z"/>',
  Backdrops:
    '<rect x="4.5" y="4" width="15" height="16" rx="1.5"/><rect x="8" y="7.5" width="8" height="9" rx=".8"/>',
  "Welcome Board":
    '<path d="M19 3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H5V5h14v10zM7 19l-2 3M17 19l2 3"/>',
  Photobooth: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/>',
};

export default function ClientHomePage() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("client-portal-active");
      return () => {
        document.body.classList.remove("client-portal-active");
      };
    }
    return undefined;
  }, []);
  const [cat, setCat] = useState<string>("All");
  // Filters + sort for the catalogue
  // Company filter supports multiple selections (empty = all companies)
  const [fCompanies, setFCompanies] = useState<string[]>([]);
  const [fStyle, setFStyle] = useState("");
  const [fColor, setFColor] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  // Which photo of each decoration is showing (shared by the card and its popup)
  const [photoIdx, setPhotoIdx] = useState<Record<number, number>>({});

  // Decorations are loaded directly from Supabase with real-time sync
  // Seed from the in-memory cache so returning to this page renders instantly (no skeleton)
  const cachedCatalog = peekCache<ApiDecoration[]>(CacheKeys.liveDecorations());
  const [catalog, setCatalog] = useState<DecorationItem[]>(() =>
    cachedCatalog ? cachedCatalog.map(fromApi) : [],
  );
  const [catalogLoading, setCatalogLoading] = useState(!cachedCatalog);

  useEffect(() => {
    let cancelled = false;
    // Same array reference = served from cache unchanged → skip the re-render
    let lastList: ApiDecoration[] | null = null;
    const load = (force = false) => {
      fetchLiveDecorations({ force })
        .then((list) => {
          if (!cancelled) {
            if (list !== lastList) {
              lastList = list;
              setCatalog(list.map(fromApi));
            }
            setCatalogLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load decorations from Supabase:", err);
          if (!cancelled) {
            setCatalog([]);
            setCatalogLoading(false);
          }
        });
    };

    void load();
    // Periodic check is served from the cache until it expires, so it only
    // reaches the database once the cached catalog is stale.
    const timer = setInterval(() => load(), 30_000);
    // Re-load when the catalog cache is invalidated (a write here or in another tab)
    const unsubscribeCache = subscribeCacheInvalidation((filter) => {
      if (
        "all" in filter ||
        filter.type === undefined ||
        filter.type === CacheKeys.liveDecorations().type
      ) {
        load();
      }
    });

    // Supabase Real-time synchronization
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel("client-decorations-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "decorations" }, () => {
          // A decoration changed in the database: bypass the cache and refresh it
          void load(true);
        })
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribeCache();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);
  // One shared categories list for chips, mobile swipe order, and catalog view
  const cats = CATEGORIES;
  useEffect(() => {
    if (cat !== "All" && !(cats as readonly string[]).includes(cat)) setCat("All");
  }, [cat]);

  // Phones: filters sit behind one "Filter & sort" button; the Plan button hides while scrolling down
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);

  // Search & Filter state
  // Search text only drives the suggestions dropdown; it does not filter the cards
  const [searchQuery, setSearchQuery] = useState("");
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const cardsAreaRef = useRef<HTMLDivElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<"next" | "prev" | null>(null);
  const swipeTimerRef = useRef<number | null>(null);
  const touchStartDataRef = useRef<{
    x: number;
    y: number;
    time: number;
    invalid: boolean;
  } | null>(null);
  const lastSwipeTimeRef = useRef<number>(0);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  // ── Search suggestions (dropdown under the search box) ──
  const getItemCompany = (item: DecorationItem) =>
    COS[item.id] || item.vendor || "Everest Events & Decor";

  /** Company suggestion picked: show that company's decorations in the grid. */
  const handleSuggestCompany = (company: string) => {
    setFCompanies([company]);
    setCat("All");
    // After the grid re-renders, bring it into view (respects sticky-bar scroll margin)
    requestAnimationFrame(() => {
      (cardsGridRef.current || cardsAreaRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  /** Decoration suggestion picked: open its detail page (same as clicking its card). */
  const handleSuggestDecoration = (item: DecorationItem) => {
    window.location.href = `/decor/${getDecorationSlug(item)}`;
  };

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [showSendRequestPreview, setShowSendRequestPreview] = useState(false);

  useEffect(() => {
    (window as any).__openSendRequestPreview = () => setShowSendRequestPreview(true);
    (window as any).__closeSendRequestPreview = () => setShowSendRequestPreview(false);
    if (
      window.location.search.includes("preview=send") ||
      window.location.hash === "#preview-send"
    ) {
      setShowSendRequestPreview(true);
    }
  }, []);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setFabHidden(y > last && y > 200);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [submitError, setSubmitError] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const submissionKeyRef = useRef("");

  // Contact form fields, mirroring & validation state
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactWhatsapp, setContactWhatsapp] = useState<string>("");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState<boolean>(true);
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [whatsappTouched, setWhatsappTouched] = useState<boolean>(false);

  const isValidPhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (!/^\+?[0-9]+$/.test(trimmed)) return false;
    const digits = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return true;
    if (digits.length === 13 && digits.startsWith("977")) return true;
    return false;
  };

  const getPhoneError = (val: string, label: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return `${label} is required`;
    if (!/^\+?[0-9]+$/.test(trimmed)) return "Digits only (leading + allowed)";
    const digits = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return "";
    if (digits.length === 13 && digits.startsWith("977")) return "";
    return "Enter a valid 10-digit number or +977 format";
  };

  const handlePhoneChange = (val: string) => {
    setContactPhone(val);
    if (whatsappSameAsPhone) {
      setContactWhatsapp(val);
    }
  };

  const handleWhatsappSameChange = (checked: boolean) => {
    setWhatsappSameAsPhone(checked);
    if (checked) {
      setContactWhatsapp(contactPhone);
    }
  };

  const resetContactForm = () => {
    setContactName("");
    setContactPhone("");
    setContactWhatsapp("");
    setWhatsappSameAsPhone(true);
    setPhoneTouched(false);
    setWhatsappTouched(false);
    setSubmitError("");
  };

  // Plan state (synchronized with localStorage via quotationStorage)
  const initialQuotation = useMemo(() => getStoredQuotation(), []);
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>(
    initialQuotation.plannedEvents,
  );
  const [activeEventName, setActiveEventName] = useState<string | null>(
    initialQuotation.activeEventName,
  );
  const [eventQuotes, setEventQuotes] = useState<Record<string, number[]>>(
    initialQuotation.eventQuotes,
  );
  const shoppingEventsRef = useRef<HTMLDivElement>(null);
  const stickyShoppingEventsRef = useRef<HTMLDivElement>(null);

  // Sync state changes to localStorage
  const isInitialQuotationSync = useRef(true);
  useEffect(() => {
    if (isInitialQuotationSync.current) {
      isInitialQuotationSync.current = false;
      return;
    }
    saveStoredQuotation({
      plannedEvents,
      activeEventName,
      eventQuotes,
    });
  }, [plannedEvents, activeEventName, eventQuotes]);

  // Sync state from storage if updated externally
  useEffect(() => {
    return subscribeQuotation((sync) => {
      setPlannedEvents(sync.plannedEvents);
      setActiveEventName(sync.activeEventName);
      setEventQuotes(sync.eventQuotes);
    });
  }, []);

  // Auto-scroll active pill into view inside shopping bar
  useEffect(() => {
    if (!activeEventName) return;
    [shoppingEventsRef.current, stickyShoppingEventsRef.current].forEach((container) => {
      if (!container) return;
      const activeEl = container.querySelector<HTMLElement>(".event-pill.active");
      // Scroll only the pill row horizontally; never move the page vertically
      scrollChildIntoContainerX(container, activeEl, { align: "nearest" });
    });
  }, [activeEventName, plannedEvents]);

  // Expose helper for testing verification
  useEffect(() => {
    (window as any).__setPlannedEvents = (events: PlannedEvent[]) => {
      setPlannedEvents(events);
      if (events.length > 0 && events[0]) {
        setActiveEventName(events[0].name);
        setEventQuotes({
          [events[0].name]: [1],
        });
      } else {
        setActiveEventName(null);
        setEventQuotes({});
      }
    };
    (window as any).__setEventQuotes = (quotes: Record<string, number[]>) => {
      setEventQuotes(quotes);
    };
  }, []);

  const [planMeta, setPlanMeta] = useState<PlanMeta>({
    venue: "",
  });

  // Plan popup (form state lives in <PlanEventModal>)
  const [planOpen, setPlanOpen] = useState(false);
  const planOpenRef = useRef(false);
  planOpenRef.current = planOpen;
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);

  // Contact modal state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // Single-decoration order that skips planning ("Buy now")
  const [buyNowItem, setBuyNowItem] = useState<DecorationItem | null>(null);
  const [, setFullSubmission] = useState<Record<string, unknown> | null>(null);

  // Dialog references
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const [detailItem, setDetailItem] = useState<DecorationItem | null>(null);
  // Review + contact popups: centred dialog on desktop, bottom sheet on phones
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  // Mirrors for global listeners (swipe / keyboard) that must not re-subscribe
  const reviewOpenRef = useRef(false);
  reviewOpenRef.current = reviewOpen;
  const contactOpenRef = useRef(false);
  contactOpenRef.current = contactOpen;
  const contactFormId = useId();
  const contactFormRef = useRef<HTMLFormElement>(null);
  const decorSectionRef = useRef<HTMLElement>(null);

  // Auto-open review modal if navigated with #review or review=1
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.search.includes("review=1") || window.location.hash === "#review")
    ) {
      setTimeout(() => {
        setReviewOpen(true);
      }, 150);
    }
  }, []);

  // Sticky Category Chips bar state & references (Mobile < 768px)
  const [isChipsStuck, setIsChipsStuck] = useState(false);
  const chipsSentinelRef = useRef<HTMLDivElement>(null);
  const chipsBarRef = useRef<HTMLDivElement>(null);
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const chipBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardsGridRef = useRef<HTMLDivElement>(null);

  // Track sticky status via IntersectionObserver on a 1px sentinel directly above the chips bar
  useEffect(() => {
    const sentinel = chipsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Sentinel has crossed above viewport top when it's not intersecting and top <= 2
        const isStuck = !entry.isIntersecting && entry.boundingClientRect.top <= 2;
        setIsChipsStuck(isStuck);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Dynamically update --sticky-h and --chips-h CSS variables so scroll offsets are always exact
  useEffect(() => {
    const updateStickyH = () => {
      if (chipsBarRef.current) {
        const h = chipsBarRef.current.offsetHeight;
        if (h > 0) {
          document.documentElement.style.setProperty("--sticky-h", `${h}px`);
          document.documentElement.style.setProperty("--chips-h", `${h}px`);
        }
      }
    };

    updateStickyH();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && chipsBarRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateStickyH();
      });
      resizeObserver.observe(chipsBarRef.current);
    }

    window.addEventListener("resize", updateStickyH);
    return () => {
      window.removeEventListener("resize", updateStickyH);
      resizeObserver?.disconnect();
    };
  }, [plannedEvents.length]);

  // Auto-scroll active chip into view horizontally whenever category changes on mobile.
  // Only the chips row scrolls; the page itself must never move.
  useEffect(() => {
    if (window.innerWidth <= 768) {
      scrollChildIntoContainerX(chipsScrollRef.current, chipBtnRefs.current[cat], {
        align: "center",
      });
    }
  }, [cat]);

  const catRef = useRef(cat);
  catRef.current = cat;
  const catsRef = useRef(cats);
  catsRef.current = cats;
  const filterSheetOpenRef = useRef(filterSheetOpen || sortSheetOpen);
  filterSheetOpenRef.current = filterSheetOpen || sortSheetOpen;

  const handleSelectCat = (category: string) => {
    // Chip-row scrolling and grid alignment are handled by the effects that run
    // after the new category has rendered, so the page is never scrolled twice.
    setCat(category);
  };

  const handleSelectCatRef = useRef(handleSelectCat);
  handleSelectCatRef.current = handleSelectCat;

  // Align grid position after a USER category change (mobile only).
  // Runs only when `cat` actually changes: not on mount, and not when the chips
  // bar becomes sticky (that used to yank the page back up mid-scroll).
  const prevCatForAlignRef = useRef(cat);
  useLayoutEffect(() => {
    if (prevCatForAlignRef.current === cat) return;
    prevCatForAlignRef.current = cat;
    if (window.innerWidth <= 768) {
      const sentinel = chipsSentinelRef.current;
      const isStuckNow = sentinel ? sentinel.getBoundingClientRect().top <= 2 : false;

      if (isStuckNow) {
        const bar = chipsBarRef.current || document.querySelector<HTMLElement>(".chips-sticky");
        const grid = cardsGridRef.current || document.querySelector<HTMLElement>(".cards-grid");
        const targetEl = grid && grid.style.display !== "none" ? grid : cardsAreaRef.current;
        if (bar && targetEl) {
          const barBottom = bar.getBoundingClientRect().bottom;
          const targetTop = targetEl.getBoundingClientRect().top;
          if (targetTop < barBottom + 8) {
            window.scrollBy({ top: targetTop - (barBottom + 8), behavior: "auto" });
          }
        }
      }
    }
  }, [cat]);

  // Mobile view horizontal swipe gesture to switch categories (max-width: 768px)
  useEffect(() => {
    const cardsEl = cardsAreaRef.current;
    if (!cardsEl) return;

    const onTouchStart = (e: TouchEvent) => {
      // Mobile view only (touch devices, max-width: 768px). Do not change desktop.
      if (window.innerWidth > 768) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when more than one finger is used (pinch zoom)
      if (e.touches.length !== 1) {
        touchStartDataRef.current = null;
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;
      const startX = touch.clientX;
      const startY = touch.clientY;

      // 4. Ignore when touch started within 24px of the left or right screen edge
      // (so iOS/Android system back-swipe still works)
      if (startX < 24 || startX > window.innerWidth - 24) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when search input is focused
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when quotation modal or other overlays/drawers are open
      if (
        filterSheetOpenRef.current ||
        reviewOpenRef.current ||
        planOpenRef.current ||
        Boolean(detailDialogRef.current?.open) ||
        contactOpenRef.current
      ) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when touch started inside chips row, top carousel, quotation modal,
      // filters/sort panel, or search input
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          '.chips, .chips-sticky, .chips-sticky-wrapper, #chips, .strip-sec, .strip-wrap, .strip-track, .co-track, .co-row, .filter-sheet, .mobile-filter-sheet, .filter-sheet-overlay, .mobile-filter-bar, dialog, [role="dialog"], input, textarea, select',
        )
      ) {
        touchStartDataRef.current = null;
        return;
      }

      // 2. Record the start x, y and time on touchstart
      touchStartDataRef.current = {
        x: startX,
        y: startY,
        time: Date.now(),
        invalid: false,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartDataRef.current) return;
      // Invalidate if user uses a second finger (pinch zoom)
      if (e.touches.length > 1) {
        touchStartDataRef.current.invalid = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const startData = touchStartDataRef.current;
      touchStartDataRef.current = null;

      if (!startData || startData.invalid) return;
      if (e.changedTouches.length === 0) return;

      const touch = e.changedTouches[0];
      if (!touch) return;
      const endX = touch.clientX;
      const endY = touch.clientY;
      const dx = endX - startData.x;
      const dy = endY - startData.y;
      const elapsed = Date.now() - startData.time;

      // 2. Count it as a swipe only if:
      // - Math.abs(dx) >= 60px
      // - Math.abs(dx) > Math.abs(dy) * 1.5   (clearly horizontal)
      // - elapsed time < 600ms
      // Otherwise ignore it, so normal vertical scrolling is never affected.
      if (elapsed >= 600 || Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) {
        return;
      }

      // 5. On a valid swipe:
      // find the active category index; next = index + 1 (left swipe),
      // previous = index - 1 (right swipe)
      const currentCats = catsRef.current;
      const currentCat = catRef.current;
      const currentIndex = (currentCats as readonly string[]).indexOf(currentCat);
      if (currentIndex === -1) return;

      let nextIndex = -1;
      let dir: "next" | "prev" | null = null;

      if (dx < 0) {
        // Swipe LEFT = next category
        nextIndex = currentIndex + 1;
        dir = "next";
      } else {
        // Swipe RIGHT = previous category
        nextIndex = currentIndex - 1;
        dir = "prev";
      }

      // If there is no next/previous (first or last), do nothing
      if (nextIndex < 0 || nextIndex >= currentCats.length || !dir) {
        return;
      }

      const nextCat = currentCats[nextIndex];
      if (!nextCat) return;

      // 9. Optional: a very small haptic tick on supported devices
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(8);
        }
      } catch {
        /* ignore */
      }

      // 7. Animation (light): short slide from direction of swipe (180ms)
      setSwipeDirection(dir);
      lastSwipeTimeRef.current = Date.now();
      if (swipeTimerRef.current) window.clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = window.setTimeout(() => {
        setSwipeDirection(null);
      }, 220);

      // 5. Call the SAME function the chip tap uses (one shared setCategory)
      handleSelectCatRef.current(nextCat);
    };

    // 1. Passive listeners attached to cards container only
    cardsEl.addEventListener("touchstart", onTouchStart, { passive: true });
    cardsEl.addEventListener("touchmove", onTouchMove, { passive: true });
    cardsEl.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cardsEl.removeEventListener("touchstart", onTouchStart);
      cardsEl.removeEventListener("touchmove", onTouchMove);
      cardsEl.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Keyboard shortcut: '/' focuses search input on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (
        planOpenRef.current ||
        detailDialogRef.current?.open ||
        reviewOpenRef.current ||
        contactOpenRef.current ||
        filterSheetOpen ||
        sortSheetOpen
      ) {
        return;
      }

      if (desktopSearchInputRef.current && window.innerWidth >= 768) {
        e.preventDefault();
        desktopSearchInputRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filterSheetOpen, sortSheetOpen]);

  const todayStr = new Date().toISOString().split("T")[0];

  const companies = Object.values(
    catalog.reduce<Record<string, { name: string; items: DecorationItem[] }>>((acc, item) => {
      const name = COS[item.id] || "Everest Events & Decor";
      (acc[name] ||= { name, items: [] }).items.push(item);
      return acc;
    }, {}),
  );
  const companyCount = companies.length;

  const companyOptions: string[] = [
    ...new Set(catalog.map((i) => COS[i.id] || i.vendor).filter((c): c is string => Boolean(c))),
  ].sort();
  const styleOptions = [...new Set(catalog.flatMap((i) => i.styles ?? []))].sort();
  const inPriceRange = (p: number) => {
    const r = PRICE_RANGES.find((x) => x.id === fPrice);
    return !r || (p >= r.min && p < r.max);
  };
  const filtersActive = Boolean(fCompanies.length > 0 || fStyle || fPrice);
  const mobileFilterCount = fCompanies.length + (fPrice ? 1 : 0);
  const filteredItems = catalog
    .filter(
      (i) =>
        (cat === "All" || i.cat === cat) &&
        (fCompanies.length === 0 || fCompanies.some((c) => COS[i.id] === c || i.vendor === c)) &&
        (!fStyle || (i.styles ?? []).includes(fStyle)) &&
        (!fColor || (i.colors ?? []).includes(fColor)) &&
        inPriceRange(i.p),
    )
    .sort((a, b) =>
      sortBy === "low"
        ? a.p - b.p
        : sortBy === "high"
          ? b.p - a.p
          : sortBy === "name"
            ? a.t.localeCompare(b.t)
            : 0,
    );

  // Calculate totals
  const totalItemCount = Object.values(eventQuotes).reduce((sum, items) => sum + items.length, 0);

  const grandTotal = Object.entries(eventQuotes).reduce((sum, [, itemIds]) => {
    const subtotal = itemIds.reduce((itemSum, id) => {
      const itm = catalog.find((i) => i.id === id);
      return itemSum + (itm ? itm.p : 0);
    }, 0);
    return sum + subtotal;
  }, 0);

  // Derive company groups live from current quotation items: [{id, name, count}]
  const quotationCompanyGroups = useMemo(() => {
    const allItemIds = Object.values(eventQuotes).flat();
    const map: Record<string, { id: string; name: string; count: number }> = {};
    for (const id of allItemIds) {
      const itm = catalog.find((i) => i.id === id);
      if (!itm) continue;
      const coName = COS[itm.id] || itm.vendor || "Everest Events & Decor";
      if (!map[coName]) {
        map[coName] = { id: coName, name: coName, count: 0 };
      }
      map[coName].count += 1;
    }
    return Object.values(map);
  }, [eventQuotes, catalog]);

  // Track selected companies (pre-ticked by default)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const userUncheckedCompaniesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = quotationCompanyGroups.map((g) => g.id);
    setSelectedCompanies((prev) => {
      // Keep selected ones that still exist in current groups
      const retained = prev.filter((id) => currentIds.includes(id));
      // For any company in currentIds that hasn't been explicitly unchecked by user, pre-tick it
      const newToSelect = currentIds.filter(
        (id) => !prev.includes(id) && !userUncheckedCompaniesRef.current.has(id),
      );
      return [...retained, ...newToSelect];
    });
  }, [quotationCompanyGroups]);

  const handleQuotationCompanyToggle = (coId: string) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(coId)) {
        userUncheckedCompaniesRef.current.add(coId);
        return prev.filter((id) => id !== coId);
      } else {
        userUncheckedCompaniesRef.current.delete(coId);
        return [...prev, coId];
      }
    });
  };

  const selectedCompanyCount = selectedCompanies.length;
  const quotationSendBtnLabel =
    selectedCompanyCount === 0
      ? "Select a company"
      : selectedCompanyCount === 1
        ? "Send request"
        : `Send to ${selectedCompanyCount} companies`;

  // Navigation index in planned events
  const currentEventIndex = plannedEvents.findIndex((e) => e.name === activeEventName);
  const hasNextEvent = currentEventIndex >= 0 && currentEventIndex < plannedEvents.length - 1;
  const nextEvent = hasNextEvent ? plannedEvents[currentEventIndex + 1] : null;

  const detailSpecs = detailItem ? getSpecs(detailItem) : null;

  // Card detail popup
  const openDetail = (item: DecorationItem) => {
    setDetailItem(item);
  };

  const closeDetail = () => {
    setDetailItem(null);
  };

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    if (detailItem) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          /* already open */
        }
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [detailItem]);

  const photoCount = (item: DecorationItem) => item.images?.length ?? 0;
  const photoOf = (item: DecorationItem) =>
    item.images?.[Math.min(photoIdx[item.id] ?? 0, Math.max(0, photoCount(item) - 1))] ?? item.img;
  const stepPhoto = (item: DecorationItem, dir: number) => {
    const n = photoCount(item);
    if (n < 2) return;
    setPhotoIdx((p) => ({ ...p, [item.id]: ((p[item.id] ?? 0) + dir + n) % n }));
  };

  // Toggle card item for active event
  const handleToggleCardItem = (id: number) => {
    if (plannedEvents.length === 0) {
      // Not planned yet: remember item, open plan popup
      setPendingItemId(id);
      openPlanModal();
      return;
    }

    if (!activeEventName) return;

    setEventQuotes((prev) => {
      const currentList = prev[activeEventName] || [];
      const isAlreadyAdded = currentList.includes(id);
      const updatedList = isAlreadyAdded
        ? currentList.filter((itemId) => itemId !== id)
        : [...currentList, id];
      return { ...prev, [activeEventName]: updatedList };
    });
  };

  // Check if item is in quote for active event
  const isItemInActiveEvent = (id: number) => {
    if (!activeEventName) return false;
    return (eventQuotes[activeEventName] || []).includes(id);
  };

  // Modal open/close helpers
  // The popup prefills itself from `plannedEvents` each time it opens
  const openPlanModal = () => {
    setPlanOpen(true);
  };

  const closePlanModal = () => {
    setPlanOpen(false);
    setPendingItemId(null);
  };

  const openReviewModal = () => {
    setReviewOpen(true);
  };

  const closeReviewModal = () => {
    setReviewOpen(false);
  };

  const clearAllQuotes = () => {
    setEventQuotes({});
    setReviewOpen(false);
  };

  // Cancel button on the bottom bar: first tap asks, second tap clears everything
  const [confirmCancelBar, setConfirmCancelBar] = useState(false);
  useEffect(() => {
    if (!confirmCancelBar) return;
    const t = window.setTimeout(() => setConfirmCancelBar(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmCancelBar]);
  useEffect(() => {
    if (totalItemCount === 0) setConfirmCancelBar(false);
  }, [totalItemCount]);
  const handleCancelBar = () => {
    if (!confirmCancelBar) {
      setConfirmCancelBar(true);
      return;
    }
    setConfirmCancelBar(false);
    clearAllQuotes();
  };

  // Cancel the whole plan: first tap asks, second tap clears events + picks and starts over
  const [confirmCancelPlan, setConfirmCancelPlan] = useState(false);
  useEffect(() => {
    if (!confirmCancelPlan) return;
    const t = window.setTimeout(() => setConfirmCancelPlan(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmCancelPlan]);
  const handleCancelPlan = () => {
    if (!confirmCancelPlan) {
      setConfirmCancelPlan(true);
      return;
    }
    setConfirmCancelPlan(false);
    setPlannedEvents([]);
    setActiveEventName(null);
    setPlanMeta({ venue: "" });
    setEventQuotes({});
    setPendingItemId(null);
    setReviewOpen(false);
  };

  // Find first event AFTER currently active event with 0 items, falling back to any empty event if none after
  const getNextEmptyEvent = (): PlannedEvent | null => {
    if (plannedEvents.length === 0) return null;
    const activeIdx = plannedEvents.findIndex((ev) => ev.name === activeEventName);

    // Rule 3: If active event is the last one, button stays "Send request"
    if (activeIdx >= 0 && activeIdx === plannedEvents.length - 1) {
      return null;
    }

    // 1. Look for first empty event AFTER currently active event
    if (activeIdx >= 0) {
      const afterEvents = plannedEvents.slice(activeIdx + 1);
      const nextEmptyAfter = afterEvents.find((ev) => (eventQuotes[ev.name] || []).length === 0);
      if (nextEmptyAfter) return nextEmptyAfter;
    }

    // Fall back to any empty event if none comes after
    const anyEmpty = plannedEvents.find((ev) => (eventQuotes[ev.name] || []).length === 0);
    return anyEmpty || null;
  };

  const nextEmptyReviewEvent = getNextEmptyEvent();

  const handleNextEmptyEventClick = (eventName: string) => {
    closeReviewModal();
    setActiveEventName(eventName);
    decorSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSkipAndSend = (eventName: string) => {
    const confirmed = window.confirm(`${eventName} has no decorations. Send anyway?`);
    if (confirmed) {
      openContactModal();
    }
  };

  const openBuyNow = (item: DecorationItem) => {
    detailDialogRef.current?.close();
    setBuyNowItem(item);
    resetContactForm();
    setIsSubmitted(false);
    setContactOpen(true);
  };

  const openContactModal = () => {
    setReviewOpen(false);
    setBuyNowItem(null);
    resetContactForm();
    setIsSubmitted(false);
    setContactOpen(true);
  };

  const closeContactModal = () => {
    setContactOpen(false);
    setBuyNowItem(null);
    resetContactForm();
    setIsSubmitted(false);
    setSubmitError("");
  };

  // Backdrop tap / Escape / pull-down: same as the old native dialog close
  // (keeps typed details, clears the buy-now item)
  const dismissContactModal = () => {
    setContactOpen(false);
    setBuyNowItem(null);
  };

  // Plan popup finished ("Start shopping →"): events arrive sorted, earliest first
  const handlePlanComplete = (sorted: PlannedEvent[]) => {
    setPlannedEvents(sorted);
    if (sorted[0]) setPlanMeta({ venue: sorted[0].venue });

    // Keep active event or switch to first
    const targetEvent =
      activeEventName && sorted.some((e) => e.name === activeEventName)
        ? activeEventName
        : sorted[0]?.name || "";
    setActiveEventName(targetEvent);

    // If a decoration was pending when clicked before planning, add it to first event
    if (pendingItemId !== null && sorted[0]) {
      const firstEventName = sorted[0].name;
      setEventQuotes((prev) => {
        const cur = prev[firstEventName] || [];
        return {
          ...prev,
          [firstEventName]: cur.includes(pendingItemId) ? cur : [...cur, pendingItemId],
        };
      });
      setPendingItemId(null);
    }

    setPlanOpen(false);
  };

  // Contact form submission → sent to the dashboard as an enquiry / quotation request
  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sendingRef.current) return; // ignore repeat clicks while a request is in flight
    setPhoneTouched(true);
    setWhatsappTouched(true);

    const effectiveWa = whatsappSameAsPhone ? contactPhone : contactWhatsapp;
    if (!contactName.trim() || !isValidPhone(contactPhone) || !isValidPhone(effectiveWa)) {
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = contactName.trim() || (formData.get("name") as string) || "";
    const phone = contactPhone.trim() || (formData.get("phone") as string) || "";
    const whatsappNumber = (
      whatsappSameAsPhone
        ? phone
        : contactWhatsapp.trim() || (formData.get("whatsapp") as string) || phone
    ).trim();
    const message = (formData.get("message") as string) || "";
    const toLine = (id: number) => {
      const item = catalog.find((i) => i.id === id);
      const isSecond =
        item?.id === 9101 ||
        item?.id === 9102 ||
        item?.sid?.startsWith("dummy-royal-orchid") ||
        item?.ownerCompanyId === "company-2" ||
        item?.vendor === "Royal Orchid Events";
      const ownerCompanyId = item?.ownerCompanyId || (isSecond ? "company-2" : "company-1");
      const ownerCompanyName =
        item?.ownerCompanyName ||
        (isSecond ? item?.vendor || "Royal Orchid Events" : COS[id] || item?.vendor || "Company 1");

      const specs = item ? getSpecs(item) : null;
      const dimensions = specs?.dimensions || formatDimensions(item?.dimensions) || "";
      const style = item?.styles?.length ? item.styles.join(", ") : specs?.floral?.style || "";
      const colours = item?.colors?.length ? item.colors.join(", ") : specs?.floral?.color || "";
      const structure =
        specs?.structure && specs.structure !== "Standard" ? specs.structure : item?.cat || "";
      const platform = specs?.platform
        ? [specs.platform.name, specs.platform.size, specs.platform.color]
            .filter(Boolean)
            .join(" · ")
        : "";
      const lighting = specs?.lighting
        ? `${specs.lighting.name}${specs.lighting.qty ? ` (${specs.lighting.qty})` : ""}`
        : "";
      const flowers = specs?.floral?.style || "";

      const inclusions: string[] = [];
      if (Array.isArray(item?.inclusions) && item.inclusions.length > 0) {
        inclusions.push(...item.inclusions);
      } else {
        if (structure && structure !== "Standard") inclusions.push(`Structure: ${structure}`);
        if (flowers) inclusions.push(`Floral: ${flowers}`);
        if (platform) inclusions.push(`Platform: ${platform}`);
        if (lighting) inclusions.push(`Lighting: ${lighting}`);
        if (specs?.addons?.length) {
          specs.addons.forEach((a: any) =>
            inclusions.push(`${a.title}${a.sub ? ` (${a.sub})` : ""}`),
          );
        }
      }

      const rawGallery = [item?.img, ...(Array.isArray(item?.images) ? item.images : [])].filter(
        (u): u is string => Boolean(u),
      );
      const gallery = [...new Set(rawGallery)];

      return {
        id: item?.sid ?? String(id),
        decorationId: item?.sid ?? String(id),
        title: item?.t ?? "",
        name: item?.t ?? "",
        category: item?.cat ?? "",
        image: item?.img ?? "",
        photo: item?.img ?? "",
        gallery: gallery.length > 0 ? gallery : undefined,
        price: item?.p ?? 0,
        listedPrice: item?.p ?? 0,
        priceUnit: item?.priceUnit || (item as any)?.price_unit || "per setup",
        description: item?.d ?? specs?.summary ?? "",
        inclusions: inclusions.length > 0 ? inclusions : undefined,
        style: style || undefined,
        colours: colours || undefined,
        dimensions: dimensions || undefined,
        size: dimensions || undefined,
        structure: structure || undefined,
        platform: platform || undefined,
        lighting: lighting || undefined,
        flowers: flowers || undefined,
        vendor: ownerCompanyName,
        companyName: ownerCompanyName,
        ownerCompanyId,
        ownerCompanyName,
      };
    };

    const payload: Parameters<typeof submitEnquiry>[0] = buyNowItem
      ? {
          type: "direct-order",
          name,
          phone,
          whatsappNumber,
          whatsappSameAsPhone,
          message,
          venue: (formData.get("venue") as string) || "",
          grandTotal: buyNowItem.p,
          // A direct order goes to the company that owns this decoration.
          companies: [
            toLine(buyNowItem.id).ownerCompanyName || buyNowItem.vendor || "Everest Events & Decor",
          ],
          events: [
            {
              name: "Direct order",
              date: (formData.get("date") as string) || "",
              venue: (formData.get("venue") as string) || "",
              decorations: [toLine(buyNowItem.id)],
              subtotal: buyNowItem.p,
            },
          ],
        }
      : {
          type: "quotation-request",
          name,
          phone,
          whatsappNumber,
          whatsappSameAsPhone,
          message,
          venue: planMeta.venue,
          grandTotal,
          companies: selectedCompanies.length > 0 ? selectedCompanies : undefined,
          events: plannedEvents.map((ev) => {
            const decorations = (eventQuotes[ev.name] || []).map(toLine);
            return {
              name: ev.name,
              date: ev.date,
              venue: ev.venue,
              decorations,
              subtotal: decorations.reduce((sum, d) => sum + d.price, 0),
            };
          }),
        };

    setSubmitError("");
    // One key per request: a retry of the same request reuses its ids, so it can never create duplicates.
    if (!submissionKeyRef.current) {
      submissionKeyRef.current = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    payload.submissionKey = submissionKeyRef.current;
    sendingRef.current = true;
    setIsSending(true);
    try {
      await submitEnquiry(payload);
      submissionKeyRef.current = "";
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? `${err.message}. Please try again, or contact us directly.`
          : "Could not send your request. Please try again.",
      );
      return;
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
    setFullSubmission(payload as unknown as Record<string, unknown>);
    contactFormRef.current?.reset();
    resetContactForm();
    // The request is sent: clear the plan so the next visit starts from scratch
    setPlannedEvents([]);
    setActiveEventName(null);
    setPlanMeta({ venue: "" });
    setEventQuotes({});
    setPendingItemId(null);
    setIsSubmitted(true);
  };

  // Backdrop click handler with mousedown guard to prevent accidental closure on drag
  const mouseDownOnBackdropRef = useRef(false);

  const handleDialogMouseDown = (
    e: React.MouseEvent<HTMLDialogElement>,
    dialogRef: React.RefObject<HTMLDialogElement | null>,
  ) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isOutside =
        e.clientY < rect.top ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width;
      mouseDownOnBackdropRef.current = isOutside;
    } else {
      mouseDownOnBackdropRef.current = false;
    }
  };

  const handleBackdropClick = (
    e: React.MouseEvent<HTMLDialogElement>,
    dialogRef: React.RefObject<HTMLDialogElement | null>,
  ) => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;
    if (!mouseDownOnBackdropRef.current) return;
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isOutside =
        e.clientY < rect.top ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width;
      if (isOutside) {
        dialog.close();
      }
    }
  };

  // Single decoration card (used in grid)
  const renderCard = (item: DecorationItem) => {
    const slug = getDecorationSlug(item);
    const decorUrl = `/decor/${slug}`;

    const handleCardClick = () => {
      if (Date.now() - lastSwipeTimeRef.current < 350) return;
      window.location.href = decorUrl;
    };

    return (
      <article
        key={item.id}
        className="post clickable"
        onClick={handleCardClick}
        tabIndex={0}
        role="button"
        aria-label={`View details for ${item.t}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        {/* Image area: skeleton while loading, photo once loaded, clean fallback on error.
            Badges appear only on top of a successfully loaded photo. */}
        <CardImage
          src={item.images?.[0] ?? item.img}
          alt={item.t}
          vendorName={COS[item.id] || item.vendor || "Everest Events & Decor"}
          category={item.cat}
          showCategoryTag={cat === "All"}
        />
        <div className="pb">
          <h4 className="serif post-title">
            <a
              href={decorUrl}
              className="post-title-link"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                e.stopPropagation();
                window.location.href = decorUrl;
              }}
            >
              {item.t}
            </a>
          </h4>
          <div className="post-price-line">
            <b className="price">
              {fmtItem(item.p)}
              {item.u || ""}
            </b>
          </div>
        </div>
      </article>
    );
  };

  // Review popup buttons (dialog footer on desktop, pinned sheet footer on phones)
  const reviewActions = (
    <>
      <button
        type="button"
        className="pill review-clear-btn"
        onClick={clearAllQuotes}
        disabled={totalItemCount === 0}
      >
        Clear all
      </button>
      <button type="button" className="pill review-close-btn" onClick={closeReviewModal}>
        Close
      </button>
      {nextEmptyReviewEvent ? (
        <div
          className="review-send-btn-wrap"
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <button
            type="button"
            className="pill pri review-primary-btn"
            onClick={() => handleNextEmptyEventClick(nextEmptyReviewEvent.name)}
            disabled={totalItemCount === 0}
          >
            Next: {nextEmptyReviewEvent.name} →
          </button>
          <button
            type="button"
            className="review-skip-link"
            onClick={() => handleSkipAndSend(nextEmptyReviewEvent.name)}
            style={{
              background: "none",
              border: 0,
              padding: "2px 0",
              color: "var(--mute)",
              fontSize: "11px",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Skip {nextEmptyReviewEvent.name} and send
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="pill pri review-primary-btn"
          onClick={openContactModal}
          disabled={totalItemCount === 0 || selectedCompanyCount === 0}
        >
          {quotationSendBtnLabel}
        </button>
      )}
    </>
  );

  // Contact popup buttons; submit targets the form by id so it also works from the sheet footer
  const contactSubmitDisabled =
    isSending ||
    !contactName.trim() ||
    !isValidPhone(contactPhone) ||
    !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp);
  const contactActions = isSubmitted ? (
    <button type="button" className="pill pri" onClick={closeContactModal}>
      Close
    </button>
  ) : (
    <>
      <button type="button" className="pill" onClick={closeContactModal}>
        Cancel
      </button>
      <button
        type="submit"
        form={contactFormId}
        className="pill pri"
        disabled={contactSubmitDisabled}
      >
        {isSending ? "Sending…" : buyNowItem ? "Place order" : "Send request"}
      </button>
    </>
  );

  return (
    <div className="client-portal-root">
      {/* Mobile Header (screens < 768px only) */}
      <header className="mobile-header">
        <button
          type="button"
          className="mobile-back-btn"
          aria-label="Back"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <SearchAutocomplete
          ref={mobileSearchInputRef}
          catalog={catalog}
          loading={catalogLoading}
          getCompany={getItemCompany}
          value={searchQuery}
          onChange={handleSearchChange}
          onSelectCompany={handleSuggestCompany}
          onSelectDecoration={handleSuggestDecoration}
          formatPrice={fmtItem}
          placeholder="Search decorations"
          ariaLabel="Search decorations or companies"
          inputClassName="mobile-header-search"
        />

        {/* Profile (opens the companies page until a real login exists) */}
        <ProfileButton variant="icon" className="mobile-profile-btn" />
      </header>
      {/* 1. Desktop sticky shopping bar (shown after planning on >= 769px) */}
      {plannedEvents.length > 0 && (
        <aside className="shopping-bar desktop-shopping-bar">
          <div className="shopping-bar-in">
            <span className="shopping-label">Shopping for</span>
            <div className="shopping-events" ref={shoppingEventsRef}>
              {plannedEvents.map((ev, idx) => {
                const isActive = ev.name === activeEventName;
                const count = (eventQuotes[ev.name] || []).length;
                return (
                  <button
                    key={ev.name}
                    type="button"
                    className={`event-pill${isActive ? " active" : ""}`}
                    onClick={() => {
                      if (isActive) {
                        openPlanModal();
                      } else {
                        setActiveEventName(ev.name);
                      }
                    }}
                  >
                    <span className="num-badge">{idx + 1}</span>
                    <span style={{ fontWeight: isActive ? 600 : 500 }}>{ev.name}</span>
                    <span style={{ opacity: 0.65 }}>·</span>
                    <span style={{ fontSize: "11px" }}>{formatDate(ev.date)}</span>
                    <span style={{ opacity: 0.65 }}>·</span>
                    <span className="count-badge">
                      {count} item{count === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="pill edit-plan-btn"
              onClick={openPlanModal}
              aria-label="Edit plan"
              title="Edit plan"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              <span className="edit-plan-text">Edit plan</span>
            </button>
            <button
              type="button"
              className={`pill cancel-plan${confirmCancelPlan ? " confirm" : ""}`}
              onClick={handleCancelPlan}
              aria-label="Cancel plan and remove all selected items"
              title="Cancel plan"
            >
              {confirmCancelPlan ? (
                <span>Sure?</span>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  <span className="edit-plan-text">Cancel plan</span>
                </>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Page header */}
      <header className="page-hero">
        {/* Desktop profile button, top-right corner (phones use the one in the header) */}
        <ProfileButton variant="pill" className="desktop-profile-btn" />
        <div className="page-hero-in">
          <h1 className="serif page-hero-title">
            Event <em>Decoration</em>
          </h1>
          <div className="page-hero-stats">
            <div>
              {catalogLoading ? (
                <div className="skeleton-stat-num skeleton-pulse" />
              ) : (
                <b className="serif">{companyCount}</b>
              )}
              <span>
                {catalogLoading ? "Checking..." : companyCount === 1 ? "Company" : "Companies"}
              </span>
            </div>
            <div>
              {catalogLoading ? (
                <div className="skeleton-stat-num skeleton-pulse" />
              ) : (
                <b className="serif">{catalog.length}</b>
              )}
              <span>
                {catalogLoading
                  ? "Loading..."
                  : catalog.length === 1
                    ? "Decoration"
                    : "Decorations"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Featured decorations carousel (smooth 60/120fps GPU loop & responsive drag) */}
      <FeaturedCarousel
        catalog={catalog}
        loading={catalogLoading}
        getVendorName={(item) =>
          COS[item.id] || item.ownerCompanyName || item.vendor || "Everest Events & Decor"
        }
      />

      {/* 2. Decorations Section */}
      <section className="sec" ref={decorSectionRef}>
        <div className="in">
          <div className="catalog-head">
            <div>
              <h2 className="serif catalog-title">
                Find your perfect <em>decor</em>
              </h2>
              <p className="catalog-sub">
                Stage, entrance, mandap, backdrops and more. Add what you love to your quotation.
              </p>
            </div>
            <span className="catalog-count" id="cnt">
              {filteredItems.length} decoration
              {filteredItems.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* 1px sentinel element for IntersectionObserver to detect when chips bar is stuck */}
          <div ref={chipsSentinelRef} className="chips-sentinel" aria-hidden="true" />

          {/* Sticky wrapper for plan pill + chips + filters/sort on mobile (< 768px) */}
          <div
            ref={chipsBarRef}
            className={`chips-sticky-wrapper chips-sticky${isChipsStuck ? " is-stuck" : ""}`}
          >
            {/* Row 1: Plan pill row (mobile only when event planned) */}
            {plannedEvents.length > 0 && (
              <div className="sticky-plan-row">
                <div className="shopping-events" ref={stickyShoppingEventsRef}>
                  {plannedEvents.map((ev, idx) => {
                    const isActive = ev.name === activeEventName;
                    const count = (eventQuotes[ev.name] || []).length;
                    return (
                      <button
                        key={ev.name}
                        type="button"
                        className={`event-pill${isActive ? " active" : ""}`}
                        onClick={() => {
                          if (isActive) {
                            openPlanModal();
                          } else {
                            setActiveEventName(ev.name);
                          }
                        }}
                      >
                        <span className="num-badge">{idx + 1}</span>
                        <span style={{ fontWeight: isActive ? 600 : 500 }}>{ev.name}</span>
                        <span style={{ opacity: 0.65 }}>·</span>
                        <span style={{ fontSize: "11px" }}>{formatDate(ev.date)}</span>
                        <span style={{ opacity: 0.65 }}>·</span>
                        <span className="count-badge">
                          {count} item{count === 1 ? "" : "s"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="pill edit-plan-btn"
                  onClick={openPlanModal}
                  aria-label="Edit plan"
                  title="Edit plan"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  <span className="edit-plan-text">Edit plan</span>
                </button>
                <button
                  type="button"
                  className={`pill cancel-plan${confirmCancelPlan ? " confirm" : ""}`}
                  onClick={handleCancelPlan}
                  aria-label="Cancel plan and remove all selected items"
                  title="Cancel plan"
                >
                  {confirmCancelPlan ? (
                    <span>Sure?</span>
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                      <span className="edit-plan-text">Cancel plan</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Row 2: Category chips */}
            <div className="chips" id="chips" ref={chipsScrollRef}>
              {cats.map((c) => (
                <button
                  key={c}
                  ref={(el) => {
                    chipBtnRefs.current[c] = el;
                  }}
                  className={`cat${c === cat ? " on" : ""}`}
                  onClick={() => handleSelectCat(c)}
                >
                  <span
                    className="ic"
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[c] ?? ICONS["Stage"]}</svg>`,
                    }}
                  />
                  {c}
                </button>
              ))}
            </div>

            {/* Mobile Filter & Sort action buttons (shown < 768px) */}
            <div className="mobile-filter-bar">
              <button
                type="button"
                className={`pill mobile-filter-btn${mobileFilterCount > 0 ? " on" : ""}`}
                onClick={() => {
                  setSortSheetOpen(false);
                  setFilterSheetOpen(true);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span>Filters{mobileFilterCount > 0 ? ` (${mobileFilterCount})` : ""}</span>
              </button>
              <button
                type="button"
                className={`pill mobile-filter-btn${sortBy !== "featured" || Boolean(fStyle) ? " on" : ""}`}
                onClick={() => {
                  setFilterSheetOpen(false);
                  setSortSheetOpen(true);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="m21 8-4-4-4 4" />
                  <path d="M17 4v16" />
                </svg>
                <span>
                  Sort
                  {sortBy !== "featured"
                    ? ` · ${sortBy === "low" ? "Low" : sortBy === "high" ? "High" : "A-Z"}`
                    : fStyle
                      ? ` · ${fStyle}`
                      : ""}
                </span>
              </button>
            </div>
          </div>

          {/* Desktop Filter controls (hidden < 768px) */}
          <div className="desktop-filters-wrap">
            <button
              type="button"
              className="filters-toggle"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <span>
                Filter &amp; sort
                {(fCompanies.length > 0 ? 1 : 0) +
                  (fStyle ? 1 : 0) +
                  (fColor ? 1 : 0) +
                  (fPrice ? 1 : 0) +
                  (sortBy !== "featured" ? 1 : 0) >
                  0 &&
                  ` · ${(fCompanies.length > 0 ? 1 : 0) + (fStyle ? 1 : 0) + (fPrice ? 1 : 0) + (sortBy !== "featured" ? 1 : 0)}`}
              </span>
              <span aria-hidden="true">{filtersOpen ? "▴" : "▾"}</span>
            </button>
            <div
              className={`filters${filtersOpen ? " open" : ""}`}
              role="group"
              aria-label="Filter and sort decorations"
            >
              <SearchAutocomplete
                ref={desktopSearchInputRef}
                catalog={catalog}
                loading={catalogLoading}
                getCompany={getItemCompany}
                value={searchQuery}
                onChange={handleSearchChange}
                onSelectCompany={handleSuggestCompany}
                onSelectDecoration={handleSuggestDecoration}
                formatPrice={fmtItem}
                placeholder="Search decorations, companies, or categories... (Press '/' to focus)"
                ariaLabel="Search decorations, companies, or categories"
              />
              {companyOptions.length > 0 && (
                <select
                  aria-label="Company"
                  value={fCompanies.length === 1 ? fCompanies[0] : ""}
                  onChange={(e) => setFCompanies(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Company</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {styleOptions.length > 0 && (
                <select
                  aria-label="Style"
                  value={fStyle}
                  onChange={(e) => setFStyle(e.target.value)}
                >
                  <option value="">Style</option>
                  {styleOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <select
                aria-label="Price range"
                value={fPrice}
                onChange={(e) => setFPrice(e.target.value)}
              >
                <option value="">Price range</option>
                {PRICE_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Sort by: Featured</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="name">Name: A - Z</option>
              </select>
              {filtersActive && (
                <button
                  type="button"
                  className="filters-clear"
                  onClick={() => {
                    setFCompanies([]);
                    setFStyle("");
                    setFColor("");
                    setFPrice("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div
            className="cards-area-wrapper"
            ref={cardsAreaRef}
            style={{
              touchAction: "pan-y",
            }}
          >
            {catalogLoading ? (
              <div className="cards-grid skeleton-grid" aria-label="Loading decorations">
                {SKELETON_KEYS.map((idx) => (
                  <div key={idx} className="skeleton-card">
                    <div className="skeleton-image skeleton-pulse" />
                    <div className="skeleton-content">
                      <div className="skeleton-badge skeleton-pulse" />
                      <div className="skeleton-line skeleton-title skeleton-pulse" />
                      <div className="skeleton-line skeleton-sub skeleton-pulse" />
                      <div className="skeleton-footer">
                        <div className="skeleton-price skeleton-pulse" />
                        <div className="skeleton-btn skeleton-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                key={cat}
                className={`cards-area-content${
                  swipeDirection === "next"
                    ? " cards-swipe-next"
                    : swipeDirection === "prev"
                      ? " cards-swipe-prev"
                      : ""
                }`}
                onAnimationEnd={() => setSwipeDirection(null)}
              >
                {filteredItems.length > 0 ? (
                  <div className="masonry cards-grid" id="grid" ref={cardsGridRef}>
                    {filteredItems.map((item) => renderCard(item))}
                  </div>
                ) : (
                  <div className="filters-empty" role="status">
                    <div className="filters-empty-icon" aria-hidden="true">
                      🌸
                    </div>
                    <h3 className="filters-empty-title">
                      {filtersActive ? "No decorations match your filters" : "No decorations found"}
                    </h3>
                    <p className="filters-empty-sub">
                      {filtersActive
                        ? "Try clearing some filters."
                        : "There are no active decorations in this category at the moment."}
                    </p>
                    {(filtersActive || cat !== "All") && (
                      <button
                        type="button"
                        className="filters-empty-clear-btn"
                        onClick={() => {
                          handleSearchChange("");
                          setFCompanies([]);
                          setFStyle("");
                          setFColor("");
                          setFPrice("");
                          setCat("All");
                        }}
                      >
                        Show all decorations
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next event prompt at end of catalog if more events exist */}
          {hasNextEvent && nextEvent && plannedEvents.length > 0 && (
            <div className="next-event-banner">
              <p>
                Done shopping for <b>{activeEventName}</b>?
              </p>
              <button
                type="button"
                className="pill pri next-event-btn"
                onClick={() => {
                  setActiveEventName(nextEvent.name);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Continue to {nextEvent.name} →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Floating "Plan your event" button (when not yet planning) */}
      {plannedEvents.length === 0 && (
        <button
          type="button"
          className={`pill pri plan-btn${fabHidden ? " plan-btn--hide" : ""}`}
          onClick={openPlanModal}
          aria-label="Plan your event"
        >
          ✨ Plan your event
        </button>
      )}

      {/* 4. Floating quotation bottom bar (when planned and items are chosen) */}
      <div className={`bar${totalItemCount > 0 ? " show" : ""}`} id="bar">
        <span id="qc" className="bar-count-text">
          {totalItemCount} item{totalItemCount > 1 ? "s" : ""} in quotation
        </span>
        <button className="pill pri" id="vq" onClick={openReviewModal}>
          Review quotation
        </button>
      </div>

      {/* Card detail dialog */}
      <dialog
        id="detail-dialog"
        ref={detailDialogRef}
        onMouseDown={(e) => handleDialogMouseDown(e, detailDialogRef)}
        onClick={(e) => handleBackdropClick(e, detailDialogRef)}
        onClose={closeDetail}
        aria-labelledby="detail-title"
      >
        {detailItem && (
          <>
            <div
              className="detail-img"
              style={{
                background: `linear-gradient(160deg, ${detailItem.g[0]}, ${detailItem.g[1]})`,
              }}
            >
              <img
                key={photoOf(detailItem)}
                src={photoOf(detailItem)}
                alt={detailItem.t}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              {photoCount(detailItem) > 1 && Array.isArray(detailItem.images) && (
                <>
                  <button
                    type="button"
                    className="ph-nav prev big"
                    aria-label="Previous photo"
                    onClick={() => stepPhoto(detailItem, -1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ph-nav next big"
                    aria-label="Next photo"
                    onClick={() => stepPhoto(detailItem, 1)}
                  >
                    ›
                  </button>
                  <div className="thumbs" role="group" aria-label="Photos">
                    {detailItem.images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        className={`thumb${i === Math.min(photoIdx[detailItem.id] ?? 0, photoCount(detailItem) - 1) ? " on" : ""}`}
                        aria-label={`Photo ${i + 1} of ${photoCount(detailItem)}`}
                        onClick={() => setPhotoIdx((p) => ({ ...p, [detailItem.id]: i }))}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button type="button" className="detail-x" onClick={closeDetail} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-meta">
                <span className="detail-cat">{detailItem.cat}</span>
                <span>
                  by {COS[detailItem.id] || detailItem.vendor || "Everest Events & Decor"}
                </span>
              </div>
              <h2 className="serif" id="detail-title">
                {detailItem.t}
              </h2>
              {detailItem.d && (
                <p
                  className="detail-desc"
                  style={{
                    color: "var(--mute)",
                    fontSize: "13.5px",
                    marginTop: "6px",
                    marginBottom: "16px",
                    lineHeight: 1.5,
                  }}
                >
                  {detailItem.d}
                </p>
              )}
              {detailSpecs && (
                <div className="spec">
                  <section className="spec-sec">
                    <h4>Overview</h4>
                    <dl className="spec-dl">
                      <div>
                        <dt>Structure type</dt>
                        <dd>
                          {typeof detailSpecs.structure === "string" && detailSpecs.structure
                            ? detailSpecs.structure
                            : detailItem.cat}
                        </dd>
                      </div>
                      <div>
                        <dt>Dimensions</dt>
                        <dd>
                          {typeof detailSpecs.dimensions === "string" && detailSpecs.dimensions
                            ? detailSpecs.dimensions
                            : detailSpecs.dimensions && typeof detailSpecs.dimensions === "object"
                              ? `${(detailSpecs.dimensions as any).width_ft || (detailSpecs.dimensions as any).width || ""} × ${(detailSpecs.dimensions as any).height_ft || (detailSpecs.dimensions as any).height || ""} ft`
                              : "Standard dimensions"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {detailSpecs.floral && (
                    <section className="spec-sec">
                      <h4>
                        Floral <em>Included in base design</em>
                      </h4>
                      <dl className="spec-dl">
                        <div>
                          <dt>Flower style</dt>
                          <dd>
                            {typeof detailSpecs.floral.style === "string"
                              ? detailSpecs.floral.style
                              : "Floral arrangement"}
                          </dd>
                        </div>
                        {detailSpecs.floral.varietyType && (
                          <div>
                            <dt>Variety type</dt>
                            <dd>{String(detailSpecs.floral.varietyType)}</dd>
                          </div>
                        )}
                      </dl>
                      {Array.isArray(detailSpecs.floral.flowers) &&
                        detailSpecs.floral.flowers.length > 0 &&
                        detailSpecs.floral.flowers.map((f, i) => {
                          const colour =
                            f.colour ||
                            (detailSpecs.floral.color && detailSpecs.floral.color !== "-"
                              ? detailSpecs.floral.color
                              : "");
                          return (
                            <div className="spec-row" key={`${f.name}-${i}`}>
                              <div>
                                <b>{f.name}</b>
                                <small>
                                  Variety: {f.kind}
                                  {colour ? ` · Colour: ${colour}` : ""}
                                </small>
                              </div>
                            </div>
                          );
                        })}
                    </section>
                  )}

                  {Array.isArray(detailSpecs.events) && detailSpecs.events.length > 0 && (
                    <section className="spec-sec">
                      <h4>Applicable events</h4>
                      <div className="spec-chips">
                        {detailSpecs.events.map((ev) => (
                          <span key={ev} className="spec-chip">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {(detailSpecs.platform ||
                    detailSpecs.lighting ||
                    (detailSpecs.addons?.length ?? 0) > 0) && (
                    <section className="spec-sec">
                      <h4>Included add-ons</h4>
                      {detailSpecs.platform && typeof detailSpecs.platform === "object" && (
                        <div className="spec-row">
                          <div>
                            <b>Platform · {detailSpecs.platform.name}</b>
                            <small>
                              {detailSpecs.platform.size} · {detailSpecs.platform.color}
                            </small>
                          </div>
                          <strong>
                            {detailSpecs.platform.price != null
                              ? fmt(detailSpecs.platform.price)
                              : "Included"}
                          </strong>
                        </div>
                      )}
                      {Array.isArray(detailSpecs.addons) &&
                        detailSpecs.addons.map((a, i) => (
                          <div className="spec-row" key={`${a.title}-${i}`}>
                            <div>
                              <b>{a.title}</b>
                              {a.sub && <small>{a.sub}</small>}
                            </div>
                            <strong>{a.price > 0 ? fmt(a.price) : "Included"}</strong>
                          </div>
                        ))}
                      {detailSpecs.lighting && typeof detailSpecs.lighting === "object" && (
                        <div className="spec-row">
                          <div>
                            <b>Lighting · {detailSpecs.lighting.name}</b>
                            <small>Quantity: {detailSpecs.lighting.qty}</small>
                          </div>
                          <strong>
                            {detailSpecs.lighting.price != null
                              ? fmt(detailSpecs.lighting.price)
                              : "Included"}
                          </strong>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              <div className="detail-foot">
                <div className="detail-foot-price">
                  <span className="spec-k">Starting price</span>
                  <b>
                    {fmtItem(detailItem.p)}
                    {detailItem.u || ""}
                  </b>
                  <small>Includes core base + confirmed add-ons</small>
                </div>
                <div className="acts">
                  <button type="button" className="pill" onClick={closeDetail}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="pill buy-btn"
                    onClick={() => openBuyNow(detailItem)}
                  >
                    Buy now
                  </button>
                  <button
                    type="button"
                    className="pill pri"
                    onClick={() => {
                      const id = detailItem.id;
                      closeDetail();
                      if (!isItemInActiveEvent(id)) handleToggleCardItem(id);
                    }}
                  >
                    {isItemInActiveEvent(detailItem.id)
                      ? "✓ Added to quotation"
                      : "+ Add to quotation"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>

      {/* 5. Plan popup: centered dialog on desktop/tablet, draggable bottom sheet on phones */}
      <PlanEventModal
        isOpen={planOpen}
        onClose={closePlanModal}
        onComplete={handlePlanComplete}
        initialEvents={plannedEvents}
      />

      {/* 6. Review Popup Dialog */}
      <ResponsiveModal
        isOpen={reviewOpen}
        onClose={closeReviewModal}
        dialogId="review-dialog"
        labelledBy="review-title"
        sheetTitle="Your quotation"
        sheetClassName="form-sheet review-sheet"
        sheetFooter={
          <div className="form-sheet-actions review-sheet-actions">{reviewActions}</div>
        }
      >
        {(isPhone) => (
          <>
        {isPhone ? (
          <p className="sheet-subtitle">Review decorations selected for each of your events.</p>
        ) : (
        <div className="review-dialog-header">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div>
              <h2 className="serif" id="review-title" style={{ margin: 0 }}>
                Your quotation
              </h2>
              <div
                style={{
                  color: "var(--mute)",
                  fontSize: "12px",
                  marginTop: 4,
                }}
              >
                Review decorations selected for each of your events.
              </div>
            </div>
            <button
              type="button"
              className="detail-x"
              onClick={closeReviewModal}
              aria-label="Close quotation"
              style={{
                position: "static",
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: 0,
                background: "#f5eff2",
                color: "var(--mute)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                fontSize: "14px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        )}

        <div className="review-dialog-body">
          {plannedEvents.length === 0 || totalItemCount === 0 ? (
            <div
              style={{
                padding: "36px 12px",
                textAlign: "center",
                color: "var(--mute)",
              }}
            >
              No decorations added to quotation yet.
            </div>
          ) : (
            <div>
              {plannedEvents.map((ev) => {
                const itemIds = eventQuotes[ev.name] || [];
                const items = itemIds
                  .map((id) => catalog.find((i) => i.id === id))
                  .filter((item): item is DecorationItem => Boolean(item));
                const subtotal = items.reduce((sum, item) => sum + item.p, 0);

                return (
                  <div key={ev.name} className="review-event-group">
                    <div className="review-event-header">
                      <div>
                        <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{ev.name}</strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--mute)",
                            marginLeft: 8,
                          }}
                        >
                          · {formatDate(ev.date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          background: "var(--card)",
                          padding: "2px 8px",
                          borderRadius: 12,
                          border: "1px solid var(--line)",
                          color: "var(--brand)",
                          fontWeight: 600,
                        }}
                      >
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--mute)",
                          padding: "6px 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        <span>No decorations added for this event yet.</span>
                        <button
                          type="button"
                          onClick={() => {
                            closeReviewModal();
                            setActiveEventName(ev.name);
                            decorSectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                            });
                          }}
                          style={{
                            background: "none",
                            border: 0,
                            padding: 0,
                            color: "var(--brand)",
                            fontWeight: 600,
                            fontSize: "12px",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          + Add decorations
                        </button>
                      </div>
                    ) : (
                      <ul className="list" style={{ margin: "6px 0" }}>
                        {items.map((item) => (
                          <li
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 0",
                            }}
                          >
                            <img
                              src={item.img}
                              alt=""
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                objectFit: "cover",
                                flex: "0 0 38px",
                              }}
                            />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 500 }}>{item.t}</span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "11.5px",
                                  color: "var(--brand)",
                                  marginTop: 1,
                                }}
                              >
                                by {COS[item.id]}
                              </span>
                            </span>
                            <b className="price">{fmtItem(item.p)}</b>
                            <button
                              type="button"
                              onClick={() => {
                                setEventQuotes((prev) => ({
                                  ...prev,
                                  [ev.name]: (prev[ev.name] || []).filter((id) => id !== item.id),
                                }));
                              }}
                              title="Remove item"
                              style={{
                                border: 0,
                                background: "none",
                                color: "var(--mute)",
                                cursor: "pointer",
                                padding: "2px 6px",
                                fontSize: "14px",
                              }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="review-event-subtotal">
                      <span>Subtotal</span>
                      <span className="price">{fmt(subtotal)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Quotation Company Picker */}
              <QuotationCompanyPicker
                groups={quotationCompanyGroups}
                selected={selectedCompanies}
                onToggle={handleQuotationCompanyToggle}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0 4px",
                  fontSize: "16px",
                }}
              >
                <span>Estimated Grand Total</span>
                <b className="price">{fmt(grandTotal)}</b>
              </div>
            </div>
          )}
        </div>

        {!isPhone && <div className="acts review-dialog-footer">{reviewActions}</div>}
          </>
        )}
      </ResponsiveModal>

      {/* 7. Contact Popup Dialog */}
      <ResponsiveModal
        isOpen={contactOpen}
        onClose={dismissContactModal}
        dialogId="contact-dialog"
        labelledBy="contact-title"
        sheetTitle={
          isSubmitted ? "Thank you!" : buyNowItem ? "Buy this decoration" : "Finalize inquiry"
        }
        sheetClassName="form-sheet contact-sheet"
        sheetFooter={<div className="form-sheet-actions">{contactActions}</div>}
        repositionInputs
      >
        {(isPhone) =>
        isSubmitted ? (
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }} role="img" aria-label="Celebration">
              🎉
            </div>
            {!isPhone && (
              <h2 className="serif" style={{ fontSize: 32, margin: "0 0 10px" }}>
                Thank you!
              </h2>
            )}
            <p
              style={{
                color: "var(--mute)",
                fontSize: 13,
                maxWidth: 380,
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              {buyNowItem
                ? `We have received your order for ${buyNowItem.t}. Our team will come to you with your quotation.`
                : "We have received your request. Our team will come to you with your quotation."}
            </p>
            {!isPhone && contactActions}
          </div>
        ) : (
          <>
            {!isPhone && (
              <h2 className="serif" id="contact-title">
                {buyNowItem ? "Buy this decoration" : "Finalize inquiry"}
              </h2>
            )}
            {buyNowItem && (
              <div className="buy-summary">
                <img src={photoOf(buyNowItem)} alt={buyNowItem.t} />
                <div>
                  <b>{buyNowItem.t}</b>
                  <small>
                    by{" "}
                    {buyNowItem.ownerCompanyName ||
                      buyNowItem.vendor ||
                      COS[buyNowItem.id] ||
                      "Everest Events & Decor"}
                  </small>
                </div>
                <strong>
                  {fmtItem(buyNowItem.p)}
                  {buyNowItem.u || ""}
                </strong>
              </div>
            )}
            <div
              className="contact-dialog-privacy"
              style={{
                color: "var(--mute)",
                fontSize: "12px",
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              Please enter your contact details so our team can follow up with your personalized
              proposal. Your name, phone number, and WhatsApp number will be shared with the
              selected companies.
            </div>

            <form
              id={contactFormId}
              ref={contactFormRef}
              onSubmit={handleContactSubmit}
              className="contact-form"
            >
              <div>
                <label htmlFor="contact-name">Your name *</label>
                <input
                  id="contact-name"
                  name="name"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="contact-phone">Phone number *</label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="e.g. 9801234567"
                  value={contactPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={phoneTouched && !isValidPhone(contactPhone)}
                />
                {phoneTouched && !isValidPhone(contactPhone) && (
                  <span className="contact-field-error" role="alert">
                    {getPhoneError(contactPhone, "Phone number")}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="contact-whatsapp">WhatsApp number *</label>
                <input
                  id="contact-whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="e.g. 9801234567"
                  value={whatsappSameAsPhone ? contactPhone : contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  onBlur={() => setWhatsappTouched(true)}
                  readOnly={whatsappSameAsPhone}
                  disabled={whatsappSameAsPhone}
                  className={whatsappSameAsPhone ? "contact-input-disabled" : ""}
                  aria-invalid={
                    (!whatsappSameAsPhone ? whatsappTouched : phoneTouched) &&
                    !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp)
                  }
                />
                {((!whatsappSameAsPhone && whatsappTouched) ||
                  (whatsappSameAsPhone && phoneTouched)) &&
                  !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp) && (
                    <span className="contact-field-error" role="alert">
                      {getPhoneError(
                        whatsappSameAsPhone ? contactPhone : contactWhatsapp,
                        "WhatsApp number",
                      )}
                    </span>
                  )}
              </div>

              <div className="contact-checkbox-row">
                <label htmlFor="contact-whatsapp-same" className="contact-checkbox-label">
                  <input
                    type="checkbox"
                    id="contact-whatsapp-same"
                    name="whatsappSameAsPhone"
                    checked={whatsappSameAsPhone}
                    onChange={(e) => handleWhatsappSameChange(e.target.checked)}
                  />
                  <span>Same as phone number</span>
                </label>
              </div>

              {buyNowItem && (
                <>
                  <div>
                    <label htmlFor="contact-date">Event date (optional)</label>
                    <input id="contact-date" name="date" type="date" min={todayStr} />
                  </div>
                  <div>
                    <label htmlFor="contact-venue">Venue / location (optional)</label>
                    <input
                      id="contact-venue"
                      name="venue"
                      placeholder="e.g. Hotel Yak & Yeti, Kathmandu"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={3}
                  placeholder="Any extra preferences, timing, or questions..."
                  style={{
                    minHeight: "84px",
                    maxHeight: "240px",
                    resize: "vertical",
                    overflowY: "auto",
                  }}
                />
              </div>

              {submitError && (
                <p role="alert" style={{ color: "#c0392b", fontSize: 13, margin: "0 0 12px" }}>
                  {submitError}
                </p>
              )}

              {!isPhone && <div className="acts">{contactActions}</div>}
            </form>
          </>
        )
        }
      </ResponsiveModal>

      {/* Mobile Filter Bottom Sheet Modal */}
      <FilterBottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        fCompanies={fCompanies}
        setFCompanies={setFCompanies}
        companyOptions={companyOptions}
        fPrice={fPrice}
        setFPrice={setFPrice}
        PRICE_RANGES={PRICE_RANGES}
      />

      {/* Mobile Sort Bottom Sheet Modal */}
      <SortBottomSheet
        isOpen={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        fStyle={fStyle}
        setFStyle={setFStyle}
        styleOptions={styleOptions}
        setFColor={setFColor}
      />

      {/* Preview Send to Companies & Confirmation Modal */}
      {showSendRequestPreview && (
        <SendRequestPreview
          isOpen={showSendRequestPreview}
          onClose={() => setShowSendRequestPreview(false)}
        />
      )}
    </div>
  );
}
