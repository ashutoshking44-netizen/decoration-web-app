import { useEffect, useState } from "react";

/** Phones (iOS / Android portrait & small landscape) — matches the CSS mobile breakpoint. */
export const PHONE_MEDIA_QUERY = "(max-width: 768px)";

/** Live result of a CSS media query (false during SSR / before mount). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on phone-sized screens, where popups become draggable bottom sheets. */
export const useIsPhone = () => useMediaQuery(PHONE_MEDIA_QUERY);
