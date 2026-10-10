import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type BookedClient, type ClientCeremonyItem, upsertStoredBookedClient } from "./clients";
import { fetchEnquiriesFromSupabase, upsertEnquiryInSupabase, subscribeToEnquiriesRealtime } from "./supabase-service";
import { getCompanyNameById } from "./current-company";
import { enquiryRepository, ENQUIRY_STORAGE_ERROR_EVENT, type StorageErrorDetail } from "./enquiry-repository";
import { INITIAL_ENQUIRIES } from "./enquiries-sample-data";

/**
 * Ceremonies for a quotation made from a website enquiry, carrying the decorations the
 * client already picked (so the quotation preview isn't empty). Returns null when the
 * enquiry has no picked decorations, so callers keep their usual behaviour.
 */
export function ceremoniesFromEnquiry(enq: {
  events?: EnquiryEvent[] | undefined;
  ceremony_type: string;
  date_bs: string;
  date_ad: string;
  venue: string;
}): ClientCeremonyItem[] | null {
  const events = enq.events ?? [];
  if (!events.some((e) => ((e.requested_decorations?.length ?? (e as any).decorations?.length ?? 0) > 0))) return null;
  return events.map((ev, i) => {
    const date = ev.date_bs ? (ev.date_ad ? `${ev.date_bs} · ${ev.date_ad}` : ev.date_bs) : ev.date_ad;
    const picks = ev.requested_decorations ?? (ev as any).decorations ?? [];
    const firstPick = picks[0];
    return {
      id: `c-${i + 1}`,
      name: ev.name,
      date,
      venue: ev.venue,
      setupId: firstPick ? String(firstPick.decorationId || firstPick.id || "") : undefined,
      setupName: firstPick ? String(firstPick.name || firstPick.title || "Decoration") : undefined,
      setupPrice: firstPick ? Number(firstPick.listedPrice ?? firstPick.price) || 0 : undefined,
      setupImage: firstPick ? String(firstPick.photo || firstPick.image || firstPick.imageUrl || "") : undefined,
      category: firstPick?.category || "Stage",
      items: picks.map((d: any) => ({
        id: String(d.id || d.decorationId || ""),
        name: d.title || d.name || "Decoration",
        price: Number(d.listedPrice ?? d.price) || 0,
        setupId: String(d.decorationId || d.id || ""),
        category: d.category || "Stage",
        ...(d.image || d.imageUrl || d.photo ? { imageUrl: d.image || d.imageUrl || d.photo } : {}),
        pending: !(Number(d.listedPrice ?? d.price) > 0),
      })),
    };
  });
}

export type EnquirySource = "Instagram" | "Website" | "Facebook" | "Referral" | "Walk-in" | "client_panel";

export type EnquiryStatus =
  | "unreviewed"
  | "interested"
  | "quotation_created"
  | "not_available"
  | "archived";

export interface EnquiryRequestedDecoration {
  id: string;
  decorationId?: string | undefined;
  title: string;
  name?: string | undefined;
  category: string;
  price: number;
  listedPrice?: number | undefined;
  priceUnit?: string | undefined;
  price_unit?: string | undefined;
  image?: string | undefined;
  photo?: string | undefined;
  gallery?: string[] | undefined;
  description?: string | undefined;
  inclusions?: string[] | undefined;
  style?: string | undefined;
  theme?: string | undefined;
  colours?: string | undefined;
  size?: string | undefined;
  dimensions?: string | undefined;
  structure?: string | undefined;
  platform?: string | undefined;
  lighting?: string | undefined;
  flowers?: string | undefined;
  seating?: string | undefined;
  customText?: string | undefined;
  events?: string | undefined;
  companyId?: string | undefined;
  companyName?: string | undefined;
  ownerCompanyId?: string | undefined;
  ownerCompanyName?: string | undefined;
  specifications?: any;
  entranceGateSpecs?: any;
  welcomeBoardSpecs?: any;
  mandapSpecs?: any;
  backdropSpecs?: any;
  stageSpecs?: any;
}

/**
 * Creates a clean snapshot of a decoration at enquiry send time.
 * Only copies fields the company has actually filled in; skips empty ones.
 * Preserves all public fields and category-specific specs.
 */
