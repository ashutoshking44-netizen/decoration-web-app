/**
 * App-wide data cache. See query-cache.ts for the behaviour guarantees.
 *
 * Usage:
 *   import { cachedQuery, CacheKeys, CacheTTL, invalidateCache } from "@/lib/cache";
 *
 *   const list = await cachedQuery({
 *     key: CacheKeys.liveDecorations(),
 *     ttl: CacheTTL.liveDecorations,
 *     fetcher: loadFromSupabase,
 *   });
 *
 *   // after a successful write:
 *   await invalidateCache(CacheKeys.liveDecorations());
 *
 * Security: only app data is cached. Auth tokens/credentials are never passed
 * through this module, and per-company data lives under `company:<id>` scopes
 * which are cleared on logout / company switch.
 */
export {
  CacheKeys,
  CacheTTL,
  PUBLIC_SCOPE,
  companyScope,
  serializeKey,
  type CacheKey,
  type CacheScope,
} from "./keys";
export {
  cachedQuery,
  peekCache,
  invalidateCache,
  clearCacheScope,
  clearAllCache,
  subscribeCacheInvalidation,
  InvalidCacheValueError,
  type CachedQueryOptions,
  type InvalidationFilter,
} from "./query-cache";
