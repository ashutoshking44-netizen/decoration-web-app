/**
 * Number of placeholder (skeleton) cards rendered while the catalog loads.
 * Kept small on purpose: extra skeleton rows make the page much taller than
 * the real content, causing unnecessary scrolling / jumps when data arrives.
 */
export const SKELETON_CARD_COUNT = 3;

/** Stable keys for rendering the skeleton placeholders. */
export const SKELETON_KEYS: readonly number[] = Array.from(
  { length: SKELETON_CARD_COUNT },
  (_, i) => i + 1,
);
