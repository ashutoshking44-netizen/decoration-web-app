import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  CalendarCheck,
  AlertCircle,
  Users,
  CheckCircle2,
  Calendar as CalendarIcon,
  ExternalLink,
} from "lucide-react";
import {
  type BookedClient,
  type BookingStage,
  BOOKING_STAGES,
  parseEventDate,
  computeDecorationItemPrice,
  getClientTotal,
  formatCurrency,
} from "@/lib/clients";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BS_MONTHS = [
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

const AD_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface BookedClientsCalendarViewProps {
  clients: BookedClient[];
  initialDateStr?: string | undefined;
  onSelectBooking: (client: BookedClient) => void;
}

// Maps AD dates to BS date info matching project event fixtures
function getBsDateForAdDate(
  year: number,
  month: number, // 1-indexed (1-12)
  day: number
): { bsDay: number; bsMonth: string; bsText: string } {
  if (year === 2026 && month === 9) {
    if (day <= 16) {
      const bsDay = day + 15;
      return { bsDay, bsMonth: "Bhadra", bsText: `Bhadra ${bsDay}` };
    } else {
      const bsDay = day - 16;
      return { bsDay, bsMonth: "Mangsir", bsText: `Mangsir ${bsDay}` };
    }
  } else if (year === 2026 && month === 10) {
    const bsDay = day + 14;
    return { bsDay, bsMonth: "Mangsir", bsText: `Mangsir ${bsDay}` };
  } else if (year === 2026 && month === 8) {
    const bsDay = day + 16;
    return { bsDay, bsMonth: "Shrawan", bsText: `Shrawan ${bsDay}` };
  }
  return { bsDay: day, bsMonth: "BS", bsText: `BS ${day}` };
}

export function BookedClientsCalendarView({
  clients,
  initialDateStr,
  onSelectBooking,
}: BookedClientsCalendarViewProps) {
  // Calendar system toggle: "AD" or "BS"
  const [system, setSystem] = useState<"BS" | "AD">("AD");

  // Base month: September 2026 (index 8)
  const [monthOffset, setMonthOffset] = useState(0);

  // Selected date for day inspector
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialDateStr || "2026-09-20"
  );

  // Compute viewed year and month
  const viewedDate = useMemo(() => {
    const baseYear = 2026;
    const baseMonth = 8; // September (0-indexed)
    const targetMonth = baseMonth + monthOffset;
    const year = baseYear + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    return { year, month };
  }, [monthOffset]);

  // Header Title
  const monthTitle = useMemo(() => {
    const { year, month } = viewedDate;
    const adMonthName = AD_MONTHS[month];
    if (system === "AD") {
      const bsInfo = getBsDateForAdDate(year, month + 1, 15);
      return {
        primary: `${adMonthName} ${year}`,
        secondary: `${bsInfo.bsMonth} 2083 BS`,
      };
    } else {
      const bsInfo = getBsDateForAdDate(year, month + 1, 15);
      return {
        primary: `${bsInfo.bsMonth} 2083 BS`,
        secondary: `${adMonthName} ${year} AD`,
      };
    }
  }, [viewedDate, system]);

  // Build grid slots (7 columns: Sun-Sat)
  const gridDays = useMemo(() => {
    const { year, month } = viewedDate;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const slots: {
      dateStr: string;
      adDay: number;
      adMonth: number;
      adYear: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      bsDay: number;
      bsText: string;
      bookings: BookedClient[];
    }[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 12 : month;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const bs = getBsDateForAdDate(prevYear, prevMonth, day);
      const dayBookings = clients.filter((c) => {
        const p = parseEventDate(c.event_date);
        return p.adDate === dateStr;
      });

      slots.push({
        dateStr,
        adDay: day,
        adMonth: prevMonth,
        adYear: prevYear,
        isCurrentMonth: false,
        isToday: dateStr === "2026-09-20",
        bsDay: bs.bsDay,
        bsText: bs.bsText,
        bookings: dayBookings,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const curMonth = month + 1;
      const dateStr = `${year}-${String(curMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const bs = getBsDateForAdDate(year, curMonth, day);
      const dayBookings = clients.filter((c) => {
        const p = parseEventDate(c.event_date);
        return p.adDate === dateStr;
      });

      slots.push({
        dateStr,
        adDay: day,
        adMonth: curMonth,
        adYear: year,
        isCurrentMonth: true,
        isToday: dateStr === "2026-09-20",
        bsDay: bs.bsDay,
        bsText: bs.bsText,
        bookings: dayBookings,
      });
    }

    // 3. Next month leading days to complete 35 or 42 grid cells
    const remaining = (7 - (slots.length % 7)) % 7;
    const totalSlotsNeeded = slots.length + remaining < 35 ? 35 - slots.length : remaining;
    for (let day = 1; day <= totalSlotsNeeded; day++) {
      const nextMonth = month + 2 > 12 ? 1 : month + 2;
      const nextYear = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const bs = getBsDateForAdDate(nextYear, nextMonth, day);
      const dayBookings = clients.filter((c) => {
        const p = parseEventDate(c.event_date);
        return p.adDate === dateStr;
      });

      slots.push({
        dateStr,
        adDay: day,
        adMonth: nextMonth,
        adYear: nextYear,
        isCurrentMonth: false,
        isToday: dateStr === "2026-09-20",
        bsDay: bs.bsDay,
        bsText: bs.bsText,
        bookings: dayBookings,
      });
    }

    return slots;
  }, [viewedDate, clients]);

  // Selected Day info & bookings
  const selectedDayData = useMemo(() => {
    if (!selectedDateStr) return null;
    const dayBookings = clients.filter((c) => {
      const p = parseEventDate(c.event_date);
      return p.adDate === selectedDateStr;
    });

    const parsed = selectedDateStr.split("-");
    const y = parseInt(parsed[0] || "2026", 10);
    const m = parseInt(parsed[1] || "9", 10);
    const d = parseInt(parsed[2] || "1", 10);
    const bs = getBsDateForAdDate(y, m, d);

    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const monthName = AD_MONTHS[m - 1];

    return {
      dateStr: selectedDateStr,
      formattedAd: `${dayOfWeek}, ${monthName} ${d}, ${y}`,
      formattedBs: `${bs.bsText}, 2083 BS`,
      bookings: dayBookings,
      isToday: selectedDateStr === "2026-09-20",
    };
  }, [selectedDateStr, clients]);

  return (
    <div className="space-y-4">
      {/* Calendar Control Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[20px] border border-[#E7DCD6] bg-white p-4 shadow-2xs">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              aria-label="Previous month"
              className="flex size-8 items-center justify-center rounded-full text-[#8A7B76] hover:bg-[#F0EBE7] hover:text-[#2B2320] transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#2B2320] leading-none">
                {monthTitle.primary}
              </h2>
              <span className="text-[11px] font-semibold text-[#8A7B76] block mt-0.5">
                {monthTitle.secondary}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev + 1)}
              aria-label="Next month"
              className="flex size-8 items-center justify-center rounded-full text-[#8A7B76] hover:bg-[#F0EBE7] hover:text-[#2B2320] transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMonthOffset(0);
              setSelectedDateStr("2026-09-20");
            }}
            className="ml-2 rounded-full border border-[#E7DCD6] bg-[#FBF6F3] px-2.5 py-1 text-xs font-bold text-[#4A3F3C] hover:bg-[#F0EBE7] hover:text-[#2B2320] transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* System Toggle + Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend Items */}
          <div className="hidden md:flex items-center gap-3 text-xs text-[#8A7B76]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#E8546F]" />
              Today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-sky-500" />
              Confirmed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Delivered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              Attention
            </span>
          </div>

          {/* BS / AD Dual System Switcher */}
          <div className="flex items-center rounded-full bg-[#F0E7E2] p-[2.5px] border border-[#E7DCD6]">
            {(["AD", "BS"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSystem(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer select-none",
                  system === item
                    ? "bg-[#E8546F] text-white shadow-xs"
                    : "bg-transparent text-[#8A7B76] hover:text-[#2B2320]"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="rounded-[22px] border border-[#E7DCD6] bg-white p-3 sm:p-4 shadow-2xs overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
            <div
              key={dayName}
              className={cn(
                "py-1 text-xs font-bold tracking-wider uppercase",
                idx === 0 || idx === 6 ? "text-[#C33A56]" : "text-[#8A7B76]"
              )}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* 7-column Date Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {gridDays.map((slot) => {
            const isSelected = slot.dateStr === selectedDateStr;
            const hasBookings = slot.bookings.length > 0;
            const displayPrimary = system === "BS" ? slot.bsDay : slot.adDay;
            const displaySecondary =
              system === "BS" ? `AD ${slot.adDay}` : slot.bsText;

            return (
              <div
                key={slot.dateStr}
                onClick={() => setSelectedDateStr(slot.dateStr)}
                className={cn(
                  "group relative flex flex-col justify-between min-h-[95px] sm:min-h-[118px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer",
                  slot.isCurrentMonth
                    ? "bg-white border-[#EFE5E0] hover:border-[#E8546F]/40 hover:shadow-xs"
                    : "bg-[#FDFBF9] border-[#F4EBE6] opacity-60",
                  slot.isToday && "ring-1.5 ring-[#E8546F] border-transparent bg-rose-50/20",
                  isSelected && "ring-2 ring-[#C33A56] border-transparent shadow-sm bg-white"
                )}
              >
                {/* Cell Header: Date Numbers + Status Indicator */}
                <div className="flex items-start justify-between gap-1 leading-none">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "font-display text-sm sm:text-base font-bold tabular-nums",
                        slot.isToday
                          ? "text-[#C33A56]"
                          : slot.isCurrentMonth
                          ? "text-[#2B2320]"
                          : "text-[#B7A9A3]"
                      )}
                    >
                      {displayPrimary}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#A69791] font-medium truncate max-w-[50px] sm:max-w-[70px]">
                      {displaySecondary}
                    </span>
                  </div>

                  {slot.isToday && (
                    <span className="hidden sm:inline-flex rounded-full bg-[#FDEDEF] px-1.5 py-0.2 text-[9px] font-bold text-[#C33A56] border border-[#F9CFD7]">
                      Today
                    </span>
                  )}

                  {hasBookings && (
                    <span className="sm:hidden size-2 rounded-full bg-[#E8546F]" />
                  )}
                </div>

                {/* Event Chips List inside the cell */}
                <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                  {slot.bookings.map((client) => {
                    const isClosed = client.stage === "closed";
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(slot.dateStr);
                          onSelectBooking(client);
                        }}
                        className={cn(
                          "w-full text-left p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer group/chip",
                          client.needs_attention && !isClosed
                            ? "bg-rose-50 border-rose-200 text-rose-950 hover:bg-rose-100"
                            : isClosed
                            ? "bg-gray-50 border-gray-200 text-gray-700"
                            : "bg-[#FBF6F3] border-[#E7DCD6] text-[#2B2320] hover:border-[#E8546F] hover:bg-white hover:shadow-2xs"
                        )}
                        title={`${client.client_name} — ${client.event_type} (${client.stage})`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[10px] sm:text-[11px] font-bold group-hover/chip:text-[#C33A56]">
                            {client.client_name}
                          </span>
                          {client.needs_attention && !isClosed && (
                            <span
                              className="size-1.5 rounded-full bg-rose-500 shrink-0"
                              title="Needs attention"
                            />
                          )}
                        </div>

                        <div className="hidden sm:flex items-center justify-between text-[9px] text-[#8A7B76] mt-0.5">
                          <span className="truncate">{client.event_type.split(" ")[0]}</span>
                          <span className="font-semibold text-[#4A3F3C] tabular-nums">
                            Rs. {Math.round(getClientTotal(client) / 1000)}k
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* If no bookings, show subtle available tag on hover */}
                  {!hasBookings && slot.isCurrentMonth && (
                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-semibold text-[#B7A9A3]">
                        Available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector / Operation Schedule Drawer */}
      {selectedDayData && (
        <div className="rounded-[22px] border border-[#E7DCD6] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F0EBE7] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7B76] bg-[#FBF6F3] px-2.5 py-0.5 rounded-full border border-[#E7DCD6]">
                  Operations Schedule
                </span>
                {selectedDayData.isToday && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C33A56] bg-rose-50 px-2.5 py-0.5 rounded-full border border-[#F9CFD7]">
                    Today's Operations
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-bold text-[#2B2320] mt-1">
                {selectedDayData.formattedAd}
              </h3>
              <p className="text-xs text-[#8A7B76] mt-0.5 font-medium">
                {selectedDayData.formattedBs} ·{" "}
                {selectedDayData.bookings.length === 0
                  ? "Fully Available · No client events scheduled"
                  : `${selectedDayData.bookings.length} ${
                      selectedDayData.bookings.length === 1 ? "Event" : "Events"
                    } Booked`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                  selectedDayData.bookings.length > 0
                    ? "bg-rose-50 text-[#C33A56] border-[#F9CFD7]"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    selectedDayData.bookings.length > 0
                      ? "bg-[#E8546F]"
                      : "bg-emerald-500"
                  )}
                />
                {selectedDayData.bookings.length > 0
                  ? `${selectedDayData.bookings.length} Active Booking`
                  : "Date Available"}
              </span>
            </div>
          </div>

          {/* If there are bookings for this date */}
          {selectedDayData.bookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {selectedDayData.bookings.map((client) => {
                return (
                  <div
                    key={client.id}
                    className="rounded-[18px] border border-[#E7DCD6] bg-[#FBF6F3] p-4 space-y-3 transition-all hover:border-[#E8546F]/50 hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="font-display text-base font-bold text-[#2B2320]">
                          {client.client_name}
                        </strong>
                        <p className="text-xs text-[#8A7B76]">{client.event_type}</p>
                      </div>

                      {client.needs_attention && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          Needs Attention
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-[#8A7B76]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-[#B7A9A3] shrink-0" />
                        <span className="truncate">{client.venue}</span>
                      </div>

                      {client.decorations && (
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-[#E8546F] shrink-0" />
                          <span>
                            {client.decorations.length} Decor Items Scheduled (
                            {client.decorations.map((d) => d.name).join(", ")})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Financial & Action row */}
                    <div className="flex items-center justify-between border-t border-[#E7DCD6]/80 pt-3">
                      <div className="text-xs">
                        <span className="text-[#8A7B76]">Total: </span>
                        <strong className="tabular-nums font-bold text-[#2B2320]">
                          {formatCurrency(getClientTotal(client))}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-7 rounded-full border-[#E7DCD6]"
                              asChild
                            >
                              <a href={`tel:${client.phone}`} title="Call Client">
                                <Phone className="size-3 text-[#4A3F3C]" />
                              </a>
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-7 rounded-full border-[#E7DCD6]"
                              asChild
                            >
                              <a
                                href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp Client"
                              >
                                <MessageCircle className="size-3 text-emerald-600" />
                              </a>
                            </Button>
                          </div>
                        )}

                        <Button
                          size="sm"
                          onClick={() => onSelectBooking(client)}
                          className="h-7 rounded-full text-xs font-bold bg-[#E8546F] hover:bg-[#C33A56] text-white cursor-pointer"
                        >
                          Fulfillment Details
                          <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#E7DCD6] p-6 text-center bg-[#FDFBF9]">
              <CalendarCheck className="size-8 text-[#B7A9A3] mx-auto mb-2" />
              <h4 className="font-display text-sm font-bold text-[#2B2320]">
                No Bookings for {selectedDayData.formattedAd}
              </h4>
              <p className="text-xs text-[#8A7B76] mt-1 max-w-md mx-auto">
                Inventory items (mandaps, entrance arches, props, lights) and setup crews
                have zero conflicting commitments on this date. Ready to take bookings!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
