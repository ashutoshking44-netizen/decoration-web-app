import { useEffect, useState } from "react";

export type CompanyProfile = {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  services: string[];
  eventTypes: string[];
  teamSize: string;
  yearsActive: string;
  about: string;
};

export const SERVICE_OPTIONS = [
  "Floral Decoration",
  "Stage & Mandap Setup",
  "Lighting & Effects",
  "Fabric & Draping",
  "Balloon Decoration",
  "Theme & Prop Styling",
  "Entrance & Pathway Decor",
  "Table & Seating Setup",
  "Rigging & Structures",
  "Outdoor / Tent Setup",
];

export const EVENT_TYPE_OPTIONS = [
  "Weddings",
  "Receptions",
  "Mehendi & Haldi",
  "Engagements",
  "Birthdays",
  "Corporate Events",
  "Anniversaries",
  "Religious Ceremonies",
];

export const TEAM_SIZE_OPTIONS = ["1–5", "6–15", "16–40", "40+"];
export const YEARS_OPTIONS = ["Less than 1 year", "1–3 years", "4–7 years", "8+ years"];

export const emptyProfile: CompanyProfile = {
  name: "",
  ownerName: "",
  phone: "",
  email: "",
  city: "",
  services: [],
  eventTypes: [],
  teamSize: "",
  yearsActive: "",
  about: "",
};

const STORAGE_KEY = "decoration-portal:company-profile";

export function loadProfile(): CompanyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompanyProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: CompanyProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  return { profile, ready };
}
