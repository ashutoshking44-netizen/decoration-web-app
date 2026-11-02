/**
 * Horizontally scroll `child` into view inside `container` WITHOUT touching
 * the window / page scroll position.
 *
 * `Element.scrollIntoView()` scrolls every scrollable ancestor, including the
 * page itself, which caused unwanted vertical page jumps when we only wanted to
 * bring a chip/pill into view inside a horizontal row.
 */
export type HorizontalAlign = "center" | "nearest";

export function computeHorizontalScrollLeft(
  containerScrollLeft: number,
  containerWidth: number,
  maxScrollLeft: number,
  childOffsetLeft: number,
  childWidth: number,
  align: HorizontalAlign,
): number {
  let target = containerScrollLeft;
  if (align === "center") {
    target = childOffsetLeft - (containerWidth - childWidth) / 2;
  } else {
    const childRight = childOffsetLeft + childWidth;
    if (childOffsetLeft < containerScrollLeft) {
      target = childOffsetLeft;
    } else if (childRight > containerScrollLeft + containerWidth) {
      target = childRight - containerWidth;
    }
  }
  return Math.max(0, Math.min(Math.max(0, maxScrollLeft), target));
}

export function scrollChildIntoContainerX(
  container: HTMLElement | null | undefined,
  child: HTMLElement | null | undefined,
  options: { align?: HorizontalAlign; behavior?: ScrollBehavior } = {},
): void {
  if (!container || !child || !container.contains(child)) return;
  const { align = "nearest", behavior = "smooth" } = options;

  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  // Child position relative to the container's scrollable content
  const childOffsetLeft = childRect.left - containerRect.left + container.scrollLeft;

  const left = computeHorizontalScrollLeft(
    container.scrollLeft,
    container.clientWidth,
    container.scrollWidth - container.clientWidth,
    childOffsetLeft,
    childRect.width,
    align,
  );

  if (Math.abs(left - container.scrollLeft) < 1) return;
  if (typeof container.scrollTo === "function") {
    container.scrollTo({ left, behavior });
  } else {
    container.scrollLeft = left;
  }
}
