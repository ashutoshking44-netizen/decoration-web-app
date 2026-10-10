// Connects this dashboard to the shared API (server/index.mjs) so the public
// client site can show the decorations uploaded here and send enquiries back.
//   • publishes the decoration catalogue whenever it changes
//   • pulls enquiries/quotation requests sent from the client site
import { loadProfile } from "./company-profile";
import { convertAdToBs } from "./event-schedule";
import {
  loadStoredSetups,
  getSetupsCacheVersion,
  getSharedPublicDecoration,
  type DecorationSetupItem,
} from "./decoration-setups";
import {
  loadStoredEnquiries,
  saveStoredEnquiries,
  buildDecorationSnapshot,
  type EnquiryEvent,
  type EnquiryItem,
} from "./enquiries";
import { upsertEnquiryInSupabase } from "./supabase-service";
import { extractPrice, extractSpecs, formatTitle } from "@/components/company/decoration-catalog-card";

export const ENQUIRIES_SYNCED_EVENT = "enquiries-synced";
const POLL_MS = 10_000;

export function getApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window === "undefined") return "http://localhost:4000";
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

/** Shape the client site reads (kept free of dashboard-only fields). */
interface PublicDecoration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  price: number;
  images: string[];
  events: string[];
  structure: string;
  dimensions: string;
  flowers: string;
  platform: string;
  /** Same floral details the admin view shows. */
  floral: { style: string; varietyType: string; flowers: { name: string; kind: string; colour: string }[] };
  /** Platform / lighting / furniture that come with the design. */
  addons: { title: string; sub: string; price: number }[];
  /** For the client site's Style and Color filters. */
  styles: string[];
  colors: string[];
  vendor: string;
  companyId?: string | undefined;
  companyName?: string | undefined;
  updatedAt: string;
}

const cleanFlowerName = (n: string) => n.replace(/^(Natural |Fresh |Artificial |Silk )+/i, "");

function floralDetails(setup: DecorationSetupItem): PublicDecoration["floral"] {
  const specs = setup.specifications;
  const list = specs?.flowers_used === false ? [] : (specs?.flowers ?? []);
  const flowers = list.map((f) => ({
    name: cleanFlowerName(f.name),
    kind:
      f.type === "natural"
        ? "Fresh"
        : f.type === "artificial"
          ? "Silk / Artificial"
          : f.natural_percent !== undefined
            ? `Mixed (${f.natural_percent}% fresh · ${100 - f.natural_percent}% silk)`
            : "Mixed",
    colour: f.colour ?? "",
  }));
  if (list.length === 0) return { style: "Structure only", varietyType: "", flowers };
  return {
    style: list.length > 1 ? "Mixed Floral Arrangement" : `${flowers[0]?.name || "Floral"} Theme`,
    varietyType: list.every((f) => f.type === "natural")
      ? "Natural / Fresh"
      : list.every((f) => f.type === "artificial")
        ? "Artificial / Silk"
        : "Mixed Varieties",
    flowers,
  };
}

function styleList(setup: DecorationSetupItem): string[] {
  const s = setup.specifications;
  const list = [...(s?.setup_styles ?? []).filter((x) => x !== "Custom"), s?.custom_setup_style ?? ""];
  return [...new Set(list.map((x) => x.trim()).filter(Boolean))];
}

/** "Red & White" -> ["Red", "White"] */
function colorList(setup: DecorationSetupItem): string[] {
  const names = (setup.specifications?.flowers ?? []).flatMap((f) => (f.colour ?? "").split(/\s*(?:&|,|\/|\band\b)\s*/i));
  const clean = names.map((n) => n.trim()).filter(Boolean).map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase());
  return [...new Set(clean)];
}

