import NepaliDate, { dateConfigMap } from "nepali-date-converter";

export interface EventScheduleItem {
  id: string;
  name: string; // "Haldi Day" | "Mehendi Day" | "Wedding Day" | "Pre-Reception / Reception Day" | custom
  isCustom?: boolean;
  dateAd: string; // "YYYY-MM-DD" e.g. "2026-11-27"
  dateBs: string; // Formatted e.g. "Mangsir 11, 2083"
  venueClassification: string; // e.g. "Residence" | "Banquet & Ballroom" | "Luxury Hotel" etc.
  venueLocation: string; // e.g. "Residence, Bhaisepati" vs "Majestic Grand, Kathmandu"
  sameAsPreviousVenue: boolean;
  timing?: string; // e.g. "Morning (10:00 AM)" or "Evening (5:00 PM)"
  notes?: string;
}

export interface CeremonyPreset {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  color: string;
  accentHex: string;
  defaultTiming: string;
  defaultClassification: string;
}

export const COMMON_CEREMONIES: CeremonyPreset[] = [
  {
    id: "haldi",
    name: "Haldi Day",
    shortName: "Haldi",
    subtitle: "Turmeric, marigold blessings & floral swing setup",
    color: "amber",
    accentHex: "#d97706",
    defaultTiming: "Morning / Daytime",
    defaultClassification: "Residence (Home Venue)",
  },
  {
    id: "mehendi",
    name: "Mehendi Day",
    shortName: "Mehendi",
    subtitle: "Henna, bohemian lounge seating & festive vibrant hues",
    color: "emerald",
    accentHex: "#059669",
    defaultTiming: "Afternoon & Evening",
    defaultClassification: "Residence (Home Venue)",
  },
  {
    id: "wedding",
    name: "Wedding Day",
    shortName: "Wedding",
    subtitle: "Sacred Mandap, floral walkway, royal entrance & vows",
    color: "rose",
    accentHex: "#e11d48",
    defaultTiming: "Full Day / Evening Auspicious Hour",
    defaultClassification: "Banquet & Ballroom",
  },
  {
    id: "reception",
    name: "Pre-Reception / Reception Day",
    shortName: "Reception",
    subtitle: "Grand stage, luxury photo backdrop, banquet banquet hall",
    color: "purple",
    accentHex: "#9333ea",
    defaultTiming: "Evening Gala Dinner",
    defaultClassification: "Banquet & Ballroom",
  },
];

export const POPULAR_EXTRA_CEREMONIES = [
  "Sangeet Night",
  "Ring Ceremony / Engagement",
  "Tilak & Supari Ceremony",
  "Baraat & Welcome Gate",
  "Pooja & Hawan",
  "Cocktail & After-Party",
  "Post-Wedding Brunch",
];

export const VENUE_CLASSIFICATIONS = [
  "Residence (Home Venue)",
  "Banquet & Ballroom",
  "Luxury Hotel & Palace",
  "Resort & Outdoor Garden Lawn",
  "Traditional Courtyard & Temple",
  "Destination / Valley Outskirts",
  "Other Venue",
];

export const POPULAR_VENUES = [
  "Residence, Bhaisepati",
  "Majestic Grand, Kathmandu",
  "The Soaltee, Grand Ballroom, Kathmandu",
  "Hyatt Regency, Regency Ballroom, Kathmandu",
  "Heritage Garden, Sanepa, Lalitpur",
  "Hotel Himalaya, Kupondole, Lalitpur",
  "Vivanta Kathmandu, Jhamsikhel",
  "Gokarna Forest Resort, Kathmandu",
  "Yak & Yeti Hotel, Durbar Marg",
  "Alice Reception, Gairidhara",
  "Royal Palace Banquet, Naxal",
  "Silver Oak Banquet, Gairidhara",
  "Imperial Banquet, Tinkune",
  "Amrapali Banquet, Bhatbhateni",
];

