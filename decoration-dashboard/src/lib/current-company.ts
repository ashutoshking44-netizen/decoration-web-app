import { getActiveCompanyId, loadProfile } from "./company-profile";

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
  // The company opened from the company picker (company-1 when none is open).
  return getActiveCompanyId() || CURRENT_COMPANY_ID;
}

export function isMyCompanyId(id?: string | number | null): boolean {
  if (id === undefined || id === null || id === "") return false;
  const s = String(id).trim().toLowerCase();
  const mine = getCurrentCompanyId();
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s === mine.toLowerCase() || norm(s) === norm(mine)) return true;
  if (mine === "company-1") {
    return s === "company_1" || s === "comp-1" || s === "1" || norm(s) === "company1" || norm(s) === "comp1";
  }
  return false;
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
  if (id === getCurrentCompanyId() || (id === "company-1" && !getActiveCompanyId()) || id === "comp-1") {
    return getCurrentCompanyName();
  }
  if (id === "company-2" || id === "comp-2") return "Royal Orchid Events";
  const found = PRESET_COMPANIES.find((c) => c.id === id);
  if (found) return found.name;
  return `Company ${id}`;
}

export function useCurrentCompany() {
  return {
    currentCompanyId: getCurrentCompanyId(),
    currentCompanyName: getCurrentCompanyName(),
  };
}

