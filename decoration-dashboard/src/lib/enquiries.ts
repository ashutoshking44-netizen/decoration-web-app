import { useState, useEffect } from "react";
import { type BookedClient, upsertStoredBookedClient } from "./clients";

export type EnquirySource = "Instagram" | "Website" | "Facebook" | "Referral" | "Walk-in";

export type EnquiryStatus =
  | "unreviewed"
  | "interested"
  | "quotation_created"
  | "not_available"
  | "archived";

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

  // Quotation number (human-readable, e.g. "Q-NISTHA")
  quotation_number?: string | undefined;

  // Soft-delete fields
  deleted_at?: string | undefined;
  deleted_by?: string | undefined;
}

export const INITIAL_ENQUIRIES: EnquiryItem[] = [
  {
    id: "enq-sworup-raj",
    client_name: "Sworup Raj",
    phone: "+9779819368019",
    whatsapp_number: "9779819368019",
    location: "Kathmandu · Inside Kathmandu",
    source: "Website",
    created_at: "2026-10-04T13:39:00Z",
    time_ago_display: "Oct 4, 2026, 1:39 PM",
    ceremony_type: "wedding",
    date_bs: "18 Ashwin 2083 BS",
    date_ad: "Oct 4, 2026",
    venue: "Grand Hall",
    availability_status: "free",
    availability_summary:
      "Your studio is free on this date. Full inventory available for Grand Hall setup.",
    status: "unreviewed",
    private_note: "",
    assigned_handler: "Pooja Thapa",
    estimated_budget_npr: 595000,
    package_tier: "PLATINUM PACKAGE",
    time_slot: "4 AM - 5 AM",
    guest_count: 200,
  },
  {
    id: "enq-nistha",
    client_name: "Nistha",
    phone: "+977 9841882233",
    whatsapp_number: "9841882233",
    location: "Kathmandu · Inside Kathmandu",
    source: "Instagram",
    created_at: "2026-09-25T13:22:00Z",
    time_ago_display: "6d 1h 53m ago",
    ceremony_type: "Anniversary Celebration",
    date_bs: "Mangsir 14, 2083",
    date_ad: "Nov 30, 2026",
    venue: "Majestic Grand, Kathmandu",
    availability_status: "hot",
    availability_summary:
      "Your studio is free on all 1 date. 1 date is globally hot across 3 studio bookings — respond fast, crew gets scarce.",
    status: "unreviewed",
    private_note: "Inquired about romantic candlelight backdrop and fresh red roses setup.",
    assigned_handler: "Pooja Thapa",
    estimated_budget_npr: 120000,
  },
  {
    id: "enq-satya-raj",
    client_name: "Satya Raj Ghimire",
    phone: "+977 9851098765",
    whatsapp_number: "9851098765",
    location: "Kathmandu · Bouddha",
    source: "Website",
    created_at: "2026-09-30T11:05:00Z",
    time_ago_display: "1d 4h 12m ago",
    ceremony_type: "Baby Shower",
    date_bs: "Kartik 28, 2083",
    date_ad: "Nov 14, 2026",
    venue: "Hyatt Regency, Bouddha",
    availability_status: "free",
    availability_summary:
      "Your studio is free on this date. 0 bookings confirmed — high crew availability and warehouse stock.",
    status: "unreviewed",
    private_note: "",
    assigned_handler: "Rohan Shrestha",
    estimated_budget_npr: 95000,
  },
  {
    id: "enq-aayush-shrestha",
    client_name: "Aayush Shrestha",
    phone: "+977 9801994411",
    whatsapp_number: "9801994411",
    location: "Lalitpur · Bhaisepati",
    source: "Instagram",
    created_at: "2026-10-01T11:30:00Z",
    time_ago_display: "3h 45m ago",
    ceremony_type: "Wedding Reception",
    date_bs: "Mangsir 2, 2083",
    date_ad: "Nov 18, 2026",
    venue: "The Soaltee, Grand Ballroom, Kathmandu",
    availability_status: "warning",
    availability_summary:
      "Critical date demand! 2 studio bookings already active for Mangsir 2. Only 1 setup crew slot remains open.",
    status: "unreviewed",
    private_note: "High-value wedding. Looking for grand floral mandap and stage arch.",
    assigned_handler: "Bikash Adhikari",
    estimated_budget_npr: 280000,
  },
  {
    id: "enq-pooja-sharma",
    client_name: "Pooja Sharma",
    phone: "+977 9849221100",
    whatsapp_number: "9849221100",
    location: "Lalitpur · Kupondole",
    source: "Facebook",
    created_at: "2026-10-01T07:00:00Z",
    time_ago_display: "8h 15m ago",
    ceremony_type: "Haldi & Mehendi",
    date_bs: "Mangsir 9, 2083",
    date_ad: "Nov 25, 2026",
    venue: "Client Residence Lawn, Bhaisepati",
    availability_status: "free",
    availability_summary:
      "Your studio is free on this date. Perfect opportunity for daytime marigold and drapes setup.",
    status: "unreviewed",
    private_note: "",
    assigned_handler: "Pooja Thapa",
    estimated_budget_npr: 85000,
  },
  {
    id: "enq-prabin-karki",
    client_name: "Prabin Karki",
    phone: "+977 9860335588",
    whatsapp_number: "9860335588",
    location: "Bhaktapur · Sallaghari",
    source: "Referral",
    created_at: "2026-09-30T20:25:00Z",
    time_ago_display: "18h 50m ago",
    ceremony_type: "Bratabandha Ceremony",
    date_bs: "Mangsir 21, 2083",
    date_ad: "Dec 7, 2026",
    venue: "Heritage Garden, Sanepa",
    availability_status: "free",
    availability_summary:
      "Your studio is free on all 1 date. Full inventory available for traditional hawan and brass setups.",
    status: "unreviewed",
    private_note: "Referred by Bikash Adhikari from last season.",
    assigned_handler: "Bikash Adhikari",
    estimated_budget_npr: 110000,
  },
  {
    id: "enq-sneha-thapa",
    client_name: "Sneha Thapa",
    phone: "+977 9813556677",
    whatsapp_number: "9813556677",
    location: "Kathmandu · Gairidhara",
    source: "Website",
    created_at: "2026-09-29T08:45:00Z",
    time_ago_display: "2d 6h 30m ago",
    ceremony_type: "Engagement & Ring Exchange",
    date_bs: "Kartik 22, 2083",
    date_ad: "Nov 8, 2026",
    venue: "Alice Reception, Gairidhara",
    availability_status: "hot",
    availability_summary:
      "Your studio is free on this date. 1 date is globally hot across 2 studio enquiries — fast follow-up recommended.",
    status: "unreviewed",
    private_note: "",
    assigned_handler: "Rohan Shrestha",
    estimated_budget_npr: 75000,
  },
  {
    id: "enq-bibek-poudel",
    client_name: "Bibek Poudel",
    phone: "+977 9851122334",
    whatsapp_number: "9851122334",
    location: "Lalitpur · Jhamsikhel",
    source: "Walk-in",
    created_at: "2026-09-27T03:15:00Z",
    time_ago_display: "4d 11h ago",
    ceremony_type: "Cocktail Party & Sangeet",
    date_bs: "Mangsir 11, 2083",
    date_ad: "Nov 27, 2026",
    venue: "Aalishan Banquet, Jhamsikhel",
    availability_status: "free",
    availability_summary:
      "Your studio is free on this date. DJ truss and modern LED neon frames ready in warehouse.",
    status: "unreviewed",
    private_note: "Walked in with family. Needs customized quote with LED lighting.",
    assigned_handler: "Pooja Thapa",
    estimated_budget_npr: 140000,
  },
];

