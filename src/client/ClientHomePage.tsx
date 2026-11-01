import "./client.css";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { SearchInput } from './components/SearchInput';
import { SendRequestPreview } from './components/SendRequestPreview';
import { QuotationCompanyPicker } from './components/QuotationCompanyPicker';
import { EventDatePicker } from './components/EventDatePicker';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  absoluteImage,
  fetchLiveDecorations,
  submitEnquiry,
  type ApiDecoration,
} from './api';
import { CATEGORIES } from './data/decorations';
import { getDecorationSlug } from './lib/slug';
import {
  getStoredQuotation,
  saveStoredQuotation,
  subscribeQuotation,
  type PlannedEvent,
} from './lib/quotationStorage';


export interface DecorationSpecs {
  summary: string;
  structure: string;
  dimensions: string;
  events: string[];
  floral: {
    style: string;
    varietyType: string;
    flowers: { name: string; kind: string; colour?: string }[];
    variety: string;
    color: string;
  };
  /** Platform / lighting / furniture that come with the design (from the dashboard). */
  addons?: { title: string; sub: string; price: number }[];
  platform?: { name: string; size: string; color: string; price: number };
  lighting?: { name: string; qty: string; price: number };
  /** Core design price. Starting price = base + platform + lighting. */
  basePrice: number;
}

export interface DecorationItem {
  id: number;
  /** Id of the decoration in the dashboard (absent for built-in samples). */
  sid?: string;
  /** All photos of the decoration (dashboard decorations only); `img` is the first. */
  images?: string[];
  /** Style / colour tags for the filters (dashboard decorations only). */
  styles?: string[];
  colors?: string[];
  specs?: DecorationSpecs;
  vendor?: string;
  dimensions?: string;
  inclusions?: string[];
  priceUnit?: string;
  ownerCompanyId?: string;
  ownerCompanyName?: string;
  cat: string;
  t: string;
  d: string;
  p: number;
  u?: string;
  h?: number;
  g: [string, string];
  e: string;
  img: string;
}

interface PlanMeta {
  venue: string;
}

export type { PlannedEvent };

const CATS = CATEGORIES;

const COS: Record<number, string> = {};

export const getSpecs = (item: DecorationItem): DecorationSpecs => {
  if (item.specs) return item.specs;
  return {
    summary: item.d || 'Elegant event decoration setup',
    structure: item.cat || 'Standard',
    dimensions: '16 × 12 ft',
    events: ['Wedding', 'Reception', 'Engagement', 'Haldi', 'Mehndi', 'Sangeet'],
    floral: {
      style: 'Floral Decor',
      varietyType: 'Fresh',
      flowers: [{ name: 'Rose', kind: 'Fresh', colour: 'Pink' }],
      variety: 'Fresh',
      color: 'Pink',
    },
    basePrice: item.p,
  };
};

// ── Decorations uploaded from the dashboard ────────────────────────────────
const API_CAT: Record<string, string> = {
  'Entrance Gate': 'Entrance',
  Backdrop: 'Backdrops',
  'Photo Booth & Selfie Station': 'Photobooth',
};
const CAT_EMOJI: Record<string, string> = {
  Stage: '🛋️',
  Entrance: '🌸',
  Mandap: '🛕',
  Backdrops: '📸',
  'Welcome Board': '🪧',
  Photobooth: '📷',
};
const FALLBACK_G: [string, string] = ['#8a2b2b', '#f0b9a0'];

/** Stable positive number for a dashboard id (the page keys items by number). */
export const numericId = (sid: string) => {
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) | 0;
  return 1000 + Math.abs(h);
};

export const formatDimensions = (dims: unknown): string => {
  if (!dims) return '';
  if (typeof dims === 'string') return dims;
  if (typeof dims === 'object' && dims !== null) {
    const d = dims as { summary?: unknown; width_ft?: unknown; height_ft?: unknown; width?: unknown; height?: unknown };
    if (d.summary) return String(d.summary);
    if (d.width_ft && d.height_ft) return `${d.width_ft} × ${d.height_ft} ft`;
    if (d.width && d.height) return `${d.width} × ${d.height} ft`;
  }
  return '';
};

export const fromApi = (d: ApiDecoration): DecorationItem => {
  const id = numericId(d.id);
  const ownerCompanyId = d.ownerCompanyId || 'company-1';
  const ownerCompanyName = d.ownerCompanyName || d.vendor || 'Everest Events & Decor';
  COS[id] = ownerCompanyName;
  const formattedDims = formatDimensions(d.dimensions);
  const floralStyleStr =
    typeof d.floral?.style === 'string' && d.floral.style
      ? d.floral.style
      : typeof d.flowers === 'string' && d.flowers
      ? d.flowers
      : 'Floral Decor';

  const summary = [
    d.structure,
    formattedDims && `Dimensions: ${formattedDims}`,
    floralStyleStr && `Floral: ${floralStyleStr}`,
    d.platform && d.platform !== 'None' && `Platform: ${d.platform}`,
  ]
    .filter(Boolean)
    .join('. ');
  const cat = API_CAT[d.category] || d.category || 'Stage';
  const images = Array.isArray(d.images) && d.images.length > 0
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
    t: d.name || 'Untitled Decoration',
    d: d.description || summary,
    p: Number(d.price) || 0,
    g: FALLBACK_G,
    e: CAT_EMOJI[cat] || '✨',
    img: images[0] || '',
    images,
    specs: {
      summary,
      structure: typeof d.structure === 'string' && d.structure ? d.structure : cat,
      dimensions: formattedDims,
      events: Array.isArray(d.events) && d.events.length > 0 ? d.events : [
        'Wedding',
        'Reception',
        'Engagement',
        'Haldi',
        'Mehndi',
        'Sangeet',
      ],
      floral: {
        style: floralStyleStr,
        varietyType: String(d.floral?.varietyType || ''),
        flowers: Array.isArray(d.floral?.flowers)
          ? d.floral.flowers.map((f: any) => ({
              name: String(f.name || 'Flower'),
              kind: String(f.kind || f.type || 'Fresh'),
              colour: f.colour || f.color ? String(f.colour || f.color) : '',
            }))
          : [],
        variety: '',
        color: '',
      },
      ...(Array.isArray(d.addons) ? { addons: d.addons } : {}),
      basePrice: Number(d.price) || 0,
    },
  };
};

const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Mehendi',
  'Haldi',
  'Sangeet',
  'Reception',
  'Bratabandha / Pasni',
  'Birthday',
  'Corporate event',
  'Other',
] as const;

const PRICE_RANGES = [
  { id: 'u25', label: 'Under Rs. 25,000', min: 0, max: 25000 },
  { id: '25-50', label: 'Rs. 25,000 - 50,000', min: 25000, max: 50000 },
  { id: '50-100', label: 'Rs. 50,000 - 1,00,000', min: 50000, max: 100000 },
  { id: 'o100', label: 'Above Rs. 1,00,000', min: 100000, max: Infinity },
];

const fmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN');
/** Items without a fixed price (dashboard "Custom Quote") show as a custom quote. */
const fmtItem = (n: number) => (n > 0 ? fmt(n) : 'Custom quote');

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(+(y || 0), +(m || 1) - 1, +(d || 1));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const W = 'rgba(255,255,255,.9)';
const W2 = 'rgba(255,255,255,.4)';
const G = '#f8d58a';
const R = '#ff9fb5';

const fl = (x: number, y: number, r: number, c = R) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="${G}"/>`;
const dots = (a: number[][], r: number, c?: string) =>
  a.map((q) => fl(q[0] ?? 0, q[1] ?? 0, r, c)).join('');
const arc = (cx: number, cy: number, r: number, n: number, a0: number, a1: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / (n - 1)) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
const col = (x: number, y0: number, y1: number, n: number) =>
  Array.from({ length: n }, (_, k) => [x, y0 + ((y1 - y0) * k) / (n - 1)]);
const sofa = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="90" height="36" rx="8" fill="${W}"/><rect x="${x - 10}" y="${y + 6}" width="20" height="30" rx="6" fill="${W}"/><rect x="${x + 80}" y="${y + 6}" width="20" height="30" rx="6" fill="${W}"/>`;
const wave = (y0: number) => {
  let d = '',
    b = '';
  for (let x = 0; x <= 300; x += 25) {
    const y = y0 + 22 * Math.sin(x / 47);
    d += (x ? 'L' : 'M') + x + ' ' + y;
    b += `<circle cx="${x}" cy="${y + 8}" r="13" fill="${G}" opacity=".25"/><circle cx="${x}" cy="${y + 8}" r="5.5" fill="${G}"/>`;
  }
  return `<path d="${d}" stroke="${W}" stroke-width="2" fill="none"/>${b}`;
};

