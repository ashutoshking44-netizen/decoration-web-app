import type { BookedClient } from "./clients";
import { parseEventDate } from "./clients";
import { convertAdToBs, convertBsToAd, parseBsText } from "./event-schedule";

export interface ResolvedDate {
  /** YYYY-MM-DD */
  iso: string;
  /** 0-based BS month */
  bsYear: number;
  bsMonth: number;
  bsDay: number;
}

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isoToResolved(iso: string): ResolvedDate | null {
  const bs = convertAdToBs(iso);
  if (!bs) return null;
  return { iso, bsYear: bs.year, bsMonth: bs.month, bsDay: bs.day };
}

/**
 * Event dates are stored in a few shapes ("2026-11-27 (Mangsir 11)",
 * "Mangsir 14, 2083 (Nov 30, 2026)", "Mangsir 14, 2083"); work out the real date.
 */
export function resolveEventDateText(text: string): ResolvedDate | null {
  const ad = parseEventDate(text).adDate;
  if (ad) return isoToResolved(ad);
  const bs = parseBsText(text.split("(")[0] ?? "");
  if (bs) {
    const iso = convertBsToAd(bs.year, bs.month, bs.day);
    if (iso) return { iso, bsYear: bs.year, bsMonth: bs.month, bsDay: bs.day };
  }
  const inParens = /\(([^)]+)\)/.exec(text)?.[1];
  if (inParens) {
    const t = Date.parse(inParens);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return isoToResolved(iso);
    }
  }
  return null;
}

export function resolveClientDate(c: BookedClient): ResolvedDate | null {
  return resolveEventDateText(c.event_date);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from today until the event (negative = already passed). */
export function daysUntil(iso: string): number {
  const a = fromIso(todayIso());
  const b = fromIso(iso);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function formatBs(r: ResolvedDate): string {
  return `${r.bsDay} ${BS_MONTHS[r.bsMonth] ?? ""} ${r.bsYear}`;
}

/** Stored format the rest of the app already understands: "YYYY-MM-DD (Mangsir 11)". */
export function toStoredEventDate(iso: string): string {
  const r = isoToResolved(iso);
  return r ? `${iso} (${BS_MONTHS[r.bsMonth] ?? ""} ${r.bsDay})` : iso;
}
