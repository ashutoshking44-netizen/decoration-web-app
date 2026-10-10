import { useState, useEffect } from "react";
import { fetchBookedClientsFromSupabase, fetchBookedClientByIdFromSupabase, upsertBookedClientInSupabase, deleteBookedClientFromSupabase, subscribeToBookedClientsRealtime } from "./supabase-service";
import type { DesignMatchAnswer } from "./design-match";

export type BookingStage =
  | "confirmed"
  | "decor_confirmed"
  | "crew_assigned"
  | "setup_scheduled"
  | "delivered"
  | "closed";

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
    return item.flowers.reduce((sum, f) => sum + (Number(f.price) || 0) * (Number(f.quantity) || 0), 0);
  }
  return Number(item.price) || 0;
}

export type QuotationStatus = "Draft" | "Sent via WhatsApp" | "Approved" | "Pending Review";

export interface CeremonySetupItem {
  id?: string | undefined;
  name: string;
  price: number;
  setupId?: string | undefined;
  category?: string | undefined;
  imageUrl?: string | undefined;
  description?: string | undefined;
  pending?: boolean | undefined;
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
  items?: CeremonySetupItem[] | undefined;
  notes?: string[] | string | undefined;
  /** Step 4: how each client reference design (another company's) is fulfilled. */
  designMatches?: DesignMatchAnswer[] | undefined;
}

export interface BookedClient {
  /** Bank/QR accounts the client may pay the advance to (ids from payment-qr settings) */
  payment_accounts?: { id: string; role: "main" | "optional" }[] | undefined;
  id: string;
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
  paid_addons?: ClientPaidAddon[] | undefined;
  addOns?: ClientPaidAddon[] | undefined;

  // Soft-delete fields
  deleted_at?: string | undefined;
  deleted_by?: string | undefined;
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
}): BookedClient {
  return {
    id: enq.id,
    client_name: enq.client_name,
    event_type: enq.ceremony_type,
    event_date: `${enq.date_bs || ""}${enq.date_ad ? ` (${enq.date_ad})` : ""}`.trim() || "Scheduled Date",
    venue: enq.venue || "Kathmandu Venue",
    stage: "confirmed",
    payment_status: "balance_due",
    payment_note: "Quotation created from incoming enquiry",
    total_amount: enq.estimated_budget_npr || 85000,
    paid_amount: 0,
    balance_due: enq.estimated_budget_npr || 85000,
    days_to_event: 30,
    needs_attention: false,
    phone: enq.phone,
    handler: enq.assigned_handler || "Pooja Thapa",
    events_count: 1,
    quotation_status: "Draft",
    proposal_id: `prop-${enq.id.replace("enq-", "")}`,
    ceremonies: [
      {
        id: "c-1",
        name: enq.ceremony_type,
        date: `${enq.date_bs || ""}${enq.date_ad ? ` · ${enq.date_ad}` : ""}`.trim() || "Date on record",
        venue: enq.venue || "Kathmandu Venue",
        setupPrice: enq.estimated_budget_npr || 85000,
      },
    ],
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
      if (cleaned.length !== parsed.length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
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

function refreshBookedClientsFromSupabase(force = false): Promise<void> {
  if (clientsRemoteLoad) return clientsRemoteLoad;
  if (!force && Date.now() - clientsRemoteLoadedAt < CLIENTS_FRESH_MS) return Promise.resolve();
  clientsRemoteLoad = fetchBookedClientsFromSupabase()
    .then((data) => {
      clientsRemoteLoadedAt = Date.now();
      clientsRemoteLoadedOnce = true;
      saveStoredBookedClients(data);
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

export function useBookedClientsStore() {
  const [clients, setClients] = useState<BookedClient[]>(() => loadStoredBookedClients());
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
    const updated = clients.map((c) =>
      c.id === clientId ? { ...c, stage: nextStage } : c
    );
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const updateClientPayment = (
    clientId: string,
    paidAmount: number,
    note?: string
  ) => {
    const updated = clients.map((c) => {
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
    const updated = clients.map((c) =>
      c.id === clientId ? { ...c, quotation_status } : c
    );
    setClients(updated);
    saveStoredBookedClients(updated);
    const target = updated.find((c) => c.id === clientId);
    if (target) void upsertBookedClientInSupabase(target);
  };

  const updateClientCeremonies = (
    clientId: string,
    ceremonies: ClientCeremonyItem[],
    totalAmount?: number
  ) => {
    const updated = clients.map((c) => {
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
        payment_status: (balance <= 0 ? "paid" : paid > 0 ? "partial" : "balance_due") as PaymentStatus,
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
      c.id === clientId
        ? { ...c, deleted_at: new Date().toISOString(), deleted_by: deletedBy }
        : c
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
      c.id === clientId
        ? { ...c, deleted_at: undefined, deleted_by: undefined }
        : c
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
  void upsertBookedClientInSupabase(client);
}

export function findClientById(clientId: string): BookedClient | undefined {
  const clients = loadStoredBookedClients();
  return clients.find((c) => c.id === clientId);
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