const ART: Record<string, string> = {
  Stage: `<rect x="30" y="300" width="240" height="20" rx="4" fill="${W2}"/><path d="M45 300V110h210v190" fill="none" stroke="${W}" stroke-width="6"/><path d="M45 110c28 40 28 110 10 190H45zM255 110c-28 40-28 110-10 190h10z" fill="${W2}"/>${dots(arc(150, 205, 78, 13, 180, 360), 9)}<path d="M150 110v34M132 144h36l-6 24h-24z" stroke="${G}" stroke-width="4" fill="${G}"/>${sofa(105, 262)}`,
  Entrance: `<path d="M95 375L130 312h40l35 63z" fill="${W2}"/>${dots(arc(150, 195, 80, 15, 180, 360), 9)}${dots(col(70, 195, 312, 8), 8)}${dots(col(230, 195, 312, 8), 8)}${dots(arc(150, 195, 62, 10, 185, 355), 4, G)}<rect x="55" y="310" width="30" height="8" rx="3" fill="${W}"/><rect x="215" y="310" width="30" height="8" rx="3" fill="${W}"/>`,
  Mandap: `<rect x="45" y="300" width="210" height="18" rx="4" fill="${W2}"/>${[70, 120, 180, 230].map((x) => `<rect x="${x - 5}" y="175" width="10" height="125" fill="${W}"/>`).join('')}<path d="M150 90L40 175h220z" fill="${W}"/><rect x="40" y="172" width="220" height="10" fill="${G}"/><path d="M70 185q25 36 50 0q30 36 60 0q25 36 50 0" fill="none" stroke="${R}" stroke-width="7"/>${dots(arc(150, 172, 100, 12, 200, 340), 5, R)}${sofa(105, 262)}`,
  Table: `<path d="M80 235h140l22 95H58z" fill="${W}"/><ellipse cx="150" cy="235" rx="74" ry="18" fill="${W}"/><ellipse cx="150" cy="232" rx="50" ry="10" fill="${W2}"/><rect x="108" y="190" width="9" height="42" fill="${W}"/><rect x="183" y="190" width="9" height="42" fill="${W}"/><circle cx="112" cy="182" r="7" fill="${G}"/><circle cx="187" cy="182" r="7" fill="${G}"/>${fl(150, 200, 18)}${fl(130, 214, 12)}${fl(170, 214, 12)}<rect x="60" y="326" width="180" height="8" rx="3" fill="${W2}"/>`,
  Floral: `${[[150, 125, 36], [98, 160, 30], [202, 160, 30], [124, 210, 27], [176, 210, 27], [150, 170, 30]].map((f) => `<path d="M150 300L${f[0]} ${f[1]}" stroke="${W}" stroke-width="4"/>`).join('')}${[[150, 125, 36], [98, 160, 30], [202, 160, 30], [124, 210, 27], [176, 210, 27], [150, 170, 30]].map((f, i) => fl(f[0] ?? 0, f[1] ?? 0, f[2] ?? 0, i % 2 ? R : '#ffc2d1')).join('')}<path d="M108 262h84l-22 80h-40z" fill="${W}"/>`,
  Lighting: `<rect x="14" y="70" width="5" height="260" fill="${W}"/><rect x="281" y="70" width="5" height="260" fill="${W}"/>${wave(105)}${wave(185)}<rect x="40" y="305" width="220" height="14" rx="4" fill="${W2}"/><rect x="60" y="270" width="40" height="35" rx="4" fill="${W2}"/><rect x="200" y="270" width="40" height="35" rx="4" fill="${W2}"/>`,
  Backdrops: `<rect x="45" y="65" width="210" height="240" rx="10" fill="${W2}"/><rect x="62" y="82" width="176" height="206" rx="6" fill="none" stroke="${W}" stroke-width="4"/>${dots([[62, 82], [238, 82], [62, 288], [238, 288], [84, 92], [216, 92], [100, 76], [200, 76]], 14)}${dots(arc(150, 92, 60, 8, 200, 340), 7, '#ffc2d1')}${sofa(105, 250)}<rect x="30" y="300" width="240" height="14" rx="4" fill="${W2}"/>`,
};

