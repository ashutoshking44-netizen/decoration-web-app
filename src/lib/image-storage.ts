import { supabase } from "./supabase";

/** Public Supabase Storage bucket for decoration photos (create it with supabase/storage.sql). */
export const IMAGE_BUCKET = "decoration-images";

/** Heavily compressed: long side in pixels and WebP/JPEG quality. */
const MAX_SIDE = 1000;
const QUALITY = 0.6;

export const isDataImageUrl = (url: unknown): url is string =>
  typeof url === "string" && url.startsWith("data:image/");

const uploaded = new Map<string, string>(); // hash -> public url (this page load)

async function hashString(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

/** Shrinks an image (data URL or File) to a small WebP (JPEG where WebP is unavailable). */
export async function compressToBlob(
  source: string | File,
  maxSide = MAX_SIDE,
  quality = QUALITY,
): Promise<Blob> {
  const src =
    typeof source === "string"
      ? source
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(source);
        });
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(img, 0, 0, width, height);
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Could not compress image");
  return jpeg;
}

/**
 * Compresses an image and uploads it to Supabase Storage. Returns the public URL,
 * or null if the upload failed (callers keep the original image in that case).
 */
export async function uploadImageToStorage(
  source: string | File,
  folder = "decorations",
): Promise<string | null> {
  try {
    const blob = await compressToBlob(source);
    const hash = await hashString(
      typeof source === "string" ? source : `${source.name}:${source.size}:${source.lastModified}`,
    );
    const cached = uploaded.get(hash);
    if (cached) return cached;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${folder}/${hash}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) {
      console.warn("[image-storage] Upload failed:", error.message);
      return null;
    }
    const url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    uploaded.set(hash, url);
    return url;
  } catch (err) {
    console.warn("[image-storage] Upload error:", err);
    return null;
  }
}

/** A Storage link for a data-URL image; any other value (http link, empty) is returned unchanged. */
export async function toStorageUrl(
  url: string | undefined | null,
  folder = "decorations",
): Promise<string> {
  if (!url) return url || "";
  if (!isDataImageUrl(url)) return url;
  return (await uploadImageToStorage(url, folder)) ?? url;
}
