import React, { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import { SearchInput } from "./SearchInput";
import {
  getSearchSuggestions,
  highlightParts,
  type SearchableDecoration,
  type Suggestion,
} from "../lib/searchSuggestions";

const CLOSE_ANIMATION_MS = 160;

export interface SearchAutocompleteProps<T extends SearchableDecoration> {
  /** Catalog to search (already cached; no requests are made while typing). */
  catalog: readonly T[];
  /** Company name for a decoration. */
  getCompany: (item: T) => string;
  /** True while the catalog itself is still loading. */
  loading?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSelectCompany: (company: string) => void;
  onSelectDecoration: (item: T) => void;
  formatPrice?: (price: number) => string;
  placeholder?: string;
  ariaLabel?: string;
  /** Class for the input pill (keeps each placement's existing styling). */
  inputClassName?: string;
  /** Debounce before recomputing suggestions. */
  debounceMs?: number;
}

/** Highlighted text (matched parts in <mark>). */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {highlightParts(text, query).map((part, i) =>
      part.match ? (
        <mark key={i}>{part.text}</mark>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

function SearchAutocompleteInner<T extends SearchableDecoration>(
  {
    catalog,
    getCompany,
    loading = false,
    value,
    onChange,
    onSelectCompany,
    onSelectDecoration,
    formatPrice,
    placeholder,
    ariaLabel,
    inputClassName,
    debounceMs = 150,
  }: SearchAutocompleteProps<T>,
  inputRef: React.ForwardedRef<HTMLInputElement>,
) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  /** Stays true briefly after closing so the close animation can play. */
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(value);

  // Debounce the query used for matching
  useEffect(() => {
    if (!value.trim()) {
      setDebouncedQuery("");
      return;
    }
    const t = setTimeout(() => setDebouncedQuery(value), debounceMs);
    return () => clearTimeout(t);
  }, [value, debounceMs]);

  // Latest company resolver without recomputing on every parent render
  const getCompanyRef = useRef(getCompany);
  getCompanyRef.current = getCompany;

  const results = useMemo(
    () => getSearchSuggestions(catalog, debouncedQuery, (item) => getCompanyRef.current(item)),
    [catalog, debouncedQuery],
  );

  // Reset keyboard highlight whenever the result list changes
  useEffect(() => setActiveIndex(-1), [results]);

  // Mount immediately on open; unmount after the close animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Close on click/tap outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const onBackdrop = Boolean(target?.closest?.(".search-suggest-backdrop"));
      if (onBackdrop || !containerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Fit the panel to the space that is actually visible below the search box
  // (shrinks when the on-screen keyboard opens) and track whether more results
  // are hidden below, so the list never looks abruptly cut off.
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [backdropTop, setBackdropTop] = useState(0);

  const updateScrollHint = () => {
    const list = listRef.current;
    if (!list) return;
    setMoreBelow(list.scrollHeight - list.scrollTop - list.clientHeight > 4);
  };

  useEffect(() => {
    if (!mounted) return;
    const vv = window.visualViewport;
    const measure = () => {
      const input = containerRef.current?.querySelector("input");
      if (!input) return;
      const inputBottom = input.getBoundingClientRect().bottom;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const space = Math.floor(visibleBottom - inputBottom - 20);
      setMaxHeight(Math.max(180, Math.min(space, 480)));
      // Backdrop starts right under the header bar (or the input) so the bar stays clear
      const bar = containerRef.current?.closest("header") ?? input;
      setBackdropTop(Math.max(0, Math.round(bar.getBoundingClientRect().bottom)));
      requestAnimationFrame(updateScrollHint);
    };
    measure();
    vv?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    return () => {
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, [mounted]);

  // Re-check the "more below" hint whenever the results change
  useEffect(() => {
    if (mounted) requestAnimationFrame(updateScrollHint);
  }, [mounted, results, maxHeight]);

  // Keep the highlighted option visible by scrolling ONLY the list (never the page)
  useEffect(() => {
    const list = listRef.current;
    const option = activeIndex >= 0 ? results.all[activeIndex] : undefined;
    if (!list || !option) return;
    const el = list.querySelector<HTMLElement>(`[data-option-id="${option.id}"]`);
    if (!el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }
  }, [activeIndex, results]);

  const select = (s: Suggestion<T>) => {
    setOpen(false);
    if (s.kind === "company") {
      onChange("");
      onSelectCompany(s.name);
    } else {
      onSelectDecoration(s.item);
    }
    const input = containerRef.current?.querySelector("input");
    input?.blur();
  };

  const handleChange = (next: string) => {
    onChange(next);
    setOpen(next.trim().length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = results.all.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!value.trim()) return;
        setOpen(true);
        if (count) setActiveIndex((i) => (i + 1) % count);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!value.trim()) return;
        setOpen(true);
        if (count) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Home":
      case "End":
        if (open && count) {
          e.preventDefault();
          setActiveIndex(e.key === "Home" ? 0 : count - 1);
        }
        break;
      case "Enter": {
        e.preventDefault();
        const chosen = results.all[activeIndex >= 0 ? activeIndex : 0];
        if (open && chosen) select(chosen);
        break;
      }
      case "Escape":
        // First Escape closes the dropdown; a second one clears (SearchInput default)
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const query = debouncedQuery.trim();
  const pending = value.trim() !== query; // still typing (debounce in progress)
  const activeId = activeIndex >= 0 ? results.all[activeIndex]?.id : undefined;
  const optionDomId = (id: string) => `${listId}-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const renderOption = (s: Suggestion<T>, index: number) => {
    const isActive = index === activeIndex;
    const common = {
      id: optionDomId(s.id),
      "data-option-id": s.id,
      role: "option" as const,
      "aria-selected": isActive,
      className: `search-suggest-option${isActive ? " is-active" : ""}`,
      // Keep focus in the input so the click isn't lost to a blur
      onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      onMouseMove: () => {
        if (activeIndex !== index) setActiveIndex(index);
      },
      onClick: () => select(s),
    };

    if (s.kind === "company") {
      return (
        <div key={s.id} {...common}>
          <span className="search-suggest-avatar" aria-hidden="true">
            {s.name.trim().charAt(0).toUpperCase() || "•"}
          </span>
          <span className="search-suggest-text">
            <span className="search-suggest-title">
              <Highlight text={s.name} query={query} />
            </span>
            <span className="search-suggest-meta">
              {s.count} decoration{s.count === 1 ? "" : "s"}
            </span>
          </span>
          <span className="search-suggest-hint" aria-hidden="true">
            Filter
          </span>
        </div>
      );
    }

    const src = s.item.images?.[0] ?? s.item.img;
    return (
      <div key={s.id} {...common}>
        <span className="search-suggest-thumb" aria-hidden="true">
          {src ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.visibility = "hidden";
              }}
            />
          ) : null}
        </span>
        <span className="search-suggest-text">
          <span className="search-suggest-title">
            <Highlight text={s.item.t} query={query} />
          </span>
          <span className="search-suggest-meta">
            {s.item.cat}
            {s.company ? ` · ${s.company}` : ""}
          </span>
        </span>
        {formatPrice && s.item.p > 0 ? (
          <span className="search-suggest-price">{formatPrice(s.item.p)}</span>
        ) : null}
      </div>
    );
  };

  let body: React.ReactNode;
  if (loading && catalog.length === 0) {
    body = <div className="search-suggest-status">Loading suggestions…</div>;
  } else if (!query || (pending && results.all.length === 0)) {
    body = <div className="search-suggest-status">Searching…</div>;
  } else if (results.all.length === 0) {
    body = (
      <div className="search-suggest-empty" role="status">
        <strong>No matches for “{query}”</strong>
        <span>Try a company name, decoration or category.</span>
      </div>
    );
  } else {
    body = (
      <>
        {results.companies.length > 0 && (
          <div role="group" aria-label="Companies">
            <div className="search-suggest-heading" role="presentation">
              Companies
            </div>
            {results.companies.map((s, i) => renderOption(s, i))}
          </div>
        )}
        {results.decorations.length > 0 && (
          <div role="group" aria-label="Decorations">
            <div className="search-suggest-heading" role="presentation">
              Decorations
            </div>
            {results.decorations.map((s, i) => renderOption(s, results.companies.length + i))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`search-autocomplete${open ? " is-open" : ""}`} ref={containerRef}>
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onClear={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        className={inputClassName}
        inputAriaProps={{
          role: "combobox",
          "aria-expanded": open,
          "aria-controls": listId,
          "aria-autocomplete": "list",
          "aria-activedescendant": open && activeId ? optionDomId(activeId) : undefined,
        }}
      />

      {mounted && (
        <>
          {/* Dims the page behind the panel on phones (hidden on desktop via CSS) */}
          <div
            className="search-suggest-backdrop"
            data-state={open ? "open" : "closed"}
            style={{ top: backdropTop }}
            aria-hidden="true"
          />
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Search suggestions"
            className={`search-suggest${moreBelow ? " has-more-below" : ""}`}
            data-state={open ? "open" : "closed"}
            style={maxHeight ? { maxHeight } : undefined}
            onScroll={updateScrollHint}
          >
            {body}
          </div>
        </>
      )}
    </div>
  );
}

/** Search box with a suggestions dropdown (companies + decorations). */
export const SearchAutocomplete = forwardRef(SearchAutocompleteInner) as <
  T extends SearchableDecoration,
>(
  props: SearchAutocompleteProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => ReturnType<typeof SearchAutocompleteInner>;
