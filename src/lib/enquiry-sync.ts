// Keeps the local enquiry store in step with Supabase without downloading the
// whole table:
//   • the list loads light columns only (status, client, dates…) with bounded retries,
//   • full event/photo data loads one row at a time, only for enquiries on screen
//     or about to be quoted,
//   • a realtime INSERT/UPDATE/DELETE re-fetches just that one row.
// One list request is shared by every caller, so React StrictMode's double
// mount (and several pages mounting at once) does not fire duplicate requests.
import { enquiryNeedsDetails, enquiryRepository } from "./enquiry-repository";
import {
  fetchEnquiryByIdFromSupabase,
  fetchEnquiryListFromSupabase,
  isRetryableSupabaseError,
  subscribeToEnquiriesRealtime,
  type EnquiryRealtimeChange,
} from "./supabase-service";

export type EnquiryLoadStatus = "idle" | "loading" | "ready" | "error";

export interface EnquiryLoadState {
  status: EnquiryLoadStatus;
  /** Attempt number while loading (1 = first try). */
  attempt?: number | undefined;
  /** Human-readable reason when status is "error". */
  error?: string | undefined;
}

const LIST_ATTEMPTS = 3;
const DETAIL_ATTEMPTS = 3;
const DETAIL_CONCURRENCY = 2;
const DETAIL_FAILURE_COOLDOWN_MS = 15_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  onRetry?: (nextAttempt: number) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isRetryableSupabaseError(err)) break;
      onRetry?.(i + 2);
      await sleep(1000 * 2 ** i + Math.random() * 300);
    }
  }
  throw lastErr;
}

function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/statement timeout/i.test(msg)) return "The database took too long to respond.";
  if (/failed to fetch|network/i.test(msg))
    return "Could not reach the server. Check your internet connection.";
  return msg || "Unknown error";
}

// ── Load state (shared by every component using enquiries) ────────────────────
let loadState: EnquiryLoadState = { status: "idle" };
const loadStateListeners = new Set<() => void>();

function setLoadState(next: EnquiryLoadState) {
  loadState = next;
  loadStateListeners.forEach((l) => l());
}

export function getEnquiryLoadState(): EnquiryLoadState {
  return loadState;
}

export function subscribeEnquiryLoadState(listener: () => void): () => void {
  loadStateListeners.add(listener);
  return () => loadStateListeners.delete(listener);
}

// ── List ──────────────────────────────────────────────────────────────────────
let listInFlight: Promise<void> | null = null;

/**
 * Loads the light enquiry list and merges it into the local store. Concurrent
 * callers share one request. A failure is reported as an error state, never as
 * an empty list. Once loaded, later refreshes run in the background without
 * flipping the page back to "loading".
 */
export function loadEnquiryList(): Promise<void> {
  if (listInFlight) return listInFlight;
  const background = loadState.status === "ready";
  if (!background) setLoadState({ status: "loading", attempt: 1 });

  listInFlight = withRetry(fetchEnquiryListFromSupabase, LIST_ATTEMPTS, (attempt) => {
    if (!background) setLoadState({ status: "loading", attempt });
  })
    .then((rows) => {
      enquiryRepository.mergeRemoteList(rows);
      setLoadState({ status: "ready" });
    })
    .catch((err) => {
      console.error("[enquiry-sync] Loading enquiries from Supabase failed:", err);
      if (!background) setLoadState({ status: "error", error: describeError(err) });
    })
    .finally(() => {
      listInFlight = null;
    });
  return listInFlight;
}

// ── Details (events + photos), one row at a time ──────────────────────────────
const detailsInFlight = new Map<string, Promise<void>>();
const detailsRefetchQueued = new Set<string>();
const detailsFailedAt = new Map<string, number>();
// Row versions already loaded this session that still lack photos (the stored
// row itself holds no usable photo), so they are not fetched again and again.
const detailsSettledVersion = new Map<string, string>();

let activeDetailFetches = 0;
const detailWaiters: (() => void)[] = [];
// Rows a user action is waiting on (e.g. "Create quotation now"): they skip the
// queue of background loads instead of waiting behind every visible card.
const priorityDetailIds = new Set<string>();