const STORAGE_KEY = "decoration_app_enquiries_v1";

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
  if (typeof window === "undefined") return INITIAL_ENQUIRIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ENQUIRIES));
      return INITIAL_ENQUIRIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (!parsed.some((e: EnquiryItem) => e.client_name === "Sworup Raj")) {
        const updated = [INITIAL_ENQUIRIES[0], ...parsed];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      // Filter deleted unless caller opts in
      return includeDeleted ? parsed : parsed.filter((e: EnquiryItem) => !e.deleted_at);
    }
    return INITIAL_ENQUIRIES;
  } catch {
    return INITIAL_ENQUIRIES;
  }
}

export function saveStoredEnquiries(enquiries: EnquiryItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
    return true;
  } catch (err) {
    console.error("Failed to save enquiries to localStorage", err);
    return false;
  }
}

export function useEnquiriesStore() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>(loadStoredEnquiries);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setEnquiries(loadStoredEnquiries());
    setIsLoaded(true);
  }, []);

  const triggerPrompt = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, prompt_state: "asking_quotation" as const } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
  };

  const cancelPrompt = (id: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, prompt_state: "idle" as const } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
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
  };

  const savePrivateNote = (id: string, note: string) => {
    const updated = enquiries.map((e) =>
      e.id === id ? { ...e, private_note: note } : e
    );
    setEnquiries(updated);
    saveStoredEnquiries(updated);
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
        enquiry.events && enquiry.events.length > 1
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
            ],
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

    return newClient;
  };

  const resetEnquiries = () => {
    setEnquiries(INITIAL_ENQUIRIES);
    saveStoredEnquiries(INITIAL_ENQUIRIES);
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
  };

  // Metrics summary
  const metrics = {
    today: 3,
    yesterday: 5,
    month: 47,
    totalUnreviewed: enquiries.filter((e) => e.status === "unreviewed").length,
    hotDatesCount: enquiries.filter((e) => e.availability_status === "hot" && e.status === "unreviewed").length,
    freeDatesCount: enquiries.filter((e) => e.availability_status === "free" && e.status === "unreviewed").length,
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
