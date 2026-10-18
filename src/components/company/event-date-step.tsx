import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import { cn } from "@/lib/utils";
import { convertAdToBs, type EventScheduleItem } from "@/lib/event-schedule";

/** One selected quotation date. Entries are always kept in date order. */
export interface EventDateEntry {
  id: string;
  dateAd: string;
  role?: string;
}

function makeEntryId() {
  return `d-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

export function createEventDateEntry(dateAd: string): EventDateEntry {
  return { id: makeEntryId(), dateAd };
}

/** Legacy helper export for backwards compatibility */
export function isEventDayRole(_role?: unknown): boolean {
  return true;
}

/** Each selected date becomes an "Event N" ceremony that Step 3 assigns a decoration card to. */
export function entriesToSchedule(
  entries: EventDateEntry[],
  venue: string,
  previous: EventScheduleItem[],
  _legacyName?: string,
): EventScheduleItem[] {
  return [...entries]
    .sort((a, b) => a.dateAd.localeCompare(b.dateAd))
    .map((e, i) => {
      const prev = previous.find((p) => p.id === e.id) || previous[i];
      const bs = convertAdToBs(e.dateAd);
      const stableId = prev?.id || e.id || `c-${i + 1}`;
      const name =
        prev?.isCustom && prev?.name
          ? prev.name
          : prev?.name && !prev.name.startsWith("Event ")
            ? prev.name
            : `Event ${i + 1}`;
      return {
        id: stableId,
        name,
        isCustom: Boolean(prev?.isCustom || (prev?.name && !prev.name.startsWith("Event "))),
        dateAd: e.dateAd,
        dateBs: bs ? bs.formatted : "",
        venueClassification: prev?.venueClassification || "Banquet & Ballroom",
        venueLocation: venue?.trim() || prev?.venueLocation || "Venue to be confirmed",
        sameAsPreviousVenue: false,
      };
    });
}

function isoFromJsDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function adLabel(iso: string): string {
  return dateFromIso(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const BS_MONTH_KEYS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];
const BS_MONTH_DISPLAY = [
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
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bsLabel(iso: string): string {
  try {
    const bs = new NepaliDate(dateFromIso(iso));
    return `${bs.getDate()} ${BS_MONTH_DISPLAY[bs.getMonth()] ?? ""} ${bs.getYear()}`;
  } catch {
    return "";
  }
}

const ROSE = "hsl(350, 80%, 65%)";
const ROSE_DARK = "hsl(350, 80%, 45%)";
const ROSE_SOFT = "hsl(350, 80%, 96%)";
const BORDER = "rgba(180, 150, 140, 0.28)";

export interface EventDateStepProps {
  entries: EventDateEntry[];
  onEntriesChange: (entries: EventDateEntry[]) => void;
  fromEnquiry?: boolean;
  venue?: string;
  onVenueChange?: (venue: string) => void;
  bookings?: unknown[];
  ignoreBookingId?: string | null;
  onBack: () => void;
  onContinue: () => void;
}

export function EventDateStep({
  entries,
  onEntriesChange,
  fromEnquiry,
  onBack,
  onContinue,
}: EventDateStepProps) {
  const [system, setSystem] = useState<"AD" | "BS">("AD");
  const [monthOffset, setMonthOffset] = useState(() => {
    const first = entries[0]?.dateAd;
    if (!first) return 0;
    const d = dateFromIso(first);
    const now = new Date();
    return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
  });

  const today = new Date();
  const todayIso = isoFromJsDate(today);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.dateAd.localeCompare(b.dateAd)),
    [entries],
  );
  const selectedSet = useMemo(() => new Set(sorted.map((e) => e.dateAd)), [sorted]);

  const offsetFor = (iso: string, sys: "AD" | "BS") => {
    const d = dateFromIso(iso);
    if (sys === "AD") {
      return (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth());
    }
    const target = new NepaliDate(d);
    const now = new NepaliDate(today);
    return (target.getYear() - now.getYear()) * 12 + (target.getMonth() - now.getMonth());
  };

  const switchSystem = (next: "AD" | "BS") => {
    const anchor = sorted[0]?.dateAd ?? todayIso;
    setSystem(next);
    setMonthOffset(offsetFor(anchor, next));
  };

  const grid = useMemo(() => {
    if (system === "AD") {
      const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const year = base.getFullYear();
      const month = base.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return {
        label: base.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        lead: new Date(year, month, 1).getDay(),
        days: Array.from({ length: daysInMonth }, (_, i) => ({
          n: i + 1,
          iso: isoFromJsDate(new Date(year, month, i + 1)),
        })),
      };
    }
    const now = new NepaliDate(today);
    let y = now.getYear();
    let m = now.getMonth() + monthOffset;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    const yearConfig = dateConfigMap[String(y)] as Record<string, number> | undefined;
    const daysInMonth = yearConfig?.[BS_MONTH_KEYS[m] ?? ""] ?? 30;
    return {
      label: `${BS_MONTH_DISPLAY[m] ?? ""} ${y}`,
      lead: new NepaliDate(y, m, 1).getDay(),
      days: Array.from({ length: daysInMonth }, (_, i) => ({
        n: i + 1,
        iso: isoFromJsDate(new NepaliDate(y, m, i + 1).toJsDate()),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, monthOffset, todayIso]);

  const toggleDate = (iso: string) => {
    if (selectedSet.has(iso)) {
      onEntriesChange(sorted.filter((e) => e.dateAd !== iso));
      return;
    }
    onEntriesChange(
      [...sorted, createEventDateEntry(iso)].sort((a, b) => a.dateAd.localeCompare(b.dateAd)),
    );
  };

  const removeEntry = (id: string) => {
    onEntriesChange(sorted.filter((e) => e.id !== id));
  };

  const canContinue = sorted.length > 0;

  return (
    <div className="w-full">
      <div className="space-y-5 pb-28 sm:pb-32">
        {fromEnquiry && (
          <div
            className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
            style={{
              backgroundColor: ROSE_SOFT,
              borderColor: "hsl(350, 70%, 88%)",
              color: ROSE_DARK,
            }}
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Event dates are preselected from the enquiry. You can choose additional dates or
              modify them as needed.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,46.5%)_minmax(0,53.5%)] items-start">
          {/* LEFT: calendar */}
          <section
            className="self-start rounded-3xl border bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(60,30,30,0.04)] flex flex-col justify-center"
            style={{ borderColor: BORDER }}
            aria-label="Event calendar"
          >
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonthOffset((o) => o - 1)}
                aria-label="Previous month"
                className="grid size-8 cursor-pointer place-items-center rounded-full border text-slate-500 transition-colors hover:bg-stone-100"
                style={{ borderColor: BORDER }}
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <div className="flex flex-1 flex-col items-center gap-1">
                <h3 className="font-['Cormorant_Garamond',serif] text-xl sm:text-[22px] font-semibold text-slate-900 leading-tight">
                  {grid.label}
                </h3>
                <div
                  className="inline-flex rounded-full border p-0.5"
                  style={{ borderColor: BORDER }}
                >
                  {(["AD", "BS"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => switchSystem(opt)}
                      className={cn(
                        "cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider transition-colors",
                        system === opt ? "text-white" : "text-slate-500 hover:text-slate-800",
                      )}
                      style={{ backgroundColor: system === opt ? ROSE : "transparent" }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMonthOffset((o) => o + 1)}
                aria-label="Next month"
                className="grid size-8 cursor-pointer place-items-center rounded-full border text-slate-500 transition-colors hover:bg-stone-100"
                style={{ borderColor: BORDER }}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: grid.lead }, (_, i) => (
                <div key={`b-${i}`} />
              ))}
              {grid.days.map(({ n, iso }) => {
                const selected = selectedSet.has(iso);
                const isToday = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => toggleDate(iso)}
                    aria-pressed={selected}
                    className={cn(
                      "flex aspect-square max-h-[44px] sm:max-h-[48px] items-center justify-center rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all select-none cursor-pointer",
                      !selected && "text-slate-700 hover:bg-rose-50/70",
                      selected && "font-semibold text-white shadow-xs scale-[1.02]",
                      !selected && isToday && "border font-bold text-slate-900",
                    )}
                    style={{
                      backgroundColor: selected ? ROSE : undefined,
                      borderColor: !selected && isToday ? ROSE : undefined,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            <div
              className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-[11px] text-slate-500"
              style={{ borderColor: BORDER }}
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: ROSE }} />{" "}
                Selected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border" style={{ borderColor: ROSE }} />{" "}
                Today
              </span>
            </div>
          </section>

          {/* RIGHT: selected dates */}
          <section
            className="self-start rounded-3xl border bg-white p-5 shadow-[0_1px_2px_rgba(60,30,30,0.04)] sm:p-7"
            style={{ borderColor: BORDER }}
            aria-label="Selected dates"
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                SELECTED DATES
              </h2>
              {sorted.length > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide"
                  style={{ backgroundColor: ROSE_SOFT, color: ROSE_DARK }}
                >
                  {sorted.length} {sorted.length === 1 ? "Date" : "Dates"}
                </span>
              )}
            </div>

            {sorted.length === 0 ? (
              <div
                className="mt-4 rounded-2xl border border-dashed px-4 py-12 text-center"
                style={{ borderColor: BORDER }}
              >
                <p className="text-sm font-semibold text-slate-800">Select event dates</p>
                <p className="mt-1 text-xs text-slate-500">
                  Choose one or more dates from the calendar.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {sorted.map((e, i) => (
                  <li
                    key={e.id}
                    className="group relative rounded-2xl border bg-white p-4 shadow-2xs transition-all hover:border-[#e14b68]/40"
                    style={{ borderColor: BORDER }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-slate-900">Event {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        aria-label={`Remove Event ${i + 1}`}
                        className="grid size-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#e14b68]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-slate-800">
                      {bsLabel(e.dateAd)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{adLabel(e.dateAd)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderColor: BORDER }}
      >
        <div className="w-full px-6 sm:px-10 lg:px-14 py-3 sm:py-3.5">
          {!canContinue && (
            <p className="mb-2 text-xs font-medium text-slate-500">
              Select at least one date to continue.
            </p>
          )}
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 shadow-2xs"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back
            </button>
            <button
              type="button"
              disabled={!canContinue}
              onClick={onContinue}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
              style={{ backgroundColor: ROSE }}
            >
              Continue
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDateStep;
