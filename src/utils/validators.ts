/**
 * Validation utilities for form inputs, media files, and phone numbers.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Accepts Nepal 10-digit mobile, +977 prefix, or standard international format
  return /^(?:\+?977[- ]?)?9[78]\d{8}$/.test(phone.replace(/\s+/g, ""));
}

export function isValidImageFile(file: File, maxMb = 10): { valid: boolean; error?: string } {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { valid: false, error: "Only JPG, PNG, WEBP, or GIF images are allowed." };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return { valid: false, error: `Image must be smaller than ${maxMb}MB.` };
  }
  return { valid: true };
}
