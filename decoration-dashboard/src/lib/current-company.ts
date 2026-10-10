import { loadProfile } from "./company-profile";

// temporary until company login is built
export const CURRENT_COMPANY_ID = "company-1";
export const DEFAULT_COMPANY_ID = CURRENT_COMPANY_ID;

export interface CompanyOption {
  id: string;
  name: string;
}

export const PRESET_COMPANIES: CompanyOption[] = [
  { id: "company-1", name: "Everest Events & Decor" },
  { id: "company-2", name: "Royal Orchid Events" },
];

export function getCurrentCompanyId(): string {
  // temporary until company login is built
  return CURRENT_COMPANY_ID;
}

export function isMyCompanyId(id?: string | number | null): boolean {
  if (id === undefined || id === null || id === "") return false;
  const s = String(id).trim().toLowerCase();
  if (s === CURRENT_COMPANY_ID.toLowerCase()) return true;
  if (s === "company-1" || s === "company_1" || s === "comp-1" || s === "1") return true;
  const myNorm = CURRENT_COMPANY_ID.toLowerCase().replace(/[^a-z0-9]/g, "");
  const norm = s.replace(/[^a-z0-9]/g, "");
  return norm === myNorm || norm === "1" || norm === "company1" || norm === "comp1";
}

export function getCurrentCompanyName(): string {
  try {
    const profile = typeof window !== "undefined" ? loadProfile() : null;
    const name = profile?.name?.trim();
    if (name) return name;
  } catch {}
  return "Everest Events & Decor";
}

export function getCompanyNameById(id?: string | null): string {
  if (!id) return "Unknown";
  if (id === CURRENT_COMPANY_ID || id === "company-1" || id === "comp-1") {
    return getCurrentCompanyName();
  }
  if (id === "company-2" || id === "comp-2") return "Royal Orchid Events";
  const found = PRESET_COMPANIES.find((c) => c.id === id);
  if (found) return found.name;
  return `Company ${id}`;
}

export function useCurrentCompany() {
  return {
    currentCompanyId: CURRENT_COMPANY_ID,
    currentCompanyName: getCurrentCompanyName(),
  };
}