export const BS_MONTH_NAMES = [
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

export const BS_MONTH_SYNONYMS: Record<string, number> = {
  baishakh: 0,
  baisakh: 0,
  jestha: 1,
  jeth: 1,
  asar: 2,
  ashadh: 2,
  ashad: 2,
  shrawan: 3,
  saun: 3,
  sawan: 3,
  bhadra: 4,
  bhadau: 4,
  aswin: 5,
  ashwin: 5,
  asoj: 5,
  kartik: 6,
  mangsir: 7,
  mangshir: 7,
  mansir: 7,
  poush: 8,
  paush: 8,
  pus: 8,
  magh: 9,
  falgun: 10,
  phagun: 10,
  chaitra: 11,
  chait: 11,
};

/**
 * Returns number of days in a Nepali month according to `dateConfigMap`
 */
export function getDaysInBsMonth(bsYear: number, bsMonth: number): number {
  const yearKey = String(bsYear);
  const monthKey = BS_MONTH_NAMES[bsMonth] as keyof (typeof dateConfigMap)[string];
  return dateConfigMap[yearKey]?.[monthKey] ?? 30;
}

/**
 * Converts AD ISO date string (YYYY-MM-DD) to formatted BS text and components
 */
export function convertAdToBs(adIso: string): {
  formatted: string;
  year: number;
  month: number;
  day: number;
} | null {
  if (!adIso) return null;
  const parts = adIso.split("-").map(Number);
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (p0 === undefined || p1 === undefined || p2 === undefined || isNaN(p0) || isNaN(p1) || isNaN(p2)) {
    return null;
  }
  try {
    const jsDate = new Date(p0, p1 - 1, p2);
    const bs = new NepaliDate(jsDate);
    return {
      formatted: bs.format("MMMM D, YYYY"),
      year: bs.getYear(),
      month: bs.getMonth(),
      day: bs.getDate(),
    };
  } catch {
    return null;
  }
}

/**
 * Converts BS date components to AD ISO date string (YYYY-MM-DD)
 */
export function convertBsToAd(bsYear: number, bsMonth: number, bsDay: number): string | null {
  try {
    const bs = new NepaliDate(bsYear, bsMonth, bsDay);
    const js = bs.toJsDate();
    const y = js.getFullYear();
    const m = String(js.getMonth() + 1).padStart(2, "0");
    const d = String(js.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

/**
 * Parses user-typed BS text string (e.g. "Mangsir 11, 2083", "11 Mangsir 2083", "2083-08-11")
 */
export function parseBsText(str: string): {
  year: number;
  month: number;
  day: number;
  formatted: string;
} | null {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();

  // Try YYYY-MM-DD or YYYY/MM/DD
  const numMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (numMatch && numMatch[1] && numMatch[2] && numMatch[3]) {
    const y = parseInt(numMatch[1], 10);
    const m = parseInt(numMatch[2], 10) - 1;
    const d = parseInt(numMatch[3], 10);
    if (y >= 2000 && y <= 2095 && m >= 0 && m < 12 && d >= 1 && d <= 32) {
      try {
        const bs = new NepaliDate(y, m, d);
        return { year: y, month: m, day: d, formatted: bs.format("MMMM D, YYYY") };
      } catch {
        // Continue
      }
    }
  }

  // Try "Month Day, Year" or "Day Month Year"
  const textMatch =
    s.match(/([a-zA-Z]+)[\s,]+(\d{1,2})[\s,]+(\d{4})/) ||
    s.match(/(\d{1,2})[\s,]+([a-zA-Z]+)[\s,]+(\d{4})/);
  if (textMatch && textMatch[1] && textMatch[2] && textMatch[3]) {
    let mStr = "";
    let day = 0;
    let year = 0;
    const t1 = textMatch[1];
    const t2 = textMatch[2];
    const t3 = textMatch[3];
    if (isNaN(Number(t1))) {
      mStr = t1.toLowerCase();
      day = parseInt(t2, 10);
      year = parseInt(t3, 10);
    } else {
      day = parseInt(t1, 10);
      mStr = t2.toLowerCase();
      year = parseInt(t3, 10);
    }
    const monthIdx = BS_MONTH_SYNONYMS[mStr];
    if (monthIdx !== undefined && year >= 2000 && year <= 2095 && day >= 1 && day <= 32) {
      try {
        const bs = new NepaliDate(year, monthIdx, day);
        return { year, month: monthIdx, day, formatted: bs.format("MMMM D, YYYY") };
      } catch {
        // Fallback
      }
    }
  }

  return null;
}

/**
 * Add or subtract N days from an AD date ISO string
 */
export function addDaysToAd(adIso: string, daysToAdd: number): string {
  if (!adIso) return "";
  try {
    const parts = adIso.split("-").map(Number);
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    if (p0 === undefined || p1 === undefined || p2 === undefined || isNaN(p0) || isNaN(p1) || isNaN(p2)) {
      return adIso;
    }
    const jsDate = new Date(p0, p1 - 1, p2);
    jsDate.setDate(jsDate.getDate() + daysToAdd);
    const y = jsDate.getFullYear();
    const m = String(jsDate.getMonth() + 1).padStart(2, "0");
    const d = String(jsDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return adIso;
  }
}

/**
 * Creates default 4-ceremony wedding timeline for a smooth start:
 * Haldi -> Mehendi -> Wedding -> Reception with sample realistic dates
 */
export function createDefaultSchedule(): EventScheduleItem[] {
  // Target upcoming wedding season date (e.g. Mangsir 11, 2083 / Nov 27, 2026)
  const defaultWeddingAd = "2026-11-27";
  const defaultWeddingBs = convertAdToBs(defaultWeddingAd)?.formatted || "Mangsir 11, 2083";

  const mehendiAd = addDaysToAd(defaultWeddingAd, -1); // 2026-11-26
  const mehendiBs = convertAdToBs(mehendiAd)?.formatted || "Mangsir 10, 2083";

  const haldiAd = addDaysToAd(defaultWeddingAd, -2); // 2026-11-25
  const haldiBs = convertAdToBs(haldiAd)?.formatted || "Mangsir 9, 2083";

  const receptionAd = addDaysToAd(defaultWeddingAd, 1); // 2026-11-28
  const receptionBs = convertAdToBs(receptionAd)?.formatted || "Mangsir 12, 2083";

  return [
    {
      id: "evt-haldi-1",
      name: "Haldi Day",
      dateAd: haldiAd,
      dateBs: haldiBs,
      venueClassification: "Residence (Home Venue)",
      venueLocation: "Residence, Bhaisepati",
      sameAsPreviousVenue: false,
      timing: "Morning (10:30 AM)",
    },
    {
      id: "evt-mehendi-2",
      name: "Mehendi Day",
      dateAd: mehendiAd,
      dateBs: mehendiBs,
      venueClassification: "Residence (Home Venue)",
      venueLocation: "Residence, Bhaisepati",
      sameAsPreviousVenue: true, // Same as previous residence
      timing: "Afternoon (2:00 PM)",
    },
    {
      id: "evt-wedding-3",
      name: "Wedding Day",
      dateAd: defaultWeddingAd,
      dateBs: defaultWeddingBs,
      venueClassification: "Banquet & Ballroom",
      venueLocation: "Majestic Grand, Kathmandu",
      sameAsPreviousVenue: false,
      timing: "Auspicious Hour (3:30 PM)",
    },
    {
      id: "evt-reception-4",
      name: "Pre-Reception / Reception Day",
      dateAd: receptionAd,
      dateBs: receptionBs,
      venueClassification: "Banquet & Ballroom",
      venueLocation: "Majestic Grand, Kathmandu",
      sameAsPreviousVenue: true, // Same as wedding venue
      timing: "Evening Reception (6:00 PM)",
    },
  ];
}

const STORAGE_KEY = "decoration-portal:quotation-event-schedule";

export function loadStoredEventSchedule(): EventScheduleItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredEventSchedule(schedule: EventScheduleItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // Ignore write failures
  }
}
