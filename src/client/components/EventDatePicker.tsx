import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import "./EventDatePicker.css";

export interface EventDatePickerProps {
  value: string; // ISO date 'YYYY-MM-DD' or ''
  onChange: (dateIso: string) => void;
  minDate?: string | undefined; // Optional min date ISO string (e.g. today)
  eventName?: string | undefined;
  defaultSystem?: ("AD" | "BS") | undefined;
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

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function getBsDaysInMonth(year: number, month: number): number {
  const yearConfig = (dateConfigMap as Record<string, Record<string, number>>)[String(year)];
  const key = BS_MONTH_KEYS[month] || "";
  return yearConfig?.[key] ?? 30;
}

function getBsSubtitle(bsYear: number, bsMonth: number, daysInMonth: number): string {
  try {
    const d1 = new NepaliDate(bsYear, bsMonth, 1).toJsDate();
    const d2 = new NepaliDate(bsYear, bsMonth, daysInMonth).toJsDate();
    const m1 = AD_MONTHS[d1.getMonth()];
    const m2 = AD_MONTHS[d2.getMonth()];
    const y1 = d1.getFullYear();
    const y2 = d2.getFullYear();
    if (m1 === m2) return `${m1} ${y1}`;
    if (y1 === y2) return `${m1}-${m2} ${y1}`;
    return `${m1} ${y1} - ${m2} ${y2}`;
  } catch {
    return "";
  }
}

function getAdSubtitle(adYear: number, adMonth: number, daysInMonth: number): string {
  try {
    const d1 = new Date(adYear, adMonth, 1);
    const d2 = new Date(adYear, adMonth, daysInMonth);
    const bs1 = new NepaliDate(d1);
    const bs2 = new NepaliDate(d2);
    const m1 = BS_MONTH_DISPLAY[bs1.getMonth()];
    const m2 = BS_MONTH_DISPLAY[bs2.getMonth()];
    const y1 = bs1.getYear();
    const y2 = bs2.getYear();
    if (m1 === m2) return `${m1} ${y1}`;
    if (y1 === y2) return `${m1}-${m2} ${y1}`;
    return `${m1} ${y1} - ${m2} ${y2}`;
  } catch {
    return "";
  }
}

export function formatAdDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = parseIso(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatBsDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = parseIso(iso);
    const bs = new NepaliDate(d);
    return `${bs.getDate()} ${BS_MONTH_DISPLAY[bs.getMonth()] || ""} ${bs.getYear()} BS`;
  } catch {
    return "";
  }
}