const ICONS: Record<string, string> = {
  All: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/>',
  Stage: '<path d="M4 5h16M5 5v14M19 5v14M5 19h14M8 19v-4h8v4M8 15v-2h8v2M5 5c2 2 2 5 1 8M19 5c-2 2-2 5-1 8"/>',
  Entrance: '<path d="M5 20V11a7 7 0 0 1 14 0v9M9 20v-9a3 3 0 0 1 6 0v9M3 20h18"/>',
  Mandap: '<path d="M12 3v2M5 9l7-4 7 4M4 9h16M7 9v10M12 9v10M17 9v10M5 19h14M9 9v2M15 9v2"/>',
  Table: '<path d="M4 9l1.5-3h13L20 9M4 9h16M6 9v10M18 9v10M9 13h6"/>',
  Floral: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="6.5" r="2.7"/><circle cx="17.2" cy="10.3" r="2.7"/><circle cx="15.2" cy="16.4" r="2.7"/><circle cx="8.8" cy="16.4" r="2.7"/><circle cx="6.8" cy="10.3" r="2.7"/>',
  Lighting: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.9 10.6c.7.7 1 1.4 1 2.4h5.8c0-1 .3-1.7 1-2.4A6 6 0 0 0 12 3z"/>',
  Backdrops: '<rect x="4.5" y="4" width="15" height="16" rx="1.5"/><rect x="8" y="7.5" width="8" height="9" rx=".8"/>',
  'Welcome Board': '<path d="M19 3H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H5V5h14v10zM7 19l-2 3M17 19l2 3"/>',
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
  const [cat, setCat] = useState<string>('All');
  // Filters + sort for the catalogue
  const [fCompany, setFCompany] = useState('');
  const [fStyle, setFStyle] = useState('');
  const [fColor, setFColor] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  // Which photo of each decoration is showing (shared by the card and its popup)
  const [photoIdx, setPhotoIdx] = useState<Record<number, number>>({});
  const [liked, setLiked] = useState<Set<number>>(new Set());

  // Decorations are loaded directly from Supabase with real-time sync
  const [catalog, setCatalog] = useState<DecorationItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchLiveDecorations()
        .then((list) => {
          if (!cancelled) {
            setCatalog(list.map(fromApi));
            setCatalogLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to load decorations from Supabase:', err);
          if (!cancelled) {
            setCatalog([]);
            setCatalogLoading(false);
          }
        });
    };

    void load();
    const timer = setInterval(load, 30_000);

    // Supabase Real-time synchronization
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('client-decorations-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'decorations' },
          () => {
            void load();
          }
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);
  // One shared categories list for chips, mobile swipe order, and catalog view
  const cats = CATEGORIES;
  useEffect(() => {
    if (cat !== 'All' && !(cats as readonly string[]).includes(cat)) setCat('All');
  }, [cat]);


  // Phones: filters sit behind one "Filter & sort" button; the Plan button hides while scrolling down
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);

  // Search & Filter state
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const cardsAreaRef = useRef<HTMLDivElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<'next' | 'prev' | null>(null);
  const swipeTimerRef = useRef<number | null>(null);
  const touchStartDataRef = useRef<{
    x: number;
    y: number;
    time: number;
    invalid: boolean;
  } | null>(null);
  const lastSwipeTimeRef = useRef<number>(0);

  // Debounce search query by 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val) {
      setDebouncedSearchQuery('');
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterSheetTab, setFilterSheetTab] = useState<'filter' | 'sort'>('filter');
  const [stripActiveIdx, setStripActiveIdx] = useState(0);
  const [showSendRequestPreview, setShowSendRequestPreview] = useState(false);

  useEffect(() => {
    (window as any).__openSendRequestPreview = () => setShowSendRequestPreview(true);
    (window as any).__closeSendRequestPreview = () => setShowSendRequestPreview(false);
    if (
      window.location.search.includes('preview=send') ||
      window.location.hash === '#preview-send'
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [submitError, setSubmitError] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const submissionKeyRef = useRef('');

  // Contact form fields, mirroring & validation state
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactWhatsapp, setContactWhatsapp] = useState<string>('');
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState<boolean>(true);
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [whatsappTouched, setWhatsappTouched] = useState<boolean>(false);

  const isValidPhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (!/^\+?[0-9]+$/.test(trimmed)) return false;
    const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return true;
    if (digits.length === 13 && digits.startsWith('977')) return true;
    return false;
  };

  const getPhoneError = (val: string, label: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return `${label} is required`;
    if (!/^\+?[0-9]+$/.test(trimmed)) return 'Digits only (leading + allowed)';
    const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return '';
    if (digits.length === 13 && digits.startsWith('977')) return '';
    return 'Enter a valid 10-digit number or +977 format';
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
    setContactName('');
    setContactPhone('');
    setContactWhatsapp('');
    setWhatsappSameAsPhone(true);
    setPhoneTouched(false);
    setWhatsappTouched(false);
    setSubmitError('');
  };

  // Plan state (synchronized with localStorage via quotationStorage)
  const initialQuotation = useMemo(() => getStoredQuotation(), []);
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>(initialQuotation.plannedEvents);
  const [activeEventName, setActiveEventName] = useState<string | null>(initialQuotation.activeEventName);
  const [eventQuotes, setEventQuotes] = useState<Record<string, number[]>>(initialQuotation.eventQuotes);
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
      const activeEl = container.querySelector<HTMLElement>('.event-pill.active');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
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
    venue: '',
  });

  // Form inputs for Plan popup
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [eventDates, setEventDates] = useState<Record<string, string>>({});
  const [eventVenues, setEventVenues] = useState<Record<string, string>>({});
  // 0 = choose event types, 1..n = date & venue for each chosen event
  const [planStep, setPlanStep] = useState<number>(0);
  const [planError, setPlanError] = useState<string>('');
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);

  // Contact modal state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // Single-decoration order that skips planning ("Buy now")
  const [buyNowItem, setBuyNowItem] = useState<DecorationItem | null>(null);
  const [, setFullSubmission] = useState<Record<string, unknown> | null>(null);

  // Dialog references
  const planDialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const stripPaused = useRef(false);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const [detailItem, setDetailItem] = useState<DecorationItem | null>(null);
  const reviewDialogRef = useRef<HTMLDialogElement>(null);
  const contactDialogRef = useRef<HTMLDialogElement>(null);
  const contactFormRef = useRef<HTMLFormElement>(null);
  const decorSectionRef = useRef<HTMLElement>(null);

  // Auto-open review modal if navigated with #review or review=1
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.search.includes('review=1') || window.location.hash === '#review')
    ) {
      setTimeout(() => {
        reviewDialogRef.current?.showModal();
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
        rootMargin: '0px',
        threshold: 0,
      }
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
          document.documentElement.style.setProperty('--sticky-h', `${h}px`);
          document.documentElement.style.setProperty('--chips-h', `${h}px`);
        }
      }
    };

    updateStickyH();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && chipsBarRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateStickyH();
      });
      resizeObserver.observe(chipsBarRef.current);
    }

    window.addEventListener('resize', updateStickyH);
    return () => {
      window.removeEventListener('resize', updateStickyH);
      resizeObserver?.disconnect();
    };
  }, [plannedEvents.length]);

  // Auto-scroll active chip into view horizontally whenever category changes on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) {
      const chipEl = chipBtnRefs.current[cat];
      if (chipEl) {
        chipEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [cat]);

  const catRef = useRef(cat);
  catRef.current = cat;
  const catsRef = useRef(cats);
  catsRef.current = cats;
  const filterSheetOpenRef = useRef(filterSheetOpen);
  filterSheetOpenRef.current = filterSheetOpen;
  const mobileMenuOpenRef = useRef(mobileMenuOpen);
  mobileMenuOpenRef.current = mobileMenuOpen;

  const handleSelectCat = (category: string) => {
    setCat(category);

    if (window.innerWidth <= 768) {
      // 1. Auto-scroll only the chips row horizontally, never vertically
      const chipEl = chipBtnRefs.current[category];
      if (chipEl) {
        chipEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }

      // 2. If chips are currently stuck, align top of grid just below pinned bar
      const isStuckNow =
        isChipsStuck ||
        (chipsSentinelRef.current ? chipsSentinelRef.current.getBoundingClientRect().top <= 2 : false);

      if (isStuckNow) {
        const bar = chipsBarRef.current || document.querySelector<HTMLElement>('.chips-sticky');
        const grid = cardsGridRef.current || document.querySelector<HTMLElement>('.cards-grid');
        const targetEl =
          grid && grid.style.display !== 'none'
            ? grid
            : cardsAreaRef.current;
        if (bar && targetEl) {
          const barBottom = bar.getBoundingClientRect().bottom;
          const targetTop = targetEl.getBoundingClientRect().top;
          if (targetTop < barBottom + 8) {
            window.scrollBy({ top: targetTop - (barBottom + 8), behavior: 'auto' });
          }
        }
      }
      // If chips are not stuck yet (user is still near top), do not scroll at all
    }
  };

  const handleSelectCatRef = useRef(handleSelectCat);
  handleSelectCatRef.current = handleSelectCat;

  // Align grid position after category change
  useLayoutEffect(() => {
    if (window.innerWidth <= 768) {
      const isStuckNow =
        isChipsStuck ||
        (chipsSentinelRef.current ? chipsSentinelRef.current.getBoundingClientRect().top <= 2 : false);

      if (isStuckNow) {
        const bar = chipsBarRef.current || document.querySelector<HTMLElement>('.chips-sticky');
        const grid = cardsGridRef.current || document.querySelector<HTMLElement>('.cards-grid');
        const targetEl =
          grid && grid.style.display !== 'none'
            ? grid
            : cardsAreaRef.current;
        if (bar && targetEl) {
          const barBottom = bar.getBoundingClientRect().bottom;
          const targetTop = targetEl.getBoundingClientRect().top;
          if (targetTop < barBottom + 8) {
            window.scrollBy({ top: targetTop - (barBottom + 8), behavior: 'auto' });
          }
        }
      }
    }
  }, [cat, isChipsStuck]);

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
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when quotation modal or other overlays/drawers are open
      if (
        filterSheetOpenRef.current ||
        mobileMenuOpenRef.current ||
        Boolean(reviewDialogRef.current?.open) ||
        Boolean(planDialogRef.current?.open) ||
        Boolean(detailDialogRef.current?.open) ||
        Boolean(contactDialogRef.current?.open)
      ) {
        touchStartDataRef.current = null;
        return;
      }

      // 4. Ignore when touch started inside chips row, top carousel, quotation modal,
      // filters/sort panel, or search input
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          '.chips, .chips-sticky, .chips-sticky-wrapper, #chips, .strip-sec, .strip-wrap, .strip-track, .co-track, .co-row, .filter-sheet, .mobile-filter-sheet, .filter-sheet-overlay, .mobile-filter-bar, dialog, [role="dialog"], input, textarea, select'
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
      if (
        elapsed >= 600 ||
        Math.abs(dx) < 60 ||
        Math.abs(dx) <= Math.abs(dy) * 1.5
      ) {
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
      let dir: 'next' | 'prev' | null = null;

      if (dx < 0) {
        // Swipe LEFT = next category
        nextIndex = currentIndex + 1;
        dir = 'next';
      } else {
        // Swipe RIGHT = previous category
        nextIndex = currentIndex - 1;
        dir = 'prev';
      }

      // If there is no next/previous (first or last), do nothing
      if (nextIndex < 0 || nextIndex >= currentCats.length || !dir) {
        return;
      }

      const nextCat = currentCats[nextIndex];
      if (!nextCat) return;

      // 9. Optional: a very small haptic tick on supported devices
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
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
    cardsEl.addEventListener('touchstart', onTouchStart, { passive: true });
    cardsEl.addEventListener('touchmove', onTouchMove, { passive: true });
    cardsEl.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      cardsEl.removeEventListener('touchstart', onTouchStart);
      cardsEl.removeEventListener('touchmove', onTouchMove);
      cardsEl.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Keyboard shortcut: '/' focuses search input on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (
        planDialogRef.current?.open ||
        detailDialogRef.current?.open ||
        reviewDialogRef.current?.open ||
        contactDialogRef.current?.open ||
        filterSheetOpen ||
        mobileMenuOpen
      ) {
        return;
      }

      if (desktopSearchInputRef.current && window.innerWidth >= 768) {
        e.preventDefault();
        desktopSearchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterSheetOpen, mobileMenuOpen]);

  const todayStr = new Date().toISOString().split('T')[0];

  const companies = Object.values(
    catalog.reduce<Record<string, { name: string; items: DecorationItem[] }>>(
      (acc, item) => {
        const name = COS[item.id] || 'Everest Events & Decor';
        (acc[name] ||= { name, items: [] }).items.push(item);
        return acc;
      },
      {}
    )
  );
  const companyCount = companies.length;

  // Auto-play the photo strip (scrolls only when there are multiple items)
  useEffect(() => {
    const el = stripRef.current;
    if (!el || catalog.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const SPEED = 45; // px per second
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft;
      if (!stripPaused.current) {
        pos += (SPEED * dt) / 1000;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0 && pos >= maxScroll) pos = 0;
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [catalog.length]);

  const scrollCarousel = (btn: HTMLElement, dir: number) => {
    const track = btn
      .closest('.co-row')
      ?.querySelector<HTMLElement>('.co-track');
    track?.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };
  const companyOptions: string[] = [
    ...new Set(catalog.map((i) => COS[i.id] || i.vendor).filter((c): c is string => Boolean(c))),
  ].sort();
  const styleOptions = [...new Set(catalog.flatMap((i) => i.styles ?? []))].sort();
  const colorOptions = [...new Set(catalog.flatMap((i) => i.colors ?? []))].sort();
  const inPriceRange = (p: number) => {
    const r = PRICE_RANGES.find((x) => x.id === fPrice);
    return !r || (p >= r.min && p < r.max);
  };
  const filtersActive = Boolean(fCompany || fStyle || fPrice);
  const activeFilterCount =
    (fCompany ? 1 : 0) +
    (fStyle ? 1 : 0) +
    (fColor ? 1 : 0) +
    (fPrice ? 1 : 0);
  const sTerm = debouncedSearchQuery.trim().toLowerCase();
  const filteredItems = catalog
    .filter(
      (i) =>
        (cat === 'All' || i.cat === cat) &&
        (!sTerm ||
          i.t.toLowerCase().includes(sTerm) ||
          (COS[i.id] || '').toLowerCase().includes(sTerm) ||
          (i.cat || '').toLowerCase().includes(sTerm)) &&
        (!fCompany || COS[i.id] === fCompany || i.vendor === fCompany) &&
        (!fStyle || (i.styles ?? []).includes(fStyle)) &&
        (!fColor || (i.colors ?? []).includes(fColor)) &&
        inPriceRange(i.p),
    )
    .sort((a, b) =>
      sortBy === 'low'
        ? a.p - b.p
        : sortBy === 'high'
          ? b.p - a.p
          : sortBy === 'name'
            ? a.t.localeCompare(b.t)
            : 0,
    );

  // Calculate totals
  const totalItemCount = Object.values(eventQuotes).reduce(
    (sum, items) => sum + items.length,
    0
  );

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
      const coName = COS[itm.id] || itm.vendor || 'Everest Events & Decor';
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
        (id) => !prev.includes(id) && !userUncheckedCompaniesRef.current.has(id)
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
      ? 'Select a company'
      : selectedCompanyCount === 1
        ? 'Send request'
        : `Send to ${selectedCompanyCount} companies`;

  // Navigation index in planned events
  const currentEventIndex = plannedEvents.findIndex(
    (e) => e.name === activeEventName
  );
  const hasNextEvent =
    currentEventIndex >= 0 && currentEventIndex < plannedEvents.length - 1;
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

  // Toggle like
  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const openPlanModal = () => {
    setPlanError('');
    setPlanStep(0);
    // prefill with existing selections if available
    if (plannedEvents.length > 0) {
      setSelectedEventTypes(plannedEvents.map((e) => e.name));
      const datesMap: Record<string, string> = {};
      const venuesMap: Record<string, string> = {};
      plannedEvents.forEach((e) => {
        datesMap[e.name] = e.date;
        venuesMap[e.name] = e.venue;
      });
      setEventDates(datesMap);
      setEventVenues(venuesMap);
    } else {
      if (selectedEventTypes.length === 0) {
        setSelectedEventTypes([]);
      }
    }
    planDialogRef.current?.showModal();
  };

  const closePlanModal = () => {
    planDialogRef.current?.close();
    setPlanError('');
    setPendingItemId(null);
  };

  const openReviewModal = () => {
    reviewDialogRef.current?.showModal();
  };

  const closeReviewModal = () => {
    reviewDialogRef.current?.close();
  };

  const clearAllQuotes = () => {
    setEventQuotes({});
    reviewDialogRef.current?.close();
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
    setPlanMeta({ venue: '' });
    setEventQuotes({});
    setSelectedEventTypes([]);
    setEventDates({});
    setEventVenues({});
    setPlanStep(0);
    setPendingItemId(null);
    reviewDialogRef.current?.close();
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
      const nextEmptyAfter = afterEvents.find(
        (ev) => (eventQuotes[ev.name] || []).length === 0
      );
      if (nextEmptyAfter) return nextEmptyAfter;
    }

    // Fall back to any empty event if none comes after
    const anyEmpty = plannedEvents.find(
      (ev) => (eventQuotes[ev.name] || []).length === 0
    );
    return anyEmpty || null;
  };

  const nextEmptyReviewEvent = getNextEmptyEvent();

  const handleNextEmptyEventClick = (eventName: string) => {
    closeReviewModal();
    setActiveEventName(eventName);
    decorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSkipAndSend = (eventName: string) => {
    const confirmed = window.confirm(
      `${eventName} has no decorations. Send anyway?`
    );
    if (confirmed) {
      openContactModal();
    }
  };

  const openBuyNow = (item: DecorationItem) => {
    detailDialogRef.current?.close();
    setBuyNowItem(item);
    resetContactForm();
    setIsSubmitted(false);
    contactDialogRef.current?.showModal();
  };

  const openContactModal = () => {
    reviewDialogRef.current?.close();
    setBuyNowItem(null);
    resetContactForm();
    setIsSubmitted(false);
    contactDialogRef.current?.showModal();
  };

  const closeContactModal = () => {
    contactDialogRef.current?.close();
    resetContactForm();
    setIsSubmitted(false);
    setSubmitError('');
  };

  // Plan event type toggle
  const toggleEventType = (type: string) => {
    setSelectedEventTypes((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      if (next.length > 0) {
        setPlanError('');
      }
      return next;
    });
  };

  const totalPlanSteps = selectedEventTypes.length + 1;
  const stepEventName =
    planStep > 0 ? selectedEventTypes[planStep - 1] : null;
  const isLastPlanStep = planStep >= selectedEventTypes.length;
  const stepLabels = ['Events', ...selectedEventTypes];

  const handlePlanBack = () => {
    setPlanError('');
    setPlanStep((s) => Math.max(0, s - 1));
  };

  // Next / submit Plan popup ("Next →" ... "Start shopping →")
  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: event types
    if (planStep === 0) {
      if (selectedEventTypes.length === 0) {
        setPlanError('Please choose at least one event.');
        return;
      }
      setPlanError('');
      setPlanStep(1);
      return;
    }

    // Steps 2..n: date (+ venue) for one event
    const ev = selectedEventTypes[planStep - 1];
    if (!ev) return;
    const evDate = eventDates[ev];
    if (!evDate) {
      setPlanError(`Please choose a date for ${ev}.`);
      return;
    }
    if (todayStr && evDate < todayStr) {
      setPlanError(`Date for ${ev} cannot be in the past.`);
      return;
    }
    setPlanError('');

    if (!isLastPlanStep) {
      // Prefill the next event's venue with this one (still editable)
      const nextName = selectedEventTypes[planStep];
      if (nextName && !eventVenues[nextName]) {
        setEventVenues((prev) => ({
          ...prev,
          [nextName]: (ev && prev[ev]) || '',
        }));
      }
      setPlanStep(planStep + 1);
      return;
    }

    // Final step: sort events earliest date first
    const sorted: PlannedEvent[] = [...selectedEventTypes]
      .map((name) => ({
        name,
        date: eventDates[name] || '',
        venue: (eventVenues[name] || '').trim(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setPlannedEvents(sorted);
    if (sorted[0]) setPlanMeta({ venue: sorted[0].venue });

    // Keep active event or switch to first
    const targetEvent =
      activeEventName && sorted.some((e) => e.name === activeEventName)
        ? activeEventName
        : (sorted[0]?.name || '');
    setActiveEventName(targetEvent);

    // If a decoration was pending when clicked before planning, add it to first event
    if (pendingItemId !== null && sorted[0]) {
      const firstEventName = sorted[0].name;
      setEventQuotes((prev) => {
        const cur = prev[firstEventName] || [];
        return {
          ...prev,
          [firstEventName]: cur.includes(pendingItemId)
            ? cur
            : [...cur, pendingItemId],
        };
      });
      setPendingItemId(null);
    }

    planDialogRef.current?.close();
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
    const name = contactName.trim() || (formData.get('name') as string) || '';
    const phone = contactPhone.trim() || (formData.get('phone') as string) || '';
    const whatsappNumber = (whatsappSameAsPhone ? phone : (contactWhatsapp.trim() || (formData.get('whatsapp') as string) || phone)).trim();
    const message = (formData.get('message') as string) || '';
    const toLine = (id: number) => {
      const item = catalog.find((i) => i.id === id);
      const isSecond =
        item?.id === 9101 ||
        item?.id === 9102 ||
        item?.sid?.startsWith('dummy-royal-orchid') ||
        item?.ownerCompanyId === 'company-2' ||
        item?.vendor === 'Royal Orchid Events';
      const ownerCompanyId = item?.ownerCompanyId || (isSecond ? 'company-2' : 'company-1');
      const ownerCompanyName =
        item?.ownerCompanyName ||
        (isSecond ? (item?.vendor || 'Royal Orchid Events') : (COS[id] || item?.vendor || 'Company 1'));

      const specs = item ? getSpecs(item) : null;
      const dimensions = specs?.dimensions || formatDimensions(item?.dimensions) || '';
      const style = item?.styles?.length ? item.styles.join(', ') : (specs?.floral?.style || '');
      const colours = item?.colors?.length ? item.colors.join(', ') : (specs?.floral?.color || '');
      const structure = specs?.structure && specs.structure !== 'Standard' ? specs.structure : (item?.cat || '');
      const platform = specs?.platform ? [specs.platform.name, specs.platform.size, specs.platform.color].filter(Boolean).join(' · ') : '';
      const lighting = specs?.lighting ? `${specs.lighting.name}${specs.lighting.qty ? ` (${specs.lighting.qty})` : ''}` : '';
      const flowers = specs?.floral?.style || '';

      const inclusions: string[] = [];
      if (Array.isArray(item?.inclusions) && item.inclusions.length > 0) {
        inclusions.push(...item.inclusions);
      } else {
        if (structure && structure !== 'Standard') inclusions.push(`Structure: ${structure}`);
        if (flowers) inclusions.push(`Floral: ${flowers}`);
        if (platform) inclusions.push(`Platform: ${platform}`);
        if (lighting) inclusions.push(`Lighting: ${lighting}`);
        if (specs?.addons?.length) {
          specs.addons.forEach((a: any) => inclusions.push(`${a.title}${a.sub ? ` (${a.sub})` : ''}`));
        }
      }

      const rawGallery = [
        item?.img,
        ...(Array.isArray(item?.images) ? item.images : []),
      ].filter((u): u is string => Boolean(u));
      const gallery = [...new Set(rawGallery)];

      return {
        id: item?.sid ?? String(id),
        decorationId: item?.sid ?? String(id),
        title: item?.t ?? '',
        name: item?.t ?? '',
        category: item?.cat ?? '',
        image: item?.img ?? '',
        photo: item?.img ?? '',
        gallery: gallery.length > 0 ? gallery : undefined,
        price: item?.p ?? 0,
        listedPrice: item?.p ?? 0,
        priceUnit: item?.priceUnit || (item as any)?.price_unit || 'per setup',
        description: item?.d ?? specs?.summary ?? '',
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
          type: 'direct-order',
          name,
          phone,
          whatsappNumber,
          whatsappSameAsPhone,
          message,
          venue: (formData.get('venue') as string) || '',
          grandTotal: buyNowItem.p,
          // A direct order goes to the company that owns this decoration.
          companies: [toLine(buyNowItem.id).ownerCompanyName || buyNowItem.vendor || 'Everest Events & Decor'],
          events: [
            {
              name: 'Direct order',
              date: (formData.get('date') as string) || '',
              venue: (formData.get('venue') as string) || '',
              decorations: [toLine(buyNowItem.id)],
              subtotal: buyNowItem.p,
            },
          ],
        }
      : {
          type: 'quotation-request',
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

    setSubmitError('');
    // One key per request: a retry of the same request reuses its ids, so it can never create duplicates.
    if (!submissionKeyRef.current) {
      submissionKeyRef.current = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    payload.submissionKey = submissionKeyRef.current;
    sendingRef.current = true;
    setIsSending(true);
    try {
      await submitEnquiry(payload);
      submissionKeyRef.current = '';
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? `${err.message}. Please try again, or contact us directly.`
          : 'Could not send your request. Please try again.'
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
    setPlanMeta({ venue: '' });
    setEventQuotes({});
    setSelectedEventTypes([]);
    setEventDates({});
    setEventVenues({});
    setPlanStep(0);
    setPendingItemId(null);
    setIsSubmitted(true);
  };

  // Backdrop click handler with mousedown guard to prevent accidental closure on drag
  const mouseDownOnBackdropRef = useRef(false);

  const handleDialogMouseDown = (
    e: React.MouseEvent<HTMLDialogElement>,
    dialogRef: React.RefObject<HTMLDialogElement | null>
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
    dialogRef: React.RefObject<HTMLDialogElement | null>
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
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div
          className="ph"
          style={{
            background: `linear-gradient(160deg, ${item.g[0]}, ${item.g[1]})`,
          }}
        >
          <svg
            viewBox="0 0 300 375"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: ART[item.cat] || '',
            }}
          />
          <img
            src={item.images?.[0] ?? item.img}
            alt={item.t}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="cn">{COS[item.id] || item.vendor || 'Everest Events & Decor'}</span>
          {cat === 'All' && <span className="tag">{item.cat}</span>}
          <button
            type="button"
            className={`heart${liked.has(item.id) ? ' on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(item.id);
            }}
            aria-label={liked.has(item.id) ? `Saved ${item.t}` : `Save ${item.t}`}
            aria-pressed={liked.has(item.id)}
          >
            {liked.has(item.id) ? '♥' : '♡'}
          </button>
        </div>
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
              {item.u || ''}
            </b>
          </div>
        </div>
      </article>
    );
  };

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
              window.location.href = '/';
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

        <SearchInput
          ref={mobileSearchInputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search decorations"
          ariaLabel="Search decorations"
          className="mobile-header-search"
        />

        <button
          type="button"
          className="mobile-icon-btn mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          title="Menu"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">Menu</span>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openPlanModal();
                }}
              >
                <span>✨ Plan your event</span>
                <span className="drawer-arrow">→</span>
              </button>
              {totalItemCount > 0 && (
                <button
                  type="button"
                  className="drawer-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openReviewModal();
                  }}
                >
                  <span>🛍️ Review quotation ({totalItemCount})</span>
                  <span className="drawer-arrow">→</span>
                </button>
              )}
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  setMobileMenuOpen(false);
                  decorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Browse all decorations</span>
                <span className="drawer-arrow">→</span>
              </button>
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setFilterSheetOpen(true);
                }}
              >
                <span>Filter &amp; sort</span>
                <span className="drawer-arrow">→</span>
              </button>
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSendRequestPreview(true);
                }}
              >
                <span>📋 Preview "Send Request" UI</span>
                <span className="drawer-arrow">→</span>
              </button>
              <a
                href="/dashboard"
                className="drawer-nav-item"
                style={{ textDecoration: "none" }}
              >
                <span>🏢 Company Dashboard</span>
                <span className="drawer-arrow">→</span>
              </a>
            </nav>
            <div className="mobile-drawer-foot">
              <p className="drawer-tagline">Luxury Wedding &amp; Event Production</p>
              <p className="drawer-phone">Kathmandu &amp; Pokhara · Nepal</p>
            </div>
          </div>
        </div>
      )}
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
                    className={`event-pill${isActive ? ' active' : ''}`}
                    onClick={() => {
                      if (isActive) {
                        openPlanModal();
                      } else {
                        setActiveEventName(ev.name);
                      }
                    }}
                  >
                    <span className="num-badge">{idx + 1}</span>
                    <span style={{ fontWeight: isActive ? 600 : 500 }}>
                      {ev.name}
                    </span>
                    <span style={{ opacity: 0.65 }}>·</span>
                    <span style={{ fontSize: '11px' }}>
                      {formatDate(ev.date)}
                    </span>
                    <span style={{ opacity: 0.65 }}>·</span>
                    <span className="count-badge">
                      {count} item{count === 1 ? '' : 's'}
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
                className={`pill cancel-plan${confirmCancelPlan ? ' confirm' : ''}`}
                onClick={handleCancelPlan}
                aria-label="Cancel plan and remove all selected items"
                title="Cancel plan"
              >
                {confirmCancelPlan ? (
                  <span>Sure?</span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
<span className="edit-plan-text">Cancel plan</span>
                  </>
                )}
              </button>
          </div>
        </aside>
      )}

      {/* Page header */}
      <header className="page-hero">
        <div className="page-hero-in">
          <span className="page-hero-badge">Wedding Events</span>
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
              <span>{catalogLoading ? 'Checking...' : companyCount === 1 ? 'Company' : 'Companies'}</span>
            </div>
            <div>
              {catalogLoading ? (
                <div className="skeleton-stat-num skeleton-pulse" />
              ) : (
                <b className="serif">{catalog.length}</b>
              )}
              <span>{catalogLoading ? 'Loading...' : catalog.length === 1 ? 'Decoration' : 'Decorations'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Company decoration strip (carousel) */}
      {catalogLoading ? (
        <section className="strip-sec" aria-label="Loading featured decorations">
          <div className="co-row strip-wrap">
            <div className="co-track strip-track skeleton-strip-track">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="strip-card skeleton-strip-card">
                  <div className="strip-img skeleton-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : catalog.length > 0 ? (
        <section className="strip-sec">
          <div className="co-row strip-wrap">
            {catalog.length > 1 && (
              <button
                type="button"
                className="strip-arrow left"
                aria-label="Scroll left"
                onClick={(e) => scrollCarousel(e.currentTarget, -1)}
              >
                ‹
              </button>
            )}
            <div
              className="co-track strip-track"
              ref={stripRef}
              onMouseEnter={() => (stripPaused.current = true)}
              onMouseLeave={() => (stripPaused.current = false)}
              onTouchStart={() => (stripPaused.current = true)}
              onTouchEnd={() => (stripPaused.current = false)}
              onFocus={() => (stripPaused.current = true)}
              onBlur={() => (stripPaused.current = false)}
              onScroll={(e) => {
                const el = e.currentTarget;
                const card = el.querySelector<HTMLElement>('.strip-card');
                if (card && card.offsetWidth > 0) {
                  const cardW = card.offsetWidth + 12;
                  const idx = Math.round(el.scrollLeft / cardW);
                  setStripActiveIdx(idx % Math.min(catalog.length, 6));
                }
              }}
            >
              {catalog.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="strip-card"
                  onClick={() => {
                    window.location.href = `/decor/${getDecorationSlug(item)}`;
                  }}
                  aria-label={`View ${item.t} by ${COS[item.id] || item.vendor}`}
                >
                  <div
                    className="strip-img"
                    style={{
                      background: `linear-gradient(160deg, ${item.g[0]}, ${item.g[1]})`,
                    }}
                  >
                    <img
                      src={item.img}
                      alt={item.t}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="strip-cap">
                      <b>{COS[item.id] || item.vendor}</b>
                      <span>{item.t}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {catalog.length > 1 && (
              <button
                type="button"
                className="strip-arrow right"
                aria-label="Scroll right"
                onClick={(e) => scrollCarousel(e.currentTarget, 1)}
              >
                ›
              </button>
            )}
          </div>

          {/* Carousel pagination dots on mobile */}
          {catalog.length > 1 && (
            <div className="carousel-dots" aria-hidden="true">
              {Array.from({ length: Math.min(catalog.length, 6) }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`carousel-dot${stripActiveIdx === i ? ' active' : ''}`}
                  onClick={() => {
                    const el = stripRef.current;
                    if (!el) return;
                    const card = el.querySelector<HTMLElement>('.strip-card');
                    if (card && card.offsetWidth > 0) {
                      const cardW = card.offsetWidth + 12;
                      el.scrollTo({ left: i * cardW, behavior: 'smooth' });
                      setStripActiveIdx(i);
                    }
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* 2. Decorations Section */}
      <section className="sec" ref={decorSectionRef}>
        <div className="in" style={{ maxWidth: 1350 }}>
          <div className="catalog-head">
            <div>
              <h2 className="serif catalog-title">
                Find your perfect <em>decor</em>
              </h2>
              <p className="catalog-sub">
                Stage, entrance, mandap, backdrops and more. Add what you love to
                your quotation.
              </p>
            </div>
            <span className="catalog-count" id="cnt">
              {filteredItems.length} decoration
              {filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* 1px sentinel element for IntersectionObserver to detect when chips bar is stuck */}
          <div ref={chipsSentinelRef} className="chips-sentinel" aria-hidden="true" />

          {/* Sticky wrapper for plan pill + chips + filters/sort on mobile (< 768px) */}
          <div
            ref={chipsBarRef}
            className={`chips-sticky-wrapper chips-sticky${isChipsStuck ? ' is-stuck' : ''}`}
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
                        className={`event-pill${isActive ? ' active' : ''}`}
                        onClick={() => {
                          if (isActive) {
                            openPlanModal();
                          } else {
                            setActiveEventName(ev.name);
                          }
                        }}
                      >
                        <span className="num-badge">{idx + 1}</span>
                        <span style={{ fontWeight: isActive ? 600 : 500 }}>
                          {ev.name}
                        </span>
                        <span style={{ opacity: 0.65 }}>·</span>
                        <span style={{ fontSize: '11px' }}>
                          {formatDate(ev.date)}
                        </span>
                        <span style={{ opacity: 0.65 }}>·</span>
                        <span className="count-badge">
                          {count} item{count === 1 ? '' : 's'}
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
                  className={`pill cancel-plan${confirmCancelPlan ? ' confirm' : ''}`}
                  onClick={handleCancelPlan}
                  aria-label="Cancel plan and remove all selected items"
                  title="Cancel plan"
                >
                  {confirmCancelPlan ? (
                  <span>Sure?</span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
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
                  className={`cat${c === cat ? ' on' : ''}`}
                  onClick={() => handleSelectCat(c)}
                >
                  <span
                    className="ic"
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[c] ?? ICONS['Stage']}</svg>`,
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
                className={`pill mobile-filter-btn${activeFilterCount > 0 ? ' on' : ''}`}
                onClick={() => {
                  setFilterSheetTab('filter');
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
                <span>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </span>
              </button>
              <button
                type="button"
                className={`pill mobile-filter-btn${sortBy !== 'featured' ? ' on' : ''}`}
                onClick={() => {
                  setFilterSheetTab('sort');
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
                  <path d="m3 16 4 4 4-4" />
                  <path d="M7 20V4" />
                  <path d="m21 8-4-4-4 4" />
                  <path d="M17 4v16" />
                </svg>
                <span>
                  Sort
                  {sortBy !== 'featured'
                    ? ` · ${sortBy === 'low' ? 'Low' : sortBy === 'high' ? 'High' : 'A-Z'}`
                    : ''}
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
                {(fCompany ? 1 : 0) +
                  (fStyle ? 1 : 0) +
                  (fColor ? 1 : 0) +
                  (fPrice ? 1 : 0) +
                  (sortBy !== 'featured' ? 1 : 0) >
                  0 &&
                  ` · ${(fCompany ? 1 : 0) + (fStyle ? 1 : 0) + (fPrice ? 1 : 0) + (sortBy !== 'featured' ? 1 : 0)}`}
              </span>
              <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
            </button>
            <div
              className={`filters${filtersOpen ? ' open' : ''}`}
              role="group"
              aria-label="Filter and sort decorations"
            >
              <SearchInput
                ref={desktopSearchInputRef}
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search decorations, companies, or categories... (Press '/' to focus)"
                ariaLabel="Search decorations, companies, or categories"
              />
              {companyOptions.length > 0 && (
                <select
                  aria-label="Company"
                  value={fCompany}
                  onChange={(e) => setFCompany(e.target.value)}
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
                    setFCompany('');
                    setFStyle('');
                    setFColor('');
                    setFPrice('');
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
              touchAction: 'pan-y',
            }}
          >
            {catalogLoading ? (
              <div className="cards-grid skeleton-grid" aria-label="Loading decorations">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
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
                  swipeDirection === 'next'
                    ? ' cards-swipe-next'
                    : swipeDirection === 'prev'
                    ? ' cards-swipe-prev'
                    : ''
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
                      {filtersActive || searchQuery
                        ? 'No decorations match your search'
                        : 'No decorations found'}
                    </h3>
                    <p className="filters-empty-sub">
                      {filtersActive || searchQuery
                        ? 'Try clearing some filters or searching for different keywords.'
                        : 'There are no active decorations in this category at the moment.'}
                    </p>
                    {(filtersActive || searchQuery || cat !== 'All') && (
                      <button
                        type="button"
                        className="filters-empty-clear-btn"
                        onClick={() => {
                          handleSearchChange('');
                          setFCompany('');
                          setFStyle('');
                          setFColor('');
                          setFPrice('');
                          setCat('All');
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
              <p>Done shopping for <b>{activeEventName}</b>?</p>
              <button
                type="button"
                className="pill pri next-event-btn"
                onClick={() => {
                  setActiveEventName(nextEvent.name);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
          className={`pill pri plan-btn${fabHidden ? ' plan-btn--hide' : ''}`}
          onClick={openPlanModal}
          aria-label="Plan your event"
        >
          ✨ Plan your event
        </button>
      )}

      {/* 4. Floating quotation bottom bar (when planned and items are chosen) */}
      <div className={`bar${totalItemCount > 0 ? ' show' : ''}`} id="bar">
        <span id="qc" className="bar-count-text">
          {totalItemCount} item{totalItemCount > 1 ? 's' : ''} in quotation
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
                  (e.currentTarget as HTMLElement).style.display = 'none';
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
                        className={`thumb${i === Math.min(photoIdx[detailItem.id] ?? 0, photoCount(detailItem) - 1) ? ' on' : ''}`}
                        aria-label={`Photo ${i + 1} of ${photoCount(detailItem)}`}
                        onClick={() => setPhotoIdx((p) => ({ ...p, [detailItem.id]: i }))}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                className="detail-x"
                onClick={closeDetail}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-meta">
                <span className="detail-cat">{detailItem.cat}</span>
                <span>by {COS[detailItem.id] || detailItem.vendor || 'Everest Events & Decor'}</span>
              </div>
              <h2 className="serif" id="detail-title">
                {detailItem.t}
              </h2>
              {detailItem.d && (
                <p className="detail-desc" style={{ color: 'var(--mute)', fontSize: '13.5px', marginTop: '6px', marginBottom: '16px', lineHeight: 1.5 }}>
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
                        <dd>{typeof detailSpecs.structure === 'string' && detailSpecs.structure ? detailSpecs.structure : detailItem.cat}</dd>
                      </div>
                      <div>
                        <dt>Dimensions</dt>
                        <dd>
                          {typeof detailSpecs.dimensions === 'string' && detailSpecs.dimensions
                            ? detailSpecs.dimensions
                            : (detailSpecs.dimensions && typeof detailSpecs.dimensions === 'object'
                              ? `${(detailSpecs.dimensions as any).width_ft || (detailSpecs.dimensions as any).width || ''} × ${(detailSpecs.dimensions as any).height_ft || (detailSpecs.dimensions as any).height || ''} ft`
                              : 'Standard dimensions')}
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
                          <dd>{typeof detailSpecs.floral.style === 'string' ? detailSpecs.floral.style : 'Floral arrangement'}</dd>
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
                            f.colour || (detailSpecs.floral.color && detailSpecs.floral.color !== '-' ? detailSpecs.floral.color : '');
                          return (
                            <div className="spec-row" key={`${f.name}-${i}`}>
                              <div>
                                <b>{f.name}</b>
                                <small>
                                  Variety: {f.kind}
                                  {colour ? ` · Colour: ${colour}` : ''}
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

                  {(detailSpecs.platform || detailSpecs.lighting || (detailSpecs.addons?.length ?? 0) > 0) && (
                    <section className="spec-sec">
                      <h4>Included add-ons</h4>
                      {detailSpecs.platform && typeof detailSpecs.platform === 'object' && (
                        <div className="spec-row">
                          <div>
                            <b>Platform · {detailSpecs.platform.name}</b>
                            <small>
                              {detailSpecs.platform.size} · {detailSpecs.platform.color}
                            </small>
                          </div>
                          <strong>{detailSpecs.platform.price != null ? fmt(detailSpecs.platform.price) : 'Included'}</strong>
                        </div>
                      )}
                      {Array.isArray(detailSpecs.addons) &&
                        detailSpecs.addons.map((a, i) => (
                          <div className="spec-row" key={`${a.title}-${i}`}>
                            <div>
                              <b>{a.title}</b>
                              {a.sub && <small>{a.sub}</small>}
                            </div>
                            <strong>{a.price > 0 ? fmt(a.price) : 'Included'}</strong>
                          </div>
                        ))}
                      {detailSpecs.lighting && typeof detailSpecs.lighting === 'object' && (
                        <div className="spec-row">
                          <div>
                            <b>Lighting · {detailSpecs.lighting.name}</b>
                            <small>Quantity: {detailSpecs.lighting.qty}</small>
                          </div>
                          <strong>{detailSpecs.lighting.price != null ? fmt(detailSpecs.lighting.price) : 'Included'}</strong>
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
                    {detailItem.u || ''}
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
                      ? '✓ Added to quotation'
                      : '+ Add to quotation'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>

      {/* 5. Plan Popup Dialog */}
      <dialog
        id="inq"
        ref={planDialogRef}
        onMouseDown={(e) => handleDialogMouseDown(e, planDialogRef)}
        onClick={(e) => handleBackdropClick(e, planDialogRef)}
        aria-labelledby="plan-title"
      >
        <div className="stepper" aria-label={`Step ${planStep + 1} of ${totalPlanSteps}`}>
          <div className="stepper-meta">
            <strong>
              Step {planStep + 1} of {totalPlanSteps}
            </strong>
            <span>{planStep === 0 ? 'Choose events' : `${stepEventName} details`}</span>
          </div>
          <div className="stepper-track">
            {stepLabels.map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className={`step-bar${planStep >= i ? ' done' : ''}`}>
                    <span />
                  </div>
                )}
                <div
                  className={`step-dot${
                    planStep > i ? ' done' : planStep === i ? ' active' : ''
                  }`}
                >
                  {planStep > i ? '✓' : i + 1}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="step-labels">
            {stepLabels.map((l, i) => (
              <span key={i} className={planStep === i ? 'active' : ''}>
                {l}
              </span>
            ))}
          </div>
        </div>

        <h2 className="serif" id="plan-title">
          Plan your event
        </h2>
        <div
          style={{
            color: 'var(--mute)',
            fontSize: '12px',
            marginBottom: 16,
          }}
        >
          Tell us about your celebration and our team will call you with ideas
          and a quotation.
        </div>

        <form onSubmit={handlePlanSubmit}>
          <div className="form-grid">
            {planStep === 0 && (
              <div className="form-col-full">
                <label id="plan-events-label">
                  Event type{' '}
                  <span style={{ color: 'var(--mute)', fontWeight: 400 }}>
                    (choose one or more)
                  </span>
                </label>
                <div
                  className="type-pills"
                  role="group"
                  aria-labelledby="plan-events-label"
                >
                  {EVENT_TYPES.map((type) => {
                    const isSelected = selectedEventTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`type-pill${isSelected ? ' selected' : ''}`}
                        onClick={() => toggleEventType(type)}
                        role="checkbox"
                        aria-checked={isSelected}
                      >
                        {isSelected && (
                          <span style={{ fontWeight: 700, fontSize: '11px' }}>
                            ✓
                          </span>
                        )}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {stepEventName && (
              <>
                <div className="form-col-full">
                  <label htmlFor={`date-${stepEventName}`} style={{ marginBottom: 10, display: 'block' }}>
                    {stepEventName} date *
                  </label>
                  <EventDatePicker
                    value={eventDates[stepEventName] || ''}
                    onChange={(newIso) => {
                      setEventDates((prev) => ({
                        ...prev,
                        [stepEventName]: newIso,
                      }));
                      setPlanError('');
                    }}
                    minDate={todayStr}
                    eventName={stepEventName}
                  />
                </div>
                <div className="form-col-full">
                  <label htmlFor={`venue-${stepEventName}`}>
                    {stepEventName} venue / location
                  </label>
                  <input
                    id={`venue-${stepEventName}`}
                    placeholder="e.g. Hotel Yak & Yeti, Kathmandu"
                    value={eventVenues[stepEventName] || ''}
                    onChange={(e) =>
                      setEventVenues((prev) => ({
                        ...prev,
                        [stepEventName]: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>

          {planError && (
            <div
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: 12,
                fontWeight: 500,
              }}
            >
              {planError}
            </div>
          )}

          <div className="acts">
            {planStep === 0 ? (
              <button type="button" className="pill" onClick={closePlanModal}>
                Cancel
              </button>
            ) : (
              <button type="button" className="pill" onClick={handlePlanBack}>
                ← Back
              </button>
            )}
            <button type="submit" className="pill pri">
              {planStep > 0 && isLastPlanStep
                ? 'Start shopping →'
                : 'Next →'}
            </button>
          </div>
        </form>
      </dialog>

      {/* 6. Review Popup Dialog */}
      <dialog
        id="review-dialog"
        ref={reviewDialogRef}
        onMouseDown={(e) => handleDialogMouseDown(e, reviewDialogRef)}
        onClick={(e) => handleBackdropClick(e, reviewDialogRef)}
        aria-labelledby="review-title"
      >
        <div className="review-dialog-header">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <h2 className="serif" id="review-title" style={{ margin: 0 }}>
                Your quotation
              </h2>
              <div
                style={{
                  color: 'var(--mute)',
                  fontSize: '12px',
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
                position: 'static',
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 0,
                background: '#f5eff2',
                color: 'var(--mute)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: '14px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="review-dialog-body">
          {plannedEvents.length === 0 || totalItemCount === 0 ? (
            <div
              style={{
                padding: '36px 12px',
                textAlign: 'center',
                color: 'var(--mute)',
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
                        <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                          {ev.name}
                        </strong>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--mute)',
                            marginLeft: 8,
                          }}
                        >
                          · {formatDate(ev.date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'var(--card)',
                          padding: '2px 8px',
                          borderRadius: 12,
                          border: '1px solid var(--line)',
                          color: 'var(--brand)',
                          fontWeight: 600,
                        }}
                      >
                        {items.length} item{items.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--mute)',
                          padding: '6px 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <span>No decorations added for this event yet.</span>
                        <button
                          type="button"
                          onClick={() => {
                            closeReviewModal();
                            setActiveEventName(ev.name);
                            decorSectionRef.current?.scrollIntoView({
                              behavior: 'smooth',
                            });
                          }}
                          style={{
                            background: 'none',
                            border: 0,
                            padding: 0,
                            color: 'var(--brand)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          + Add decorations
                        </button>
                      </div>
                    ) : (
                      <ul className="list" style={{ margin: '6px 0' }}>
                        {items.map((item) => (
                          <li
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '8px 0',
                            }}
                          >
                            <img
                              src={item.img}
                              alt=""
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                objectFit: 'cover',
                                flex: '0 0 38px',
                              }}
                            />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 500 }}>
                                {item.t}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '11.5px',
                                  color: 'var(--brand)',
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
                                  [ev.name]: (prev[ev.name] || []).filter(
                                    (id) => id !== item.id
                                  ),
                                }));
                              }}
                              title="Remove item"
                              style={{
                                border: 0,
                                background: 'none',
                                color: 'var(--mute)',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                fontSize: '14px',
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0 4px',
                  fontSize: '16px',
                }}
              >
                <span>Estimated Grand Total</span>
                <b className="price">{fmt(grandTotal)}</b>
              </div>
            </div>
          )}
        </div>

        <div className="acts review-dialog-footer">
          <button
            type="button"
            className="pill review-clear-btn"
            onClick={clearAllQuotes}
            disabled={totalItemCount === 0}
          >
            Clear all
          </button>
          <button
            type="button"
            className="pill review-close-btn"
            onClick={closeReviewModal}
          >
            Close
          </button>
          {nextEmptyReviewEvent ? (
            <div
              className="review-send-btn-wrap"
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
              }}
            >
              <button
                type="button"
                className="pill pri review-primary-btn"
                onClick={() =>
                  handleNextEmptyEventClick(nextEmptyReviewEvent.name)
                }
                disabled={totalItemCount === 0}
              >
                Next: {nextEmptyReviewEvent.name} →
              </button>
              <button
                type="button"
                className="review-skip-link"
                onClick={() => handleSkipAndSend(nextEmptyReviewEvent.name)}
                style={{
                  background: 'none',
                  border: 0,
                  padding: '2px 0',
                  color: 'var(--mute)',
                  fontSize: '11px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
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
        </div>
      </dialog>

      {/* 7. Contact Popup Dialog */}
      <dialog
        id="contact-dialog"
        ref={contactDialogRef}
        onMouseDown={(e) => handleDialogMouseDown(e, contactDialogRef)}
        onClick={(e) => handleBackdropClick(e, contactDialogRef)}
        onClose={() => setBuyNowItem(null)}
        aria-labelledby="contact-title"
      >
        {isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div
              style={{ fontSize: 52, marginBottom: 12 }}
              role="img"
              aria-label="Celebration"
            >
              🎉
            </div>
            <h2 className="serif" style={{ fontSize: 32, margin: '0 0 10px' }}>
              Thank you!
            </h2>
            <p
              style={{
                color: 'var(--mute)',
                fontSize: 13,
                maxWidth: 380,
                margin: '0 auto 24px',
                lineHeight: 1.6,
              }}
            >
              {buyNowItem
                ? `We have received your order for ${buyNowItem.t}. Our team will come to you with your quotation.`
                : 'We have received your request. Our team will come to you with your quotation.'}
            </p>
            <button type="button" className="pill pri" onClick={closeContactModal}>
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="serif" id="contact-title">
              {buyNowItem ? 'Buy this decoration' : 'Finalize inquiry'}
            </h2>
            {buyNowItem && (
              <div className="buy-summary">
                <img src={photoOf(buyNowItem)} alt={buyNowItem.t} />
                <div>
                  <b>{buyNowItem.t}</b>
                  <small>
                    by {buyNowItem.ownerCompanyName || buyNowItem.vendor || COS[buyNowItem.id] || 'Everest Events & Decor'}
                  </small>
                </div>
                <strong>
                  {fmtItem(buyNowItem.p)}
                  {buyNowItem.u || ''}
                </strong>
              </div>
            )}
            <div
              className="contact-dialog-privacy"
              style={{
                color: 'var(--mute)',
                fontSize: '12px',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              Please enter your contact details so our team can follow up with
              your personalized proposal. Your name, phone number, and WhatsApp number
              will be shared with the selected companies.
            </div>

            <form ref={contactFormRef} onSubmit={handleContactSubmit} className="contact-form">
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
                    {getPhoneError(contactPhone, 'Phone number')}
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
                  className={whatsappSameAsPhone ? 'contact-input-disabled' : ''}
                  aria-invalid={
                    (!whatsappSameAsPhone ? whatsappTouched : phoneTouched) &&
                    !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp)
                  }
                />
                {((!whatsappSameAsPhone && whatsappTouched) || (whatsappSameAsPhone && phoneTouched)) &&
                  !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp) && (
                    <span className="contact-field-error" role="alert">
                      {getPhoneError(whatsappSameAsPhone ? contactPhone : contactWhatsapp, 'WhatsApp number')}
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
                    <input
                      id="contact-date"
                      name="date"
                      type="date"
                      min={todayStr}
                    />
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
                    minHeight: '84px',
                    maxHeight: '240px',
                    resize: 'vertical',
                    overflowY: 'auto',
                  }}
                />
              </div>

              {submitError && (
                <p role="alert" style={{ color: '#c0392b', fontSize: 13, margin: '0 0 12px' }}>
                  {submitError}
                </p>
              )}

              <div className="acts">
                <button
                  type="button"
                  className="pill"
                  onClick={closeContactModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pill pri"
                  disabled={
                    isSending ||
                    !contactName.trim() ||
                    !isValidPhone(contactPhone) ||
                    !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp)
                  }
                >
                  {isSending ? 'Sending…' : buyNowItem ? 'Place order' : 'Send request'}
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>

      {/* Mobile Filter Bottom Sheet Modal */}
      {filterSheetOpen && (
        <div
          className="filter-sheet-overlay"
          onClick={() => setFilterSheetOpen(false)}
        >
          <div
            className="filter-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort decorations"
          >
            <div className="sheet-handle-bar">
              <div className="sheet-handle" />
            </div>

            <div className="sheet-header">
              <h3 className="serif">Filter &amp; Sort</h3>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setFilterSheetOpen(false)}
                aria-label="Close filter sheet"
              >
                ✕
              </button>
            </div>

            <div className="sheet-body">
              {/* Company */}
              <div className="sheet-sec">
                <span className="sheet-sec-title">Company</span>
                <div className="sheet-pills">
                  <button
                    type="button"
                    className={`sheet-pill${!fCompany ? ' on' : ''}`}
                    onClick={() => setFCompany('')}
                  >
                    All Companies
                  </button>
                  {companyOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sheet-pill${fCompany === c ? ' on' : ''}`}
                      onClick={() => setFCompany(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="sheet-sec">
                <span className="sheet-sec-title">Price Range</span>
                <div className="sheet-pills">
                  <button
                    type="button"
                    className={`sheet-pill${!fPrice ? ' on' : ''}`}
                    onClick={() => setFPrice('')}
                  >
                    Any Price
                  </button>
                  {PRICE_RANGES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`sheet-pill${fPrice === r.id ? ' on' : ''}`}
                      onClick={() => setFPrice(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort by */}
              <div className="sheet-sec">
                <span className="sheet-sec-title">Sort By</span>
                <div className="sheet-pills">
                  {[
                    { id: 'featured', label: 'Featured' },
                    { id: 'low', label: 'Price: Low to High' },
                    { id: 'high', label: 'Price: High to Low' },
                    { id: 'name', label: 'Name: A - Z' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`sheet-pill${sortBy === s.id ? ' on' : ''}`}
                      onClick={() => setSortBy(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles */}
              {styleOptions.length > 0 && (
                <div className="sheet-sec">
                  <span className="sheet-sec-title">Style</span>
                  <div className="sheet-pills">
                    <button
                      type="button"
                      className={`sheet-pill${!fStyle ? ' on' : ''}`}
                      onClick={() => setFStyle('')}
                    >
                      All Styles
                    </button>
                    {styleOptions.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`sheet-pill${fStyle === st ? ' on' : ''}`}
                        onClick={() => setFStyle(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {(fCompany || fPrice || fStyle || sortBy !== 'featured') && (
                <button
                  type="button"
                  className="sheet-reset"
                  onClick={() => {
                    setFCompany('');
                    setFPrice('');
                    setFStyle('');
                    setFColor('');
                    setSortBy('featured');
                  }}
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                className="pill pri sheet-apply"
                onClick={() => setFilterSheetOpen(false)}
              >
                Apply Filters ({filteredItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

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