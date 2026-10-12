import { useEffect, useState } from "react";
import { fetchCompanyProfileFromSupabase, saveCompanyProfileToSupabase } from "./supabase-service";

export type CompanySummary = { id: string; name: string; ownerName: string; city: string };

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

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "Everest Events & Decor",
  ownerName: "Sunil Shrestha",
  phone: "+977-9801234567",
  email: "hello@everestevents.com",
  city: "Kathmandu",
  services: ["Floral Decoration", "Stage & Mandap Setup", "Lighting & Effects"],
  eventTypes: ["Weddings", "Receptions", "Engagements"],
  teamSize: "16–40",
  yearsActive: "4–7 years",
  about: "Specialized in luxury floral decors, mandap designs and ambient lighting.",
};

const STORAGE_KEY = "decoration-portal:company-profile";

export function loadProfile(): CompanyProfile | null {
  if (typeof window === "undefined") return DEFAULT_COMPANY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompanyProfile;
      if (parsed && typeof parsed.name === "string" && parsed.name.trim()) {
        return parsed;
      }
    }
    return DEFAULT_COMPANY_PROFILE;
  } catch {
    return DEFAULT_COMPANY_PROFILE;
  }
}

/** The saved profile of the open company, or null (no default fallback). */
export function loadStoredProfile(): CompanyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompanyProfile;
    return parsed && typeof parsed.name === "string" && parsed.name.trim() ? parsed : null;
  } catch {
    return null;
  }
}

// ── Which company is open on this browser (testing stage: pick a company, no password) ──
const ACTIVE_KEY = "decoration-portal:active-company";

export function getActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** Open a company. Pass its profile to show it straight away. */
export function setActiveCompany(id: string, profile?: CompanyProfile | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_KEY, id);
  if (profile) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(STORAGE_KEY);
  profileRemoteLoad = null;
}

/** Log out: no company is open. Saved companies and their data stay in Supabase. */
export function logoutCompany() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
  profileRemoteLoad = null;
}

/** Saves the open company's profile. With no company open, it creates a new company and opens it. */
export async function saveProfile(profile: CompanyProfile): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let id = getActiveCompanyId();
  if (!id) {
    id = `company-${Date.now().toString(36)}`;
    window.localStorage.setItem(ACTIVE_KEY, id);
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return await saveCompanyProfileToSupabase(profile, id);
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// One request is shared by every component using the profile (several per page).
let profileRemoteLoad: Promise<CompanyProfile | null | undefined> | null = null;
let profileRemoteLoadedAt = 0;
const PROFILE_FRESH_MS = 30_000;

/** Resolves the Supabase profile (null = none saved yet), or undefined if the request failed. */
function loadRemoteProfile(): Promise<CompanyProfile | null | undefined> {
  if (profileRemoteLoad && Date.now() - profileRemoteLoadedAt < PROFILE_FRESH_MS) return profileRemoteLoad;
  profileRemoteLoadedAt = Date.now();
  profileRemoteLoad = fetchCompanyProfileFromSupabase(getActiveCompanyId() || undefined).catch((err) => {
    console.warn("[company-profile] Loading profile from Supabase failed:", err);
    profileRemoteLoad = null;
    return undefined;
  });
  return profileRemoteLoad;
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(loadProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!getActiveCompanyId()) {
      setReady(true);
      return;
    }
    void loadRemoteProfile().then((data) => {
      if (!active) return;
      if (data) {
        setProfile(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } else if (data === null) {
        // Supabase confirmed it has no profile yet: upload the local one.
        const local = loadProfile();
        if (local) {
          setProfile(local);
          void saveCompanyProfileToSupabase(local, getActiveCompanyId() || undefined);
        }
      }
      // data === undefined: the request failed; keep the local profile, write nothing.
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return { profile, ready };
}
