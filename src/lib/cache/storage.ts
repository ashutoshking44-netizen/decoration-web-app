/**
 * Persistent storage for cache entries (IndexedDB), with safe fallbacks.
 *
 * - SSR / private mode / blocked storage: every call degrades to a no-op and
 *   the cache simply runs memory-only. Nothing here ever throws to callers.
 * - Corrupted entries (wrong shape / unreadable) are treated as missing and
 *   deleted.
 */
import { CACHE_SCHEMA_VERSION, type CacheKey } from "./keys";

export interface CacheEntry<T = unknown> {
  id: string; // serialized key
  key: CacheKey;
  value: T;
  savedAt: number;
  expiresAt: number;
  version: number;
}

const DB_NAME = "decoration-app-cache";
const STORE = "entries";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // If another tab upgrades the DB, close so it isn't blocked.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req ? req.result : undefined);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

/** Basic structural validation so corrupted rows are never returned. */
export function isValidEntry(raw: unknown): raw is CacheEntry {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Partial<CacheEntry>;
  return (
    typeof e.id === "string" &&
    !!e.key &&
    typeof e.key === "object" &&
    typeof e.savedAt === "number" &&
    typeof e.expiresAt === "number" &&
    e.version === CACHE_SCHEMA_VERSION &&
    "value" in e &&
    e.value !== undefined
  );
}

export async function readEntry<T>(id: string): Promise<CacheEntry<T> | null> {
  const raw = await run<unknown>("readonly", (s) => s.get(id));
  if (raw === undefined) return null;
  if (!isValidEntry(raw)) {
    void deleteEntries([id]);
    return null;
  }
  return raw as CacheEntry<T>;
}

export async function writeEntry(entry: CacheEntry): Promise<void> {
  await run("readwrite", (s) => s.put(entry));
}

export async function deleteEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await run("readwrite", (s) => {
    ids.forEach((id) => s.delete(id));
  });
}

/** All stored entries (invalid rows are skipped and cleaned up). */
export async function readAllEntries(): Promise<CacheEntry[]> {
  const raw = await run<unknown[]>("readonly", (s) => s.getAll());
  if (!Array.isArray(raw)) return [];
  const valid: CacheEntry[] = [];
  const bad: string[] = [];
  raw.forEach((r) => {
    if (isValidEntry(r)) valid.push(r);
    else if (r && typeof (r as { id?: unknown }).id === "string")
      bad.push((r as { id: string }).id);
  });
  void deleteEntries(bad);
  return valid;
}

export async function clearAllEntries(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}