export const EventDatePicker: React.FC<EventDatePickerProps> = ({
  value,
  onChange,
  minDate,
  defaultSystem = "BS",
}) => {
  const [system, setSystem] = useState<"AD" | "BS">(defaultSystem);

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoString(today), [today]);

  // Track currently viewed month & year for BS and AD
  const [bsYear, setBsYear] = useState<number>(() => {
    const base = value ? parseIso(value) : today;
    try {
      return new NepaliDate(base).getYear();
    } catch {
      return 2083;
    }
  });

  const [bsMonth, setBsMonth] = useState<number>(() => {
    const base = value ? parseIso(value) : today;
    try {
      return new NepaliDate(base).getMonth();
    } catch {
      return 5;
    }
  });

  const [adYear, setAdYear] = useState<number>(() => {
    const base = value ? parseIso(value) : today;
    return base.getFullYear();
  });

  const [adMonth, setAdMonth] = useState<number>(() => {
    const base = value ? parseIso(value) : today;
    return base.getMonth();
  });

  // When value changes from outside, align calendar view if not matching
  useEffect(() => {
    if (value) {
      const targetDate = parseIso(value);
      setAdYear(targetDate.getFullYear());
      setAdMonth(targetDate.getMonth());
      try {
        const bs = new NepaliDate(targetDate);
        setBsYear(bs.getYear());
        setBsMonth(bs.getMonth());
      } catch {
        // keep current
      }
    }
  }, [value]);

  // Switching system synchronizes viewed month
  const handleSwitchSystem = (newSystem: "AD" | "BS") => {
    if (newSystem === system) return;

    if (newSystem === "AD") {
      // Convert current BS midpoint to AD
      try {
        const midJs = new NepaliDate(bsYear, bsMonth, 15).toJsDate();
        setAdYear(midJs.getFullYear());
        setAdMonth(midJs.getMonth());
      } catch {
        // fallback
      }
    } else {
      // Convert current AD midpoint to BS
      try {
        const midBs = new NepaliDate(new Date(adYear, adMonth, 15));
        setBsYear(midBs.getYear());
        setBsMonth(midBs.getMonth());
      } catch {
        // fallback
      }
    }
    setSystem(newSystem);
  };

  // Previous month navigation
  const handlePrevMonth = () => {
    if (system === "BS") {
      if (bsMonth === 0) {
        setBsMonth(11);
        setBsYear((y) => y - 1);
      } else {
        setBsMonth((m) => m - 1);
      }
    } else {
      if (adMonth === 0) {
        setAdMonth(11);
        setAdYear((y) => y - 1);
      } else {
        setAdMonth((m) => m - 1);
      }
    }
  };

  // Next month navigation
  const handleNextMonth = () => {
    if (system === "BS") {
      if (bsMonth === 11) {
        setBsMonth(0);
        setBsYear((y) => y + 1);
      } else {
        setBsMonth((m) => m + 1);
      }
    } else {
      if (adMonth === 11) {
        setAdMonth(0);
        setAdYear((y) => y + 1);
      } else {
        setAdMonth((m) => m + 1);
      }
    }
  };

  // Compute grid depending on system
  const gridData = useMemo(() => {
    if (system === "BS") {
      const daysCount = getBsDaysInMonth(bsYear, bsMonth);
      let lead = 0;
      try {
        lead = new NepaliDate(bsYear, bsMonth, 1).getDay();
      } catch {
        lead = 0;
      }

      const days = Array.from({ length: daysCount }, (_, i) => {
        const dayNumber = i + 1;
        let iso = "";
        try {
          const js = new NepaliDate(bsYear, bsMonth, dayNumber).toJsDate();
          iso = toIsoString(js);
        } catch {
          iso = "";
        }
        return { n: dayNumber, iso };
      });

      return {
        headerPrimary: `${BS_MONTH_DISPLAY[bsMonth] || ""} ${bsYear}`,
        headerSecondary: getBsSubtitle(bsYear, bsMonth, daysCount),
        lead,
        days,
      };
    } else {
      const daysCount = new Date(adYear, adMonth + 1, 0).getDate();
      const lead = new Date(adYear, adMonth, 1).getDay();

      const days = Array.from({ length: daysCount }, (_, i) => {
        const dayNumber = i + 1;
        const js = new Date(adYear, adMonth, dayNumber);
        return { n: dayNumber, iso: toIsoString(js) };
      });

      return {
        headerPrimary: `${AD_MONTHS[adMonth] || ""} ${adYear}`,
        headerSecondary: getAdSubtitle(adYear, adMonth, daysCount),
        lead,
        days,
      };
    }
  }, [system, bsYear, bsMonth, adYear, adMonth]);

  return (
    <div className="edp-wrap">
      {/* 1. Toggle capsule between AD and BS */}
      <div className="edp-toggle">
        <button
          type="button"
          onClick={() => handleSwitchSystem("AD")}
          className={`edp-toggle-btn${system === "AD" ? " active" : ""}`}
        >
          AD (Gregorian)
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSystem("BS")}
          className={`edp-toggle-btn${system === "BS" ? " active" : ""}`}
        >
          BS (Bikram Sambat)
        </button>
      </div>

      {/* 2. Calendar Card */}
      <div className="edp-card">
        {/* Month & Year header */}
        <div className="edp-header">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="edp-nav-btn"
          >
            <ChevronLeft />
          </button>

          <div className="edp-title-wrap">
            <h3 className="edp-title">{gridData.headerPrimary}</h3>
            <p className="edp-subtitle">{gridData.headerSecondary}</p>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="edp-nav-btn"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="edp-weekdays">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`edp-weekday${i === 0 || i === 6 ? " weekend" : ""}`}>
              {w}
            </span>
          ))}
        </div>

        {/* Days grid - Available/partially booked/booked status completely removed */}
        <div className="edp-grid">
          {/* Leading blank offset */}
          {Array.from({ length: gridData.lead }, (_, i) => (
            <div key={`blank-${i}`} className="edp-blank" />
          ))}

          {/* Month days */}
          {gridData.days.map((day) => {
            const isSelected = Boolean(value && day.iso === value);
            const isPast = Boolean(minDate && day.iso && day.iso < minDate);
            const isToday = Boolean(day.iso === todayIso);

            let dayClass = "edp-day";
            if (isSelected) dayClass += " selected";
            else if (isToday) dayClass += " today";
            if (isPast) dayClass += " disabled";

            return (
              <button
                key={day.iso || `day-${day.n}`}
                type="button"
                disabled={isPast || !day.iso}
                onClick={() => {
                  if (day.iso && !isPast) {
                    onChange(day.iso);
                  }
                }}
                className={dayClass}
              >
                <span>{day.n}</span>
              </button>
            );
          })}
        </div>

        {/* Selected date confirmation banner */}
        {value && (
          <div className="edp-selected-info">
            <div className="edp-selected-info-left">
              <CalendarCheck />
              <span>Selected Date:</span>
            </div>
            <div className="edp-selected-info-right">
              <span>{formatAdDate(value)}</span>
              <span className="edp-selected-info-bs">({formatBsDate(value)})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDatePicker;
