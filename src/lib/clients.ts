import { useState, useEffect, useMemo } from "react";
import {
  fetchBookedClientsFromSupabase,
  fetchBookedClientByIdFromSupabase,
  upsertBookedClientInSupabase,
  deleteBookedClientFromSupabase,
  subscribeToBookedClientsRealtime,
} from "./supabase-service";
import type { DesignMatchAnswer } from "./design-match";
import { enquiryRepository } from "./enquiry-repository";
import { getCurrentCompanyId } from "./current-company";
import { bookedClientBelongsToCurrentCompany } from "./company-scope";

export type BookingStage =
  "confirmed" | "decor_confirmed" | "crew_assigned" | "setup_scheduled" | "delivered" | "closed";

export type PaymentStatus = "paid" | "partial" | "balance_due";

export interface ClientFlowerItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ClientDecorationItem {
  name: string;
  type: string;
  price?: number;
  flowers?: ClientFlowerItem[];
}

export function computeDecorationItemPrice(item: ClientDecorationItem): number {
  if (item.flowers && item.flowers.length > 0) {
    return item.flowers.reduce(
      (sum, f) => sum + (Number(f.price) || 0) * (Number(f.quantity) || 0),
      0,
    );
  }
  return Number(item.price) || 0;
}

/**
 * Shared currency formatter across the application ("Rs. 4,92,000", not "₹").
 */