export function buildDecorationSnapshot(dec: any, catalogFallback?: any): EnquiryRequestedDecoration {
  const fallback = catalogFallback || {};
  const primary = dec || {};

  const id = String(fallback.decorationId || fallback.id || primary.decorationId || primary.id || "");
  const name = String(fallback.name || fallback.title || primary.name || primary.title || "Decoration").trim();
  const category = String(fallback.category || primary.category || "Stage").trim();
  const price = Number(fallback.total_price ?? fallback.listedPrice ?? fallback.price ?? primary.total_price ?? primary.listedPrice ?? primary.price) || 0;

  // Cover photo
  const photo = String(
    fallback.photo || fallback.imageUrl || fallback.image || primary.photo || primary.imageUrl || primary.image || ""
  ).trim() || undefined;

  // Extra photos (gallery) - filter out empty strings and deduplicate
  const rawGallery: string[] = (Array.isArray(fallback.gallery) && fallback.gallery.length > 0)
    ? fallback.gallery
    : ((Array.isArray(primary.gallery) && primary.gallery.length > 0)
      ? primary.gallery
      : (photo ? [photo] : []));
  const gallery = [...new Set(rawGallery.filter((url) => typeof url === "string" && url.trim().length > 0))];

  // Price unit (only if filled)
  const priceUnit = (
    fallback.priceUnit || fallback.price_unit || fallback.specifications?.price_unit || fallback.pricing_unit ||
    primary.priceUnit || primary.price_unit || primary.specifications?.price_unit || primary.pricing_unit || ""
  )?.trim() || undefined;

  // Description
  const description = (fallback.description?.trim() || primary.description?.trim()) || undefined;

  // Inclusions: from explicit array or synthesized from filled specifications
  let inclusions: string[] | undefined = undefined;
  if (Array.isArray(fallback.inclusions) && fallback.inclusions.length > 0) {
    inclusions = fallback.inclusions.filter((item: any) => typeof item === "string" && item.trim().length > 0);
  } else if (Array.isArray(primary.inclusions) && primary.inclusions.length > 0) {
    inclusions = primary.inclusions.filter((item: any) => typeof item === "string" && item.trim().length > 0);
  } else if (fallback.specifications || primary.specifications) {
    const specs = fallback.specifications || primary.specifications;
    const synthesized: string[] = [];

    if (specs.main_structure || specs.structure_type) {
      synthesized.push(`Main Structure: ${specs.main_structure || specs.structure_type}`);
    }
    if (specs.floral_tag === "with_flowers" || specs.flowers_used) {
      if (Array.isArray(specs.flowers) && specs.flowers.length > 0) {
        const flowerList = specs.flowers
          .map((f: any) => `${f.name || "Flowers"}${f.colour ? ` (${f.colour})` : ""}`)
          .join(", ");
        synthesized.push(`Flowers: ${flowerList}`);
      } else {
        synthesized.push("Fresh & silk floral arrangement included");
      }
    }
    if (specs.platforms_used || specs.mandap_platform_used) {
      const platformParts = [
        specs.platform_shape,
        specs.platform_colour ? `in ${specs.platform_colour}` : "",
        specs.platform_height ? `(${specs.platform_height}ft height)` : "",
      ].filter(Boolean);
      synthesized.push(`Platform: ${platformParts.join(" ") || "Raised platform deck"}`);
    }
    if (specs.lighting_used) {
      if (Array.isArray(specs.lighting) && specs.lighting.length > 0) {
        const lightList = specs.lighting
          .map((l: any) => `${l.type || "Lights"}${l.quantity ? ` (${l.quantity} ${l.unit || "pcs"})` : ""}`)
          .join(", ");
        synthesized.push(`Lighting: ${lightList}`);
      } else {
        synthesized.push("Integrated spotlights & ambient lights");
      }
    }
    if (specs.furniture_used && specs.furniture_details?.trim()) {
      synthesized.push(`Furniture: ${specs.furniture_details.trim()}`);
    }
    if (synthesized.length > 0) {
      inclusions = synthesized;
    }
  }

  // Style / theme / colours
  let style: string | undefined = undefined;
  if (fallback.style?.trim()) {
    style = fallback.style.trim();
  } else if (primary.style?.trim()) {
    style = primary.style.trim();
  } else if (Array.isArray(fallback.specifications?.setup_styles) && fallback.specifications.setup_styles.length > 0) {
    style = fallback.specifications.setup_styles.join(", ");
  } else if (Array.isArray(primary.specifications?.setup_styles) && primary.specifications.setup_styles.length > 0) {
    style = primary.specifications.setup_styles.join(", ");
  } else if (fallback.backdropSpecs?.backdropStyle || primary.backdropSpecs?.backdropStyle) {
    style = fallback.backdropSpecs?.backdropStyle || primary.backdropSpecs?.backdropStyle;
  }

  const theme: string | undefined = (fallback.theme?.trim() || primary.theme?.trim()) || undefined;

  let colours: string | undefined = undefined;
  if (fallback.colours?.trim()) {
    colours = fallback.colours.trim();
  } else if (primary.colours?.trim()) {
    colours = primary.colours.trim();
  } else if (Array.isArray(fallback.specifications?.color_theme) && fallback.specifications.color_theme.length > 0) {
    colours = fallback.specifications.color_theme.join(", ");
  } else if (Array.isArray(primary.specifications?.color_theme) && primary.specifications.color_theme.length > 0) {
    colours = primary.specifications.color_theme.join(", ");
  } else {
    const specs = fallback.specifications || primary.specifications;
    if (Array.isArray(specs?.flowers) && specs.flowers.length > 0) {
      const flowerColors = [...new Set(specs.flowers.map((f: any) => f.colour).filter(Boolean))];
      if (flowerColors.length > 0) colours = flowerColors.join(", ");
    }
  }

  // Size / dimensions
  let size: string | undefined = undefined;
  if (fallback.dimensions?.trim()) {
    size = fallback.dimensions.trim();
  } else if (fallback.size?.trim()) {
    size = fallback.size.trim();
  } else if (primary.dimensions?.trim()) {
    size = primary.dimensions.trim();
  } else if (primary.size?.trim()) {
    size = primary.size.trim();
  } else if (fallback.specifications?.dimensions?.width_ft && fallback.specifications?.dimensions?.height_ft) {
    size = `${fallback.specifications.dimensions.width_ft} × ${fallback.specifications.dimensions.height_ft} ft`;
  } else if (primary.specifications?.dimensions?.width_ft && primary.specifications?.dimensions?.height_ft) {
    size = `${primary.specifications.dimensions.width_ft} × ${primary.specifications.dimensions.height_ft} ft`;
  } else if (fallback.backdropSpecs?.dimensions || primary.backdropSpecs?.dimensions) {
    size = fallback.backdropSpecs?.dimensions || primary.backdropSpecs?.dimensions;
  } else if (fallback.stageSpecs?.dimensions || primary.stageSpecs?.dimensions) {
    size = fallback.stageSpecs?.dimensions || primary.stageSpecs?.dimensions;
  }

  // Category-specific details
  const structure = (fallback.structure?.trim() || primary.structure?.trim()) || undefined;
  const platform = (fallback.platform?.trim() || primary.platform?.trim()) || undefined;
  const lighting = (fallback.lighting?.trim() || primary.lighting?.trim()) || undefined;
  const flowers = (fallback.flowers?.trim() || primary.flowers?.trim()) || undefined;
  const seating = (fallback.seating?.trim() || primary.seating?.trim()) || undefined;
  const customText = (fallback.customText?.trim() || primary.customText?.trim()) || undefined;
  const events = (fallback.events?.trim() || primary.events?.trim()) || undefined;

  const entranceGateSpecs = fallback.entranceGateSpecs || primary.entranceGateSpecs || undefined;
  const welcomeBoardSpecs = fallback.welcomeBoardSpecs || primary.welcomeBoardSpecs || undefined;
  const mandapSpecs = fallback.mandapSpecs || primary.mandapSpecs || undefined;
  const backdropSpecs = fallback.backdropSpecs || primary.backdropSpecs || undefined;
  const stageSpecs = fallback.stageSpecs || primary.stageSpecs || undefined;

  // Ownership
  let companyId = fallback.companyId || fallback.ownerCompanyId || primary.companyId || primary.ownerCompanyId || undefined;
  if (companyId === "comp-1") companyId = "company-1";
  if (companyId === "comp-2") companyId = "company-2";

  let companyName = fallback.companyName || fallback.ownerCompanyName || primary.companyName || primary.ownerCompanyName || undefined;
  if (companyId && (!companyName || companyName === "Company 1")) {
    companyName = getCompanyNameById(companyId);
  }

  const snapshot: EnquiryRequestedDecoration = {
    id,
    decorationId: id,
    name,
    title: name,
    category,
    price,
    listedPrice: price,
    ...(photo ? { photo, image: photo } : {}),
    ...(gallery && gallery.length > 0 ? { gallery } : {}),
    ...(priceUnit ? { priceUnit, price_unit: priceUnit } : {}),
    ...(description ? { description } : {}),
    ...(inclusions && inclusions.length > 0 ? { inclusions } : {}),
    ...(style ? { style } : {}),
    ...(theme ? { theme } : {}),
    ...(colours ? { colours } : {}),
    ...(size ? { size, dimensions: size } : {}),
    ...(structure ? { structure } : {}),
    ...(platform ? { platform } : {}),
    ...(lighting ? { lighting } : {}),
    ...(flowers ? { flowers } : {}),
    ...(seating ? { seating } : {}),
    ...(customText ? { customText } : {}),
    ...(events ? { events } : {}),
    ...(companyId ? { companyId, ownerCompanyId: companyId } : {}),
    ...(companyName ? { companyName, ownerCompanyName: companyName } : {}),
    ...(entranceGateSpecs ? { entranceGateSpecs } : {}),
    ...(welcomeBoardSpecs ? { welcomeBoardSpecs } : {}),
    ...(mandapSpecs ? { mandapSpecs } : {}),
    ...(backdropSpecs ? { backdropSpecs } : {}),
    ...(stageSpecs ? { stageSpecs } : {}),
  };

  // Log saved snapshot item to console as required
  console.log("[Enquiry Snapshot Saved Item]:", JSON.stringify(snapshot, null, 2));

  return snapshot;
}


