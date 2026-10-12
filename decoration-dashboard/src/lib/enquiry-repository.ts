import type { EnquiryItem } from "./enquiries";
import type { EnquiryListRow } from "./supabase-service";
import { INITIAL_ENQUIRIES } from "./enquiries-sample-data";
import { saveEnquiryPhotos } from "./enquiry-photos";

// ── Storage Keys ─────────────────────────────────────────────────────────────
export const ENQUIRY_STORAGE_KEY = "decoration_app_enquiries_v1";
export const ENQUIRY_BACKUP_PREFIX = "decoration_app_enquiries_backup_";
export const MAX_ENQUIRY_BACKUPS = 5;
export const ENQUIRY_STORAGE_ERROR_EVENT = "enquiry-storage-error";

export interface StorageErrorDetail {
  type: "quota_exceeded" | "write_failed" | "corrupt_data";
  message: string;
}

// Global in-memory cache of extracted base64 images so they render immediately
const memoryPhotoCache = new Map<string, string>();
// Bumped whenever a photo is added, so resolved copies are rebuilt only then.
let photoCacheVersion = 0;

/** Swaps a base64 photo for its idb:// ref; returns true when it is new and needs persisting. */
function cachePhoto(ref: string, dataUrl: string): boolean {
  if (memoryPhotoCache.get(ref) === dataUrl) return false;
  memoryPhotoCache.set(ref, dataUrl);
  photoCacheVersion++;
  return true;
}

// Items as held in memory/localStorage (already stripped of base64 photos).
const storedItems = new WeakSet<EnquiryItem>();
// Resolved copy handed to the UI → the stored item it came from. Lets save()
// skip re-stripping (deep-cloning megabytes) for enquiries that did not change.
const storedByResolved = new WeakMap<EnquiryItem, EnquiryItem>();
const resolvedByStored = new WeakMap<EnquiryItem, { v: number; r: EnquiryItem }>();

function markStored(items: EnquiryItem[]): EnquiryItem[] {
  items.forEach((i) => storedItems.add(i));
  return items;
}

/** The stored form of `item`: reused when unchanged, otherwise stripped of base64 photos. */
function toStored(item: EnquiryItem): EnquiryItem {
  if (storedItems.has(item)) return item;
  const known = storedByResolved.get(item);
  if (known) return known;
  const stored = sanitizeEnquiryPhotos(item);
  storedItems.add(stored);
  return stored;
}

/**
 * Strips heavy data:image base64 strings synchronously from an enquiry tree,
 * caching them in memory and queueing them for IndexedDB background persistence.
 */
