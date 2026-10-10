import { useMemo } from "react";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import NepaliDate from "nepali-date-converter";
import type { BookedClient } from "@/lib/clients";
import { BS_MONTHS, resolveClientDate, todayIso } from "@/lib/booked-dates";
import { getDaysInBsMonth } from "@/lib/event-schedule";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

const MONTHS_SHOWN = 3;

function waLink(c: BookedClient) {
  const digits = (c.whatsapp || c.phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits.length === 10 ? `977${digits}` : digits}` : null;
}

/**
 * One row per Nepali month (current + next two) with a dot per day. Booked days
 * are highlighted; hover (or tap) one to see who it is and call / WhatsApp them.
 */
export function BookedCalendarStrip({
  clients,
  onPickDate,
  selectedIso,
}: {
  clients: BookedClient[];
  /** A booked day was clicked (or a name in its hover card). */
  onPickDate: (iso: string, label: string) => void;
  selectedIso?: string | null | undefined;
}) {
  const rows = useMemo(() => {
    const now = new NepaliDate(new Date());
    const today = todayIso();
    const byKey = new Map<string, BookedClient[]>();
    for (const c of clients) {
      const r = resolveClientDate(c);
      if (!r) continue;
      const key = `${r.bsYear}-${r.bsMonth}-${r.bsDay}`;
      byKey.set(key, [...(byKey.get(key) ?? []), c]);
    }
    return Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      let year = now.getYear();
      let month = now.getMonth() + i;
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      const days = getDaysInBsMonth(year, month);
      let booked = 0;
      const cells = Array.from({ length: days }, (_, d) => {
        const day = d + 1;
        const list = byKey.get(`${year}-${month}-${day}`) ?? [];
        if (list.length) booked += 1;
        const isToday = i === 0 && day === now.getDate();
        const isPast = i === 0 && day < now.getDate();
        const iso = list[0] ? (resolveClientDate(list[0])?.iso ?? "") : "";
        return { day, list, isToday, isPast, iso, label: `${day} ${BS_MONTHS[month] ?? ""}` };
      });
      return { year, month, cells, booked, today };
    });
  }, [clients]);

  return (
    <section className="rounded-2xl border border-[#F3D5DB] bg-white p-4 shadow-2xs sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#E8546F]" />
          <h2 className="font-display text-sm font-semibold text-[#2B2320]">Booking Calendar</h2>
          <span className="flex items-center gap-1 text-xs text-[#8A7B76]">
            <span className="size-2.5 rounded-full bg-[#E8546F]" /> Booked
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${row.year}-${row.month}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#F5E7E2] bg-[#FDF9F7] px-3 py-2.5"
          >
            <span className="w-24 shrink-0 rounded-full bg-gradient-to-r from-[#E8546F] to-[#F08A5D] px-3 py-1 text-center font-display text-xs font-semibold text-white">
              {BS_MONTHS[row.month]} {row.year}
            </span>
            {/* Dots share the row width; on phones the row scrolls sideways instead of shrinking them */}
            <div className="order-last min-w-0 basis-full overflow-x-auto [scrollbar-width:none] sm:order-none sm:basis-0 sm:flex-1 [&::-webkit-scrollbar]:hidden">
              <div
                className="grid min-w-[780px] items-center"
                style={{ gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))` }}
              >
              {row.cells.map((cell) =>
                cell.list.length > 0 ? (
                  <HoverCard key={cell.day} openDelay={80} closeDelay={120}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        onClick={() => cell.iso && onPickDate(cell.iso, cell.label)}
                        aria-pressed={selectedIso === cell.iso}
                        aria-label={`${cell.list.map((c) => c.client_name).join(", ")} — ${BS_MONTHS[row.month]} ${cell.day}`}
                        className={cn(
                          "mx-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E8546F] text-[10px] font-bold text-white shadow-xs transition hover:scale-110",
                          cell.isToday && "ring-2 ring-[#E8546F]/40 ring-offset-1",
                          selectedIso && selectedIso === cell.iso && "ring-2 ring-[#5A1A26] ring-offset-2",
                          cell.isPast && "opacity-60",
                        )}
                      >
                        {cell.day}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64 space-y-2 rounded-xl border-[#F3D5DB] p-3" sideOffset={6}>
                      <p className="font-display text-xs font-semibold text-[#5A1A26]">
                        {BS_MONTHS[row.month]} {cell.day}, {row.year}
                      </p>
                      {cell.list.map((c) => {
                        const wa = waLink(c);
                        return (
                          <div key={c.id} className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => cell.iso && onPickDate(cell.iso, cell.label)}
                              className="min-w-0 text-left"
                              title="Show this booking below"
                            >
                              <span className="block truncate text-sm font-semibold text-[#2B2320]">{c.client_name}</span>
                              <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-[#8A7B76]">
                                {c.event_type}
                              </span>
                            </button>
                            <div className="flex shrink-0 gap-1.5">
                              {c.phone && (
                                <a
                                  href={`tel:${c.phone}`}
                                  className="flex size-7 items-center justify-center rounded-full bg-[#FDEDEF] text-[#D6415C] transition hover:bg-[#FBD9DF]"
                                  title="Call"
                                >
                                  <Phone className="size-3.5" />
                                </a>
                              )}
                              {wa && (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="size-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  <span
                    key={cell.day}
                    className={cn(
                      "mx-auto flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums",
                      cell.isToday
                        ? "font-bold text-[#D6415C] ring-2 ring-[#E8546F]/40"
                        : cell.isPast
                          ? "text-[#D9CFCA]"
                          : "text-[#B7A9A3]",
                    )}
                  >
                    {cell.day}
                  </span>
                ),
              )}
              </div>
            </div>
            <span className="ml-auto shrink-0 rounded-full border border-[#F3D5DB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#D6415C] sm:ml-0">
              {row.booked} booked
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
