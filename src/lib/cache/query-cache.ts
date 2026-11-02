/**
 * Central cache-first data loader.
 *
 *   cachedQuery({ key, fetcher, ttl })
 *
 * Lookup order: memory → IndexedDB → network.
 *
 * Guarantees
 * - Cache first: a fresh entry (younger than `ttl`) is returned without any
 *   network request, also across client-side page navigations.
 * - Manual page reload (F5 / pull-to-refresh): the first request for each key
 *   after a reload bypasses the cache, fetches fresh data and re-caches it.
 * - De-duplication: concurrent calls for the same key share one request.
 * - Only successful, valid responses are stored. A thrown error or a value
 *   rejected by `isValid` is never cached.
 * - Network failure: falls back to the last good (even expired) entry if one
 *   exists, otherwise rethrows so the caller can show its error/empty state.
 * - Writes win over in-flight reads: a request that started before an
 *   invalidation never writes its (now outdated) result into the cache.
 * - Server-side rendering never caches (would leak data between visitors).
 * - Invalidations propagate to other open tabs via BroadcastChannel.
 */
import {
  keyMatches,
  serializeKey,
  CACHE_SCHEMA_VERSION,
  type CacheKey,
  type CacheScope,
} from "./keys";
import {
  clearAllEntries,
  deleteEntries,
  readAllEntries,
  readEntry,
  writeEntry,
  type CacheEntry,
} from "./storage";

export interface CachedQueryOptions<T> {
  key: CacheKey;
  fetcher: () => Promise<T>;
  /** Freshness window in ms. */
  ttl: number;
  /** Skip the cache and fetch fresh data (e.g. after a realtime change). */
  force?: boolean | undefined;
  /** Reject incomplete/invalid responses so they are not cached. */
  isValid?: ((value: T) => boolean) | undefined;
}

export type InvalidationFilter = Partial<CacheKey> | { all: true };
type Listener = (filter: InvalidationFilter) => void;

const isBrowser = typeof window !== "undefined";

const memory = new Map<string, CacheEntry>();
const knownKeys = new Map<string, CacheKey>();
const inFlight = new Map<string, Promise<unknown>>();
/** Bumped on invalidation; in-flight requests from an older epoch don't write. */
const epochs = new Map<string, number>();
/** Keys already refreshed since this page load (for reload-bypass). */
const refreshedSinceLoad = new Set<string>();
const listeners = new Set<Listener>();

export class InvalidCacheValueError extends Error {
  constructor(id: string) {
    super(`[cache] Rejected invalid/incomplete response for ${id}`);
    this.name = "InvalidCacheValueError";
  }
}

// ── Page-reload detection ────────────────────────────────────────────────────
let reloadChecked = false;
let wasReload = false;
function isPageReload(): boolean {
  if (!reloadChecked) {
    reloadChecked = true;
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      wasReload = nav?.type === "reload";
    } catch {
      wasReload = false;
    }
  }
  return wasReload;
}

// ── Cross-tab invalidation ───────────────────────────────────────────────────
let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (!isBrowser || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel("decoration-app-cache");
      channel.onmessage = (ev: MessageEvent<InvalidationFilter>) => {
        if (ev.data && typeof ev.data === "object") applyInvalidation(ev.data, false);
      };
    } catch {
      channel = null;
    }
  }
  return channel;
}

