/** Anything with a title/name and an id that can be turned into a URL slug. */
export interface SluggableItem {
  t?: string | undefined;
  name?: string | undefined;
  id?: string | number | undefined;
  sid?: string | undefined;
}

export function getDecorationSlug(item: SluggableItem): string {
  const name = (item.t || item.name || "").trim().toLowerCase();
  const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (slug) {
    return slug;
  }
  return String(item.sid || item.id || "decor");
}

export function matchesDecoration(param: string, item: SluggableItem): boolean {
  if (!param) return false;
  const cleanParam = decodeURIComponent(param).trim().toLowerCase();
  const slug = getDecorationSlug(item);
  const name = (item.t || item.name || "").trim().toLowerCase();
  const numId = String(item.id || "").toLowerCase();
  const sid = String(item.sid || "").toLowerCase();

  return cleanParam === slug || cleanParam === name || cleanParam === numId || cleanParam === sid;
}
