import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  buildDecorationSnapshot,
  type EnquiryItem,
  type EnquiryStatus,
  type EnquirySource,
  type EnquiryRequestedDecoration,
} from "./enquiries";
import type { BookedClient } from "./clients";
import type { DecorationSetupItem } from "./decoration-setups";
import type { PaymentQr } from "./payment-qr";
import type { CompanyProfile } from "./company-profile";
import { convertAdToBs } from "./event-schedule";
import { containsPhotoRef, resolveEnquiryPhotoRefs } from "./enquiry-repository";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENQUIRIES API
// ─────────────────────────────────────────────────────────────────────────────

function formatAdDate(iso: string | null | undefined): string {
  if (!iso) return "Date pending";
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {}
  return String(iso);
}

function formatBsDate(iso: string | null | undefined, existingBs: string | null | undefined): string {
  if (existingBs && existingBs.trim()) {
    const b = existingBs.trim();
    return b.toLowerCase().includes("pending") || b.includes("BS") ? b : `${b} BS`;
  }
  if (iso) {
    try {
      const converted = convertAdToBs(iso);
      if (converted?.formatted) return `${converted.formatted} BS`;
    } catch {}
  }
  return "Date pending";
}
function normalizeDecorationSnapshot(d: any): EnquiryRequestedDecoration {
  return buildDecorationSnapshot(d);
}

/** A failed Supabase request. Never treat this as "no rows". */
export class SupabaseRequestError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.code = code;
  }
}

function toRequestError(error: any, status: number | undefined): SupabaseRequestError {
  return new SupabaseRequestError(
    String(error?.message || "Supabase request failed"),
    Number(status) || 0,
    String(error?.code || ""),
  );
}

/** Timeouts, network drops, rate limits and 5xx are worth retrying; 4xx are not. */
export function isRetryableSupabaseError(err: unknown): boolean {
  if (!(err instanceof SupabaseRequestError)) return true;
  if (err.code === "57014") return true; // statement timeout
  return err.status === 0 || err.status === 408 || err.status === 429 || err.status >= 500;
}

// Everything the enquiry list and its stage filters need. `events` and
// `reference_images` are left out: they hold base64 photos (~17 MB for all rows)
// and selecting them for every row exceeds the database statement timeout.
const ENQUIRY_LIST_COLUMNS = [
  "id", "client_name", "phone", "whatsapp_number", "email", "location", "source",
  "ceremony_type", "date_bs", "date_ad", "date_iso", "venue", "availability_status",
  "availability_summary", "status", "order_type", "estimated_budget_npr", "package_tier",
  "time_slot", "guest_count", "private_note", "assigned_handler", "prompt_state",
  "decline_reason", "responded_at", "quotation_number", "deleted_at", "deleted_by",
  "created_at", "updated_at",
].join(",");

/** An enquiry row without its heavy detail fields (see ENQUIRY_LIST_COLUMNS). */
export type EnquiryListRow = Omit<EnquiryItem, "events" | "reference_images" | "reference_photo_count">;

function normalizeEnquiryStatus(raw: unknown): EnquiryStatus {
  const s = String(raw || "").toLowerCase().trim();
  return !s || s === "new" || s === "unreviewed" ? "unreviewed" : (s as EnquiryStatus);
}

function normalizeEnquirySource(raw: unknown): EnquirySource {
  return raw === "client_panel" ? "Website" : ((raw as EnquirySource) || "Website");
}