/** One ceremony/function inside a multi-event enquiry (e.g. Mehendi, Wedding, Reception). */
export interface EnquiryEvent {
  name: string;
  date_ad: string; // e.g. "Nov 30, 2026"
  date_bs: string; // e.g. "Mangsir 14, 2083 BS"
  /** Exact date as YYYY-MM-DD, when the client picked one (absent for pending dates). */
  date_iso?: string | undefined;
  time_slot?: string | undefined;
  venue: string;
  guest_count?: number | undefined;
  /** Decorations the client asked for at this event (e.g. "Stage", "Mandap"). */
  requirements?: string[] | undefined;
  /** Specific reference notes, photos, and links attached directly to individual categories (e.g. Stage, Mandap). */
  category_details?: Record<string, { note?: string | undefined; photoUrl?: string | undefined; link?: string | undefined }> | undefined;
  /** Catalogue decorations the client picked on the website for this event. */
  requested_decorations?: EnquiryRequestedDecoration[] | undefined;
  /** Optional note the client left about this event. */
  note?: string | undefined;
  /** Reference photos for this event live in IndexedDB under "<enquiryId>#<eventIndex>". */
  photo_count?: number | undefined;
  photos_saved?: boolean | undefined;
}

export interface EnquiryItem {
  id: string;
  client_name: string;
  phone: string;
  whatsapp_number?: string | undefined;
  email?: string | undefined;
  location: string; // e.g. "Kathmandu · Inside Kathmandu"
  source: EnquirySource;
  created_at: string;
  time_ago_display: string; // e.g. "6d 1h 53m ago"
  ceremony_type: string; // e.g. "wedding", "Anniversary"
  date_bs: string; // e.g. "18 Ashwin 2083 BS"
  date_ad: string; // e.g. "Nov 30, 2026"
  date_iso?: string | undefined;
  venue: string; // e.g. "Grand Hall", "Majestic Grand, Kathmandu"
  availability_status: "free" | "hot" | "warning";
  availability_summary: string;
  status: EnquiryStatus;
  private_note?: string | undefined;
  assigned_handler?: string | undefined;
  estimated_budget_npr?: number | undefined;
  prompt_state?: "idle" | "asking_quotation" | "later" | undefined;
  decline_reason?: string | undefined;
  package_tier?: string | undefined;
  time_slot?: string | undefined;
  guest_count?: number | undefined;
  responded_at?: string | undefined;

