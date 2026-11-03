import { useCallback, useEffect, useState } from "react";

/**
 * Photographer gallery — photos received from event photographers.
 * Stored in IndexedDB (photos are too big for localStorage's ~5 MB quota).
 */

export interface GalleryPhoto {
  id: string;
  /** JPEG data URL */
  src: string;
  photographer: string;
  event: string;
  createdAt: number;
}

const DB_NAME = "decoration_photographer_gallery";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadAll(): Promise<GalleryPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result as GalleryPhoto[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

async function putPhotos(photos: GalleryPhoto[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    photos.forEach((p) => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Resize to max 1600px and re-encode as JPEG so many photos fit. */
export function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function usePhotographerGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then((p) => {
        if (!cancelled) setPhotos(p);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Returns how many photos were saved. */
  const addPhotos = useCallback(
    async (files: File[], meta: { photographer: string; event: string }): Promise<number> => {
      const added: GalleryPhoto[] = [];
      for (const file of files) {
        try {
          const src = await compressImage(file);
          added.push({
            id: `gp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
            src,
            photographer: meta.photographer.trim(),
            event: meta.event.trim(),
            createdAt: Date.now(),
          });
        } catch {
          /* skip unreadable file */
        }
      }
      if (added.length === 0) return 0;
      try {
        await putPhotos(added);
      } catch {
        return 0;
      }
      setPhotos((prev) => [...added, ...prev].sort((a, b) => b.createdAt - a.createdAt));
      return added.length;
    },
    [],
  );

  const removePhoto = useCallback(async (id: string) => {
    try {
      await deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
  }, []);

  return { photos, ready, addPhotos, removePhoto };
}