export function formatCurrency(amount: number | null | undefined): string {
  return `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

export type QuotationStatus = "Draft" | "Sent via WhatsApp" | "Approved" | "Pending Review";

export interface CeremonySetupItem {
  id?: string | undefined;
  name: string;
  price: number;
  unitPrice?: number | undefined;
  quantity?: number | undefined;
  setupId?: string | undefined;
  category?: string | undefined;
  imageUrl?: string | undefined;
  photo?: string | undefined;
  description?: string | undefined;
  details?: string | undefined;
  pending?: boolean | undefined;
  isAddon?: boolean | undefined;
}

export interface ClientPaidAddon {
  id: string;
  name: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  unitPrice?: number | undefined;
  price?: number | undefined;
  category?: string | undefined;
  description?: string | undefined;
  icon?: string | undefined;
}

export interface ClientCeremonyItem {
  id?: string | undefined;
  name: string; // e.g. "Haldi Day", "Wedding Day"
  date: string; // e.g. "Mangsir 2, 2083"
  venue: string; // e.g. "Residence, Bhaisepati"
  setupId?: string | undefined;
  setupName?: string | undefined;
  setupPrice?: number | undefined;
  setupImage?: string | undefined;
  category?: string | undefined;
  subtotal?: number | undefined;
  items?: CeremonySetupItem[] | undefined;
  notes?: string[] | string | undefined;
  /** Step 4: how each client reference design (another company's) is fulfilled. */
  designMatches?: DesignMatchAnswer[] | undefined;
}

/**
 * Computes or retrieves subtotal for a single ceremony item.
 */
export function getCeremonySubtotal(ceremony: ClientCeremonyItem | null | undefined): number {
  if (!ceremony) return 0;
  if (typeof ceremony.subtotal === "number" && ceremony.subtotal > 0) {
    return ceremony.subtotal;
  }
  if (ceremony.items && ceremony.items.length > 0) {
    const itemsSum = ceremony.items.reduce((s, it) => {
      const lineTotal =
        typeof it.price === "number" && it.price > 0
          ? it.price
          : (Number((it as any).quantity) || 1) * (Number((it as any).unitPrice) || 0);
      return s + lineTotal;
    }, 0);
    const matchesSum = (ceremony.designMatches || []).reduce(
      (s, m) => s + (Number(m.rate) || 0),
      0,
    );
    const sum = itemsSum + matchesSum;
    if (sum > 0) return sum;
  }
  if (typeof ceremony.setupPrice === "number" && ceremony.setupPrice > 0) {
    return ceremony.setupPrice;
  }
  return 0;
}

/**
 * Shared function to compute or read the grand total for a client.
 * If total_amount is missing or 0, it dynamically recomputes from ceremonies,
 * paid add-ons, or decoration setups.
 */
export function getClientTotal(client: BookedClient | null | undefined): number {
  if (!client) return 0;

  if (typeof client.total_amount === "number" && client.total_amount > 0) {
    return client.total_amount;
  }

  let recomputed = 0;
  if (client.ceremonies && client.ceremonies.length > 0) {
    for (const c of client.ceremonies) {
      recomputed += getCeremonySubtotal(c);
    }
    const addOns = client.paid_addons || client.addOns || [];
    for (const a of addOns) {
      const p =
        typeof a.price === "number" && a.price > 0
          ? a.price
          : (Number(a.quantity) || 1) * (Number(a.unitPrice) || 0);
      recomputed += p;
    }
  }

  if (recomputed === 0 && client.decorations && client.decorations.length > 0) {
    recomputed = client.decorations.reduce((s, d) => s + computeDecorationItemPrice(d), 0);
  }

  if (recomputed > 0) return recomputed;
  return Number(client.total_amount) || 0;
}

export interface BookedClient {
  /** Company this booking belongs to (kept on this browser; older bookings belong to the first company). */
  company_id?: string | undefined;
  /** Bank/QR accounts the client may pay the advance to (ids from payment-qr settings) */
  payment_accounts?: { id: string; role: "main" | "optional" }[] | undefined;
  id: string;
  enquiry_id?: string | undefined;
  client_name: string;
  event_type: string;
  event_date: string;
  venue: string;
  stage: BookingStage;
  payment_status: PaymentStatus;
  payment_note: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  days_to_event: number | "today" | "complete";
  needs_attention: boolean;
  phone?: string | undefined;
  /** WhatsApp number when it differs from `phone`. */
  whatsapp?: string | undefined;
  /** Where the client came from (Instagram, Referral, Website…). */
  source?: string | undefined;
  city?: string | undefined;
  /** e.g. "Inside Kathmandu Valley". */
  location_type?: string | undefined;
  decorations?: ClientDecorationItem[] | undefined;
  crew_assignments?: { role: string; name: string }[] | undefined;
  notes?: string | undefined;

  // New fields for Multi-Ceremony Card Selection and Quotation Overview
  handler?: string | undefined;
  events_count?: number | undefined;
  quotation_status?: QuotationStatus | undefined;
  proposal_id?: string | undefined;
  ceremonies?: ClientCeremonyItem[] | undefined;
  events?: ClientCeremonyItem[] | undefined;
  paid_addons?: ClientPaidAddon[] | undefined;
  addOns?: ClientPaidAddon[] | undefined;

  // Soft-delete fields
  deleted_at?: string | undefined;
  deleted_by?: string | undefined;
}

/**
 * Ceremonies for a quotation made from a website enquiry, carrying the decorations the
 * client already picked (so the quotation preview isn't empty). Returns null when the
 * enquiry has no picked decorations, so callers keep their usual behaviour.
 */
export function ceremoniesFromEnquiry(enq: {
  events?: any[] | undefined;
  ceremony_type?: string | undefined;
  date_bs?: string | undefined;
  date_ad?: string | undefined;
  venue?: string | undefined;
  requested_decorations?: any[] | undefined;
  decorations?: any[] | undefined;
  picks?: any[] | undefined;
}): ClientCeremonyItem[] | null {
  const events = enq.events ?? [];
  const topLevelPicks = enq.requested_decorations ?? enq.decorations ?? enq.picks ?? [];
  const hasEventDecorations = events.some(
    (e) => (e.requested_decorations?.length ?? e.decorations?.length ?? e.picks?.length ?? 0) > 0,
  );

  if (!hasEventDecorations && topLevelPicks.length === 0) return null;

  if (events.length > 0 && hasEventDecorations) {
    return events.map((ev, i) => {
      const date = ev.date_bs
        ? ev.date_ad
          ? `${ev.date_bs} · ${ev.date_ad}`
          : ev.date_bs
        : ev.date_ad || "Date TBD";
      const picks =
        ev.requested_decorations ?? ev.decorations ?? ev.picks ?? (i === 0 ? topLevelPicks : []);
      const firstPick = picks[0];
      const items: CeremonySetupItem[] = picks.map((d: any, dIdx: number) => {
        const price = Number(d.listedPrice ?? d.price) || 0;
        return {
          id: String(d.id || d.decorationId || `item-${i}-${dIdx}`),
          name: d.title || d.name || "Decoration",
          price,
          unitPrice: Number(d.unitPrice) || price,
          quantity: Number(d.quantity) || 1,
          setupId: String(d.decorationId || d.id || ""),
          category: d.category || "Stage",
          imageUrl: d.image || d.imageUrl || d.photo || undefined,
          photo: d.photo || d.image || d.imageUrl || undefined,
          description: d.description || undefined,
          pending: price === 0,
        };
      });

      const subtotal = items.reduce((s, it) => s + it.price, 0);
      const setupName =
        items.length > 1
          ? items.map((it) => it.name).join(" + ")
          : firstPick
            ? String(firstPick.name || firstPick.title || "Decoration")
            : undefined;
      const setupPrice =
        subtotal || (firstPick ? Number(firstPick.listedPrice ?? firstPick.price) || 0 : undefined);
      const setupImage = firstPick
        ? String(firstPick.photo || firstPick.image || firstPick.imageUrl || "")
        : items[0]?.imageUrl || undefined;

      return {
        id: ev.id || `c-${i + 1}`,
        name: ev.name || `Ceremony ${i + 1}`,
        date,
        venue: ev.venue || enq.venue || "Kathmandu Venue",
        setupId: firstPick
          ? String(firstPick.decorationId || firstPick.id || "")
          : items[0]?.setupId,
        setupName,
        setupPrice,
        setupImage,
        category: firstPick?.category || items[0]?.category || "Stage",
        subtotal,
        items,
      };
    });
  }

  // Single ceremony from top-level picks
  const firstPick = topLevelPicks[0];
  const items: CeremonySetupItem[] = topLevelPicks.map((d: any, dIdx: number) => {
    const price = Number(d.listedPrice ?? d.price) || 0;
    return {
      id: String(d.id || d.decorationId || `item-0-${dIdx}`),
      name: d.title || d.name || "Decoration",
      price,
      unitPrice: Number(d.unitPrice) || price,
      quantity: Number(d.quantity) || 1,
      setupId: String(d.decorationId || d.id || ""),
      category: d.category || "Stage",
      imageUrl: d.image || d.imageUrl || d.photo || undefined,
      photo: d.photo || d.image || d.imageUrl || undefined,
      description: d.description || undefined,
      pending: price === 0,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.price, 0);
  const setupName =
    items.length > 1
      ? items.map((it) => it.name).join(" + ")
      : firstPick
        ? String(firstPick.name || firstPick.title || "Decoration")
        : undefined;
  const setupPrice =
    subtotal || (firstPick ? Number(firstPick.listedPrice ?? firstPick.price) || 0 : undefined);

  return [
    {
      id: "c-1",
      name: enq.ceremony_type || "Wedding Ceremony",
      date: enq.date_bs
        ? enq.date_ad
          ? `${enq.date_bs} · ${enq.date_ad}`
          : enq.date_bs
        : enq.date_ad || "Date on record",
      venue: enq.venue || "Kathmandu Venue",
      setupId: firstPick ? String(firstPick.decorationId || firstPick.id || "") : items[0]?.setupId,
      setupName,
      setupPrice,
      setupImage: firstPick
        ? String(firstPick.photo || firstPick.image || firstPick.imageUrl || "")
        : items[0]?.imageUrl || undefined,
      category: firstPick?.category || items[0]?.category || "Stage",
      subtotal,
      items,
    },
  ];
}

/**
 * Automatically rebuilds missing decoration lines and totals for old or empty quotations
 * from the linked enquiry so they are never permanently blank.
 */
export function healEmptyQuotationCeremonies(client: BookedClient): BookedClient {
  const ceremonies = client.ceremonies ?? [];
  const hasItems = ceremonies.some((c) => (c.items?.length ?? 0) > 0);

  // If already has items in all ceremonies, ensure setupName, setupPrice, and subtotal are aligned
  if (hasItems && ceremonies.every((c) => (c.items?.length ?? 0) > 0)) {
    const patchedCeremonies = ceremonies.map((c) => {
      const items = c.items || [];
      const subtotal = getCeremonySubtotal(c);
      const setupName =
        c.setupName || (items.length > 0 ? items.map((it) => it.name).join(" + ") : undefined);
      return {
        ...c,
        setupName,
        setupPrice: c.setupPrice && c.setupPrice > 0 ? c.setupPrice : subtotal,
        subtotal,
      };
    });
    const recomputedTotal =
      patchedCeremonies.reduce((sum, c) => sum + (c.subtotal || 0), 0) +
      (client.paid_addons || client.addOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
    return {
      ...client,
      ceremonies: patchedCeremonies,
      events: patchedCeremonies,
      total_amount:
        client.total_amount && client.total_amount > 0 ? client.total_amount : recomputedTotal,
      balance_due:
        client.balance_due && client.balance_due > 0 ? client.balance_due : recomputedTotal,
    };
  }

  // Look up matching enquiry
  const enqs = enquiryRepository.getAll(true);
  const cleanPId = (client.proposal_id || "").toLowerCase().replace(/^(prop-|q-)/i, "");
  const cleanCId = (client.id || "").toLowerCase().replace(/^(bk-|enq-)/i, "");
  const cName = (client.client_name || "").toLowerCase().trim();

  const enq = enqs.find((e) => {
    const eId = (e.id || "").toLowerCase();
    const cleanEId = eId.replace(/^enq-/, "");
    const eName = (e.client_name || "").toLowerCase().trim();
    if (client.enquiry_id && eId === client.enquiry_id.toLowerCase()) return true;
    if (eId === (client.id || "").toLowerCase()) return true;
    if (cleanEId && (cleanEId === cleanPId || cleanEId === cleanCId)) return true;
    if (eName && cName) {
      if (eName === cName) return true;
      if (eName.includes(cName) || cName.includes(eName)) return true;
      // Handle "satya raj and ashutosh thapa" vs "satya raj" / "ashutosh thapa"
      const cWords = cName.split(/[\s&,/+]+/).filter((w) => w.length > 2);
      const eWords = eName.split(/[\s&,/+]+/).filter((w) => w.length > 2);
      if (cWords.some((w) => eWords.includes(w))) return true;
    }
    return false;
  });

  const rebuilt = enq ? ceremoniesFromEnquiry(enq) : null;

  const baseList =
    ceremonies.length > 0
      ? ceremonies
      : rebuilt && rebuilt.length > 0
        ? rebuilt
        : [
            {
              id: "c-1",
              name: client.event_type || "Wedding Ceremony",
              date: client.event_date || "Date on record",
              venue: client.venue || "Kathmandu Venue",
              setupPrice: client.total_amount || 85000,
              subtotal: client.total_amount || 85000,
            },
          ];

  const mergedCeremonies = baseList.map((c, i) => {
    const src = rebuilt?.[i] || rebuilt?.[0];
    let items = c.items && c.items.length > 0 ? c.items : src?.items || [];

    // If still no items, but ceremony has a price or client has a total, synthesize decoration item
    if (items.length === 0) {
      const price =
        typeof c.setupPrice === "number" && c.setupPrice > 0
          ? c.setupPrice
          : typeof c.subtotal === "number" && c.subtotal > 0
            ? c.subtotal
            : typeof client.total_amount === "number" && client.total_amount > 0
              ? client.total_amount
              : 85000;
      const name = c.setupName || src?.setupName || client.event_type || "Wedding Decoration";
      const img = c.setupImage || src?.setupImage || "/gallery/wedding-1.jpg";
      items = [
        {
          id: c.setupId || src?.setupId || `item-${i}-fallback`,
          name,
          price,
          unitPrice: price,
          quantity: 1,
          setupId: c.setupId || src?.setupId || `setup-${i}`,
          category: c.category || src?.category || "Stage",
          imageUrl: img,
          photo: img,
          description: "Curated wedding decoration setup",
          details: "Curated wedding decoration setup",
          pending: false,
        },
      ];
    }

    const subtotal =
      items.reduce((s, it) => s + (Number(it.price) || 0), 0) ||
      src?.setupPrice ||
      c.setupPrice ||
      0;
    return {
      ...c,
      setupName:
        c.setupName ||
        src?.setupName ||
        (items.length > 0 ? items.map((it) => it.name).join(" + ") : undefined),
      setupPrice: c.setupPrice && c.setupPrice > 0 ? c.setupPrice : subtotal,
      setupImage: c.setupImage || src?.setupImage || items[0]?.imageUrl,
      subtotal,
      items,
    };
  });

  const grandTotal =
    mergedCeremonies.reduce((s, c) => s + (c.subtotal || 0), 0) +
    (client.paid_addons || client.addOns || []).reduce((sum, a) => sum + (a.price || 0), 0);

  return {
    ...client,
    enquiry_id: client.enquiry_id || enq?.id,
    ceremonies: mergedCeremonies,
    events: mergedCeremonies,
    total_amount: client.total_amount && client.total_amount > 0 ? client.total_amount : grandTotal,
    balance_due: client.balance_due && client.balance_due > 0 ? client.balance_due : grandTotal,
  };
}

export function convertEnquiryToBookedClient(enq: {
  id: string;
  client_name: string;
  ceremony_type: string;
  date_bs?: string | undefined;
  date_ad?: string | undefined;
  venue?: string | undefined;
  estimated_budget_npr?: number | undefined;
  phone?: string | undefined;
  assigned_handler?: string | undefined;
  private_note?: string | undefined;
  events?: any[] | undefined;
  requested_decorations?: any[] | undefined;
  decorations?: any[] | undefined;
  picks?: any[] | undefined;
}): BookedClient {
  const fromEnquiry = ceremoniesFromEnquiry(enq);
  const price = enq.estimated_budget_npr || 85000;
  const ceremonies: ClientCeremonyItem[] =
    fromEnquiry && fromEnquiry.length > 0
      ? fromEnquiry
      : [
          {
            id: "c-1",
            name: enq.ceremony_type,
            date:
              `${enq.date_bs || ""}${enq.date_ad ? ` · ${enq.date_ad}` : ""}`.trim() ||
              "Date on record",
            venue: enq.venue || "Kathmandu Venue",
            setupPrice: price,
            subtotal: price,
            items: [
              {
                id: "item-0-0",
                name: enq.ceremony_type || "Wedding Decoration",
                price,
                unitPrice: price,
                quantity: 1,
                category: "Stage",
                imageUrl: "/gallery/wedding-1.jpg",
                photo: "/gallery/wedding-1.jpg",
                description: "Curated wedding decoration setup",
                details: "Curated wedding decoration setup",
                pending: false,
              },
            ],
          },
        ];

  const total = ceremonies.reduce((s, c) => s + getCeremonySubtotal(c), 0) || price;

  return {
    id: enq.id,
    enquiry_id: enq.id,
    company_id: getCurrentCompanyId(),
    client_name: enq.client_name,
    event_type: enq.ceremony_type,
    event_date:
      `${enq.date_bs || ""}${enq.date_ad ? ` (${enq.date_ad})` : ""}`.trim() || "Scheduled Date",
    venue: enq.venue || "Kathmandu Venue",
    stage: "confirmed",
    payment_status: "balance_due",
    payment_note: "Quotation created from incoming enquiry",
    total_amount: total,
    paid_amount: 0,
    balance_due: total,
    days_to_event: 30,
    needs_attention: false,
    phone: enq.phone,
    handler: enq.assigned_handler || "Pooja Thapa",
    events_count: ceremonies.length,
    quotation_status: "Draft",
    proposal_id: `prop-${enq.id.replace("enq-", "")}`,
    ceremonies,
    events: ceremonies,
    notes: enq.private_note,
  };
}

export const BOOKING_STAGES: { key: BookingStage; label: string; step: number }[] = [
  { key: "confirmed", label: "Confirmed", step: 1 },
  { key: "decor_confirmed", label: "Decor Confirmed", step: 2 },
  { key: "crew_assigned", label: "Crew Assigned", step: 3 },
  { key: "setup_scheduled", label: "Setup Scheduled", step: 4 },
  { key: "delivered", label: "Delivered", step: 5 },
  { key: "closed", label: "Closed", step: 6 },
];

export const INITIAL_BOOKED_CLIENTS: BookedClient[] = [];

const DUMMY_CLIENT_IDS = new Set([
  "bk-rohan-sneha",
  "bk-aarav-riya",
  "bk-shrestha-reception",
  "bk-karki-mehendi",
  "bk-thapa-engagement",
]);

const STORAGE_KEY = "decoration-portal:booked-clients";

const BOOKED_CLIENTS_UPDATED_EVENT = "booked-clients-updated";

// The booked-clients data (with photos) is larger than localStorage allows, so
// writes there fail and every page used to re-download it. The latest list is
// kept in memory for the session; localStorage is still written when it fits.
let clientsMemory: BookedClient[] | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === STORAGE_KEY) clientsMemory = null;
  });
}

function readStoredBookedClients(): BookedClient[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookedClient[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed.filter((c) => !DUMMY_CLIENT_IDS.has(c.id));
      const healed = cleaned.map(healEmptyQuotationCeremonies);
      if (cleaned.length !== parsed.length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(healed));
      }
      return healed;
    }
    return [];
  } catch {
    return [];
  }
}

export function loadStoredBookedClients(includeDeleted = false): BookedClient[] {
  if (typeof window === "undefined") return [];
  if (!clientsMemory) clientsMemory = readStoredBookedClients();
  return includeDeleted ? [...clientsMemory] : clientsMemory.filter((c) => !c.deleted_at);
}

export function saveStoredBookedClients(clients: BookedClient[]) {
  if (typeof window === "undefined") return;
  const cleaned = clients.filter((c) => !DUMMY_CLIENT_IDS.has(c.id));
  clientsMemory = cleaned;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error("Failed to save booked clients to localStorage:", err);
  }
  window.dispatchEvent(new Event(BOOKED_CLIENTS_UPDATED_EVENT));
}

// ── Shared Supabase sync ──────────────────────────────────────────────────────
// One request serves every component using the store; it is skipped while the
// data is fresh, and realtime changes fetch only the changed row.
const CLIENTS_FRESH_MS = 60_000;
let clientsRemoteLoad: Promise<void> | null = null;
let clientsRemoteLoadedAt = 0;
let clientsRemoteLoadedOnce = false;

// Clients saved on this device whose Supabase save has not succeeded yet. They are kept (and
// retried) when the list is reloaded from Supabase, so a quotation never vanishes after being made.
const PENDING_SYNC_KEY = "decoration-portal:pending-client-sync";
function readPendingSync(): Set<string> {
  try {
    return new Set<string>(JSON.parse(window.localStorage.getItem(PENDING_SYNC_KEY) || "[]"));
  } catch {
    return new Set<string>();
  }
}
function writePendingSync(ids: Set<string>) {
  try {
    window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
function syncClientToSupabase(client: BookedClient) {
  const pending = readPendingSync();
  pending.add(client.id);
  writePendingSync(pending);
  void upsertBookedClientInSupabase(client).then((ok) => {
    const now = readPendingSync();
    if (ok) now.delete(client.id);
    else
      console.error(
        `[clients] Saving quotation ${client.id} to Supabase failed; it is kept on this device and will be retried.`,
      );
    writePendingSync(now);
  });
}

function refreshBookedClientsFromSupabase(force = false): Promise<void> {
  if (clientsRemoteLoad) return clientsRemoteLoad;
  if (!force && Date.now() - clientsRemoteLoadedAt < CLIENTS_FRESH_MS) return Promise.resolve();
  clientsRemoteLoad = fetchBookedClientsFromSupabase()
    .then((data) => {
      clientsRemoteLoadedAt = Date.now();
      clientsRemoteLoadedOnce = true;
      const pending = readPendingSync();
      const remoteIds = new Set(data.map((c) => c.id));
      pending.forEach((id) => {
        if (remoteIds.has(id)) pending.delete(id);
      });
      const unsynced = loadStoredBookedClients(true).filter(
        (c) => pending.has(c.id) && !remoteIds.has(c.id),
      );
      writePendingSync(pending);
      unsynced.forEach(syncClientToSupabase);
      saveStoredBookedClients([...unsynced, ...data]);
    })
    .catch((err) => {
      // Keep the cached clients; a failed request is not an empty list.
      console.warn("[clients] Loading booked clients from Supabase failed:", err);
    })
    .finally(() => {
      clientsRemoteLoad = null;
    });
  return clientsRemoteLoad;
}

function applyRemoteClientChange(id: string) {
  fetchBookedClientByIdFromSupabase(id)
    .then((row) => {
      const all = loadStoredBookedClients(true);
      const idx = all.findIndex((c) => c.id === id);
      if (row) {
        const next = [...all];
        if (idx >= 0) next[idx] = row;
        else next.unshift(row);
        saveStoredBookedClients(next);
      } else if (idx >= 0) {
        saveStoredBookedClients(all.filter((c) => c.id !== id));
      }
    })
    .catch((err) => console.warn(`[clients] Loading booked client ${id} failed:`, err));
}

/** True when the booked client belongs to the company that is open. */
export function isMyBookedClient(c: BookedClient): boolean {
  return bookedClientBelongsToCurrentCompany(c, (id) =>
    enquiryRepository.getAll(true).find((e) => e.id === id),
  );
}

export function useBookedClientsStore() {
  const [allClients, setClients] = useState<BookedClient[]>(() => loadStoredBookedClients());
  const clients = useMemo(() => allClients.filter(isMyBookedClient), [allClients]);
  const [isLoaded, setIsLoaded] = useState(clientsRemoteLoadedOnce);

  useEffect(() => {
    let active = true;
    // Shared, deduplicated fetch from Supabase (skipped while still fresh)
    void refreshBookedClientsFromSupabase().then(() => {
      if (active) setIsLoaded(true);
    });

    // Shared Supabase Realtime Subscription: only the changed row is fetched
    const unsubscribe = subscribeToBookedClientsRealtime(
      (change) => applyRemoteClientChange(change.id),
      () => void refreshBookedClientsFromSupabase(true),
    );

    const handleSync = () => setClients(loadStoredBookedClients());
    window.addEventListener(BOOKED_CLIENTS_UPDATED_EVENT, handleSync);
    handleSync(); // pick up a load that finished before this listener was attached

    return () => {
      active = false;
      window.removeEventListener(BOOKED_CLIENTS_UPDATED_EVENT, handleSync);
      unsubscribe();
    };
  }, []);

  const updateClientStage = (clientId: string, nextStage: BookingStage) => {
    const updated = allClients.map((c) => (c.id === clientId ? { ...c, stage: nextStage } : c));
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const updateClientPayment = (clientId: string, paidAmount: number, note?: string) => {
    const updated = allClients.map((c) => {
      if (c.id !== clientId) return c;
      const total = c.total_amount;
      const newPaid = Math.min(total, Math.max(0, paidAmount));
      const newBalance = total - newPaid;
      const newStatus: PaymentStatus =
        newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "balance_due";
      return {
        ...c,
        paid_amount: newPaid,
        balance_due: newBalance,
        payment_status: newStatus,
        payment_note: note ?? c.payment_note,
      };
    });
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const updateClientQuotationStatus = (clientId: string, quotation_status: QuotationStatus) => {
    const updated = allClients.map((c) => (c.id === clientId ? { ...c, quotation_status } : c));
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const updateClientCeremonies = (
    clientId: string,
    ceremonies: ClientCeremonyItem[],
    totalAmount?: number,
  ) => {
    const updated = allClients.map((c) => {
      if (c.id !== clientId) return c;
      const newTotal = totalAmount !== undefined ? totalAmount : c.total_amount;
      const newBalance = Math.max(0, newTotal - c.paid_amount);
      return {
        ...c,
        ceremonies,
        events_count: ceremonies.length,
        total_amount: newTotal,
        balance_due: newBalance,
      };
    });
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  /** Edit any plain fields of a booked client (used by the Edit Client form). */
  const updateClient = (clientId: string, patch: Partial<BookedClient>) => {
    const all = loadStoredBookedClients(true);
    const updated = all.map((c) => {
      if (c.id !== clientId) return c;
      const next = { ...c, ...patch };
      const paid = Math.min(next.total_amount, Math.max(0, next.paid_amount));
      const balance = next.total_amount - paid;
      return {
        ...next,
        paid_amount: paid,
        balance_due: balance,
        payment_status: (balance <= 0
          ? "paid"
          : paid > 0
            ? "partial"
            : "balance_due") as PaymentStatus,
      };
    });
    saveStoredBookedClients(updated);
    setClients(updated.filter((c) => !c.deleted_at));
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const resetClients = () => {
    setClients([]);
    saveStoredBookedClients([]);
  };

  /**
   * Soft-delete a booked client (quotation). Keeps the row in storage with
   * deleted_at/deleted_by set; removes it from the reactive client list.
   */
  const softDeleteClient = (clientId: string, deletedBy = "staff") => {
    // Operate on ALL rows (including previously deleted) to avoid data loss
    const all = loadStoredBookedClients(true);
    const updated = all.map((c) =>
      c.id === clientId ? { ...c, deleted_at: new Date().toISOString(), deleted_by: deletedBy } : c,
    );
    saveStoredBookedClients(updated);
    // Reactive state only holds non-deleted records
    setClients(updated.filter((c) => !c.deleted_at));
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  /**
   * Restore a soft-deleted booked client (undo).
   */
  const undoDeleteClient = (clientId: string) => {
    const all = loadStoredBookedClients(true);
    const updated = all.map((c) =>
      c.id === clientId ? { ...c, deleted_at: undefined, deleted_by: undefined } : c,
    );
    saveStoredBookedClients(updated);
    setClients(updated.filter((c) => !c.deleted_at));
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  return {
    clients,
    isLoaded,
    updateClientStage,
    updateClientPayment,
    updateClientQuotationStatus,
    updateClientCeremonies,
    updateClient,
    resetClients,
    softDeleteClient,
    undoDeleteClient,
  };
}

export function upsertStoredBookedClient(client: BookedClient): void {
  const clients = loadStoredBookedClients();
  const existingIdx = clients.findIndex((c) => c.id === client.id);
  let updated: BookedClient[];
  if (existingIdx >= 0) {
    updated = clients.map((c, i) => (i === existingIdx ? client : c));
  } else {
    updated = [client, ...clients];
  }
  saveStoredBookedClients(updated);
  syncClientToSupabase(client);
}

export function findClientById(clientId: string): BookedClient | undefined {
  if (!clientId) return undefined;
  const needle = clientId.trim().toLowerCase();
  const cleanNeedle = needle.replace(/^(bk-|enq-|prop-|q-)/i, "");
  const clients = loadStoredBookedClients(true);
  const found =
    clients.find((c) => (c.id || "").toLowerCase() === needle) ||
    clients.find((c) => (c.enquiry_id || "").toLowerCase() === needle) ||
    clients.find((c) => (c.proposal_id || "").toLowerCase() === needle) ||
    clients.find((c) => {
      const cId = (c.id || "").toLowerCase().replace(/^(bk-|enq-)/, "");
      const pId = (c.proposal_id || "").toLowerCase().replace(/^(prop-|q-)/, "");
      const eId = (c.enquiry_id || "").toLowerCase().replace(/^enq-/, "");
      return cleanNeedle && (cId === cleanNeedle || pId === cleanNeedle || eId === cleanNeedle);
    });
  return found ? healEmptyQuotationCeremonies(found) : undefined;
}

export function parseEventDate(eventDateStr: string): {
  adDate: string;
  adYear: number;
  adMonth: number;
  adDay: number;
  bsText: string;
  bsMonthName?: string | undefined;
  bsDay?: number | undefined;
} {
  const match = eventDateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*\(([^)]+)\))?/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return {
      adDate: "",
      adYear: 0,
      adMonth: 0,
      adDay: 0,
      bsText: "",
    };
  }
  const adYear = parseInt(match[1], 10);
  const adMonth = parseInt(match[2], 10);
  const adDay = parseInt(match[3], 10);
  const bsText = match[4] || "";
  const bsParts = bsText.trim().split(/\s+/);
  const bsMonthName = bsParts[0] || undefined;
  const rawDay = parseInt(bsParts[1] || "0", 10);
  const bsDay = isNaN(rawDay) || rawDay === 0 ? undefined : rawDay;

  return {
    adDate: `${match[1]}-${match[2]}-${match[3]}`,
    adYear,
    adMonth,
    adDay,
    bsText,
    bsMonthName,
    bsDay,
  };
}

export function getBookingsForDate(clients: BookedClient[], adDateStr: string): BookedClient[] {
  return clients.filter((c) => {
    const parsed = parseEventDate(c.event_date);
    return parsed.adDate === adDateStr;
  });
}