  // Multi-event enquiries (first item mirrors the top-level ceremony/date/venue fields)
  events?: EnquiryEvent[] | undefined;
  // Client-supplied reference photos (compressed JPEG data URLs)
  reference_images?: string[] | undefined; // legacy: photos used to be stored inline
  // Photos are stored in IndexedDB (see enquiry-photos.ts); these describe them.
  reference_photo_count?: number | undefined;
  reference_photos_saved?: boolean | undefined;

  /** Website enquiries: a one-decoration direct order, or a full quotation request. */
  order_type?: "direct-order" | "quotation-request" | undefined;

  // Quotation number (human-readable, e.g. "Q-NISTHA")
  quotation_number?: string | undefined;

  // Soft-delete fields
  deleted_at?: string | undefined;
  deleted_by?: string | undefined;

  // Sample lead flag to isolate demo leads from real client enquiries
  isSample?: boolean | undefined;
}

export { INITIAL_ENQUIRIES };

const STORAGE_KEY = "decoration_app_enquiries_v1";

const DUMMY_IDS = new Set([
  "enq-sworup-raj",
  "enq-nistha",
  "enq-satya-raj",
  "enq-aayush-shrestha",
  "enq-pooja-sharma",
  "enq-prabin-karki",
  "enq-sneha-thapa",
  "enq-bibek-poudel",
]);

