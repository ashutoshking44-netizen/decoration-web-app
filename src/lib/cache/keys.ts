/**
 * Cache key model.
 *
 * Every entry is namespaced by:
 *   scope  – who the data belongs to: "public" (anonymous catalog data) or
 *            "company:<id>" (data private to one company/account)
 *   page   – the screen/feature that owns it (e.g. "catalog", "company-picker")
 *   type   – the kind of data (e.g. "live-decorations", "profile")
 *   params – optional extra discriminator (e.g. an id or filter)
 *
 * Bump CACHE_SCHEMA_VERSION whenever the shape of cached values changes so old
 * entries are ignored and dropped instead of being fed to new code.
 */
export const CACHE_SCHEMA_VERSION = 1;

export const PUBLIC_SCOPE = "public";

export type CacheScope = typeof PUBLIC_SCOPE | `company:${string}`;

export interface CacheKey {
  scope: CacheScope;
  page: string;
  type: string;
  params?: string | number | null;
}

/** Scope for data private to one company. */
export const companyScope = (companyId: string): CacheScope => `company:${companyId}`;

const enc = (v: unknown) => encodeURIComponent(String(v ?? ""));

/** Stable string form of a key: "v1|scope|page|type|params". */
export function serializeKey(key: CacheKey): string {
  return [
    `v${CACHE_SCHEMA_VERSION}`,
    enc(key.scope),
    enc(key.page),
    enc(key.type),
    enc(key.params ?? ""),
  ].join("|");
}

/** Does `key` match every field given in `filter`? (used for targeted invalidation) */
export function keyMatches(key: CacheKey, filter: Partial<CacheKey>): boolean {
  return (
    (filter.scope === undefined || filter.scope === key.scope) &&
    (filter.page === undefined || filter.page === key.page) &&
    (filter.type === undefined || filter.type === key.type) &&
    (filter.params === undefined || String(filter.params ?? "") === String(key.params ?? ""))
  );
}

/** Central registry of the keys used in the app, so they are never hand-typed twice. */
export const CacheKeys = {
  liveDecorations: (): CacheKey => ({
    scope: PUBLIC_SCOPE,
    page: "catalog",
    type: "live-decorations",
  }),
  companyList: (): CacheKey => ({
    scope: PUBLIC_SCOPE,
    page: "company-picker",
    type: "company-list",
  }),
  companyProfile: (companyId: string): CacheKey => ({
    scope: companyScope(companyId),
    page: "company",
    type: "profile",
  }),
} as const;

/** How long each kind of data is considered fresh. */
export const CacheTTL = {
  liveDecorations: 5 * 60_000,
  companyList: 10 * 60_000,
  companyProfile: 5 * 60_000,
} as const;
