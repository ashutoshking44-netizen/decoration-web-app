/**
 * Reference photos for enquiries live in IndexedDB, not localStorage.
 * localStorage is capped at ~5 MB for the whole app (shared with decoration
 * setups, clients, etc.), so photos used to be silently dropped when it was
 * full. IndexedDB has a far larger quota.
 */

const DB_NAME = "decoration_enquiry_photos";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Saves the photo data-URLs for an enquiry. Resolves false if they could not be stored. */
export async function saveEnquiryPhotos(enquiryId: string, photos: string[]): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(photos, enquiryId);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function loadEnquiryPhotos(enquiryId: string): Promise<string[]> {
  try {
    const db = await openDb();
    return await new Promise<string[]>((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(enquiryId);
      req.onsuccess = () => {
        db.close();
        resolve(Array.isArray(req.result) ? (req.result as string[]) : []);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}