function addonDetails(setup: DecorationSetupItem): PublicDecoration["addons"] {
  const s = setup.specifications;
  const out: PublicDecoration["addons"] = [];
  for (const p of s?.platforms ?? []) {
    out.push({
      title: `Platform · ${p.custom_type || p.type}`,
      sub: [`${p.size.width} × ${p.size.height} ft`, p.custom_colour || p.colour || p.flex_colour]
        .filter(Boolean)
        .join(" · "),
      price: Number(p.price) || 0,
    });
  }
  if (!s?.platforms?.length && s?.mandap_platform_used) {
    out.push({
      title: `Platform · ${s.mandap_platform_type ?? "Platform"}`,
      sub: [s.mandap_platform_shape, s.mandap_platform_colour].filter(Boolean).join(" · "),
      price: Number(s.mandap_platform_price) || 0,
    });
  }
  const lights = s?.lighting ?? [];
  const itemTotal = lights.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  // The admin view shows one lighting total ("Lighting setup Rs. 40,000"); it can be set
  // without a price on each item, so publish that total when the items carry none.
  const lightingTotal = Number(s?.overall_lighting_price ?? s?.overall_lighting_cost) || 0;
  if (lights.length > 0 && itemTotal === 0 && lightingTotal > 0) {
    out.push({
      title: "Lighting setup",
      sub: lights.map((l) => `${l.type} × ${l.quantity ?? 1}${l.unit ? ` ${l.unit}` : ""}`).join(", "),
      price: lightingTotal,
    });
  } else {
    for (const l of lights) {
      out.push({
        title: `Lighting · ${l.type}`,
        sub: `Quantity: ${l.quantity ?? 1}${l.unit ? ` ${l.unit}` : ""}`,
        price: Number(l.price) || 0,
      });
    }
  }
  if (s?.furniture_used) {
    out.push({ title: "Furniture", sub: s.furniture_details ?? "", price: Number(s.furniture_price) || 0 });
  }
  return out;
}

function toPublic(setup: DecorationSetupItem, vendor: string): PublicDecoration {
  const specs = extractSpecs(setup);
  const images = [setup.imageUrl, ...(setup.gallery ?? [])].filter(
    (u, i, all): u is string => Boolean(u) && all.indexOf(u) === i,
  );
  return {
    id: setup.id,
    name: formatTitle(setup),
    category: setup.category,
    description: setup.description ?? "",
    status: String(setup.status ?? "Live"),
    // Same "Starting from" price the Decorations page shows on its cards
    price: extractPrice(setup),
    images,
    events: setup.specifications?.applicable_events ?? setup.applicable_events ?? [],
    structure:
      setup.specifications?.structure_type ||
      setup.entranceGateSpecs?.structureType ||
      setup.mandapSpecs?.structureType ||
      setup.stageSpecs?.structureType ||
      "",
    dimensions: specs.dimensions,
    flowers: specs.flowerType,
    platform: specs.platformStyle,
    floral: floralDetails(setup),
    addons: addonDetails(setup),
    styles: styleList(setup),
    colors: colorList(setup),
    vendor,
    companyId: setup.companyId || "company-1",
    companyName: setup.companyName || vendor,
    updatedAt: setup.updatedAt ?? setup.createdAt,
  };
}

function companyName(): string {
  return loadProfile()?.name || "Everest Events & Decor";
}

let publishTimer: ReturnType<typeof setTimeout> | undefined;
let lastPublished = "";

// The body (several MB with photos) is rebuilt only when the catalogue or vendor
// name changes, not on every 10-second retry.
let bodyCache: { version: number; vendor: string; body: string } | null = null;

