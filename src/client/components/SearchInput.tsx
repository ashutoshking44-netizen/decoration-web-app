import React, { forwardRef } from "react";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  ariaLabel?: string | undefined;
  id?: string;
  className?: string | undefined;
  autoFocus?: boolean;
  onClear?: () => void;
  /** Runs before the built-in key handling; call e.preventDefault() to skip it. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Extra ARIA attributes for the <input> (e.g. combobox wiring for autocomplete). */
  inputAriaProps?: React.AriaAttributes & { role?: React.AriaRole };
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "Search decorations, companies, or categories...",
      ariaLabel = "Search decorations, companies, or categories",
      id,
      className = "",
      autoFocus = false,
      onClear,
      onKeyDown,
      onFocus,
      inputAriaProps,
    },
    ref,
  ) => {
    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    return (
      <div className={`search-input-wrapper ${className}`.trim()} role="search">
        <svg
          className="search-input-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={ref}
          type="search"
          id={id}
          className="search-input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          {...inputAriaProps}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            if (e.key === "Escape") {
              handleClear();
            } else if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
        />

        {value ? (
          <button
            type="button"
            className="search-input-clear"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
