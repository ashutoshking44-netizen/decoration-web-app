import type { EnquiryItem } from "./enquiries";
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

/**
 * Strips heavy data:image base64 strings synchronously from an enquiry tree,
 * caching them in memory and queueing them for IndexedDB background persistence.
 */
function sanitizeEnquiryPhotos(enq: EnquiryItem): EnquiryItem {
  let hadBase64 = false;
  const clone = JSON.parse(JSON.stringify(enq)) as EnquiryItem;
  const photosToPersist: { key: string; photos: string[] }[] = [];

  if (clone.events && Array.isArray(clone.events)) {
    clone.events.forEach((ev, evIdx) => {
      const evPhotos: string[] = [];

      if (ev.requested_decorations && Array.isArray(ev.requested_decorations)) {
        ev.requested_decorations.forEach((d, dIdx) => {
          // Check photo/image
          if (typeof d.photo === "string" && d.photo.startsWith("data:image/")) {
            hadBase64 = true;
            const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/photo`;
            memoryPhotoCache.set(ref, d.photo);
            evPhotos.push(d.photo);
            d.photo = ref;
          }
          if (typeof d.image === "string" && d.image.startsWith("data:image/")) {
            hadBase64 = true;
            const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/image`;
            memoryPhotoCache.set(ref, d.image);
            evPhotos.push(d.image);
            d.image = ref;
          }

          // Check gallery
          if (Array.isArray(d.gallery)) {
            d.gallery = d.gallery.map((g, gIdx) => {
              if (typeof g === "string" && g.startsWith("data:image/")) {
                hadBase64 = true;
                const ref = `idb://${clone.id}/e${evIdx}/d${dIdx}/g${gIdx}`;
                memoryPhotoCache.set(ref, g);
                evPhotos.push(g);
                return ref;
              }
              return g;
            });
          }
        });
      }

      if (evPhotos.length > 0) {
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
    clone.reference_images = clone.reference_images.map((img, iIdx) => {
      if (typeof img === "string" && img.startsWith("data:image/")) {
        hadBase64 = true;
        const ref = `idb://${clone.id}/ref/${iIdx}`;
        memoryPhotoCache.set(ref, img);
        refPhotos.push(img);
        return ref;
      }
      return img;
    });
    if (refPhotos.length > 0) {
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

// ── EnquiryRepository Implementation ─────────────────────────────────────────
class EnquiryRepository {
  private memoryEnquiries: EnquiryItem[] = [];
  private hasLoaded = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
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
    const list = this.memoryEnquiries;
    return includeDeleted ? list : list.filter((e) => !e.deleted_at);
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
            this.memoryEnquiries = parsed;
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
              this.memoryEnquiries = backupParsed;
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
  public save(enquiries: EnquiryItem[]): boolean {
    if (typeof window === "undefined") return false;

    // Guard 1: Do not save until the first load has finished
    if (!this.hasLoaded) {
      console.warn("[EnquiryRepository] Save rejected: Initial load has not finished yet.");
      return false;
    }

    // Guard 2: Never write an empty list over existing real data
    const existingReal = this.memoryEnquiries.filter((e) => !e.isSample && !e.deleted_at);
    if (enquiries.length === 0 && existingReal.length > 0) {
      console.warn(
        `[EnquiryRepository] Save blocked: Attempted to overwrite ${existingReal.length} existing real enquiries with an empty array.`
      );
      return false;
    }

    try {
      // Sanitize base64 photos out of the localStorage payload
      const sanitized = enquiries.map((enq) => sanitizeEnquiryPhotos(enq));
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

      // Update memory
      this.memoryEnquiries = sanitized;

      // Broadcast event
      window.dispatchEvent(new Event("enquiries-synced"));
      return true;
    } catch (err) {
      console.error("[EnquiryRepository] Unexpected error during save:", err);
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
   * Merges remote enquiries (from Supabase or local API).
   * If remote is empty, keeps existing data.
   */
  public mergeRemote(remoteEnquiries: EnquiryItem[]): EnquiryItem[] {
    if (!this.hasLoaded) {
      this.loadFromStorage();
    }

    if (!Array.isArray(remoteEnquiries) || remoteEnquiries.length === 0) {
      // Remote is empty: NEVER overwrite local data with []!
      return this.memoryEnquiries;
    }

    const current = this.memoryEnquiries;
    const remoteById = new Map<string, EnquiryItem>();
    remoteEnquiries.forEach((r) => {
      remoteById.set(r.id, { ...r, isSample: false });
    });

    const merged: EnquiryItem[] = [];
    const processedIds = new Set<string>();

    // Remote items first
    remoteEnquiries.forEach((r) => {
      const existing = current.find((c) => c.id === r.id);
      if (existing) {
        merged.push({
          ...r,
          isSample: false,
          deleted_at: existing.deleted_at || r.deleted_at,
          private_note: existing.private_note || r.private_note,
        });
      } else {
        merged.push({ ...r, isSample: false });
      }
      processedIds.add(r.id);
    });

    // Keep local items (e.g. sample leads or unsynced offline leads)
    current.forEach((c) => {
      if (!processedIds.has(c.id)) {
        merged.push(c);
      }
    });

    this.save(merged);
    return this.memoryEnquiries;
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
    return this.memoryEnquiries;
  }
}

export const enquiryRepository = new EnquiryRepository();
