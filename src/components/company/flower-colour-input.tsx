import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FlowerColourOption {
  name: string;
  hex?: string;
  gradient?: string;
  border?: boolean;
}

export const FLOWER_COLOUR_OPTIONS: FlowerColourOption[] = [
  { name: "Red", hex: "#DC2626" },
  { name: "Pink", hex: "#F472B6" },
  { name: "White", hex: "#FFFFFF", border: true },
  { name: "Ivory", hex: "#FFFFF0", border: true },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Peach", hex: "#FDBA74" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Lavender", hex: "#C084FC" },
  { name: "Magenta", hex: "#D946EF" },
  { name: "Maroon", hex: "#881337" },
  { name: "Burgundy", hex: "#722F37" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Cream", hex: "#FEF9C3", border: true },
  { name: "Green", hex: "#16A34A" },
  { name: "Brown", hex: "#78350F" },
  { name: "Black", hex: "#18181B" },
  {
    name: "Mixed / Multicolor",
    gradient:
      "conic-gradient(from 180deg at 50% 50%, #EC4899, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6, #EC4899)",
  },
];

export const PLATFORM_COLOUR_OPTIONS: FlowerColourOption[] = [
  { name: "White", hex: "#FFFFFF", border: true },
  { name: "Ivory", hex: "#FFFFF0", border: true },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Silver", hex: "#C0C0C0" },
  {
    name: "Mirror / Reflective",
    gradient:
      "linear-gradient(135deg, #E2E8F0 0%, #FFFFFF 25%, #94A3B8 50%, #FFFFFF 75%, #CBD5E1 100%)",
    border: true,
  },
  { name: "Red", hex: "#DC2626" },
  { name: "Pink", hex: "#F472B6" },
  { name: "Peach", hex: "#FDBA74" },
  { name: "Maroon", hex: "#881337" },
  { name: "Burgundy", hex: "#722F37" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Lavender", hex: "#C084FC" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#16A34A" },
  { name: "Cream", hex: "#FEF9C3", border: true },
  { name: "Brown", hex: "#78350F" },
  { name: "Black", hex: "#18181B" },
  {
    name: "Mixed / Multicolor",
    gradient:
      "conic-gradient(from 180deg at 50% 50%, #EC4899, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6, #EC4899)",
  },
];

export function getFlowerColourStyle(
  colourName: string,
  options?: FlowerColourOption[],
): {
  backgroundColor?: string;
  background?: string;
  borderColor: string;
} {
  if (!colourName) {
    return { backgroundColor: "#F472B6", borderColor: "rgba(0,0,0,0.15)" };
  }
  const trimmed = colourName.trim().toLowerCase();
  if (trimmed.startsWith("#")) {
    const isPale =
      trimmed === "#ffffff" ||
      trimmed === "#fff" ||
      trimmed === "#fef9c3" ||
      trimmed === "#fef08a" ||
      trimmed === "#fffff0";
    return {
      backgroundColor: colourName,
      borderColor: isPale ? "#CBD5E1" : "rgba(0,0,0,0.15)",
    };
  }

  const pool = options ? [...options, ...FLOWER_COLOUR_OPTIONS] : FLOWER_COLOUR_OPTIONS;

  const exactMatch = pool.find((c) => c.name.toLowerCase() === trimmed);
  if (exactMatch) {
    if (exactMatch.gradient) {
      return {
        background: exactMatch.gradient,
        borderColor: exactMatch.border ? "#CBD5E1" : "rgba(0,0,0,0.15)",
      };
    }
    return {
      backgroundColor: exactMatch.hex || "#F472B6",
      borderColor: exactMatch.border ? "#CBD5E1" : "rgba(0,0,0,0.15)",
    };
  }

  if (trimmed.includes("multi") || trimmed.includes("mix")) {
    return {
      background:
        "conic-gradient(from 180deg at 50% 50%, #EC4899, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6, #EC4899)",
      borderColor: "rgba(0,0,0,0.15)",
    };
  }
  if (trimmed.includes("mirror") || trimmed.includes("reflective")) {
    return {
      background:
        "linear-gradient(135deg, #E2E8F0 0%, #FFFFFF 25%, #94A3B8 50%, #FFFFFF 75%, #CBD5E1 100%)",
      borderColor: "#CBD5E1",
    };
  }
  if (trimmed.includes("gold")) {
    return { backgroundColor: "#D4AF37", borderColor: "rgba(0,0,0,0.15)" };
  }
  if (trimmed.includes("silver")) {
    return { backgroundColor: "#C0C0C0", borderColor: "rgba(0,0,0,0.15)" };
  }
  if (trimmed.includes("ivory")) {
    return { backgroundColor: "#FFFFF0", borderColor: "#CBD5E1" };
  }

  // Check if any predefined color name is part of the custom string (e.g. "Light Pink" -> Pink, "Dark Red" -> Red, "Baby Blue" -> Blue)
  const partialMatch = pool.find((c) => trimmed.includes(c.name.toLowerCase()));
  if (partialMatch) {
    if (partialMatch.gradient) {
      return {
        background: partialMatch.gradient,
        borderColor: partialMatch.border ? "#CBD5E1" : "rgba(0,0,0,0.15)",
      };
    }
    return {
      backgroundColor: partialMatch.hex || "#F472B6",
      borderColor: partialMatch.border ? "#CBD5E1" : "rgba(0,0,0,0.15)",
    };
  }
  return { backgroundColor: "#CBD5E1", borderColor: "#94A3B8" };
}

export interface FlowerColourInputProps {
  value: string;
  onChange: (value: string) => void;
  options?: FlowerColourOption[] | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  wrapperClassName?: string | undefined;
  id?: string | undefined;
  "aria-label"?: string | undefined;
}

export function FlowerColourInput({
  value,
  onChange,
  options = FLOWER_COLOUR_OPTIONS,
  placeholder = "Select or enter color",
  className,
  wrapperClassName,
  id,
  "aria-label": ariaLabel = "Toggle color list",
}: FlowerColourInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // When opening the dropdown without typing, show all available options so the user can easily view or change selection.
  // When the user actively types into the input, filter the options according to the query.
  const filtered = useMemo(() => {
    if (!isSearching) return options;
    const q = (value || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.name.toLowerCase().includes(q));
  }, [isSearching, value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const selectedIdx = options.findIndex(
        (item) => item.name.toLowerCase() === (value || "").trim().toLowerCase(),
      );
      if (selectedIdx >= 0) {
        setHighlightedIndex(selectedIdx);
      }
    } else {
      setHighlightedIndex(-1);
      setIsSearching(false);
    }
  }, [isOpen, options, value]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, highlightedIndex]);

  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    setIsOpen(false);
    setIsSearching(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsSearching(false);
        setIsOpen(true);
        const selectedIdx = options.findIndex(
          (item) => item.name.toLowerCase() === (value || "").trim().toLowerCase(),
        );
        setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]!.name);
      } else {
        // Accept the typed custom text
        setIsOpen(false);
        setIsSearching(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setIsSearching(false);
      setHighlightedIndex(-1);
    }
  };

  const hasValue = Boolean((value || "").trim());
  const swatchStyle = getFlowerColourStyle(value, options);

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      <div className="relative">
        {/* Dynamic color swatch on the left */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
          {hasValue ? (
            <span
              className="size-4 rounded-full border shadow-2xs transition-all shrink-0"
              style={swatchStyle}
            />
          ) : (
            <span className="size-4 rounded-full border border-dashed border-slate-300 bg-slate-100 shrink-0" />
          )}
        </div>

        {/* Searchable + Editable Input */}
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value ?? ""}
          onChange={(e) => {
            onChange(e.target.value);
            setIsSearching(true);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsSearching(false);
            setIsOpen(true);
          }}
          onClick={() => {
            setIsSearching(false);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-11 sm:h-12 pl-9.5 pr-8 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]",
            className,
          )}
          autoComplete="off"
        />

        {/* Toggle chevron button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                setIsSearching(false);
              }
              return next;
            });
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label={ariaLabel}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              isOpen && "rotate-180 text-slate-600",
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg scrollbar-thin"
        >
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isHighlighted = highlightedIndex === idx;
              const isExactMatch = value.trim().toLowerCase() === item.name.toLowerCase();
              const itemSwatchStyle = item.gradient
                ? { background: item.gradient, borderColor: "rgba(0,0,0,0.15)" }
                : {
                    backgroundColor: item.hex,
                    borderColor: item.border ? "#CBD5E1" : "rgba(0,0,0,0.15)",
                  };
              return (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={isExactMatch}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item.name);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
                    isHighlighted
                      ? "bg-[#FFF5F7] text-[#E8546F] font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3.5 rounded-full border shadow-2xs shrink-0"
                      style={itemSwatchStyle}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isExactMatch && <Check className="size-3.5 text-[#E8546F]" />}
                </button>
              );
            })
          ) : (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs rounded-lg bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100"
            >
              <span
                className="size-3.5 rounded-full border shadow-2xs shrink-0"
                style={swatchStyle}
              />
              <span className="truncate">
                Custom color: <span className="font-semibold">&quot;{value.trim()}&quot;</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface PlatformColourInputProps {
  value: string;
  onChange: (value: string) => void;
  options?: FlowerColourOption[] | undefined;
  suggestions?: readonly string[] | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  wrapperClassName?: string | undefined;
  id?: string | undefined;
}

export function PlatformColourInput({
  value,
  onChange,
  options = PLATFORM_COLOUR_OPTIONS,
  placeholder = "Select or add colour",
  className,
  wrapperClassName,
  id = "platform-colour",
}: PlatformColourInputProps) {
  return (
    <FlowerColourInput
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      wrapperClassName={wrapperClassName}
      aria-label="Toggle platform colour list"
    />
  );
}