async function publishDecorations() {
  const vendor = companyName();
  const version = getSetupsCacheVersion();
  if (!bodyCache || bodyCache.version !== version || bodyCache.vendor !== vendor) {
    const payload = loadStoredSetups().map((s) => toPublic(s, vendor));
    bodyCache = { version, vendor, body: JSON.stringify({ decorations: payload }) };
  }
  const body = bodyCache.body;
  if (body === lastPublished) return;
  try {
    const res = await fetch(`${getApiBase()}/api/decorations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) lastPublished = body;
  } catch {
    /* API not running — try again on the next change */
  }
}

function schedulePublish() {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(publishDecorations, 600);
}

// ── Enquiries from the client site ──────────────────────────────────────────

interface ServerEnquiry {
  id: string;
  createdAt: string;
  type: "quotation-request" | "direct-order";
  name: string;
  phone: string;
  email: string;
  message: string;
  venue: string;
  grandTotal: number;
  events: {
    name: string;
    date: string;
    venue: string;
    subtotal: number;
    decorations: { id: string; title: string; category: string; price: number; image?: string }[];
  }[];
}

const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

function formatAd(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso || "Date pending";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function digits(v: string) {
  return v.replace(/\D/g, "");
}

function toEnquiry(s: ServerEnquiry): EnquiryItem {
  const allSetups = loadStoredSetups();
  const setupsMap = new Map(allSetups.map((st) => [st.id, st]));
  const events: EnquiryEvent[] = (s.events.length ? s.events : [{ name: "Event", date: "", venue: s.venue, subtotal: 0, decorations: [] }]).map(
    (e) => {
      const bs = e.date ? convertAdToBs(e.date) : null;
      // The picked decorations (with photos) render as thumbnails; the note keeps the subtotal.
      const note = e.decorations.length ? `Subtotal of selected decorations: ${rs(e.subtotal)}` : undefined;
      const requested = e.decorations.map((d: any) => {
        const decId = d.decorationId || d.id;
        const catalogItem = getSharedPublicDecoration(decId, d);
        const photoUrl =
          d.photo ||
          (d.image
            ? d.image.startsWith("/")
              ? `${getApiBase()}${d.image}`
              : d.image
            : catalogItem?.photo);

        return buildDecorationSnapshot({ ...d, photo: photoUrl, image: photoUrl }, catalogItem);
      });
      const requirements = [...new Set(e.decorations.map((d) => d.category).filter(Boolean))];
      return {
        name: e.name,
        date_ad: e.date ? formatAd(e.date) : "Date pending",
        date_bs: bs ? `${bs.formatted} BS` : "",
        date_iso: e.date || undefined,
        venue: e.venue || s.venue || "Venue to be decided",
        requirements: requirements.length ? requirements : undefined,
        requested_decorations: requested.length ? requested : undefined,
        note,
      };
    },
  );
  const first = events[0]!;
  const phone = s.phone.trim();
  return {
    id: s.id,
    client_name: s.name,
    phone,
    whatsapp_number: digits(phone) || undefined,
    email: s.email || undefined,
    location: s.venue || first.venue,
    source: "Website",
    created_at: s.createdAt,
    time_ago_display: new Date(s.createdAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    ceremony_type: first.name,
    date_bs: first.date_bs,
    date_ad: first.date_ad,
    venue: first.venue,
    availability_status: "free",
    availability_summary: "New website quotation request — check the calendar to confirm these dates are available.",
    status: "unreviewed",
    private_note: [
      s.type === "direct-order" ? "Direct order from website." : "Quotation request from website.",
      s.message ? `Client message: ${s.message}` : "",
      `Total of selected decorations: ${rs(s.grandTotal)}`,
    ]
      .filter(Boolean)
      .join("\n"),
    estimated_budget_npr: s.grandTotal || undefined,
    order_type: s.type,
    events,
  };
}

async function pullEnquiries() {
  try {
    const res = await fetch(`${getApiBase()}/api/enquiries`);
    if (!res.ok) return;
    const { enquiries } = (await res.json()) as { enquiries: ServerEnquiry[] };
    const existing = loadStoredEnquiries(true);
    const known = new Set(existing.map((e) => e.id));
    const fresh = enquiries.filter((e) => !known.has(e.id)).map(toEnquiry);

    // Enquiries imported before photos were supported: fill in the picked decorations.
    const byId = new Map(enquiries.map((e) => [e.id, e]));
    let backfilled = false;
    const merged = existing.map((enq) => {
      const src = byId.get(enq.id);
      if (!src || !enq.events || enq.events.some((ev) => ev.requested_decorations)) return enq;
      const rebuilt = toEnquiry(src).events ?? [];
      backfilled = true;
      return {
        ...enq,
        events: enq.events.map((ev, i) => {
          const r = rebuilt[i]?.requested_decorations;
          return r ? { ...ev, requested_decorations: r, note: rebuilt[i]?.note } : ev;
        }),
      };
    });

    if (fresh.length === 0 && !backfilled) return;
    fresh.forEach((item) => {
      void upsertEnquiryInSupabase(item);
    });
    if (saveStoredEnquiries([...fresh, ...merged])) {
      window.dispatchEvent(new Event(ENQUIRIES_SYNCED_EVENT));
    }
  } catch {
    /* API not running */
  }
}

/** Start background sync. Returns a cleanup function. */
export function startServerSync(): () => void {
  if (typeof window === "undefined") return () => {};
  schedulePublish();
  void pullEnquiries();
  const onSetups = () => schedulePublish();
  window.addEventListener("decoration-setups-updated", onSetups);
  window.addEventListener("storage", onSetups);
  const timer = setInterval(() => {
    void pullEnquiries();
    schedulePublish(); // retry if the API was down earlier
  }, POLL_MS);
  return () => {
    window.removeEventListener("decoration-setups-updated", onSetups);
    window.removeEventListener("storage", onSetups);
    clearInterval(timer);
    clearTimeout(publishTimer);
  };
}