function wakeDetailWaiters(all: boolean) {
  if (all) detailWaiters.splice(0).forEach((w) => w());
  else detailWaiters.shift()?.();
}

async function withDetailSlot<T>(id: string, fn: () => Promise<T>): Promise<T> {
  while (activeDetailFetches >= DETAIL_CONCURRENCY && !priorityDetailIds.has(id)) {
    await new Promise<void>((r) => detailWaiters.push(r));
  }
  activeDetailFetches++;
  try {
    return await fn();
  } finally {
    activeDetailFetches--;
    priorityDetailIds.delete(id);
    wakeDetailWaiters(false);
  }
}

function fetchDetails(id: string, fromRealtime: boolean, priority = false): Promise<void> {
  if (priority) {
    priorityDetailIds.add(id);
    wakeDetailWaiters(true); // a queued request for this id re-checks and proceeds
  }
  const running = detailsInFlight.get(id);
  if (running) {
    // A realtime change landed mid-fetch: fetch once more afterwards so the newest version wins.
    if (fromRealtime) detailsRefetchQueued.add(id);
    return running;
  }

  const p = withDetailSlot(id, () =>
    withRetry(() => fetchEnquiryByIdFromSupabase(id), DETAIL_ATTEMPTS),
  )
    .then((record) => {
      detailsFailedAt.delete(id);
      if (record) {
        enquiryRepository.applyRemoteRecord(record);
        const held = enquiryRepository.getById(id);
        if (held && enquiryNeedsDetails(held) && record.updated_at) {
          detailsSettledVersion.set(id, record.updated_at);
        }
      } else if (fromRealtime) {
        // The row is gone from Supabase (realtime DELETE).
        enquiryRepository.removeRecord(id);
      }
    })
    .catch((err) => {
      detailsFailedAt.set(id, Date.now());
      console.warn(`[enquiry-sync] Loading details for enquiry ${id} failed:`, err);
    })
    .finally(() => {
      detailsInFlight.delete(id);
      if (detailsRefetchQueued.delete(id)) void fetchDetails(id, true);
    });

  detailsInFlight.set(id, p);
  return p;
}

/**
 * Makes sure the given enquiries hold their full event/photo data, fetching
 * only rows that are missing or out of date. Resolves when done (failures are
 * logged, not thrown, so callers can carry on with what they have).
 */
export function ensureEnquiryDetails(
  ids: string[],
  opts: { priority?: boolean } = {},
): Promise<void> {
  const now = Date.now();
  const work = ids.map((id) => {
    const item = enquiryRepository.getById(id);
    if (!item || !enquiryNeedsDetails(item)) return detailsInFlight.get(id);
    if (item.updated_at && detailsSettledVersion.get(id) === item.updated_at) return undefined;
    if (!opts.priority && now - (detailsFailedAt.get(id) ?? 0) < DETAIL_FAILURE_COOLDOWN_MS)
      return undefined;
    return fetchDetails(id, false, opts.priority);
  });
  return Promise.all(work).then(() => undefined);
}

// ── Realtime ──────────────────────────────────────────────────────────────────
function onRealtimeChange(change: EnquiryRealtimeChange) {
  // Fetch only the changed row (DELETE resolves to "not found" and is removed).
  void fetchDetails(change.id, true);
}

let releaseRealtime: (() => void) | null = null;
let retainCount = 0;

/**
 * Starts enquiry syncing for a mounted page: loads (or background-refreshes)
 * the list and listens for realtime changes. Returns the matching release.
 */
export function retainEnquirySync(): () => void {
  retainCount++;
  if (!releaseRealtime) {
    releaseRealtime = subscribeToEnquiriesRealtime(onRealtimeChange, () => {
      // Changes may have been missed while disconnected; the light list is cheap.
      void loadEnquiryList();
    });
  }
  void loadEnquiryList();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    retainCount--;
    if (retainCount === 0 && releaseRealtime) {
      // The channel teardown itself is deferred inside supabase-service, so a
      // StrictMode remount re-attaches to the same joined channel.
      releaseRealtime();
      releaseRealtime = null;
    }
  };
}