function sanitizeEnquiryPhotos(enq: EnquiryItem): EnquiryItem {
  const clone = JSON.parse(JSON.stringify(enq)) as EnquiryItem;
  const photosToPersist: { key: string; photos: string[] }[] = [];

  if (clone.events && Array.isArray(clone.events)) {
    clone.events.forEach((ev, evIdx) => {
      const evPhotos: string[] = [];
      let evChanged = false;

      if (ev.requested_decorations && Array.isArray(ev.requested_decorations)) {
        ev.requested_decorations.forEach((d, dIdx) => {
          // Check photo/image
          if (typeof d.photo === "string" && d.photo.startsWith("data:image/")) {
            const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/photo`;
            if (cachePhoto(ref, d.photo)) evChanged = true;
            evPhotos.push(d.photo);
            d.photo = ref;
          }
          if (typeof d.image === "string" && d.image.startsWith("data:image/")) {
            const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/image`;
            if (cachePhoto(ref, d.image)) evChanged = true;
            evPhotos.push(d.image);
            d.image = ref;
          }

          // Check gallery
          if (Array.isArray(d.gallery)) {
            d.gallery = d.gallery.map((g, gIdx) => {
              if (typeof g === "string" && g.startsWith("data:image/")) {
                const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/g${gIdx}`;
                if (cachePhoto(ref, g)) evChanged = true;
                evPhotos.push(g);
                return ref;
              }
              return g;
            });
          }
        });
      }

      // Only re-persist when a photo is new or changed, not on every save.
      if (evPhotos.length > 0 && evChanged) {
        photosToPersist.push({
          key: `${clone.id}#decorations#${evIdx}`,
          photos: evPhotos,
        });
      }
    });
  }

  // Check reference_images
  if (Array.isArray(clone.reference_images)) {
    const refPhotos: string[] = [];
    let refChanged = false;
    clone.reference_images = clone.reference_images.map((img, iIdx) => {
      if (typeof img === "string" && img.startsWith("data:image/")) {
        const ref = `idb://${clone.id}/ref/${iIdx}`;
        if (cachePhoto(ref, img)) refChanged = true;
        refPhotos.push(img);
        return ref;
      }
      return img;
    });
    if (refPhotos.length > 0 && refChanged) {
      photosToPersist.push({
        key: `${clone.id}#reference_images`,
        photos: refPhotos,
      });
    }
  }

  // Queue background persistence to IndexedDB without blocking localStorage write
  if (photosToPersist.length > 0) {
    setTimeout(async () => {
      for (const item of photosToPersist) {
        try {
          await saveEnquiryPhotos(item.key, item.photos);
        } catch (err) {
          console.warn("[EnquiryRepository] Failed to save photos to IndexedDB:", err);
        }
      }
    }, 0);
  }

  return clone;
}

/**
 * Resolves an image URL if it was converted to an IndexedDB ref.
 */
export function resolveEnquiryPhoto(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("idb://")) {
    const cached = memoryPhotoCache.get(url);
    if (cached) return cached;
  }
  return url;
}

/** Deep copy of `value` with every idb:// ref this tab knows swapped back for its photo. */
export function resolveEnquiryPhotoRefs<T>(value: T): T {
  if (typeof value === "string") {
    return (value.startsWith("idb://") ? (memoryPhotoCache.get(value) ?? value) : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => resolveEnquiryPhotoRefs(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveEnquiryPhotoRefs(v);
    return out as T;
  }
  return value;
}

/** True when `value` still holds an idb:// ref (a photo only some browser tab had in memory). */
export function containsPhotoRef(value: unknown): boolean {
  if (typeof value === "string") return value.startsWith("idb://");
  if (Array.isArray(value)) return value.some(containsPhotoRef);
  if (value && typeof value === "object") return Object.values(value).some(containsPhotoRef);
  return false;
}

/**
 * UI copy of a stored item with idb:// refs swapped back for photos. The same
 * object is returned until the item or the photo cache changes, so React can
 * skip re-rendering unchanged enquiry cards.
 */
function resolveItem(item: EnquiryItem): EnquiryItem {
  const hit = resolvedByStored.get(item);
  if (hit && hit.v === photoCacheVersion) return hit.r;
  const r =
    !containsPhotoRef(item.events) && !containsPhotoRef(item.reference_images)
      ? item
      : {
          ...item,
          events: resolveEnquiryPhotoRefs(item.events),
          reference_images: resolveEnquiryPhotoRefs(item.reference_images),
        };
  resolvedByStored.set(item, { v: photoCacheVersion, r });
  if (r !== item) storedByResolved.set(r, item);
  return r;
}

function isOlder(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return !isNaN(ta) && !isNaN(tb) && ta < tb;
}

/**
 * Whether a Supabase enquiry still needs its full event/photo data loaded:
 * never loaded, loaded for an older row version, or photos not available in this tab.
 */
export function enquiryNeedsDetails(item: EnquiryItem): boolean {
  if (item.isSample || !item.updated_at) return false;
  if (item.events === undefined || item.details_updated_at !== item.updated_at) return true;
  return containsPhotoRef(resolveItem(item).events) || containsPhotoRef(resolveItem(item).reference_images);
}

// ── EnquiryRepository Implementation ─────────────────────────────────────────
class EnquiryRepository {
  private memoryEnquiries: EnquiryItem[] = [];
  private hasLoaded = false;

  private persistTimer: ReturnType<typeof setTimeout> | undefined;
  private syncedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      // Write any batched Supabase data before the tab goes away.
      const flush = () => this.flushPendingPersist();
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
  }

  public isInitialized(): boolean {
    return this.hasLoaded;
  }

  /**
   * Retrieves all enquiries from memory (or triggers load if first time).
   */
  public getAll(includeDeleted = false): EnquiryItem[] {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }
    const list = this.memoryEnquiries.map(resolveItem);
    return includeDeleted ? list : list.filter((e) => !e.deleted_at);
  }

  private setMemory(list: EnquiryItem[]) {
    this.memoryEnquiries = markStored(list);
  }

  public getById(id: string): EnquiryItem | undefined {
    if (!this.hasLoaded) this.loadFromStorage();
    const item = this.memoryEnquiries.find((e) => e.id === id);
    return item ? resolveItem(item) : undefined;
  }

  /**
   * Loads enquiries from primary storage or rolling backups.
   * NEVER automatically seeds sample leads!
   */
  public loadFromStorage(): EnquiryItem[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(ENQUIRY_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.setMemory(parsed);
            this.hasLoaded = true;
            return this.memoryEnquiries;
          }
        } catch (parseErr) {
          console.warn("[EnquiryRepository] Primary storage corrupted. Attempting backup restore...", parseErr);
        }
      }

      // Check rolling backups (backup_1 to backup_5)
      for (let i = 1; i <= MAX_ENQUIRY_BACKUPS; i++) {
        const backupKey = `${ENQUIRY_BACKUP_PREFIX}${i}`;
        const backupRaw = localStorage.getItem(backupKey);
        if (backupRaw) {
          try {
            const backupParsed = JSON.parse(backupRaw);
            if (Array.isArray(backupParsed) && backupParsed.length > 0) {
              console.warn(`[EnquiryRepository] Restored ${backupParsed.length} enquiries from rolling backup #${i}`);
              this.setMemory(backupParsed);
              this.hasLoaded = true;
              try {
                localStorage.setItem(ENQUIRY_STORAGE_KEY, backupRaw);
              } catch {}
              return this.memoryEnquiries;
            }
          } catch {}
        }
      }

      // Clean start: empty array, NO auto-seeding
      this.memoryEnquiries = [];
      this.hasLoaded = true;
      return [];
    } catch (err) {
      console.error("[EnquiryRepository] Error during loadFromStorage:", err);
      this.memoryEnquiries = [];
      this.hasLoaded = true;
      return [];
    }
  }

  /**
   * Primary save method. Synchronous to prevent race conditions.
   * Enforces all persistence guards:
   * 1. Cannot save before initial load finishes.
   * 2. Cannot overwrite existing real enquiries with an empty array.
   * 3. Sanitizes base64 images so localStorage never exceeds quota.
   * 4. Updates rolling 5-save backup.
   * 5. Catches QuotaExceededError and notifies UI.
   */
  public save(
    enquiries: EnquiryItem[],
    opts: { fromRemote?: boolean; allowEmpty?: boolean } = {},
  ): boolean {
    if (typeof window === "undefined") return false;

    // Guard 1: Do not save until the first load has finished
    if (!this.hasLoaded) {
      console.warn("[EnquiryRepository] Save rejected: Initial load has not finished yet.");
      return false;
    }

    // Guard 2: Never write an empty list over existing real data
    const existingReal = this.memoryEnquiries.filter((e) => !e.isSample && !e.deleted_at);
    if (enquiries.length === 0 && existingReal.length > 0 && !opts.allowEmpty) {
      console.warn(
        `[EnquiryRepository] Save blocked: Attempted to overwrite ${existingReal.length} existing real enquiries with an empty array.`
      );
      return false;
    }

    try {
      // Strip base64 photos out of the localStorage payload (unchanged items are reused as-is)
      const sanitized = enquiries.map(toStored);

      if (opts.fromRemote) {
        // Supabase-confirmed data: show it now; write the local cache once per
        // burst (e.g. while many enquiries' details load) instead of per record.
        this.setMemory(sanitized);
        this.schedulePersist();
        this.scheduleSyncedEvent();
        return true;
      }

      // Local changes are written immediately, as before.
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
      if (!this.persist(sanitized)) return false;
      this.setMemory(sanitized);
      window.dispatchEvent(new Event("enquiries-synced"));
      return true;
    } catch (err) {
      console.error("[EnquiryRepository] Unexpected error during save:", err);
      return false;
    }
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      this.persist(this.memoryEnquiries);
    }, 400);
  }

  private flushPendingPersist() {
    if (!this.persistTimer) return;
    clearTimeout(this.persistTimer);
    this.persistTimer = undefined;
    this.persist(this.memoryEnquiries);
  }

  private scheduleSyncedEvent() {
    if (this.syncedTimer) return;
    this.syncedTimer = setTimeout(() => {
      this.syncedTimer = undefined;
      window.dispatchEvent(new Event("enquiries-synced"));
    }, 30);
  }

  /** Writes the list to localStorage (with lean fallback and rolling backup). */
  private persist(sanitized: EnquiryItem[]): boolean {
    try {
      const json = JSON.stringify(sanitized);

      try {
        localStorage.setItem(ENQUIRY_STORAGE_KEY, json);
      } catch (storageErr: any) {
        const isQuota =
          storageErr?.name === "QuotaExceededError" ||
          storageErr?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          storageErr?.code === 22;

        console.error("[EnquiryRepository] localStorage write error:", storageErr);

        // Show a visible warning
        window.dispatchEvent(
          new CustomEvent<StorageErrorDetail>(ENQUIRY_STORAGE_ERROR_EVENT, {
            detail: {
              type: isQuota ? "quota_exceeded" : "write_failed",
              message: isQuota
                ? "Storage limit reached: Large photos were saved to background storage only."
                : "Failed to write enquiry data to local storage.",
            },
          })
        );

        // Lean fallback: strip non-essential properties to ensure core records are saved
        const lean = sanitized.map((e) => ({
          id: e.id,
          client_name: e.client_name,
          phone: e.phone,
          whatsapp_number: e.whatsapp_number,
          whatsappNumber: e.whatsappNumber || e.whatsapp_number,
          whatsappSameAsPhone: e.whatsappSameAsPhone,
          email: e.email,
          location: e.location,
          source: e.source,
          created_at: e.created_at,
          time_ago_display: e.time_ago_display,
          ceremony_type: e.ceremony_type,
          date_bs: e.date_bs,
          date_ad: e.date_ad,
          venue: e.venue,
          availability_status: e.availability_status,
          availability_summary: e.availability_summary,
          status: e.status,
          private_note: e.private_note,
          order_type: e.order_type,
          isSample: e.isSample,
          deleted_at: e.deleted_at,
          events: (e.events || []).map((ev) => ({
            name: ev.name,
            date_ad: ev.date_ad,
            date_bs: ev.date_bs,
            date_iso: ev.date_iso,
            venue: ev.venue,
            requirements: ev.requirements,
          })),
        }));

        try {
          localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(lean));
        } catch {
          return false;
        }
      }

      // Rolling backup
      this.pushRollingBackup(json);
      return true;
    } catch (err) {
      console.error("[EnquiryRepository] Unexpected error while writing local storage:", err);
      return false;
    }
  }

  /**
   * Pushes the latest successful save to rolling backups 1..5.
   */
  private pushRollingBackup(json: string) {
    try {
      for (let i = MAX_ENQUIRY_BACKUPS - 1; i >= 1; i--) {
        const fromKey = `${ENQUIRY_BACKUP_PREFIX}${i}`;
        const toKey = `${ENQUIRY_BACKUP_PREFIX}${i + 1}`;
        const prev = localStorage.getItem(fromKey);
        if (prev) {
          try {
            localStorage.setItem(toKey, prev);
          } catch {}
        }
      }
      localStorage.setItem(`${ENQUIRY_BACKUP_PREFIX}1`, json);
    } catch {
      // Silent backup
    }
  }

  /**
   * Merges the light Supabase list (no events/photos). Supabase is the source of
   * truth for every column it returned, so local values never win over them.
   * Locally held event/photo details are kept until fresh ones are loaded.
   * Local-only enquiries (samples, unsynced offline leads) are kept.
   */
  public mergeRemoteList(rows: EnquiryListRow[]): void {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }

    const current = this.memoryEnquiries;
    const byId = new Map(current.map((c) => [c.id, c]));
    const remoteIds = new Set<string>();

    const merged: EnquiryItem[] = rows.map((r) => {
      remoteIds.add(r.id);
      const local = byId.get(r.id);
      // A newer version (e.g. from a realtime update) arrived while this list was loading.
      if (local && isOlder(r.updated_at, local.updated_at)) return local;
      const next: EnquiryItem = {
        ...local,
        ...r,
        // The full row mapper derives these from events when the column is empty.
        ceremony_type: r.ceremony_type || local?.ceremony_type || "Wedding",
        venue: r.venue || local?.venue || "",
        estimated_budget_npr: r.estimated_budget_npr ?? local?.estimated_budget_npr,
        isSample: false,
      };
      // Unchanged rows keep their object, so their cards are not re-rendered.
      if (local && (Object.keys(next) as (keyof EnquiryItem)[]).every((k) => next[k] === local[k])) return local;
      return next;
    });

    current.forEach((c) => {
      if (!remoteIds.has(c.id)) merged.push(c);
    });

    this.save(merged, { fromRemote: true });
  }

  /**
   * Applies one full Supabase record (with events/photos). Ignored when an
   * even newer version of the row is already held locally.
   */
  public applyRemoteRecord(record: EnquiryItem): void {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }
    const list = [...this.memoryEnquiries];
    const idx = list.findIndex((e) => e.id === record.id);
    if (idx >= 0 && isOlder(record.updated_at, list[idx]!.updated_at)) return;

    const next: EnquiryItem = { ...record, isSample: false };
    if (idx >= 0) list[idx] = next;
    else list.unshift(next);
    this.save(list, { fromRemote: true });
  }

  /** Drops an enquiry that no longer exists in Supabase. */
  public removeRecord(id: string): void {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }
    if (!this.memoryEnquiries.some((e) => e.id === id)) return;
    this.save(
      this.memoryEnquiries.filter((e) => e.id !== id),
      { fromRemote: true, allowEmpty: true },
    );
  }

  /**
   * Resets sample leads only on explicit user request.
   * Real client enquiries are 100% PRESERVED.
   */
  public resetSampleLeads(): EnquiryItem[] {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }

    // Keep all real client enquiries
    const realEnquiries = this.memoryEnquiries.filter((e) => !e.isSample);

    // Create fresh sample leads marked with isSample: true
    const sampleLeads: EnquiryItem[] = INITIAL_ENQUIRIES.map((s) => ({
      ...s,
      isSample: true,
      created_at: new Date().toISOString(),
    }));

    const combined = [...realEnquiries, ...sampleLeads];
    this.save(combined);
    return this.getAll();
  }
}

export const enquiryRepository = new EnquiryRepository();
