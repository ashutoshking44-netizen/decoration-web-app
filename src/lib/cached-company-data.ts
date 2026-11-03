/**
 * Cache-first wrappers for company data used by the company picker and the
 * company profile. The raw Supabase functions stay in supabase-service.ts;
 * these only add caching. Invalidation after writes happens in
 * supabase-service.ts (saveCompanyProfileToSupabase).
 */
import type { CompanyProfile, CompanySummary } from "./company-profile";
import { fetchCompanyProfileFromSupabase, listCompaniesFromSupabase } from "./supabase-service";
import { cachedQuery, CacheKeys, CacheTTL } from "./cache";

/** All companies for the picker. Throws if nothing could be loaded or cached. */
export function getCompanyListCached(options: { force?: boolean } = {}): Promise<CompanySummary[]> {
  return cachedQuery({
    key: CacheKeys.companyList(),
    ttl: CacheTTL.companyList,
    force: options.force,
    fetcher: listCompaniesFromSupabase,
    isValid: Array.isArray,
  });
}

/**
 * One company's profile (null = none saved yet). Stored under that company's
 * own cache scope, so it is isolated from other companies and cleared on
 * logout / company switch. Throws if nothing could be loaded or cached.
 */
export function getCompanyProfileCached(
  companyId: string,
  options: { force?: boolean } = {},
): Promise<CompanyProfile | null> {
  return cachedQuery({
    key: CacheKeys.companyProfile(companyId),
    ttl: CacheTTL.companyProfile,
    force: options.force,
    fetcher: () => fetchCompanyProfileFromSupabase(companyId),
    // null is a valid answer ("no profile yet"); anything else must be an object
    isValid: (v) => v === null || typeof v === "object",
  });
}