// ── Housekeeping: drop entries that expired long ago (once per load) ─────────
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60_000;
let pruned = false;
function pruneOldEntriesOnce() {
  if (pruned || !isBrowser) return;
  pruned = true;
  void readAllEntries().then((all) => {
    const now = Date.now();
    void deleteEntries(all.filter((e) => e.expiresAt + PRUNE_AFTER_MS < now).map((e) => e.id));
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Synchronous memory-only peek (fresh or stale). Lets UIs render instantly. */
export function peekCache<T>(key: CacheKey): T | undefined {
  const entry = memory.get(serializeKey(key));
  return entry ? (entry.value as T) : undefined;
}

export async function cachedQuery<T>(opts: CachedQueryOptions<T>): Promise<T> {
  const { key, fetcher, ttl, force = false, isValid } = opts;
  if (!isBrowser) return fetcher();

  getChannel();
  pruneOldEntriesOnce();

  const id = serializeKey(key);
  knownKeys.set(id, key);

  const bypass = force || (isPageReload() && !refreshedSinceLoad.has(id));

  if (!bypass) {
    const now = Date.now();
    const mem = memory.get(id);
    if (mem && mem.expiresAt > now) return mem.value as T;
    if (!mem) {
      const stored = await readEntry<T>(id);
      if (stored) {
        memory.set(id, stored);
        if (stored.expiresAt > Date.now()) return stored.value;
      }
    }
  }

  const pending = inFlight.get(id);
  if (pending) return pending as Promise<T>;

  const startEpoch = epochs.get(id) ?? 0;
  const request = (async () => {
    try {
      const value = await fetcher();
      if (value === undefined || (isValid && !isValid(value))) {
        throw new InvalidCacheValueError(id);
      }
      refreshedSinceLoad.add(id);
      if ((epochs.get(id) ?? 0) === startEpoch) {
        const now = Date.now();
        const entry: CacheEntry<T> = {
          id,
          key,
          value,
          savedAt: now,
          expiresAt: now + ttl,
          version: CACHE_SCHEMA_VERSION,
        };
        memory.set(id, entry);
        void writeEntry(entry);
      }
      return value;
    } catch (err) {
      // Safe fallback: last good value (even if expired), unless it was invalidated.
      if ((epochs.get(id) ?? 0) === startEpoch) {
        const fallback = memory.get(id) ?? (await readEntry<T>(id));
        if (fallback) {
          console.warn("[cache] Request failed, serving last cached data for", key, err);
          return fallback.value as T;
        }
      }
      throw err;
    } finally {
      inFlight.delete(id);
    }
  })();

  inFlight.set(id, request);
  return request;
}

/**
 * Remove cached entries matching `filter` (e.g. `{ scope, type }`), here and in
 * other tabs. Only the matching section is cleared, never the whole cache.
 */
export async function invalidateCache(filter: Partial<CacheKey>): Promise<void> {
  await applyInvalidation(filter, true);
}

/** Remove everything cached for one user/company (logout, account switch). */
export async function clearCacheScope(scope: CacheScope): Promise<void> {
  await applyInvalidation({ scope }, true);
}

/** Remove the entire cache (user-initiated "clear cache"). */
export async function clearAllCache(): Promise<void> {
  await applyInvalidation({ all: true }, true);
}

/** Be notified when entries are invalidated (locally or in another tab). */
export function subscribeCacheInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  getChannel();
  return () => listeners.delete(listener);
}

async function applyInvalidation(filter: InvalidationFilter, broadcast: boolean) {
  if (!isBrowser) return;
  const all = "all" in filter && filter.all === true;
  const matches = (key: CacheKey) => all || keyMatches(key, filter as Partial<CacheKey>);

  const ids = new Set<string>();
  knownKeys.forEach((key, id) => {
    if (matches(key)) ids.add(id);
  });
  memory.forEach((entry, id) => {
    if (matches(entry.key)) ids.add(id);
  });

  ids.forEach((id) => {
    memory.delete(id);
    epochs.set(id, (epochs.get(id) ?? 0) + 1);
  });

  if (broadcast) {
    if (all) {
      await clearAllEntries();
    } else {
      const stored = await readAllEntries();
      const storedIds = stored.filter((e) => matches(e.key)).map((e) => e.id);
      await deleteEntries([...new Set([...ids, ...storedIds])]);
    }
    try {
      getChannel()?.postMessage(filter);
    } catch {
      /* ignore */
    }
  }

  listeners.forEach((l) => {
    try {
      l(filter);
    } catch (err) {
      console.error("[cache] invalidation listener failed", err);
    }
  });
}