function formatTimeAgo(createdAt: string | null | undefined): string {
  return createdAt
    ? new Date(createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}

/**
 * Maps a list row. Fields that the full mapper derives from `events`
 * (ceremony_type, venue, estimated_budget_npr fallbacks) are left empty here;
 * the repository merge keeps the locally known values for them.
 */
function mapEnquiryListRow(row: any): EnquiryListRow {
  const dateIso = row.date_iso || undefined;
  return {
    id: row.id,
    client_name: row.client_name || "",
    phone: row.phone || "",
    whatsapp_number: row.whatsapp_number || undefined,
    email: row.email || undefined,
    location: row.location || "Kathmandu · Inside Kathmandu",
    source: normalizeEnquirySource(row.source),
    created_at: row.created_at || new Date().toISOString(),
    time_ago_display: formatTimeAgo(row.created_at),
    ceremony_type: row.ceremony_type || "",
    date_bs: formatBsDate(dateIso, row.date_bs),
    date_ad: row.date_ad || formatAdDate(dateIso),
    date_iso: dateIso,
    venue: row.venue || "",
    availability_status: row.availability_status || "free",
    availability_summary: row.availability_summary || "",
    status: normalizeEnquiryStatus(row.status),
    private_note: row.private_note || undefined,
    assigned_handler: row.assigned_handler || undefined,
    estimated_budget_npr: row.estimated_budget_npr != null ? Number(row.estimated_budget_npr) : undefined,
    prompt_state: row.prompt_state || "idle",
    decline_reason: row.decline_reason || undefined,
    package_tier: row.package_tier || undefined,
    time_slot: row.time_slot || undefined,
    guest_count: row.guest_count != null ? Number(row.guest_count) : undefined,
    responded_at: row.responded_at || undefined,
    order_type: row.order_type || "quotation-request",
    quotation_number: row.quotation_number || undefined,
    deleted_at: row.deleted_at || undefined,
    deleted_by: row.deleted_by || undefined,
    updated_at: row.updated_at || undefined,
  };
}

/** Light list of every enquiry. Throws SupabaseRequestError on failure. */
export async function fetchEnquiryListFromSupabase(): Promise<EnquiryListRow[]> {
  const { data, error, status } = await supabase
    .from("enquiries")
    .select(ENQUIRY_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .retry(false); // retries are handled (bounded) by the caller
  if (error) throw toRequestError(error, status);
  return (data || []).map(mapEnquiryListRow);
}

/**
 * One enquiry with its full event/photo data. Resolves null when the row does
 * not exist. Throws SupabaseRequestError on failure.
 */
export async function fetchEnquiryByIdFromSupabase(id: string): Promise<EnquiryItem | null> {
  const { data, error, status } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle()
    .retry(false); // retries are handled (bounded) by the caller
  if (error) throw toRequestError(error, status);
  return data ? mapEnquiryRow(data) : null;
}

function mapEnquiryRow(row: any): EnquiryItem {
  const status = normalizeEnquiryStatus(row.status);
  const source = normalizeEnquirySource(row.source);

  const dateIso = row.date_iso || undefined;
  const dateAd = row.date_ad || formatAdDate(dateIso);
  const dateBs = formatBsDate(dateIso, row.date_bs);

  const events = Array.isArray(row.events) && row.events.length > 0
    ? row.events.map((ev: any) => {
        const evIso = ev.date_iso || ev.date || dateIso || undefined;
        const evAd = ev.date_ad || formatAdDate(evIso);
        const evBs = formatBsDate(evIso, ev.date_bs);
        const rawList = Array.isArray(ev.requested_decorations) && ev.requested_decorations.length > 0
          ? ev.requested_decorations
          : Array.isArray(ev.decorations)
          ? ev.decorations
          : undefined;
        const requestedDecorations = rawList
          ? rawList.map((d: any) => normalizeDecorationSnapshot(d))
          : undefined;

        return {
          name: ev.name || row.ceremony_type || "Ceremony",
          date_ad: evAd,
          date_bs: evBs,
          date_iso: evIso,
          venue: ev.venue || row.venue || "",
          guest_count: ev.guest_count != null ? Number(ev.guest_count) : undefined,
          time_slot: ev.time_slot || undefined,
          requirements: Array.isArray(ev.requirements) ? ev.requirements : undefined,
          category_details: ev.category_details || undefined,
          requested_decorations: requestedDecorations,
          note: ev.note || undefined,
          photo_count: ev.photo_count != null ? Number(ev.photo_count) : undefined,
        };
      })
    : [
        {
          name: row.ceremony_type || "Wedding",
          date_ad: dateAd,
          date_bs: dateBs,
          date_iso: dateIso,
          venue: row.venue || "",
          guest_count: row.guest_count != null ? Number(row.guest_count) : undefined,
          time_slot: row.time_slot || undefined,
        },
      ];

  let estimatedBudget = row.estimated_budget_npr != null ? Number(row.estimated_budget_npr) : undefined;
  if (estimatedBudget === undefined && events) {
    const sum = events.reduce((acc: number, ev: any) => {
      if (ev.requested_decorations) {
        return acc + ev.requested_decorations.reduce((dAcc: number, d: any) => dAcc + (Number(d.price) || 0), 0);
      }
      return acc;
    }, 0);
    if (sum > 0) estimatedBudget = sum;
  }

  return {
    id: row.id,
    client_name: row.client_name || "",
    phone: row.phone || "",
    whatsapp_number: row.whatsapp_number || undefined,
    email: row.email || undefined,
    location: row.location || "Kathmandu · Inside Kathmandu",
    source,
    created_at: row.created_at || new Date().toISOString(),
    time_ago_display: formatTimeAgo(row.created_at),
    ceremony_type: row.ceremony_type || events[0]?.name || "Wedding",
    date_bs: dateBs,
    date_ad: dateAd,
    date_iso: dateIso,
    venue: row.venue || events[0]?.venue || "",
    availability_status: row.availability_status || "free",
    availability_summary: row.availability_summary || "",
    status,
    private_note: row.private_note || undefined,
    assigned_handler: row.assigned_handler || undefined,
    estimated_budget_npr: estimatedBudget,
    prompt_state: row.prompt_state || "idle",
    decline_reason: row.decline_reason || undefined,
    package_tier: row.package_tier || undefined,
    time_slot: row.time_slot || undefined,
    guest_count: row.guest_count != null ? Number(row.guest_count) : undefined,
    responded_at: row.responded_at || undefined,
    events,
    reference_images: Array.isArray(row.reference_images) ? row.reference_images : undefined,
    reference_photo_count: Array.isArray(row.reference_images) ? row.reference_images.length : undefined,
    order_type: row.order_type || "quotation-request",
    quotation_number: row.quotation_number || undefined,
    deleted_at: row.deleted_at || undefined,
    deleted_by: row.deleted_by || undefined,
    updated_at: row.updated_at || undefined,
    // The events above are this row version's full details.
    details_updated_at: row.updated_at || undefined,
  };
}

/**
 * The heavy detail columns are only written when this copy really holds them:
 * - a row loaded from the light list has no events yet (sending [] would wipe them),
 * - events older than the row's current version would overwrite newer ones,
 * - photos replaced by browser-only idb:// refs would destroy the stored photos.
 * Leaving the columns out of an upsert keeps the values already in the database.
 */
function detailColumnsForUpsert(item: EnquiryItem): Record<string, unknown> {
  const detailsCurrent = !item.updated_at || item.details_updated_at === item.updated_at;
  if (!detailsCurrent || item.events === undefined) return {};
  const events = resolveEnquiryPhotoRefs(item.events);
  const referenceImages = resolveEnquiryPhotoRefs(item.reference_images || []);
  if (containsPhotoRef(events) || containsPhotoRef(referenceImages)) return {};
  return { events, reference_images: referenceImages };
}

export async function upsertEnquiryInSupabase(item: EnquiryItem): Promise<boolean> {
  try {
    const payload = {
      id: item.id,
      client_name: item.client_name,
      phone: item.phone,
      whatsapp_number: item.whatsapp_number || null,
      email: item.email || null,
      location: item.location || null,
      source: item.source || "Website",
      ceremony_type: item.ceremony_type || null,
      date_bs: item.date_bs || null,
      date_ad: item.date_ad || null,
      date_iso: (item as any).date_iso || null,
      venue: item.venue || null,
      availability_status: item.availability_status || "free",
      availability_summary: item.availability_summary || null,
      status: item.status || "unreviewed",
      order_type: item.order_type || "quotation-request",
      estimated_budget_npr: item.estimated_budget_npr ?? null,
      package_tier: item.package_tier || null,
      time_slot: item.time_slot || null,
      guest_count: item.guest_count ?? null,
      private_note: item.private_note || null,
      assigned_handler: item.assigned_handler || null,
      prompt_state: item.prompt_state || "idle",
      decline_reason: item.decline_reason || null,
      responded_at: item.responded_at || null,
      ...detailColumnsForUpsert(item),
      quotation_number: item.quotation_number || null,
      deleted_at: item.deleted_at || null,
      deleted_by: item.deleted_by || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("enquiries").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Supabase upsert enquiry failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase upsert enquiry error:", err);
    return false;
  }
}

export async function deleteEnquiryFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("enquiries").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete enquiry failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase delete enquiry error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BOOKED CLIENTS / QUOTATIONS API
// ─────────────────────────────────────────────────────────────────────────────

/** All booked clients. Throws SupabaseRequestError on failure (never "no rows"). */
export async function fetchBookedClientsFromSupabase(): Promise<BookedClient[]> {
  const { data, error, status } = await supabase
    .from("booked_clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw toRequestError(error, status);
  return (data || []).map(mapBookedClientRow);
}

/** One booked client, or null when it no longer exists. Throws on failure. */
export async function fetchBookedClientByIdFromSupabase(id: string): Promise<BookedClient | null> {
  const { data, error, status } = await supabase.from("booked_clients").select("*").eq("id", id).maybeSingle();
  if (error) throw toRequestError(error, status);
  return data ? mapBookedClientRow(data) : null;
}

function mapBookedClientRow(row: any): BookedClient {
  return {
    id: row.id,
    client_name: row.client_name || "",
    event_type: row.event_type || "",
    event_date: row.event_date || "",
    venue: row.venue || "",
    stage: row.stage || "confirmed",
    payment_status: row.payment_status || "balance_due",
    payment_note: row.payment_note || "",
    total_amount: Number(row.total_amount) || 0,
    paid_amount: Number(row.paid_amount) || 0,
    balance_due: Number(row.balance_due) || 0,
    days_to_event: (row.days_to_event === "today" || row.days_to_event === "complete")
      ? row.days_to_event
      : Number(row.days_to_event) || 30,
    needs_attention: Boolean(row.needs_attention),
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    source: row.source || undefined,
    city: row.city || undefined,
    location_type: row.location_type || undefined,
    decorations: Array.isArray(row.decorations) ? row.decorations : undefined,
    crew_assignments: Array.isArray(row.crew_assignments) ? row.crew_assignments : undefined,
    notes: row.notes || undefined,
    handler: row.handler || undefined,
    events_count: row.events_count != null ? Number(row.events_count) : 1,
    quotation_status: row.quotation_status || "Draft",
    proposal_id: row.proposal_id || undefined,
    ceremonies: Array.isArray(row.ceremonies) ? row.ceremonies : undefined,
    paid_addons: Array.isArray(row.paid_addons) ? row.paid_addons : undefined,
    payment_accounts: Array.isArray(row.payment_accounts) ? row.payment_accounts : undefined,
    deleted_at: row.deleted_at || undefined,
  
    deleted_by: row.deleted_by || undefined,
  };
}

export async function upsertBookedClientInSupabase(item: BookedClient): Promise<boolean> {
  try {
    const payload = {
      id: item.id,
      client_name: item.client_name,
      phone: item.phone || null,
      whatsapp: item.whatsapp || null,
      email: (item as any).email || null,
      event_type: item.event_type,
      event_date: item.event_date,
      venue: item.venue,
      stage: item.stage || "confirmed",
      payment_status: item.payment_status || "balance_due",
      payment_note: item.payment_note || "",
      total_amount: item.total_amount || 0,
      paid_amount: item.paid_amount || 0,
      balance_due: item.balance_due || 0,
      days_to_event: String(item.days_to_event ?? "30"),
      needs_attention: Boolean(item.needs_attention),
      source: item.source || null,
      city: item.city || null,
      location_type: item.location_type || null,
      handler: item.handler || null,
      events_count: item.events_count || 1,
      quotation_status: item.quotation_status || "Draft",
      proposal_id: item.proposal_id || null,
      ceremonies: item.ceremonies || [],
      decorations: item.decorations || [],
      paid_addons: item.paid_addons || item.addOns || [],
      crew_assignments: item.crew_assignments || [],
      payment_accounts: item.payment_accounts || [],
      notes: item.notes || null,
      deleted_at: item.deleted_at || null,
      deleted_by: item.deleted_by || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("booked_clients").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Supabase upsert booked client failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase upsert booked client error:", err);
    return false;
  }
}

export async function deleteBookedClientFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("booked_clients").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete booked client failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase delete booked client error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DECORATIONS CATALOG API
// ─────────────────────────────────────────────────────────────────────────────

/** All decorations. Throws SupabaseRequestError on failure (never "no rows"). */
export async function fetchDecorationsFromSupabase(): Promise<DecorationSetupItem[]> {
  const { data, error, status } = await supabase
    .from("decorations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw toRequestError(error, status);
  return (data || []).map(mapDecorationRow);
}

/** One decoration, or null when it no longer exists. Throws on failure. */
export async function fetchDecorationByIdFromSupabase(id: string): Promise<DecorationSetupItem | null> {
  const { data, error, status } = await supabase.from("decorations").select("*").eq("id", id).maybeSingle();
  if (error) throw toRequestError(error, status);
  return data ? mapDecorationRow(data) : null;
}

function mapDecorationRow(row: any): DecorationSetupItem {
  let compId = row.company_id || row.companyId || undefined;
  if (compId === "comp-1") compId = "company-1";
  if (compId === "comp-2") compId = "company-2";
  if (!compId) compId = "company-1";

  let compName = row.company_name || row.companyName || undefined;
  if (!compName) {
    compName =
      compId === "company-1"
        ? "Company 1"
        : compId === "company-2"
        ? "Company 2"
        : `Company ${compId}`;
  }

  return {
    id: row.id,
    sku: row.sku || undefined,
    name: row.name || "",
    category: row.category,
    description: row.description || "",
    imageUrl: row.image_url || "",
    gallery: Array.isArray(row.images) ? row.images : [],
    status: row.status || "Live",
    companyId: compId,
    companyName: compName,
    total_price: Number(row.price) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    bookingCount: row.booking_count != null ? Number(row.booking_count) : 0,
    applicable_events: Array.isArray(row.applicable_events) ? row.applicable_events : ["Wedding"],
    specifications: row.specifications && Object.keys(row.specifications).length > 0 ? row.specifications : undefined,
    components: Array.isArray(row.components) ? row.components : [],
  };
}

export async function upsertDecorationInSupabase(item: DecorationSetupItem): Promise<boolean> {
  try {
    const price = Number(
      item.total_price ??
        item.specifications?.base_pricing_rate ??
        item.entranceGateSpecs?.price ??
        item.welcomeBoardSpecs?.price ??
        item.mandapSpecs?.price ??
        item.backdropSpecs?.price ??
        item.stageSpecs?.price ??
        0
    );

    const compId = item.companyId || "company-1";
    const compName =
      item.companyName ||
      (compId === "company-1"
        ? "Company 1"
        : compId === "company-2"
        ? "Company 2"
        : `Company ${compId}`);

    const payload = {
      id: item.id,
      sku: item.sku || null,
      name: item.name,
      category: item.category,
      description: item.description || null,
      price: isNaN(price) ? 0 : price,
      status: item.status || "Live",
      company_id: compId,
      company_name: compName,
      companyId: compId,
      companyName: compName,
      image_url: item.imageUrl || null,
      images: item.gallery || [],
      applicable_events: item.applicable_events || [],
      structure_type: item.specifications?.structure_type || null,
      dimensions: item.specifications?.dimensions || {},
      specifications: item.specifications || {},
      components: item.components || [],
      booking_count: item.bookingCount || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("decorations").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Supabase upsert decoration failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase upsert decoration error:", err);
    return false;
  }
}

export async function deleteDecorationFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("decorations").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete decoration failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase delete decoration error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYMENT QR ACCOUNTS API
// ─────────────────────────────────────────────────────────────────────────────

/** All payment QR accounts. Throws SupabaseRequestError on failure (never "no rows"). */
export async function fetchPaymentQrsFromSupabase(): Promise<PaymentQr[]> {
  const { data, error, status } = await supabase
    .from("payment_qrs")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw toRequestError(error, status);

  return (data || []).map((row: any): PaymentQr => ({
    id: row.id,
    ownerName: row.owner_name || "",
    label: row.label || "",
    accountNumber: row.account_number || undefined,
    image: row.image || "",
  }));
}

export async function savePaymentQrsToSupabase(list: PaymentQr[]): Promise<boolean> {
  try {
    // Delete removed ones and upsert current ones
    const currentIds = list.map((q) => q.id);
    if (currentIds.length > 0) {
      await supabase.from("payment_qrs").delete().not("id", "in", `(${currentIds.join(",")})`);
    } else {
      await supabase.from("payment_qrs").delete().neq("id", "");
    }

    if (list.length === 0) return true;

    const rows = list.map((q, idx) => ({
      id: q.id,
      owner_name: q.ownerName,
      label: q.label,
      account_number: q.accountNumber || null,
      image: q.image,
      display_order: idx,
    }));

    const { error } = await supabase.from("payment_qrs").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Supabase save payment QRs failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase save payment QRs error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMPANY PROFILE API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The stored company profile, or null when none has been saved yet.
 * Throws SupabaseRequestError on failure (a failure is not "no profile").
 */
export async function fetchCompanyProfileFromSupabase(): Promise<CompanyProfile | null> {
  const { data, error, status } = await supabase
    .from("company_profile")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw toRequestError(error, status);
  if (!data) return null;
  return {
    name: data.name || "",
    ownerName: data.owner_name || "",
    phone: data.phone || "",
    email: data.email || "",
    city: data.city || "",
    services: Array.isArray(data.services) ? data.services : [],
    eventTypes: Array.isArray(data.event_types) ? data.event_types : [],
    teamSize: data.team_size || "",
    yearsActive: data.years_active || "",
    about: data.about || "",
  };
}

export async function saveCompanyProfileToSupabase(profile: CompanyProfile): Promise<boolean> {
  try {
    const payload = {
      id: "default",
      name: profile.name,
      owner_name: profile.ownerName,
      phone: profile.phone,
      email: profile.email,
      city: profile.city,
      services: profile.services || [],
      event_types: profile.eventTypes || [],
      team_size: profile.teamSize,
      years_active: profile.yearsActive,
      about: profile.about,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("company_profile").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Supabase save company profile failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase save company profile error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SHARED REALTIME CHANNELS (PREVENTS DUPLICATE SUBSCRIBE ERRORS)
// ─────────────────────────────────────────────────────────────────────────────

/** Which row changed. The record itself is fetched separately by id. */
export interface TableRealtimeChange {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  id: string;
}

/**
 * One shared realtime channel per table. Listeners get the changed row's id
 * (so they can fetch just that row) and a callback when the channel re-joins
 * after a drop. Teardown is deferred so a quick unmount/remount (React
 * StrictMode, route changes) reuses the joined channel.
 */
function createTableRealtime(table: string, channelName: string) {
  type Listener = { onChange: (c: TableRealtimeChange) => void; onResubscribed?: (() => void) | undefined };
  const listeners = new Set<Listener>();
  let channel: RealtimeChannel | null = null;
  let teardown: ReturnType<typeof setTimeout> | undefined;

  return (onChange: Listener["onChange"], onResubscribed?: Listener["onResubscribed"]): (() => void) => {
    const listener: Listener = { onChange, onResubscribed };
    listeners.add(listener);
    clearTimeout(teardown);
    if (!channel) {
      let joinedBefore = false;
      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload: any) => {
          const id = payload?.new?.id ?? payload?.old?.id;
          if (!id) return;
          const change: TableRealtimeChange = { eventType: payload.eventType, id: String(id) };
          listeners.forEach((l) => {
            try {
              l.onChange(change);
            } catch (e) {
              console.error(e);
            }
          });
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (joinedBefore) listeners.forEach((l) => l.onResubscribed?.());
          joinedBefore = true;
        });
    }
    return () => {
      listeners.delete(listener);
      clearTimeout(teardown);
      teardown = setTimeout(() => {
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      }, 1000);
    };
  };
}

export const subscribeToDecorationsRealtime = createTableRealtime("decorations", "global_decorations_realtime");
export const subscribeToBookedClientsRealtime = createTableRealtime("booked_clients", "global_booked_clients_realtime");

/** Which enquiry changed. The record itself is fetched separately by id. */
export interface EnquiryRealtimeChange {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  id: string;
}

interface EnquiriesRealtimeListener {
  onChange: (change: EnquiryRealtimeChange) => void;
  /** Called when the channel re-joins after a drop, since changes may have been missed. */
  onResubscribed?: (() => void) | undefined;
}

const enquiriesListeners = new Set<EnquiriesRealtimeListener>();
let enquiriesChannel: RealtimeChannel | null = null;
let enquiriesChannelTeardown: ReturnType<typeof setTimeout> | undefined;

export function subscribeToEnquiriesRealtime(
  onChange: EnquiriesRealtimeListener["onChange"],
  onResubscribed?: EnquiriesRealtimeListener["onResubscribed"],
): () => void {
  const listener: EnquiriesRealtimeListener = { onChange, onResubscribed };
  enquiriesListeners.add(listener);
  clearTimeout(enquiriesChannelTeardown);

  if (!enquiriesChannel) {
    let joinedBefore = false;
    enquiriesChannel = supabase
      .channel("global_enquiries_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enquiries" },
        (payload: any) => {
          const id = payload?.new?.id ?? payload?.old?.id;
          if (!id) return;
          const change: EnquiryRealtimeChange = { eventType: payload.eventType, id: String(id) };
          enquiriesListeners.forEach((l) => {
            try {
              l.onChange(change);
            } catch (e) {
              console.error(e);
            }
          });
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (joinedBefore) enquiriesListeners.forEach((l) => l.onResubscribed?.());
        joinedBefore = true;
      });
  }

  return () => {
    enquiriesListeners.delete(listener);
    // Deferred so a quick unmount/remount (React StrictMode, route changes)
    // reuses the joined channel instead of leaving and re-joining it.
    clearTimeout(enquiriesChannelTeardown);
    enquiriesChannelTeardown = setTimeout(() => {
      if (enquiriesListeners.size === 0 && enquiriesChannel) {
        supabase.removeChannel(enquiriesChannel);
        enquiriesChannel = null;
      }
    }, 1000);
  };
}
