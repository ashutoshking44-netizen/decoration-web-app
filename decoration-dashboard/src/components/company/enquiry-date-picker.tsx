import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import { cn } from "@/lib/utils";

/**
 * Multi-date calendar for the public enquiry form.
 * - Nepali (BS) calendar by default, AD toggle available
 * - tap several days to pick several event dates
 * - "Add pending date" for clients who only know the month
 */

export interface PickedDate {
  id: string;
  /** YYYY-MM-DD, or "" for a pending (month-only) date */
  dateAd: string;
  /** e.g. "Kartik 2083" when the exact day isn't known yet */
  pendingLabel?: string | undefined;
}

const BS_MONTH_KEYS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];
export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const ROSE = "#E11D48";
const BORDER = "rgba(180, 150, 140, 0.28)";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
function uid() {
  return `d-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

export function bsDateLabel(dateAd: string): string {
  try {
    const bs = new NepaliDate(fromIso(dateAd));
    return `${bs.getDate()} ${BS_MONTH_NAMES[bs.getMonth()] ?? ""} ${bs.getYear()}`;
  } catch {
    return "";
  }
}
export function adDateLabel(dateAd: string): string {
  return fromIso(dateAd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EnquiryDatePicker({
  dates,
  onChange,
  error,
  single = false,
}: {
  dates: PickedDate[];
  onChange: (dates: PickedDate[]) => void;
  error?: string | undefined;
  /** Just a calendar for one date: no heading, chips or "pending date" option. */
  single?: boolean | undefined;
}) {
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [system, setSystem] = useState<"BS" | "AD">("BS");
  const [offset, setOffset] = useState(0);
  const [pendingOpen, setPendingOpen] = useState(false);

  const nowBs = useMemo(() => new NepaliDate(today), [today]);
  const [pendMonth, setPendMonth] = useState(nowBs.getMonth());
  const [pendYear, setPendYear] = useState(nowBs.getYear());

  const exact = useMemo(
    () => dates.filter((d) => d.dateAd).sort((a, b) => a.dateAd.localeCompare(b.dateAd)),
    [dates],
  );
  const pending = dates.filter((d) => !d.dateAd);
  const selected = useMemo(() => new Set(exact.map((d) => d.dateAd)), [exact]);

  const grid = useMemo(() => {
    if (system === "AD") {
      const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const y = base.getFullYear();
      const m = base.getMonth();
      const n = new Date(y, m + 1, 0).getDate();
      return {
        label: base.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        lead: base.getDay(),
        days: Array.from({ length: n }, (_, i) => ({ n: i + 1, iso: iso(new Date(y, m, i + 1)) })),
      };
    }
    let y = nowBs.getYear();
    let m = nowBs.getMonth() + offset;
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const cfg = dateConfigMap[String(y)] as Record<string, number> | undefined;
    const n = cfg?.[BS_MONTH_KEYS[m] ?? ""] ?? 30;
    return {
      label: `${BS_MONTH_NAMES[m] ?? ""} ${y}`,
      lead: new NepaliDate(y, m, 1).getDay(),
      days: Array.from({ length: n }, (_, i) => ({
        n: i + 1,
        iso: iso(new NepaliDate(y, m, i + 1).toJsDate()),
      })),
    };
  }, [system, offset, today, nowBs]);

  const toggle = (dayIso: string) => {
    if (dayIso < todayIso) return;
    if (selected.has(dayIso)) {
      onChange(dates.filter((d) => d.dateAd !== dayIso));
    } else {
      onChange([...dates, { id: uid(), dateAd: dayIso }]);
    }
  };

  const addPending = () => {
    const label = `${BS_MONTH_NAMES[pendMonth] ?? ""} ${pendYear}`;
    if (pending.some((p) => p.pendingLabel === label)) {
      setPendingOpen(false);
      return;
    }
    onChange([...dates, { id: uid(), dateAd: "", pendingLabel: label }]);
    setPendingOpen(false);
  };

  const switchSystem = (next: "BS" | "AD") => {
    setSystem(next);
    setOffset(0);
  };

  return (
    <div className="space-y-4">
      {!single && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7B76]">
          Select event dates <span className="text-[#D6415C]">*</span>
        </p>
      )}

      <div className="rounded-3xl border bg-white p-3 sm:p-4" style={{ borderColor: BORDER }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={offset <= 0}
            aria-label="Previous month"
            className="grid size-9 place-items-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-base font-bold" style={{ color: "#9F1239" }}>
              {grid.label}
            </h3>
            <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: BORDER }}>
              {(["BS", "AD"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => switchSystem(opt)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider transition",
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
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next month"
            className="grid size-9 place-items-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: grid.lead }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {grid.days.map(({ n, iso: dayIso }) => {
            const isSel = selected.has(dayIso);
            const isToday = dayIso === todayIso;
            const past = dayIso < todayIso;
            return (
              <button
                key={dayIso}
                type="button"
                disabled={past}
                onClick={() => toggle(dayIso)}
                aria-pressed={isSel}
                className={cn(
                  "mx-auto flex h-10 w-full max-w-[56px] items-center justify-center rounded-xl text-sm transition select-none",
                  past && "cursor-not-allowed text-slate-300",
                  !past && !isSel && "text-slate-700 hover:bg-rose-50",
                  isSel && "font-bold text-white shadow-sm",
                  !isSel && isToday && !past && "border font-semibold",
                )}
                style={{
                  backgroundColor: isSel ? ROSE : undefined,
                  borderColor: !isSel && isToday ? ROSE : undefined,
                  color: !isSel && isToday ? ROSE : undefined,
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {!single && (exact.length > 0 || pending.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {exact.map((d) => (
            <Chip
              key={d.id}
              label={bsDateLabel(d.dateAd)}
              title={adDateLabel(d.dateAd)}
              onRemove={() => onChange(dates.filter((x) => x.id !== d.id))}
            />
          ))}
          {pending.map((d) => (
            <Chip
              key={d.id}
              label={`${d.pendingLabel} (date pending)`}
              dashed
              onRemove={() => onChange(dates.filter((x) => x.id !== d.id))}
            />
          ))}
        </div>
      )}

      {single ? null : pendingOpen ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-4">
          <p className="text-xs font-semibold text-rose-800">Which month is it likely to be?</p>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={pendMonth}
              onChange={(e) => setPendMonth(Number(e.target.value))}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            >
              {BS_MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={pendYear}
              onChange={(e) => setPendYear(Number(e.target.value))}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            >
              {[nowBs.getYear(), nowBs.getYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addPending}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: ROSE }}
            >
              Add pending date
            </button>
            <button
              type="button"
              onClick={() => setPendingOpen(false)}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setPendingOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-rose-300 bg-rose-50/70 px-4 py-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100/60"
          >
            <CalendarPlus className="size-4" />
            Add pending date
          </button>
          <p className="mt-2 text-center text-xs text-[#8A7B76]">
            Don't know the exact day yet? Add a pending date — just tell us the month.
          </p>
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-[#D6415C]">{error}</p>}
    </div>
  );
}

function Chip({
  label,
  title,
  dashed,
  onRemove,
}: {
  label: string;
  title?: string;
  dashed?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-rose-50 py-1.5 pl-3.5 pr-2 text-xs font-semibold text-rose-700",
        dashed ? "border-dashed border-rose-300" : "border-rose-200",
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="grid size-5 place-items-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
