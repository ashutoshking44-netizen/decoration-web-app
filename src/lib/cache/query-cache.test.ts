import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

// The cache only activates in a browser; simulate one (memory-only: no IndexedDB here).
(globalThis as { window?: unknown }).window = globalThis;

type CacheModule = typeof import("./index");
let cache: CacheModule;

beforeAll(async () => {
  cache = await import("./index");
});

const key = (type: string, scope: "public" | `company:${string}` = "public") => ({
  scope,
  page: "test",
  type,
});

const counter = <T>(value: T | (() => T)) => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return typeof value === "function" ? (value as () => T)() : value;
  };
  return { fetcher, calls: () => calls };
};

beforeEach(async () => {
  await cache.clearAllCache();
});

describe("cachedQuery", () => {
  it("serves fresh data from cache without a second request", async () => {
    const f = counter([1, 2, 3]);
    const a = await cache.cachedQuery({ key: key("hit"), ttl: 60_000, fetcher: f.fetcher });
    const b = await cache.cachedQuery({ key: key("hit"), ttl: 60_000, fetcher: f.fetcher });
    expect(a).toEqual([1, 2, 3]);
    expect(b).toBe(a);
    expect(f.calls()).toBe(1);
  });

  it("de-duplicates concurrent requests for the same key", async () => {
    const f = counter("x");
    const [a, b, c] = await Promise.all([
      cache.cachedQuery({ key: key("dedupe"), ttl: 60_000, fetcher: f.fetcher }),
      cache.cachedQuery({ key: key("dedupe"), ttl: 60_000, fetcher: f.fetcher }),
      cache.cachedQuery({ key: key("dedupe"), ttl: 60_000, fetcher: f.fetcher }),
    ]);
    expect([a, b, c]).toEqual(["x", "x", "x"]);
    expect(f.calls()).toBe(1);
  });

  it("refetches once the entry has expired", async () => {
    const f = counter("v");
    await cache.cachedQuery({ key: key("ttl"), ttl: -1, fetcher: f.fetcher });
    await cache.cachedQuery({ key: key("ttl"), ttl: -1, fetcher: f.fetcher });
    expect(f.calls()).toBe(2);
  });

  it("force bypasses a fresh entry and updates it", async () => {
    let n = 0;
    const fetcher = async () => ++n;
    await cache.cachedQuery({ key: key("force"), ttl: 60_000, fetcher });
    const forced = await cache.cachedQuery({
      key: key("force"),
      ttl: 60_000,
      fetcher,
      force: true,
    });
    const after = await cache.cachedQuery({ key: key("force"), ttl: 60_000, fetcher });
    expect(forced).toBe(2);
    expect(after).toBe(2);
  });

  it("never caches failures or invalid responses", async () => {
    await expect(
      cache.cachedQuery({
        key: key("fail"),
        ttl: 60_000,
        fetcher: async () => {
          throw new Error("network");
        },
      }),
    ).rejects.toThrow("network");
    await expect(
      cache.cachedQuery({
        key: key("invalid"),
        ttl: 60_000,
        fetcher: async () => "not-an-array" as unknown as number[],
        isValid: Array.isArray,
      }),
    ).rejects.toBeInstanceOf(cache.InvalidCacheValueError);
    expect(cache.peekCache(key("fail"))).toBeUndefined();
    expect(cache.peekCache(key("invalid"))).toBeUndefined();
  });

  it("falls back to the last good value when a refresh fails", async () => {
    await cache.cachedQuery({ key: key("fallback"), ttl: 60_000, fetcher: async () => "good" });
    const v = await cache.cachedQuery({
      key: key("fallback"),
      ttl: 60_000,
      force: true,
      fetcher: async () => {
        throw new Error("offline");
      },
    });
    expect(v).toBe("good");
  });

  it("invalidation removes only the matching section", async () => {
    await cache.cachedQuery({ key: key("a"), ttl: 60_000, fetcher: async () => "A" });
    await cache.cachedQuery({ key: key("b"), ttl: 60_000, fetcher: async () => "B" });
    await cache.invalidateCache({ type: "a" });
    expect(cache.peekCache(key("a"))).toBeUndefined();
    expect(cache.peekCache(key("b"))).toBe("B");
  });

  it("does not show outdated data after invalidation (and no stale fallback)", async () => {
    await cache.cachedQuery({ key: key("stale"), ttl: 60_000, fetcher: async () => "old" });
    await cache.invalidateCache({ type: "stale" });
    await expect(
      cache.cachedQuery({
        key: key("stale"),
        ttl: 60_000,
        fetcher: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toThrow("offline");
  });

  it("a request started before a write never caches its outdated result", async () => {
    let release: (v: string) => void = () => {};
    let markStarted: () => void = () => {};
    const started = new Promise<void>((r) => (markStarted = r));
    const slow = cache.cachedQuery({
      key: key("race"),
      ttl: 60_000,
      fetcher: () =>
        new Promise<string>((r) => {
          release = r;
          markStarted();
        }),
    });
    await started; // request is now in flight
    await cache.invalidateCache({ type: "race" }); // a write happened meanwhile
    release("before-write");
    expect(await slow).toBe("before-write"); // caller still gets its answer…
    expect(cache.peekCache(key("race"))).toBeUndefined(); // …but it isn't cached
  });

  it("keeps companies isolated and clears one company's scope only", async () => {
    await cache.cachedQuery({
      key: key("profile", "company:1"),
      ttl: 60_000,
      fetcher: async () => "one",
    });
    await cache.cachedQuery({
      key: key("profile", "company:2"),
      ttl: 60_000,
      fetcher: async () => "two",
    });
    await cache.cachedQuery({ key: key("catalog"), ttl: 60_000, fetcher: async () => "pub" });
    expect(cache.peekCache(key("profile", "company:1"))).toBe("one");
    expect(cache.peekCache(key("profile", "company:2"))).toBe("two");

    await cache.clearCacheScope("company:1");
    expect(cache.peekCache(key("profile", "company:1"))).toBeUndefined();
    expect(cache.peekCache(key("profile", "company:2"))).toBe("two");
    expect(cache.peekCache(key("catalog"))).toBe("pub");
  });

  it("notifies subscribers on invalidation", async () => {
    const seen: unknown[] = [];
    const off = cache.subscribeCacheInvalidation((f) => seen.push(f));
    await cache.invalidateCache({ type: "x" });
    await cache.clearAllCache();
    off();
    expect(seen).toEqual([{ type: "x" }, { all: true }]);
  });
});
