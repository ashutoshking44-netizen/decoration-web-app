// Step 4 (Configure Event) — how we fulfil a design the client picked from
// another company. One answer per reference design, per event. Answers travel
// with the quotation inside its `ceremonies` JSON (`designMatches`), so no new
// tables or columns are needed.
import type { DecorationCategory } from "./decoration-setups";

export interface DesignMatchAnswer {
  /** Stable key of the reference pick within its event (see referencePickKey). */
  referenceKey: string;
  /** Id of the card this reference produced in the event's selected cards. */
  referenceCardId: string;
  referenceName: string;
  referenceCategory: string;
  referenceCompanyName?: string | undefined;
  /** "Can we provide this design?" */
  availability: DesignAvailability | null;
  /** Yes/No answer saved by the first version of this step; read via availabilityOf(). */
  hasSimilar?: "yes" | "no" | null | undefined;
  /** How we match it: one of our catalogue designs, or a screenshot + requirements. */
  method: "catalog" | "upload" | null;
  /** Our catalogue design chosen to fulfil the reference. */
  matchedSetupId?: string | undefined;
  matchedSetupName?: string | undefined;
  /** Screenshot we uploaded (compressed data URL). Never the client's original reference. */
  screenshot?: string | undefined;
  /** "Describe the design requirements" */
  description: string;
  /**
   * Rate entered by hand in Pricing for an uploaded (custom) reference.
   * Undefined means not priced yet; there is never a default.
   */
  rate?: number | undefined;
}

export type DesignAvailability = "exact" | "similar";

/**
 * The answer's availability. Answers saved by earlier versions of this step
 * ("Yes"/"No", or "Need to Recreate") were screenshot-and-description answers,
 * so they read as Similar Design (their upload details are kept).
 */
export function availabilityOf(a: DesignMatchAnswer | undefined): DesignAvailability | null {
  if (!a) return null;
  const saved = a.availability as string | null | undefined;
  if (saved === "exact" || saved === "similar") return saved;
  if (saved === "recreate") return "similar";
  if (a.hasSimilar === "yes" || a.hasSimilar === "no") return "similar";
  return null;
}

/** True when a similar design chosen from our catalogue fulfils this reference. */
export function matchedFromCatalog(a: DesignMatchAnswer | undefined): boolean {
  return !!a && availabilityOf(a) === "similar" && a.method === "catalog" && !!a.matchedSetupId;
}

/**
 * True when we fulfil this reference from an uploaded screenshot and written
 * requirements. It is a custom design with no price yet: shown in Pricing as an
 * unpriced design reference, never as a priced card.
 */
export function isUploadedReference(a: DesignMatchAnswer | undefined): boolean {
  return !!a && availabilityOf(a) === "similar" && a.method === "upload";
}

/** A design the client picked in their enquiry, as shown on Step 4. */
export interface DesignPick {
  key: string;
  pickIndex: number;
  name: string;
  category: string;
  image?: string | undefined;
  companyName?: string | undefined;
  /** The full decoration the client sent (price, description, inclusions, specs). */
  raw?: any;
}

/** Key for a pick that stays the same however often the enquiry is reloaded. */
export function referencePickKey(pick: any, pickIndex: number): string {
  const id = String(pick?.decorationId || pick?.id || pick?.name || pick?.title || "pick");
  return `${pickIndex}:${id}`;
}

export function pickImage(pick: any): string | undefined {
  const gallery = Array.isArray(pick?.gallery) ? pick.gallery : [];
  const url = pick?.photo || pick?.image || pick?.imageUrl || gallery[0];
  return typeof url === "string" && url.trim() ? url : undefined;
}

/**
 * Maps category names from the client site and our catalogue onto one value,
 * e.g. "Entrance" and "Entrance Gate" are the same category.
 */
export function normalizeDecorationCategory(raw: unknown): DecorationCategory | string {
  const s = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return "";
  if (s.includes("entrance") || s.includes("gate")) return "Entrance Gate";
  if (s.includes("welcome") || s.includes("board") || s.includes("signage")) return "Welcome Board";
  if (s.includes("backdrop")) return "Backdrop";
  if (s.includes("mandap")) return "Mandap";
  if (s.includes("stage")) return "Stage";
  return String(raw).trim();
}

export function sameDecorationCategory(a: unknown, b: unknown): boolean {
  const na = normalizeDecorationCategory(a);
  return !!na && na.toLowerCase() === normalizeDecorationCategory(b).toLowerCase();
}

export function emptyDesignMatch(ref: DesignPick, referenceCardId: string): DesignMatchAnswer {
  return {
    referenceKey: ref.key,
    referenceCardId,
    referenceName: ref.name,
    referenceCategory: ref.category,
    referenceCompanyName: ref.companyName,
    availability: null,
    method: null,
    description: "",
  };
}

/** What is still missing before this reference can be continued, or null when complete. */
export function designMatchProblem(a: DesignMatchAnswer | undefined): string | null {
  const av = availabilityOf(a);
  if (!a || !av) return "Choose whether we can provide this design.";
  if (av === "exact") return null; // we already have it: nothing more to answer
  if (!a.method) return "Choose how you would like to match this design.";
  if (a.method === "catalog") {
    return a.matchedSetupId ? null : "Select one of our designs to match it.";
  }
  // Upload a Screenshot
  if (!a.screenshot) return "Upload a screenshot of the design.";
  if (!a.description.trim()) return "Describe the design requirements.";
  return null;
}