// ── Audit Log ───────────────────────────────────────────────────────────────
const AUDIT_KEY = "decoration_app_audit_log_v1";

export interface AuditEntry {
  id: string;
  action: string;
  target_id: string;
  target_label: string;
  performed_by: string;
  performed_at: string;
  detail?: string | undefined;
}

export function writeAuditLog(entry: Omit<AuditEntry, "id" | "performed_at">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const log: AuditEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift({
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      performed_at: new Date().toISOString(),
    });
    // Keep the last 500 entries to avoid unbounded growth
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 500)));
  } catch {
    // Ignore storage errors
  }
}
// ────────────────────────────────────────────────────────────────────────────

export function loadStoredEnquiries(includeDeleted = false): EnquiryItem[] {
  return enquiryRepository.getAll(includeDeleted);
}

export function saveStoredEnquiries(enquiries: EnquiryItem[]): boolean {
  return enquiryRepository.save(enquiries);
}

export function useEnquiriesStore() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>(() => enquiryRepository.getAll());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Initial sync from Supabase (never clobber local data if Supabase is empty)
    fetchEnquiriesFromSupabase()
      .then((data) => {
        if (data && data.length > 0) {
          enquiryRepository.mergeRemote(data);
          setEnquiries(enquiryRepository.getAll());
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn("[useEnquiriesStore] Supabase fetch error:", err);
        setIsLoaded(true);
      });

    // 2. Shared Realtime changes from Supabase
    const unsubscribe = subscribeToEnquiriesRealtime(() => {
      fetchEnquiriesFromSupabase().then((data) => {
        if (data && data.length > 0) {
          enquiryRepository.mergeRemote(data);
          setEnquiries(enquiryRepository.getAll());
        }
      });
    });

    // 3. New enquiries arriving from client site or sync events
    const onSynced = () => {
      setEnquiries(enquiryRepository.getAll());
    };
    window.addEventListener("enquiries-synced", onSynced);
    window.addEventListener("storage", onSynced);

    // 4. Storage error notification
    const onStorageError = (e: Event) => {
      const detail = (e as CustomEvent<StorageErrorDetail>).detail;
      toast.warning(detail?.message || "Storage warning");
    };
    window.addEventListener(ENQUIRY_STORAGE_ERROR_EVENT, onStorageError as EventListener);

    return () => {
      window.removeEventListener("enquiries-synced", onSynced);
      window.removeEventListener("storage", onSynced);
      window.removeEventListener(ENQUIRY_STORAGE_ERROR_EVENT, onStorageError as EventListener);
      unsubscribe();
    };
  }, []);

  const triggerPrompt = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, prompt_state: "asking_quotation" as const } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const cancelPrompt = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, prompt_state: "idle" as const } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const markInterestedLater = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "interested" as const,
            prompt_state: "later" as const,
            responded_at: new Date().toISOString(),
          }
        : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const markNotAvailable = (id: string, reason?: string) => {
    const updated = enquiries.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "not_available" as const,
            prompt_state: "idle" as const,
            decline_reason: reason || "Date conflict / Studio unavailable",
            responded_at: new Date().toISOString(),
          }
        : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const savePrivateNote = (id: string, note: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, private_note: note } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const restoreEnquiry = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "unreviewed" as const,
            prompt_state: "idle" as const,
            decline_reason: undefined,
          }
        : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  const createQuotationForEnquiry = (id: string): BookedClient | null => {
    const enquiry = enquiries.find((e) => e.id === id);
    if (!enquiry) return null;

    // Build matching BookedClient record
    const newClient: BookedClient = {
      id: enquiry.id,
      client_name: enquiry.client_name,
      event_type: enquiry.ceremony_type,
      event_date: `${enquiry.date_ad} (${enquiry.date_bs})`,
      venue: enquiry.venue,
      stage: "confirmed",
      payment_status: "balance_due",
      payment_note: "Quotation generated from incoming inquiry",
      total_amount: enquiry.estimated_budget_npr || 85000,
      paid_amount: 0,
      balance_due: enquiry.estimated_budget_npr || 85000,
      days_to_event: 45,
      needs_attention: false,
      phone: enquiry.phone,
      handler: enquiry.assigned_handler || "Pooja Thapa",
      events_count: enquiry.events?.length || 1,
      quotation_status: "Draft",
      proposal_id: `PROP-${enquiry.id.replace("enq-", "").toUpperCase()}-2083`,
      ceremonies:
        ceremoniesFromEnquiry(enquiry) ??
        (enquiry.events && enquiry.events.length > 1
          ? enquiry.events.map((ev, i) => ({
              id: `c-${i + 1}`,
              name: ev.name,
              date: ev.date_bs,
              venue: ev.venue,
              setupPrice: i === 0 ? enquiry.estimated_budget_npr || 85000 : 0,
            }))
          : [
              {
                id: `c-1`,
                name: enquiry.ceremony_type,
                date: enquiry.date_bs,
                venue: enquiry.venue,
                setupPrice: enquiry.estimated_budget_npr || 85000,
              },
            ]),
      notes: enquiry.private_note,
    };

    // Upsert into Booked Clients store
    upsertStoredBookedClient(newClient);

    // Update enquiry state
    const updated = enquiries.map((e) =>
      e.id === id
        ? {
            ...e,
            status: "quotation_created" as const,
            prompt_state: "idle" as const,
            responded_at: new Date().toISOString(),
          }
        : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);

    return newClient;
  };

  const resetEnquiries = () => {
    const updated = enquiryRepository.resetSampleLeads();
    setEnquiries(updated);
  };

  /**
   * Soft-delete an enquiry's quotation. The enquiry itself stays; its
   * status reverts to quotation_pending so it re-enters the triage pipeline.
   * An audit log entry is written automatically.
   */
  const softDeleteQuotation = (
    id: string,
    label: string,
    deletedBy = "staff"
  ) => {
    const all = loadStoredEnquiries(true);
    const updated = all.map((e) =>
      e.id === id
        ? {
            ...e,
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy,
            // Revert stage back to quotation_pending
            status: "interested" as const,
            prompt_state: "later" as const,
          }
        : e
    );
    saveStoredEnquiries(updated);
    setEnquiries(updated.filter((e) => !e.deleted_at));
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);

    writeAuditLog({
      action: "quotation_deleted",
      target_id: id,
      target_label: label,
      performed_by: deletedBy,
      detail: "Soft-deleted via Enquiries & Quotations page",
    });
  };

  /**
   * Undo a soft-delete — restores the quotation_created status.
   */
  const undoDeleteQuotation = (id: string) => {
    const all = loadStoredEnquiries(true);
    const updated = all.map((e) =>
      e.id === id
        ? {
            ...e,
            deleted_at: undefined,
            deleted_by: undefined,
            status: "quotation_created" as const,
            prompt_state: "idle" as const,
          }
        : e
    );
    saveStoredEnquiries(updated);
    setEnquiries(updated.filter((e) => !e.deleted_at));
    const target = updated.find((e) => e.id === id);
    if (target) void upsertEnquiryInSupabase(target);
  };

  // Metrics summary calculated from real data
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const metrics = {
    today: enquiries.filter((e) => e.created_at?.startsWith(todayStr)).length,
    yesterday: enquiries.filter((e) => e.created_at?.startsWith(yesterdayStr)).length,
    month: enquiries.filter((e) => e.created_at?.startsWith(monthStr)).length,
    totalUnreviewed: enquiries.filter((e) => e.status === "unreviewed" || (e.status as any) === "new" || !e.status).length,
    hotDatesCount: enquiries.filter((e) => e.availability_status === "hot" && (e.status === "unreviewed" || (e.status as any) === "new" || !e.status)).length,
    freeDatesCount: enquiries.filter((e) => e.availability_status === "free" && (e.status === "unreviewed" || (e.status as any) === "new" || !e.status)).length,
  };

  return {
    enquiries,
    isLoaded,
    metrics,
    triggerPrompt,
    cancelPrompt,
    markInterestedLater,
    markNotAvailable,
    savePrivateNote,
    restoreEnquiry,
    createQuotationForEnquiry,
    resetEnquiries,
    softDeleteQuotation,
    undoDeleteQuotation,
  };
}
