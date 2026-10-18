/**
 * Locally-persisted "intake" defaults for the Quotation Studio wizard —
 * the Source / Handler pill lists (user-extendable) and the last-used
 * values the "Defaults" button re-applies.
 */

const STORAGE_KEY = "decoration-portal:quotation-intake";

export interface QuotationIntakeState {
  sourceOptions: string[];
  handlerOptions: string[];
  lastSource?: string | undefined;
  lastHandler?: string | undefined;
  lastCity?: string | undefined;
  lastEventLocation?: string | undefined;
}

export const DEFAULT_SOURCE_OPTIONS = [
  "INSTAGRAM",
  "TIK-TOK",
  "FACEBOOK",
  "HANDLER",
  "WHATSAPP",
  "REFERENCE",
  "OLD-CLIENT",
  "WEBSITE",
  "OTHER",
];

export const DEFAULT_HANDLER_OPTIONS = ["Satya Raj Ghimire", "suvash mukhiya", "ANWESHA ADHIKARI"];

export const EVENT_LOCATION_OPTIONS = [
  "Inside Kathmandu",
  "Outside Kathmandu",
  "Mixed",
  "Kathmandu → Outside",
  "Outside → Kathmandu",
];

function emptyState(): QuotationIntakeState {
  return {
    sourceOptions: [...DEFAULT_SOURCE_OPTIONS],
    handlerOptions: [...DEFAULT_HANDLER_OPTIONS],
    lastSource: "INSTAGRAM",
    lastEventLocation: "Inside Kathmandu",
    lastCity: "Kathmandu",
    lastHandler: "suvash mukhiya",
  };
}

export function loadQuotationIntake(): QuotationIntakeState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      sourceOptions:
        Array.isArray(parsed.sourceOptions) && parsed.sourceOptions.length > 0
          ? parsed.sourceOptions
          : [...DEFAULT_SOURCE_OPTIONS],
      handlerOptions:
        Array.isArray(parsed.handlerOptions) && parsed.handlerOptions.length > 0
          ? parsed.handlerOptions
          : [...DEFAULT_HANDLER_OPTIONS],
      lastSource: typeof parsed.lastSource === "string" ? parsed.lastSource : "INSTAGRAM",
      lastHandler: typeof parsed.lastHandler === "string" ? parsed.lastHandler : "suvash mukhiya",
      lastCity: typeof parsed.lastCity === "string" ? parsed.lastCity : "Kathmandu",
      lastEventLocation:
        typeof parsed.lastEventLocation === "string"
          ? parsed.lastEventLocation
          : "Inside Kathmandu",
    };
  } catch {
    return emptyState();
  }
}

export function saveQuotationIntake(state: QuotationIntakeState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore write failures (private browsing / storage full)
  }
}
