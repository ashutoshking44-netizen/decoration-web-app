/**
 * Formatting utilities for Nepali Rupee (NPR), dates, and numbers.
 */

/**
 * Formats a number as NPR currency with Nepali thousands grouping.
 * Example: 85000 -> "NPR 85,000"
 */
export function formatNpr(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num === null || num === undefined) return "NPR 0";
  return `NPR ${num.toLocaleString("en-IN")}`;
}

/**
 * Formats a phone number for display with country code.
 */
export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned;
}

/**
 * Capitalizes string words to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
  );
}
