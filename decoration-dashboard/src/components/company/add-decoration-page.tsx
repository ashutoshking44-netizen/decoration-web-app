import { useState, useRef, useEffect, useMemo, type ChangeEvent, type DragEvent } from "react";
import { usePhotographerGallery, type GalleryPhoto } from "@/lib/photographer-gallery";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  X,
  Plus,
  Minus,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  FolderOpen,
  Sparkles,
  Lightbulb,
  PenLine,
  Layers,
  Armchair,
  RefreshCw,
  Flower2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useDecorationSetupsStore,
  type DecorationCategory,
  type DecorationSetupItem,
  MANDAP_PLATFORM_OPTIONS,
  PLATFORM_SHAPES,
  PLATFORM_COLOURS,
  compressImage,
} from "@/lib/decoration-setups";
import {
  FlowerColourInput,
  PlatformColourInput,
  FLOWER_COLOUR_OPTIONS,
  PLATFORM_COLOUR_OPTIONS,
  type FlowerColourOption,
  type FlowerColourInputProps,
  type PlatformColourInputProps,
  getFlowerColourStyle,
} from "./flower-colour-input";

const FLOW_STEPS = [
  { number: 1, title: "Upload Photo" },
  { number: 2, title: "Basic Details" },
  { number: 3, title: "Setup Details" },
] as const;

interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
  size: string;
}

interface FlowerItemRow {
  id: string;
  name: string;
  color?: string;
  type: "Natural" | "Artificial" | "Mixed";
}

export type LightingUnit = "piece" | "box" | "set" | "meter";

interface LightItemRow {
  id: string;
  type: string;
  quantity: number;
  unit: LightingUnit;
}

const CATEGORY_OPTIONS: DecorationCategory[] = [
  "Stage",
  "Mandap",
  "Entrance Gate",
  "Backdrop",
  "Welcome Board",
];

const EVENT_TYPE_OPTIONS = [
  "Bachelorette",
  "Couple Shoot",
  "Engagement",
  "Haldi",
  "Kasar",
  "Matkor",
  "Mehndi",
  "Miscellaneous",
  "Pooja",
  "Reception",
  "Sangeet",
  "Wedding",
] as const;

export const LIGHT_TYPE_SUGGESTIONS = [
  "Warm Spotlights",
  "LED Par Lights",
  "Fairy / String Lights",
  "Chandeliers",
  "Hanging Pendant Lights",
  "Uplights",
  "Neon Sign / Neon Flex",
  "Flood Lights",
  "Lanterns",
  "Candle / LED Candles",
] as const;

// ─── Main Structure Options by Category (Single-Select) ───
export const MAIN_STRUCTURE_OPTIONS_BY_CATEGORY: Record<DecorationCategory, string[]> = {
  Mandap: [
    "4-Pillar",
    "6-Pillar",
    "Round",
    "Dome",
    "Canopy",
    "Open Frame",
    "Custom",
  ],
  Stage: [
    "Raised Platform",
    "Multi-tier Platform",
    "Truss Frame",
    "Arch Frame",
    "Freestanding Back Wall",
    "Custom",
  ],
  "Entrance Gate": [
    "Rectangular Frame",
    "Arch",
    "Circular Ring",
    "Truss Gate",
    "Pillar Gate",
    "Custom",
  ],
  Backdrop: [
    "Pipe & Drape",
    "Solid Panel Wall",
    "Floral / Greenery Wall",
    "Circular Frame",
    "Arch Frame",
    "LED / Screen Wall",
    "Custom",
  ],
  "Welcome Board": [
    "Easel",
    "Freestanding Sign Stand",
    "Mirror Frame",
    "Acrylic Stand",
    "Wooden Frame",
    "Custom",
  ],
};

// ─── Setup Style Options by Category (Multi-Select) ───
export const SETUP_STYLE_OPTIONS_BY_CATEGORY: Record<DecorationCategory, string[]> = {
  Mandap: [
    "Traditional",
    "Floral",
    "Royal",
    "Minimal",
    "Boho",
    "Contemporary",
    "Custom",
  ],
  Stage: [
    "Floral",
    "Draped",
    "Royal",
    "Minimal",
    "LED",
    "Themed",
    "Custom",
  ],
  "Entrance Gate": [
    "Floral",
    "Draped",
    "Royal",
    "Rustic",
    "Minimal",
    "Themed",
    "Custom",
  ],
  Backdrop: [
    "Floral",
    "Draped",
    "Sequin",
    "Neon",
    "Minimal",
    "Themed",
    "Custom",
  ],
  "Welcome Board": [
    "Floral",
    "Minimal",
    "Rustic",
    "Royal",
    "Modern",
    "Custom",
  ],
};

const FURNITURE_SUGGESTIONS = [
  "Sofa",
  "Chair",
  "Table",
  "Stool",
  "Swing",
  "Pedestal",
];

const DECOR_LIBRARY_PRESETS = [
  {
    id: "lib-1",
    title: "Grand Royal Mughal Stage Setup",
    category: "Stage" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80",
    tag: "Royal Stage",
  },
  {
    id: "lib-2",
    title: "Royal Mughal Floral Gateway",
    category: "Entrance Gate" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1000&auto=format&fit=crop&q=80",
    tag: "Arch & Truss",
  },
  {
    id: "lib-3",
    title: "Sacred Pastel Botanical Mandap",
    category: "Mandap" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1000&auto=format&fit=crop&q=80",
    tag: "Traditional Stage",
  },
  {
    id: "lib-4",
    title: "Luxury Gold Mirror Welcome Sign",
    category: "Welcome Board" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&auto=format&fit=crop&q=80",
    tag: "Acrylic & Easel",
  },
  {
    id: "lib-5",
    title: "Shimmer Sequin & Neon Luxe Backdrop",
    category: "Backdrop" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000&auto=format&fit=crop&q=80",
    tag: "Stage & Photobooth",
  },
  {
    id: "lib-6",
    title: "Frosted Acrylic Board on Brass Stand",
    category: "Welcome Board" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1000&auto=format&fit=crop&q=80",
    tag: "Modern Calligraphy",
  },
  {
    id: "lib-7",
    title: "Royal 6-Pillar Dome Mandap Set",
    category: "Mandap" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&auto=format&fit=crop&q=80",
    tag: "Grand Wedding",
  },
  {
    id: "lib-8",
    title: "Warm Fairy Light Waterfall Drape",
    category: "Backdrop" as DecorationCategory,
    url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1000&auto=format&fit=crop&q=80",
    tag: "LED Lighting",
  },
];

export const FLOWER_NAME_SUGGESTIONS = [
  "Rose",
  "Marigold",
  "Carnation",
  "Orchid",
  "Lily",
  "Tulip",
  "Baby’s Breath",
  "Jasmine",
  "Hydrangea",
  "Lotus",
  "Chrysanthemum",
  "Sunflower",
  "Daisy",
  "Peony",
  "Gypsophila",
  "Anemone",
  "Dahlia",
  "Ranunculus",
];

interface FlowerAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[] | readonly string[];
  placeholder?: string;
  className?: string;
}

function FlowerAutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: FlowerAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!isSearching) return suggestions;
    const q = (value || "").trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((item) => item.toLowerCase().includes(q));
  }, [isSearching, value, suggestions]);

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
      const selectedIdx = suggestions.findIndex(
        (item) => item.toLowerCase() === (value || "").trim().toLowerCase(),
      );
      if (selectedIdx >= 0) {
        setHighlightedIndex(selectedIdx);
      }
    } else {
      setHighlightedIndex(-1);
      setIsSearching(false);
    }
  }, [isOpen, suggestions, value]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, highlightedIndex]);

  const handleSelect = (selectedItem: string) => {
    onChange(selectedItem);
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
        const selectedIdx = suggestions.findIndex(
          (item) => item.toLowerCase() === (value || "").trim().toLowerCase(),
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
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[highlightedIndex]!);
      } else {
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

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        value={value}
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
        className={className}
        autoComplete="off"
      />

      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg scrollbar-thin"
        >
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isHighlighted = highlightedIndex === idx;
              const isExactMatch = value.trim().toLowerCase() === item.toLowerCase();
              return (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
                    isHighlighted
                      ? "bg-[#FFF5F7] text-[#E8546F] font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{item}</span>
                  {isExactMatch && <Check className="size-3.5 text-[#E8546F]" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[11px] text-slate-400 italic">
              Custom: &quot;{value}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Flower & Platform Colour Inputs (Reusable Components) ───
export {
  FlowerColourInput,
  PlatformColourInput,
  FLOWER_COLOUR_OPTIONS,
  PLATFORM_COLOUR_OPTIONS,
  type FlowerColourOption,
  type FlowerColourInputProps,
  type PlatformColourInputProps,
  getFlowerColourStyle,
};

// ─── Platform Shape Line Icons ───
const SHAPE_ICONS: Record<string, React.ReactNode> = {
  Square: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
    </svg>
  ),
  Rectangle: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="4" width="13" height="8" rx="1.5" />
    </svg>
  ),
  Circle: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  ),
  "Semi-circle": (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 10.5h11a5.5 5.5 0 0 0-11 0z" />
    </svg>
  ),
  Oval: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="8" cy="8" rx="6" ry="4" />
    </svg>
  ),
  Hexagon: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="8,2 14,5.5 14,11.5 8,15 2,11.5 2,5.5" />
    </svg>
  ),
  Custom: (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    </svg>
  ),
};

export interface FormYesNoToggleProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function FormYesNoToggle({
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  className,
  disabled = false,
}: FormYesNoToggleProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {([true, false] as const).map((val) => {
        const label = val ? yesLabel : noLabel;
        const isSelected = value === val;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(val)}
            className={cn(
              "flex h-10 min-w-[72px] items-center justify-center rounded-xl px-5 text-xs font-semibold transition-all cursor-pointer",
              isSelected
                ? "border border-[#E8546F] bg-[#FFF5F7] text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export interface AddDecorationPageProps {
  /** When provided, pre-populates the form for editing an existing setup. */
  initialSetup?: DecorationSetupItem | undefined;
  /** Return destination path when saved or closed (defaults to ?from= query param or '/inventory') */
  from?: string | undefined;
  /** Initial step to start on (e.g. 2 for Basic Details when editing) */
  initialStep?: 1 | 2 | 3 | undefined;
  /** When true, renders inside a modal overlay instead of full-page */
  asModal?: boolean | undefined;
  /** Controlled open state for modal mode */
  open?: boolean | undefined;
  /** Controlled open state handler for modal mode */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Callback on setup created or updated (receives the created setup item) */
  onSetupCreated?: ((setup: DecorationSetupItem) => void) | undefined;
  /** Optional onClose handler */
  onClose?: (() => void) | undefined;
  /** Start a NEW setup from this photo (e.g. a client's reference photo): it is loaded as the cover photo and the wizard opens on Basic Details. */
  initialPhotoUrl?: string | undefined;
  /** Suggested name / category / applicable events when starting from a photo. */
  initialName?: string | undefined;
  initialCategory?: DecorationCategory | undefined;
  initialEvents?: string[] | undefined;
}

export function AddDecorationPage({
  initialSetup,
  from,
  initialStep,
  asModal = false,
  open = true,
  onOpenChange,
  onSetupCreated,
  onClose,
  initialPhotoUrl,
  initialName,
  initialCategory,
  initialEvents,
}: AddDecorationPageProps = {}) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const { addSetup, updateSetup } = useDecorationSetupsStore();

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (rightColumnRef.current) {
      rightColumnRef.current.scrollTop = 0;
    }
  };

  const getReturnPath = () => {
    if (from) return from;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryFrom = searchParams.get("from");
      if (queryFrom) return queryFrom;
    }
    return "/inventory";
  };

  // ─── 3-Step Flow ───
  // 1: Upload Photo, 2: Basic Details, 3: Setup Details
  const [step, setStep] = useState<1 | 2 | 3>(
    () => initialStep ?? (initialSetup || initialPhotoUrl ? 2 : 1),
  );

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    } else if (initialSetup && step === 1) {
      setStep(2);
    }
  }, [initialStep, initialSetup]);

  // Ensure view resets to top whenever step changes (e.g. Step 2 -> Step 3)
  useEffect(() => {
    scrollToTop();
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
    });
    return () => cancelAnimationFrame(rafId);
  }, [step]);

  // Photos state
  const [photos, setPhotos] = useState<UploadedPhoto[]>(() => {
    if (initialSetup?.imageUrl) {
      const all =
        initialSetup.gallery && initialSetup.gallery.length > 0
          ? initialSetup.gallery
          : [initialSetup.imageUrl];
      return all.map((url, idx) => ({
        id: `photo-${idx}`,
        url,
        name: `Photo ${idx + 1}`,
        size: "1.2 MB",
      }));
    }
    if (initialPhotoUrl) {
      return [
        { id: "photo-client-ref", url: initialPhotoUrl, name: "Client reference photo", size: "Client reference" },
      ];
    }
    return [];
  });

  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const photographerGallery = usePhotographerGallery();
  const [isReplacingMode, setIsReplacingMode] = useState(false);

  // ─── Step 2 Fields: Basic Details ───
  const [category, setCategory] = useState<DecorationCategory | null>(
    initialSetup?.category || initialCategory || null,
  );

  const [decorName, setDecorName] = useState(initialSetup?.name || initialName || "");

  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(
    initialSetup?.applicable_events || initialEvents || [],
  );

  // Card 4: Main Structure (Single-Select)
  const [mainStructure, setMainStructure] = useState<string>(() => {
    if (initialSetup?.specifications?.main_structure) {
      return initialSetup.specifications.main_structure;
    }
    if (initialSetup?.specifications?.structure_type) {
      const cat = initialSetup.category;
      if (cat) {
        const catOpts = MAIN_STRUCTURE_OPTIONS_BY_CATEGORY[cat] || [];
        const match = catOpts.find((opt) =>
          initialSetup.specifications?.structure_type?.includes(opt)
        );
        if (match) return match;
      }
    }
    return "";
  });
  const [customStructureInput, setCustomStructureInput] = useState<string>(
    initialSetup?.specifications?.custom_main_structure ||
      initialSetup?.specifications?.custom_structure_type ||
      ""
  );

  // Card 5: Setup Style (Multi-Select)
  const [setupStyles, setSetupStyles] = useState<string[]>(() => {
    if (initialSetup?.specifications?.setup_styles) {
      return initialSetup.specifications.setup_styles;
    }
    return [];
  });
  const [customSetupStyleInput, setCustomSetupStyleInput] = useState<string>(
    initialSetup?.specifications?.custom_setup_style || ""
  );

  // Reset to clean state if initialSetup is not provided
  useEffect(() => {
    if (!initialSetup) {
      setCategory(null);
      setDecorName("");
      setSelectedEventTypes([]);
      setMainStructure("");
      setCustomStructureInput("");
      setSetupStyles([]);
      setCustomSetupStyleInput("");
      setDescription("");
      setFloralTag("with_flowers");
      setFlowersUsed(true);
      setWidthFt("16");
      setHeightFt("12");
      setBaseDecorationPrice("");
    }
  }, [initialSetup]);

  // Handle category change: update options immediately and clear incompatible selections
  const handleCategoryChange = (newCat: DecorationCategory) => {
    setCategory(newCat);
    const validStructures = MAIN_STRUCTURE_OPTIONS_BY_CATEGORY[newCat] || [];
    if (!validStructures.includes(mainStructure)) {
      setMainStructure("");
      setCustomStructureInput("");
    }
    const validStyles = SETUP_STYLE_OPTIONS_BY_CATEGORY[newCat] || [];
    setSetupStyles((prev) => prev.filter((style) => validStyles.includes(style)));
    if (!validStyles.includes("Custom")) {
      setCustomSetupStyleInput("");
    }
  };

  const handleToggleSetupStyle = (style: string) => {
    setSetupStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  // ─── Step 3 Fields: Setup Details ───
  const [widthFt, setWidthFt] = useState(
    initialSetup?.specifications?.dimensions?.width_ft
      ? String(initialSetup.specifications.dimensions.width_ft)
      : "16",
  );
  const [heightFt, setHeightFt] = useState(
    initialSetup?.specifications?.dimensions?.height_ft
      ? String(initialSetup.specifications.dimensions.height_ft)
      : "12",
  );

  const [description, setDescription] = useState<string>(() => {
    return initialSetup?.description || "";
  });

  const [floralTag, setFloralTag] = useState<"with_flowers" | "structure_only">(() => {
    const rawTag = (initialSetup as any)?.floralTag || (initialSetup?.specifications as any)?.floral_tag;
    if (rawTag === "structure_only" || rawTag === "with_flowers") return rawTag;
    if (initialSetup?.specifications?.flowers_used === false) return "structure_only";
    return "with_flowers";
  });

  const [flowersUsed, setFlowersUsed] = useState<boolean | null>(() => {
    if (initialSetup?.specifications?.flowers_used !== undefined) {
      return initialSetup.specifications.flowers_used;
    }
    return true;
  });

  const [flowerRows, setFlowerRows] = useState<FlowerItemRow[]>(() => {
    if (
      initialSetup?.specifications?.flowers &&
      initialSetup.specifications.flowers.length > 0
    ) {
      return initialSetup.specifications.flowers.map((f, i) => ({
        id: `flw-${i}`,
        name: f.name,
        color: f.colour || "Pink",
        type:
          f.type === "artificial"
            ? "Artificial"
            : f.type === "mixed"
              ? "Mixed"
              : "Natural",
      }));
    }
    return [{ id: "flw-1", name: "Rose", color: "Pink", type: "Natural" }];
  });

  const [platformUsed, setPlatformUsed] = useState<boolean | null>(() => {
    if (initialSetup?.specifications?.mandap_platform_used !== undefined) {
      return initialSetup.specifications.mandap_platform_used;
    }
    if (initialSetup?.specifications?.platforms_used !== undefined) {
      return initialSetup.specifications.platforms_used;
    }
    return null;
  });
  const [mandapPlatformType, setMandapPlatformType] = useState<string>(() => {
    if (initialSetup?.specifications?.mandap_platform_type) {
      return initialSetup.specifications.mandap_platform_type;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.type) {
      const existing = initialSetup.specifications.platforms[0].type;
      if ((MANDAP_PLATFORM_OPTIONS as readonly string[]).includes(existing)) {
        return existing;
      }
      return "Custom";
    }
    return "Raised Wooden Deck";
  });
  const [customMandapPlatformInput, setCustomMandapPlatformInput] = useState<string>(() => {
    if (initialSetup?.specifications?.platforms?.[0]?.custom_type) {
      return initialSetup.specifications.platforms[0].custom_type;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.type) {
      const existing = initialSetup.specifications.platforms[0].type;
      if (!(MANDAP_PLATFORM_OPTIONS as readonly string[]).includes(existing)) {
        return existing;
      }
    }
    return "";
  });

  const [platformShape, setPlatformShape] = useState<string>(() => {
    if (initialSetup?.specifications?.platform_shape) {
      return initialSetup.specifications.platform_shape;
    }
    if (initialSetup?.specifications?.mandap_platform_shape) {
      return initialSetup.specifications.mandap_platform_shape;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.shape) {
      const existing = initialSetup.specifications.platforms[0].shape;
      if ((PLATFORM_SHAPES as readonly string[]).includes(existing)) {
        return existing;
      }
      return "Custom";
    }
    return "Square";
  });
  const [customPlatformShape, setCustomPlatformShape] = useState<string>(() => {
    if (initialSetup?.specifications?.custom_platform_shape) {
      return initialSetup.specifications.custom_platform_shape;
    }
    if (initialSetup?.specifications?.custom_mandap_platform_shape) {
      return initialSetup.specifications.custom_mandap_platform_shape;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.custom_shape) {
      return initialSetup.specifications.platforms[0].custom_shape;
    }
    return "";
  });


  const [platformColour, setPlatformColour] = useState<string>(() => {
    // If a custom colour was stored, load it directly (the autocomplete handles free-text)
    if (initialSetup?.specifications?.custom_platform_colour) {
      return initialSetup.specifications.custom_platform_colour;
    }
    if (initialSetup?.specifications?.custom_mandap_platform_colour) {
      return initialSetup.specifications.custom_mandap_platform_colour;
    }
    if (initialSetup?.specifications?.platform_colour) {
      return initialSetup.specifications.platform_colour;
    }
    if (initialSetup?.specifications?.mandap_platform_colour) {
      return initialSetup.specifications.mandap_platform_colour;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.custom_colour) {
      return initialSetup.specifications.platforms[0].custom_colour;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.colour) {
      return initialSetup.specifications.platforms[0].colour;
    }
    if (initialSetup?.specifications?.platforms?.[0]?.flex_colour) {
      return initialSetup.specifications.platforms[0].flex_colour;
    }
    return "";
  });

  const [platformHeight, setPlatformHeight] = useState<string>(() => {
    if (initialSetup?.specifications?.platform_height !== undefined) {
      return String(initialSetup.specifications.platform_height);
    }
    if (initialSetup?.specifications?.mandap_platform_height !== undefined) {
      return String(initialSetup.specifications.mandap_platform_height);
    }
    if (initialSetup?.specifications?.platforms?.[0]?.height_ft !== undefined) {
      return String(initialSetup.specifications.platforms[0].height_ft);
    }
    return "";
  });
  const [platformPrice, setPlatformPrice] = useState(
    initialSetup?.specifications?.platform_price !== undefined
      ? String(initialSetup.specifications.platform_price)
      : initialSetup?.specifications?.mandap_platform_price !== undefined
        ? String(initialSetup.specifications.mandap_platform_price)
        : initialSetup?.specifications?.platforms?.[0]?.price !== undefined
          ? String(initialSetup.specifications.platforms[0].price)
          : "",
  );
  const [isPlatformConfirmed, setIsPlatformConfirmed] = useState<boolean>(() => {
    return !!initialSetup?.specifications?.platform_confirmed;
  });
  const [confirmedPlatformPrice, setConfirmedPlatformPrice] = useState<string>(() => {
    if (initialSetup?.specifications?.platform_price !== undefined) {
      return String(initialSetup.specifications.platform_price);
    }
    if (initialSetup?.specifications?.mandap_platform_price !== undefined) {
      return String(initialSetup.specifications.mandap_platform_price);
    }
    if (initialSetup?.specifications?.platforms?.[0]?.price !== undefined) {
      return String(initialSetup.specifications.platforms[0].price);
    }
    return "";
  });
  const [platformCommitted, setPlatformCommitted] = useState(
    initialSetup?.specifications?.platform_price ||
      initialSetup?.specifications?.mandap_platform_price ||
      initialSetup?.specifications?.platforms?.[0]?.price ||
      0,
  );
  const [platformStatus, setPlatformStatus] = useState<"idle" | "set" | "invalid">("idle");

  const [lightsUsed, setLightsUsed] = useState<boolean | null>(() => {
    if (initialSetup?.specifications?.lighting_used !== undefined) {
      return initialSetup.specifications.lighting_used;
    }
    return null;
  });

  const [isLightingConfirmed, setIsLightingConfirmed] = useState<boolean>(() => {
    return !!initialSetup?.specifications?.lighting_confirmed;
  });

  const [confirmedLightingPrice, setConfirmedLightingPrice] = useState<string>(() => {
    if (initialSetup?.specifications?.overall_lighting_price !== undefined) {
      return String(initialSetup.specifications.overall_lighting_price);
    }
    if (initialSetup?.specifications?.overall_lighting_cost !== undefined) {
      return String(initialSetup.specifications.overall_lighting_cost);
    }
    return "";
  });

  const [overallLightingPriceInput, setOverallLightingPriceInput] = useState<string>(() => {
    if (initialSetup?.specifications?.overall_lighting_price !== undefined) {
      return String(initialSetup.specifications.overall_lighting_price);
    }
    if (initialSetup?.specifications?.overall_lighting_cost !== undefined) {
      return String(initialSetup.specifications.overall_lighting_cost);
    }
    return "";
  });

  const [lightRows, setLightRows] = useState<LightItemRow[]>(() => {
    if (
      initialSetup?.specifications?.lighting &&
      initialSetup.specifications.lighting.length > 0
    ) {
      return initialSetup.specifications.lighting.map((l, i) => ({
        id: l.id || `light-${i + 1}`,
        type: l.type || "Warm Spotlights",
        quantity: Math.max(1, Number(l.quantity) || 1),
        unit: (l.unit as LightingUnit) || "piece",
      }));
    }
    return [{ id: "light-1", type: "Warm Spotlights", quantity: 1, unit: "piece" }];
  });

  const totalLightingCost = useMemo(() => {
    if (!lightsUsed) return 0;
    return Number(confirmedLightingPrice || overallLightingPriceInput) || 0;
  }, [lightsUsed, confirmedLightingPrice, overallLightingPriceInput]);

  const [furnitureUsed, setFurnitureUsed] = useState<boolean>(() => {
    if (initialSetup?.specifications?.furniture_used !== undefined) {
      return initialSetup.specifications.furniture_used;
    }
    return Boolean(
      initialSetup?.specifications?.furniture_details ||
      (initialSetup?.specifications?.furniture_price !== undefined && Number(initialSetup.specifications.furniture_price) > 0) ||
      initialSetup?.specifications?.furniture_confirmed
    );
  });
  const [furnitureDetails, setFurnitureDetails] = useState<string>(() => {
    return initialSetup?.specifications?.furniture_details || "";
  });
  const [furniturePrice, setFurniturePrice] = useState<string>(() => {
    return initialSetup?.specifications?.furniture_price !== undefined
      ? String(initialSetup.specifications.furniture_price)
      : "";
  });
  const [isFurnitureConfirmed, setIsFurnitureConfirmed] = useState<boolean>(() => {
    return !!initialSetup?.specifications?.furniture_confirmed;
  });

  const handleToggleFurnitureSuggestion = (sug: string) => {
    setFurnitureDetails((prev) => {
      if (!prev.trim()) {
        return sug;
      }
      const items = prev.split(",").map((s) => s.trim()).filter(Boolean);
      const exists = items.some((item) => item.toLowerCase() === sug.toLowerCase());
      if (exists) {
        const filtered = items.filter((item) => item.toLowerCase() !== sug.toLowerCase());
        return filtered.join(", ");
      } else {
        return [...items, sug].join(", ");
      }
    });
  };

  // Optional Base / Starting Price for the decoration itself
  const [baseDecorationPrice, setBaseDecorationPrice] = useState<string>(() => {
    if (initialSetup?.specifications?.base_pricing_rate !== undefined && initialSetup.specifications.base_pricing_rate > 0) {
      return String(initialSetup.specifications.base_pricing_rate);
    }
    if (initialSetup?.total_price !== undefined && initialSetup.total_price > 0) {
      return String(initialSetup.total_price);
    }
    return "";
  });

  // Total Add-On Price (Sum of selected platform, lighting, and furniture add-ons)
  const [totalAddOnPrice, setTotalAddOnPrice] = useState<string>(() => {
    const platformCost = (initialSetup?.specifications?.platforms || []).reduce(
      (sum, p) => sum + (Number(p.price) || 0),
      0
    );
    const lightingCost =
      Number(initialSetup?.specifications?.overall_lighting_price) ||
      Number(initialSetup?.specifications?.overall_lighting_cost) ||
      0;
    const furnitureCost = Number(initialSetup?.specifications?.furniture_price) || 0;
    const sum = platformCost + lightingCost + furnitureCost;
    return sum > 0 ? String(sum) : "0";
  });

  // Automatically sum up the add-on prices (Platform, Lighting, Furniture)
  useEffect(() => {
    const platformCost = platformUsed ? (Number(confirmedPlatformPrice || platformPrice) || 0) : 0;
    const lightingCost = lightsUsed ? (Number(confirmedLightingPrice || overallLightingPriceInput) || 0) : 0;
    const furnitureCost = furnitureUsed ? (Number(furniturePrice) || 0) : 0;
    const sum = platformCost + lightingCost + furnitureCost;
    setTotalAddOnPrice(String(sum));
  }, [platformUsed, platformPrice, confirmedPlatformPrice, lightsUsed, confirmedLightingPrice, overallLightingPriceInput, furnitureUsed, furniturePrice]);

  const platformCost = platformUsed ? (Number(confirmedPlatformPrice || platformPrice) || 0) : 0;
  const lightingCost = lightsUsed ? (Number(confirmedLightingPrice || overallLightingPriceInput) || 0) : 0;
  const furnitureCost = furnitureUsed ? (Number(furniturePrice) || 0) : 0;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Multiple File Upload Handler ───
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const processFiles = async (files: File[]) => {
    const validImageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validImageFiles.length === 0) {
      toast.error("Please select valid image files (PNG, JPG, WebP)");
      return;
    }

    const readPromises = validImageFiles.map(async (file) => {
      const compressedUrl = await compressImage(file, 1200, 0.78);
      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        url: compressedUrl,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      };
    });

    const newPhotos = await Promise.all(readPromises);

    setPhotos((prev) => {
      const updated = [...newPhotos, ...prev];
      setActivePhotoIndex(0);
      return updated;
    });

    toast.success(
      `${newPhotos.length} photo${newPhotos.length > 1 ? "s" : ""} added!`,
    );
  };

  const handleSelectFromLibrary = (preset: typeof DECOR_LIBRARY_PRESETS[0]) => {
    const newPhoto: UploadedPhoto = {
      id: `lib-${Date.now()}`,
      url: preset.url,
      name: `${preset.title}.jpg`,
      size: "1.8 MB",
    };
    if (isReplacingMode) {
      setPhotos((prev) => {
        if (prev.length === 0) return [newPhoto];
        const updated = [...prev];
        const targetIdx =
          activePhotoIndex >= 0 && activePhotoIndex < prev.length
            ? activePhotoIndex
            : 0;
        updated[targetIdx] = newPhoto;
        return updated;
      });
      setIsReplacingMode(false);
      toast.success(`Photo replaced with "${preset.title}"`);
    } else {
      setPhotos((prev) => [newPhoto, ...prev]);
      setActivePhotoIndex(0);
      toast.success(`Added "${preset.title}" from library`);
    }
    setIsLibraryOpen(false);
  };

  const handleSelectFromGallery = (photo: GalleryPhoto) => {
    const label = photo.event || photo.photographer || "Photographer photo";
    const newPhoto: UploadedPhoto = {
      id: `pg-${Date.now()}`,
      url: photo.src,
      name: `${label}.jpg`,
      size: "",
    };
    if (isReplacingMode) {
      setPhotos((prev) => {
        if (prev.length === 0) return [newPhoto];
        const updated = [...prev];
        const targetIdx =
          activePhotoIndex >= 0 && activePhotoIndex < prev.length ? activePhotoIndex : 0;
        updated[targetIdx] = newPhoto;
        return updated;
      });
      setIsReplacingMode(false);
      toast.success("Photo replaced from the photographer gallery");
    } else {
      setPhotos((prev) => [newPhoto, ...prev]);
      setActivePhotoIndex(0);
      toast.success("Added from the photographer gallery");
    }
    setIsLibraryOpen(false);
  };

  const handleReplaceFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (PNG, JPG, WebP)");
        return;
      }
      try {
        const compressedUrl = await compressImage(file, 1200, 0.78);
        const replacedPhoto: UploadedPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          url: compressedUrl,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        };

        setPhotos((prev) => {
          if (prev.length === 0) {
            return [replacedPhoto];
          }
          const updated = [...prev];
          const targetIdx =
            activePhotoIndex >= 0 && activePhotoIndex < prev.length
              ? activePhotoIndex
              : 0;
          updated[targetIdx] = replacedPhoto;
          return updated;
        });

        toast.success("Photo replaced successfully!");
      } catch {
        toast.error("Failed to process the replacement image");
      }
    }
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const toggleEventType = (event: string) => {
    if (event === "All") {
      if (selectedEventTypes.length === EVENT_TYPE_OPTIONS.length) {
        setSelectedEventTypes([]);
      } else {
        setSelectedEventTypes([...EVENT_TYPE_OPTIONS]);
      }
      return;
    }
    setSelectedEventTypes((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  };

  const handleAddFlowerRow = () => {
    const newId = `flw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setFlowerRows((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        color: "Pink",
        type: "Natural",
      },
    ]);
  };

  const handleRemoveFlowerRow = (id: string) => {
    setFlowerRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUpdateFlowerRow = (
    id: string,
    field: keyof FlowerItemRow,
    value: string,
  ) => {
    setFlowerRows((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  };

  const handleAddLightRow = () => {
    const newId = `light-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setLightRows((prev) => [
      ...prev,
      {
        id: newId,
        type: "",
        quantity: 1,
        unit: "piece",
      },
    ]);
  };

  const handleRemoveLightRow = (id: string) => {
    setLightRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.id !== id);
    });
  };

  const handleUpdateLightType = (id: string, type: string) => {
    setLightRows((prev) =>
      prev.map((l) => (l.id === id ? { ...l, type } : l)),
    );
  };

  const handleUpdateLightQuantity = (id: string, delta: number) => {
    setLightRows((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const newQty = Math.max(1, (l.quantity || 1) + delta);
        return { ...l, quantity: newQty };
      }),
    );
  };

  const handleUpdateLightUnit = (id: string, unit: LightingUnit) => {
    setLightRows((prev) =>
      prev.map((l) => (l.id === id ? { ...l, unit } : l)),
    );
  };

  const handleConfirmPlatform = () => {
    if (!platformShape) {
      toast.error("Please select a platform shape.");
      return;
    }
    if (platformShape === "Custom" && !customPlatformShape.trim()) {
      toast.error("Please describe the custom platform shape.");
      return;
    }
    if (!platformColour.trim()) {
      toast.error("Please enter a platform colour.");
      return;
    }
    const val = Number(platformPrice);
    if (!platformPrice.trim() || isNaN(val) || val < 0) {
      toast.error("Please enter a valid platform price.");
      return;
    }
    setConfirmedPlatformPrice(platformPrice.trim());
    setIsPlatformConfirmed(true);
    toast.success("Platform details confirmed");
  };

  const handleConfirmLighting = () => {
    const val = Number(overallLightingPriceInput);
    if (!overallLightingPriceInput.trim() || isNaN(val) || val < 0) {
      toast.error("Please enter a valid overall lighting price.");
      return;
    }
    for (let i = 0; i < lightRows.length; i++) {
      if (!lightRows[i]?.type.trim()) {
        toast.error(`Please enter a light type for Light ${i + 1}.`);
        return;
      }
    }
    setConfirmedLightingPrice(overallLightingPriceInput.trim());
    setIsLightingConfirmed(true);
    toast.success("Lighting price confirmed");
  };

  const handleConfirmFurniture = () => {
    const val = Number(furniturePrice);
    if (furniturePrice.trim() && (isNaN(val) || val < 0)) {
      toast.error("Please enter a valid furniture price.");
      return;
    }
    setIsFurnitureConfirmed(true);
    toast.success("Furniture details confirmed");
  };

  const handleRemoveSpecificPhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(updated);
    if (updated.length === 0) {
      toast.info("Photo removed. You can upload or drop a new image below.");
      // Do NOT reset to Step 1! Maintain position in the edit flow (Step 2 / Basic Details)
    } else {
      setActivePhotoIndex((prev) =>
        prev >= updated.length ? updated.length - 1 : prev,
      );
      toast.success("Photo removed");
    }
  };

  // ─── Step 1 -> Step 2 ───
  const handleContinueToStep2 = () => {
    if (photos.length === 0) {
      toast.error("Please upload or choose at least one photo before continuing.");
      return;
    }
    setStep(2);
    scrollToTop();
  };

  // ─── Step 2 -> Step 3 ───
  const handleContinueToStep3 = () => {
    if (photos.length === 0) {
      toast.error("Please upload or choose a photo for this setup before continuing.");
      return;
    }
    if (!category) {
      toast.error("Please select a decoration category before continuing.");
      return;
    }
    if (!decorName.trim()) {
      toast.error("Please enter a decoration name before continuing.");
      return;
    }
    if (selectedEventTypes.length === 0) {
      toast.error("Please select at least one applicable event.");
      return;
    }
    if (!mainStructure) {
      toast.error("Please select what the main structure is.");
      return;
    }
    if (mainStructure === "Custom" && !customStructureInput.trim()) {
      toast.error("Please describe the custom structure.");
      return;
    }
    setStep(3);
    scrollToTop();
  };

  // ─── Step 3 -> Finish & Save All ───
  const handleFinishAndSave = () => {
    if (photos.length === 0) {
      toast.error("Please upload or choose a photo for this setup before saving.");
      return;
    }
    const w = Number(widthFt);
    const h = Number(heightFt);
    if (!widthFt || isNaN(w) || w <= 0 || !heightFt || isNaN(h) || h <= 0) {
      toast.error("Please enter valid width and height dimensions.");
      return;
    }

    if (flowersUsed === true) {
      if (flowerRows.length === 0 || flowerRows.some((f) => !f.name.trim())) {
        toast.error("Please enter names for all added flowers.");
        return;
      }
    }

    if (platformUsed === true) {
      if (!platformShape) {
        toast.error("Please select a platform shape.");
        return;
      }
      if (platformShape === "Custom" && !customPlatformShape.trim()) {
        toast.error("Please describe the custom platform shape.");
        return;
      }
      if (!platformColour.trim()) {
        toast.error("Please enter a platform colour.");
        return;
      }
      const pPrice = Number(confirmedPlatformPrice || platformPrice);
      if ((!confirmedPlatformPrice && !platformPrice.trim()) || isNaN(pPrice) || pPrice < 0) {
        toast.error("Please enter and confirm the platform price.");
        return;
      }
    }

    if (lightsUsed === true) {
      if (lightRows.length === 0) {
        toast.error("Please add at least one light.");
        return;
      }
      for (let i = 0; i < lightRows.length; i++) {
        const row = lightRows[i]!;
        if (!row.type.trim()) {
          toast.error(`Please enter a light type for Light ${i + 1}.`);
          return;
        }
      }
      const lightingPriceVal = Number(confirmedLightingPrice || overallLightingPriceInput);
      if (!confirmedLightingPrice && !overallLightingPriceInput.trim()) {
        toast.error("Please enter and confirm the overall lighting price.");
        return;
      }
      if (isNaN(lightingPriceVal) || lightingPriceVal < 0) {
        toast.error("Please enter a valid overall lighting price.");
        return;
      }
    }

    const parsedBasePrice = Number(baseDecorationPrice);
    if (!baseDecorationPrice.trim()) {
      toast.error("Please enter a base decoration price.");
      return;
    }
    if (isNaN(parsedBasePrice) || parsedBasePrice <= 0) {
      toast.error("Please enter a valid base decoration price.");
      return;
    }
    if (totalAddOnPrice.trim() && (isNaN(Number(totalAddOnPrice)) || Number(totalAddOnPrice) < 0)) {
      toast.error("Please enter a valid add-on price.");
      return;
    }

    const finalBasePrice = Number(baseDecorationPrice) || 0;
    const finalAddOnPrice = Number(totalAddOnPrice) || 0;
    const finalTotalPrice =
      (finalBasePrice + finalAddOnPrice) > 0
        ? finalBasePrice + finalAddOnPrice
        : (finalBasePrice || finalAddOnPrice || 45000);

    setIsSubmitting(true);
    const finalCategory: DecorationCategory = category || "Stage";
    const floralLabel = flowersUsed ? flowerRows[0]?.type || "Floral" : "Decorated";
    const finalName =
      decorName.trim() ||
      `${selectedEventTypes[0] || "Grand"} ${floralLabel} ${finalCategory} Setup`;
    const randomSku = `${finalCategory.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const primaryPhotoUrl =
      photos[0]?.url ||
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80";
    const allGalleryUrls = photos.map((p) => p.url);

    // Separately resolve structure and setup styles
    const finalMainStructure =
      mainStructure === "Custom"
        ? customStructureInput.trim() || "Custom Structure"
        : mainStructure;

    const finalSetupStyles = setupStyles.map((style) =>
      style === "Custom" && customSetupStyleInput.trim()
        ? customSetupStyleInput.trim()
        : style
    );

    const finalPlatformShape =
      platformShape === "Custom"
        ? customPlatformShape.trim() || "Custom Shape"
        : platformShape;

    // If the typed colour matches a known suggestion, use it as-is; otherwise it's a custom value
    const knownColours = (PLATFORM_COLOURS as readonly string[]).filter((c) => c !== "Custom");
    const isKnownColour = knownColours.some(
      (c) => c.toLowerCase() === platformColour.trim().toLowerCase(),
    );
    const finalPlatformColour = platformColour.trim() || "White";

    const pHeightNum =
      platformHeight && !isNaN(Number(platformHeight))
        ? Number(platformHeight)
        : undefined;

    const pPriceNum =
      (confirmedPlatformPrice || platformPrice) && !isNaN(Number(confirmedPlatformPrice || platformPrice))
        ? Number(confirmedPlatformPrice || platformPrice)
        : 0;

    const finalDescription =
      description.trim() ||
      `${finalMainStructure}${finalSetupStyles.length > 0 ? ` (${finalSetupStyles.join(", ")})` : ""}. Dimensions: ${widthFt} × ${heightFt} ft. Floral: ${floralTag === "with_flowers" ? "With Flowers" : "Structure Only"}. Platform: ${platformUsed ? `${finalPlatformShape} Platform (${finalPlatformColour})${pHeightNum ? `, ${pHeightNum}ft` : ""}` : "No"}. Lighting: ${lightsUsed ? (lightRows.length > 0 ? lightRows.map((l) => `${l.type || "Light"} (${l.quantity || 1} ${l.unit || "piece"})`).join(", ") : "Yes") : "No"}.`;

    const setupPayload = {
      name: finalName,
      sku: initialSetup?.sku || randomSku,
      category: finalCategory,
      imageUrl: primaryPhotoUrl,
      gallery: allGalleryUrls.length > 0 ? allGalleryUrls : [primaryPhotoUrl],
      description: finalDescription,
      applicable_events: selectedEventTypes,
      total_price: finalTotalPrice,
      floralTag: floralTag,
      specifications: {
        // Backwards compatible structure_type
        structure_type: finalMainStructure,
        // Separate stored fields
        main_structure: finalMainStructure,
        custom_main_structure: mainStructure === "Custom" ? customStructureInput.trim() : undefined,
        setup_styles: finalSetupStyles,
        custom_setup_style: setupStyles.includes("Custom") ? customSetupStyleInput.trim() : undefined,
        dimensions: {
          width_ft: Number(widthFt) || 16,
          height_ft: Number(heightFt) || 12,
        },
        base_pricing_rate: finalBasePrice > 0 ? finalBasePrice : undefined,
        total_addon_price: finalAddOnPrice,
        applicable_events: selectedEventTypes,
        floral_tag: floralTag,
        flowers_used: floralTag === "with_flowers",
        flowers: floralTag === "with_flowers"
          ? flowerRows.map((f) => ({
              name: f.name || "Flower",
              colour: f.color || "Pink",
              type: (f.type === "Artificial"
                ? "artificial"
                : f.type === "Mixed"
                  ? "mixed"
                  : "natural") as "artificial" | "mixed" | "natural",
            }))
          : [],
        platforms_used: platformUsed === true,
        platform_confirmed: platformUsed === true ? isPlatformConfirmed : false,
        platform_shape: platformUsed === true ? finalPlatformShape : undefined,
        custom_platform_shape:
          platformUsed === true && platformShape === "Custom"
            ? customPlatformShape.trim()
            : undefined,
        platform_colour: platformUsed === true ? finalPlatformColour : undefined,
        custom_platform_colour:
          platformUsed === true && !isKnownColour
            ? finalPlatformColour
            : undefined,
        platform_height: platformUsed === true ? pHeightNum : undefined,
        platform_price: platformUsed === true ? pPriceNum : undefined,

        // Backwards compatibility for mandap-specific fields
        mandap_platform_used: platformUsed === true,
        mandap_platform_shape: platformUsed === true ? finalPlatformShape : undefined,
        custom_mandap_platform_shape:
          platformUsed === true && platformShape === "Custom"
            ? customPlatformShape.trim()
            : undefined,
        mandap_platform_colour: platformUsed === true ? finalPlatformColour : undefined,
        custom_mandap_platform_colour:
          platformUsed === true && !isKnownColour
            ? finalPlatformColour
            : undefined,
        mandap_platform_height: platformUsed === true ? pHeightNum : undefined,
        mandap_platform_price: platformUsed === true ? pPriceNum : undefined,

        platforms: platformUsed === true
          ? [
              {
                id: "platform-1",
                type: `${finalPlatformShape} Platform`,
                size: {
                  width: Number(widthFt) || 16,
                  height: pHeightNum || 1,
                },
                flex_colour: finalPlatformColour,
                price: pPriceNum,
                height_ft: pHeightNum,
                shape: finalPlatformShape,
                custom_shape:
                  platformShape === "Custom"
                    ? customPlatformShape.trim()
                    : undefined,
                colour: finalPlatformColour,
                custom_colour: !isKnownColour ? finalPlatformColour : undefined,
              },
            ]
          : [],
        lighting_used: lightsUsed === true,
        lighting_confirmed: lightsUsed === true ? (isLightingConfirmed || !!confirmedLightingPrice) : false,
        overall_lighting_price: lightsUsed === true ? (Number(confirmedLightingPrice || overallLightingPriceInput) || 0) : undefined,
        overall_lighting_cost: lightsUsed === true ? (Number(confirmedLightingPrice || overallLightingPriceInput) || 0) : undefined,
        lighting: lightsUsed === true
          ? lightRows.map((r) => ({
              type: r.type.trim() || "Warm Spotlights",
              quantity: Math.max(1, Number(r.quantity) || 1),
              unit: (r.unit || "piece") as LightingUnit,
            }))
          : [],
        furniture_used: furnitureUsed === true,
        furniture_details: furnitureUsed ? (furnitureDetails.trim() || undefined) : undefined,
        furniture_price: (furnitureUsed && furniturePrice) ? (Number(furniturePrice) || undefined) : undefined,
        furniture_confirmed: furnitureUsed ? isFurnitureConfirmed : false,
      },
    };

    let savedItem: DecorationSetupItem;
    if (initialSetup?.id) {
      updateSetup(initialSetup.id, setupPayload);
      savedItem = { ...initialSetup, ...setupPayload } as DecorationSetupItem;
    } else {
      savedItem = addSetup(setupPayload);
    }

    if (asModal) {
      setIsSubmitting(false);
      toast.success(
        initialSetup?.id
          ? `"${finalName}" changes saved!`
          : `"${finalName}" saved to catalog!`
      );
      if (onSetupCreated) onSetupCreated(savedItem);
      if (onOpenChange) onOpenChange(false);
      if (onClose) onClose();
      return;
    }

    const returnPath = getReturnPath();
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(
        initialSetup?.id
          ? `"${finalName}" changes saved successfully!`
          : `"${finalName}" successfully added to your catalog!`
      );
      navigate({ to: returnPath as any });
    }, 400);
  };

  const handleClose = () => {
    if (asModal) {
      if (onClose) onClose();
      if (onOpenChange) onOpenChange(false);
      return;
    }
    const returnPath = getReturnPath();
    navigate({ to: returnPath as any });
  };

  const activePhoto = photos[activePhotoIndex] || photos[0];

  const currentMainStructureOptions = category
    ? MAIN_STRUCTURE_OPTIONS_BY_CATEGORY[category] || []
    : [];
  const currentSetupStyleOptions = category
    ? SETUP_STYLE_OPTIONS_BY_CATEGORY[category] || []
    : [];

  const content = (
    <div className={cn(
      "flex flex-col bg-[#FFFBFC] w-full",
      asModal ? "h-full max-h-full overflow-hidden flex-1" : "min-h-screen lg:h-screen lg:overflow-hidden"
    )}>
      {/* Hidden file input for uploading photos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden file input for replacing current photo */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      {/* ─── LIBRARY PRESET PICKER MODAL ─── */}
      <Dialog
        open={isLibraryOpen}
        onOpenChange={(open) => {
          setIsLibraryOpen(open);
          if (!open) setIsReplacingMode(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-[#E8546F]" />
              Choose from Photographer Gallery
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pick a photo your photographers sent to use as your setup image.
            </DialogDescription>
          </DialogHeader>

          {photographerGallery.photos.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
              <Camera className="mb-3 size-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No photographer photos yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Add photos in Decorations → Photographer Gallery and they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 pt-2 sm:grid-cols-3">
              {photographerGallery.photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handleSelectFromGallery(photo)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-all hover:border-[#E8546F] hover:shadow-md active:scale-98"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={photo.src}
                      alt={photo.event || "Photographer photo"}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="bg-white p-2.5">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {photo.photographer || "Unnamed photographer"}
                    </p>
                    {photo.event && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">{photo.event}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── TOP HEADER WITH WIDE 3-STEP HORIZONTAL PROGRESS BAR ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          {/* Left section: Exit Setup button (or title if modal) */}
          <div className="flex items-center min-w-0 w-24 sm:w-36 shrink-0">
            {asModal ? (
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-[#E8546F] shrink-0" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                  {initialSetup ? "Edit Setup" : "Upload Setup"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Exit Setup</span>
                <span className="sm:hidden">Exit</span>
              </button>
            )}
          </div>

          {/* Centered Wide Horizontal Progress Bar */}
          <div className="flex-1 max-w-2xl mx-auto overflow-x-auto scrollbar-none py-1">
            <div className="flex items-center justify-between w-full min-w-[290px] sm:min-w-[440px]">
              {FLOW_STEPS.map((s, idx) => {
                const isCompleted = s.number < step;
                const isCurrent = s.number === step;
                const isUpcoming = s.number > step;

                return (
                  <div key={s.number} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted || initialSetup) {
                          setStep(s.number as 1 | 2 | 3);
                          scrollToTop();
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 sm:gap-2.5 select-none transition-all outline-none text-left",
                        (isCompleted || initialSetup) ? "cursor-pointer group" : "cursor-default"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                          isCompleted && "bg-[#E8546F] text-white shadow-xs group-hover:bg-[#d64560]",
                          isCurrent && "bg-[#E8546F] text-white ring-4 ring-rose-100 shadow-[0_2px_10px_rgba(232,84,111,0.35)] scale-105",
                          isUpcoming && (initialSetup ? "bg-rose-50 border border-rose-200 text-[#E8546F] font-semibold" : "bg-slate-100 border border-slate-200 text-slate-400 font-medium")
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3.5 sm:size-4 stroke-[2.5]" />
                        ) : (
                          <span>{s.number}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-xs sm:text-[13px] transition-colors whitespace-nowrap",
                            isCompleted && "font-semibold text-slate-700 group-hover:text-[#E8546F]",
                            isCurrent && "font-bold text-[#E8546F]",
                            isUpcoming && "font-medium text-slate-400"
                          )}
                        >
                          <span className="hidden sm:inline">{s.title}</span>
                          <span className="sm:hidden">
                            {s.number === 1 ? "Photo" : s.number === 2 ? "Details" : "Setup"}
                          </span>
                        </span>
                      </div>
                    </button>

                    {idx < FLOW_STEPS.length - 1 && (
                      <div className="flex-1 mx-2 sm:mx-4 h-[2px] rounded-full overflow-hidden bg-slate-200 min-w-[20px]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out",
                            step > s.number ? "w-full bg-[#E8546F]" : "w-0"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Section: Photo count badge + Close button */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 min-w-0 w-28 sm:w-44 shrink-0">
            {photos.length > 0 && (
              <span className="hidden md:inline-flex rounded-full border border-rose-300/80 bg-rose-50/70 px-3 py-1 text-xs font-semibold text-[#E8546F] whitespace-nowrap">
                {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 active:scale-95 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className={cn(
        "flex-1 min-h-0 w-full overflow-hidden flex flex-col",
        asModal ? "h-full" : "px-4 py-6 sm:px-6 sm:py-8 lg:px-0 lg:py-0"
      )}>
        {step === 1 ? (
          /* ─────────────────────────────────────────────────────────────────
             STEP 1 — UPLOAD PHOTO
             - Drag-and-drop upload area
             - Click to upload
             - Choose from library
             - Image preview, remove, and replace actions
             - Continue button, enabled only after at least one photo is uploaded
             ───────────────────────────────────────────────────────────────── */
          <div className={cn(
            "mx-auto flex w-full flex-col justify-between",
            asModal
              ? "h-full min-h-0 max-w-4xl p-4 sm:p-6 lg:p-8 flex-1"
              : "min-h-[calc(100vh-180px)] max-w-3xl justify-center gap-5 py-4"
          )}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "group relative flex w-full flex-col rounded-[28px] sm:rounded-[36px] border-2 border-dashed bg-white transition-all duration-200 shadow-[0_8px_32px_rgba(232,84,111,0.03)]",
                asModal ? "flex-1 min-h-[380px] sm:min-h-[440px] justify-center" : "",
                isDragging
                  ? "border-[#E8546F] bg-rose-50/50 scale-[1.005]"
                  : "border-[#F6CBD3]"
              )}
            >
              {photos.length === 0 ? (
                /* Empty Upload Dropzone */
                <div className={cn(
                  "flex flex-col items-center justify-center text-center",
                  asModal ? "px-6 py-10 sm:px-12 sm:py-16 my-auto" : "px-6 py-14 sm:px-12 sm:py-20"
                )}>
                  <div className="mb-4 sm:mb-5 flex size-16 sm:size-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-rose-50 text-[#E8546F] shadow-sm">
                    <Camera className="size-8 sm:size-10 stroke-[1.8]" />
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Upload your decoration photo
                  </h1>

                  <p className="mt-2.5 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Drag and drop your photos here, browse from your files, or pick a high-resolution design from our library.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-11 gap-2 rounded-xl bg-[#E8546F] px-6 text-xs sm:text-sm font-semibold text-white shadow-[0_4px_16px_rgba(232,84,111,0.25)] hover:bg-[#D43F5B] active:scale-95 transition-all cursor-pointer"
                    >
                      <Upload className="size-4" />
                      Browse Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsLibraryOpen(true)}
                      className="h-11 gap-2 rounded-xl border-rose-200 bg-rose-50/60 px-5 text-xs sm:text-sm font-semibold text-[#E8546F] hover:bg-rose-100 hover:border-rose-300 active:scale-95 transition-all cursor-pointer"
                    >
                      <FolderOpen className="size-4" />
                      Choose from Photographer Gallery
                    </Button>
                  </div>

                  <p className="mt-4 text-[11px] font-medium text-slate-400">
                    Supports high-resolution JPG, PNG, WEBP up to 25MB each
                  </p>
                </div>
              ) : (
                /* Filled Gallery State with previews & actions */
                <div className={cn(
                  "flex flex-col gap-5",
                  asModal ? "h-full justify-between p-6 sm:p-8 flex-1" : "px-6 py-6 sm:px-8 sm:py-8"
                )}>
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-[#E8546F]">
                        <Camera className="size-5 stroke-[1.8]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {photos.length} photo{photos.length > 1 ? "s" : ""} selected
                        </p>
                        <p className="text-xs text-slate-500">
                          Click <strong>Continue</strong> to configure decoration details.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLibraryOpen(true)}
                      className="h-9 gap-1.5 rounded-xl border-rose-200 bg-rose-50/50 text-xs font-semibold text-[#E8546F] hover:bg-rose-100 cursor-pointer"
                    >
                      <FolderOpen className="size-3.5" />
                      Add from Gallery
                    </Button>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className={cn(
                    "grid grid-cols-3 gap-3 sm:grid-cols-4 overflow-y-auto pr-1 scrollbar-thin",
                    asModal ? "flex-1 max-h-[360px]" : "max-h-60"
                  )}>
                    {photos.map((p, idx) => (
                      <div
                        key={p.id}
                        className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs shrink-0"
                      >
                        <img
                          src={p.url}
                          alt={p.name}
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {idx === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-[#E8546F] px-2 py-0.5 text-[9px] font-bold text-white shadow">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecificPhoto(idx)}
                          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:text-rose-600 cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="size-3.5" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="truncate text-[9px] font-medium text-white">{p.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drop More or Browse Action Bar */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#F6CBD3] px-4 py-3 hover:border-[#E8546F] hover:bg-rose-50/40 transition-all"
                  >
                    <Upload className="size-4 text-[#E8546F]" />
                    <span className="text-xs font-semibold text-slate-600">
                      Drop more photos or <span className="text-[#E8546F] underline underline-offset-2">browse files</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1 Persistent Footer */}
            <div className={cn("flex items-center justify-between px-2", asModal ? "pt-4 shrink-0" : "")}>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                Cancel
              </button>

              <Button
                type="button"
                disabled={photos.length === 0}
                onClick={handleContinueToStep2}
                className="h-10 gap-2 rounded-xl bg-[#E8546F] px-8 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(232,84,111,0.3)] hover:bg-[#D43F5B] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Continue
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             STEPS 2 & 3: 2-COLUMN LAYOUT
             Left: Persistent decoration image preview + gallery switcher
             Right: Step 2 (Basic Details) or Step 3 (Setup Details)
             ───────────────────────────────────────────────────────────────── */
          <div className={cn(
            "flex flex-col gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden",
            asModal ? "px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-2 h-full" : "lg:px-6 lg:pt-5"
          )}>
            {/* Title Header */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                  {step === 2 ? "Basic Details" : "Setup Details"}
                </h1>
                {initialSetup && (
                  <span className="hidden sm:inline-flex rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-bold text-[#E8546F]">
                    Editing: {initialSetup.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {step === 2 ? "Step 2 of 3" : "Step 3 of 3"}
                </span>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
              {/* ─── LEFT COLUMN: PERSISTENT PHOTO VIEWER THROUGHOUT STEPS 2 & 3 ─── */}
              <div className="space-y-3 lg:col-span-5 h-full overflow-y-auto pb-4 pr-1">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative overflow-hidden rounded-2xl border transition-all duration-200 bg-white shadow-xs ${
                    isDragging ? "border-[#E8546F] ring-2 ring-[#E8546F]/30" : "border-slate-200/90"
                  }`}
                >
                  {/* Main Active Photo */}
                  <div className={cn(
                    "w-full overflow-hidden bg-slate-100 flex items-center justify-center relative",
                    asModal
                      ? "aspect-[4/3] sm:aspect-auto lg:h-[360px] xl:lg:h-[400px]"
                      : "aspect-[4/3] lg:aspect-auto lg:h-[calc(100vh-270px)]"
                  )}>
                    {activePhoto ? (
                      <img
                        src={activePhoto.url}
                        alt={`Decoration Photo ${activePhotoIndex + 1}`}
                        className="size-full object-cover transition-all duration-300"
                      />
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "size-full flex flex-col items-center justify-center p-6 text-center transition-all",
                          isDragging ? "bg-rose-50/80 scale-[0.99]" : "bg-rose-50/20"
                        )}
                      >
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-white border border-rose-200 text-[#E8546F] mb-3 shadow-xs">
                          <Upload className="size-7 stroke-[1.8]" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          Upload Setup Photo
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                          Drag & drop your new image here, or choose an option below
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-9 gap-1.5 rounded-xl bg-[#E8546F] text-xs font-semibold text-white shadow-xs hover:bg-[#D43F5B] cursor-pointer"
                          >
                            <Upload className="size-3.5" />
                            Browse Files
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsReplacingMode(false);
                              setIsLibraryOpen(true);
                            }}
                            className="h-9 gap-1.5 rounded-xl border-rose-200 bg-white text-xs font-semibold text-[#E8546F] hover:bg-rose-50 cursor-pointer"
                          >
                            <FolderOpen className="size-3.5" />
                            From Gallery
                          </Button>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-3 font-medium">
                          Supports PNG, JPG, WebP
                        </span>
                      </div>
                    )}

                    {/* Top Badges */}
                    {activePhoto && (
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
                          Photo {activePhotoIndex + 1} of {photos.length}
                        </span>
                        {activePhotoIndex === 0 && (
                          <span className="rounded-full bg-[#E8546F] px-2 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                            Cover
                          </span>
                        )}
                      </div>
                    )}

                    {/* Left/Right Chevrons for multi-photos */}
                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIndex((prev) =>
                              prev > 0 ? prev - 1 : photos.length - 1,
                            )
                          }
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-xs transition-colors cursor-pointer"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIndex((prev) =>
                              prev < photos.length - 1 ? prev + 1 : 0,
                            )
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-xs transition-colors cursor-pointer"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </>
                    )}

                    {/* Top Right Quick Actions: Clear REPLACE PHOTO Action */}
                    {activePhoto && (
                      <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => replaceFileInputRef.current?.click()}
                          className="h-8 gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-xs hover:bg-white hover:text-[#E8546F] active:scale-95 transition-all cursor-pointer border border-slate-200/80"
                          title="Replace this photo with a new image"
                        >
                          <RefreshCw className="size-3.5 text-[#E8546F]" />
                          <span>Replace Photo</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md backdrop-blur-xs hover:bg-white hover:text-slate-900 active:scale-95 transition-all cursor-pointer border border-slate-200/80"
                              title="More photo options"
                            >
                              <ChevronDown className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl bg-white border border-slate-200">
                            <DropdownMenuItem
                              onClick={() => replaceFileInputRef.current?.click()}
                              className="gap-2.5 text-xs font-medium py-2 rounded-xl cursor-pointer"
                            >
                              <Upload className="size-3.5 text-[#E8546F]" />
                              <span>Upload New File</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setIsReplacingMode(true);
                                setIsLibraryOpen(true);
                              }}
                              className="gap-2.5 text-xs font-medium py-2 rounded-xl cursor-pointer"
                            >
                              <FolderOpen className="size-3.5 text-[#E8546F]" />
                              <span>Choose from Photographer Gallery</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => fileInputRef.current?.click()}
                              className="gap-2.5 text-xs font-medium py-2 rounded-xl cursor-pointer"
                            >
                              <Plus className="size-3.5 text-slate-600" />
                              <span>Add Additional Photo</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              onClick={() => handleRemoveSpecificPhoto(activePhotoIndex)}
                              className="gap-2.5 text-xs font-medium py-2 rounded-xl text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="size-3.5 text-rose-500" />
                              <span>Remove Photo</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Decoration Photos ({photos.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 font-semibold text-[#E8546F] hover:underline cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      Add photos
                    </button>
                  </div>

                  {photos.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {photos.map((p, idx) => {
                        const isActive = activePhotoIndex === idx;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setActivePhotoIndex(idx)}
                            className={cn(
                              "group relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer",
                              isActive
                                ? "border-[#E8546F] shadow-sm ring-2 ring-[#E8546F]/20 scale-102"
                                : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                            )}
                            title={isActive ? "Current photo (Active)" : `Switch to Photo ${idx + 1}`}
                          >
                            <img
                              src={p.url}
                              alt=""
                              className="size-full object-cover"
                            />
                            {idx === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#E8546F] text-center text-[8px] font-bold text-white py-0.5">
                                Cover
                              </span>
                            )}
                            {/* Quick Replace on hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoIndex(idx);
                                replaceFileInputRef.current?.click();
                              }}
                              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Replace this photo"
                            >
                              <RefreshCw className="size-3.5 mb-0.5" />
                              <span className="text-[8px] font-bold">Replace</span>
                            </button>
                            {/* If multiple photos, provide small remove option */}
                            {photos.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSpecificPhoto(idx);
                                }}
                                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 cursor-pointer z-10"
                                title="Remove photo"
                              >
                                <X className="size-2.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 text-[#E8546F] hover:bg-rose-100/60 hover:border-[#E8546F] transition-colors cursor-pointer"
                        title="Upload more photos"
                      >
                        <Plus className="size-4" />
                        <span className="text-[9px] font-bold">Add</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs text-slate-500">
                      <span>No photos currently uploaded</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-semibold text-[#E8546F] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="size-3.5" />
                        <span>Upload photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── RIGHT COLUMN: STEP 2 OR STEP 3 ─── */}
              <div
                ref={rightColumnRef}
                className="space-y-4 lg:col-span-7 lg:overflow-y-auto lg:h-full lg:pr-1 lg:pb-8"
              >
                {step === 2 ? (
                  /* ─────────────────────────────────────────────────────────
                     STEP 2 — BASIC DETAILS
                     Card 1: Decoration Category
                     Card 2: Decoration Name
                     Card 3: Applicable Events
                     Card 4: Main Structure (What is the main structure? Single-select)
                     Card 5: Setup Style (How should it be styled? Multi-select)
                     ───────────────────────────────────────────────────────── */
                  <>
                    {/* Card 1: Decoration Category */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                        1. DECORATION CATEGORY <span className="text-rose-500">*</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const isSelected = category === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategoryChange(cat)}
                              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? "border border-[#E8546F] bg-[#FFF5F7] font-semibold text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 2: Decoration Name */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                        2. DECORATION NAME <span className="text-rose-500">*</span>
                      </p>
                      <Input
                        value={decorName}
                        onChange={(e) => setDecorName(e.target.value)}
                        placeholder="e.g. Royal Lotus Peach Stage Setup"
                        className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                      />
                    </div>

                    {/* Card 3: Applicable Events */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          3. APPLICABLE EVENTS <span className="text-rose-500">*</span>
                        </p>
                        <label className="flex cursor-pointer items-center gap-1.5 select-none">
                          <span
                            role="checkbox"
                            aria-checked={selectedEventTypes.length === EVENT_TYPE_OPTIONS.length}
                            onClick={() => toggleEventType("All")}
                            className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-all ${
                              selectedEventTypes.length === EVENT_TYPE_OPTIONS.length
                                ? "border-[#E8546F] bg-[#E8546F]"
                                : "border-slate-300 bg-white hover:border-[#E8546F]/60"
                            }`}
                          >
                            {selectedEventTypes.length === EVENT_TYPE_OPTIONS.length && (
                              <svg viewBox="0 0 10 8" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 4l2.5 2.5L9 1" />
                              </svg>
                            )}
                          </span>
                          <span
                            onClick={() => toggleEventType("All")}
                            className={`text-[11px] font-semibold transition-colors ${
                              selectedEventTypes.length === EVENT_TYPE_OPTIONS.length
                                ? "text-[#E8546F]"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            All
                          </span>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPE_OPTIONS.map((item) => {
                          const isSelected = selectedEventTypes.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleEventType(item)}
                              className={`rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? "border border-[#E8546F] bg-[#FFF5F7] font-semibold text-[#E8546F] shadow-2xs"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card 4: Main Structure (Single-Select) */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          4. MAIN STRUCTURE <span className="text-rose-500">*</span>
                        </p>
                        <span className="text-[11px] font-medium text-slate-400">
                          What is the main structure?
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentMainStructureOptions.length > 0 ? (
                          currentMainStructureOptions.map((opt) => {
                            const isSelected = mainStructure === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setMainStructure(opt)}
                                className={`rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? "border border-[#E8546F] bg-[#FFF5F7] font-semibold text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic py-1">
                            Select a decoration category above to view structure options.
                          </span>
                        )}
                      </div>

                      {/* Custom Main Structure Description Input */}
                      {mainStructure === "Custom" && (
                        <div className="mt-3">
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Describe the custom structure <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            id="custom-main-structure"
                            value={customStructureInput}
                            onChange={(e) => setCustomStructureInput(e.target.value)}
                            placeholder="Describe the custom structure"
                            className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Card 5: Setup Style (Multi-Select, Optional) */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          5. SETUP STYLE
                        </p>
                        <span className="text-[11px] font-medium text-slate-400">
                          How should it be styled?
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentSetupStyleOptions.length > 0 ? (
                          currentSetupStyleOptions.map((style) => {
                            const isSelected = setupStyles.includes(style);
                            return (
                              <button
                                key={style}
                                type="button"
                                onClick={() => handleToggleSetupStyle(style)}
                                className={`rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? "border border-[#E8546F] bg-[#FFF5F7] font-semibold text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {style}
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic py-1">
                            Select a decoration category above to view style options.
                          </span>
                        )}
                      </div>

                      {/* Custom Setup Style Description Input */}
                      {setupStyles.includes("Custom") && (
                        <div className="mt-3">
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Describe the custom setup style
                          </label>
                          <Input
                            id="custom-setup-style"
                            value={customSetupStyleInput}
                            onChange={(e) => setCustomSetupStyleInput(e.target.value)}
                            placeholder="Describe the custom setup style"
                            className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Step 2 Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          scrollToTop();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="size-3.5" />
                        Back to Photos
                      </button>
                      <Button
                        type="button"
                        onClick={handleContinueToStep3}
                        className="h-10 gap-2 rounded-xl bg-[#E8546F] px-8 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(232,84,111,0.3)] hover:bg-[#D43F5B] active:scale-95 transition-all cursor-pointer"
                      >
                        Continue
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ─────────────────────────────────────────────────────────
                     STEP 3 — SETUP DETAILS
                     - Width and height
                     - Are flowers used?
                     - Flower cards, shown only when “Yes” is selected
                     - Platform details
                     - Lighting details
                     - Pricing and all remaining configuration fields
                     ───────────────────────────────────────────────────────── */
                  <>
                    {/* (6) Width and Height */}
                    <div
                      id="step-3-top"
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          6. WIDTH & HEIGHT
                        </p>
                        <span className="text-xs font-semibold text-[#E8546F] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {widthFt} × {heightFt} ft
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">
                            Width (ft)
                          </label>
                          <Input
                            type="number"
                            value={widthFt}
                            onChange={(e) => setWidthFt(e.target.value)}
                            placeholder="16"
                            className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 focus-visible:border-[#E8546F]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">
                            Height (ft)
                          </label>
                          <Input
                            type="number"
                            value={heightFt}
                            onChange={(e) => setHeightFt(e.target.value)}
                            placeholder="12"
                            className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 focus-visible:border-[#E8546F]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Floral Style Toggle & Specifications */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-[#9E3650]">
                          7. FLORAL STYLE <span className="text-rose-500">*</span>
                        </p>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-md border",
                          floralTag === "with_flowers"
                            ? "text-[#E8546F] bg-rose-50 border-rose-200"
                            : "text-slate-600 bg-slate-100 border-slate-200"
                        )}>
                          {floralTag === "with_flowers" ? "With Flowers" : "Structure Only"}
                        </span>
                      </div>

                      {/* Floral Style 2-button Toggle */}
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFloralTag("with_flowers");
                            setFlowersUsed(true);
                            if (flowerRows.length === 0) {
                              setFlowerRows([
                                { id: `flw-${Date.now()}`, name: "Rose", color: "Pink", type: "Natural" },
                              ]);
                            }
                          }}
                          className={cn(
                            "py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                            floralTag === "with_flowers"
                              ? "bg-[#FFF5F7] border-[#E8546F] text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Flower2 className="size-4 text-[#E8546F]" />
                          <span>With Flowers</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFloralTag("structure_only");
                            setFlowersUsed(false);
                          }}
                          className={cn(
                            "py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                            floralTag === "structure_only"
                              ? "bg-slate-100 border-slate-300 text-slate-800 shadow-2xs font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Layers className="size-4" />
                          <span>Structure Only</span>
                        </button>
                      </div>

                      {/* Flower Cards — shown ONLY when Yes */}
                      {flowersUsed === true && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                          {flowerRows.map((row, index) => (
                            <div
                              key={row.id}
                              className="rounded-2xl border border-slate-200/90 bg-[#FAF7F5] p-4 sm:p-5 shadow-2xs transition-all"
                            >
                              <div className="flex items-center justify-between mb-3.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                  FLORAL SPECIFICATION {index + 1}
                                </span>
                                {flowerRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFlowerRow(row.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-rose-50"
                                    aria-label={`Remove Floral Spec ${index + 1}`}
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                    Flower Type
                                  </label>
                                  <FlowerAutocompleteInput
                                    value={row.name}
                                    onChange={(val) =>
                                      handleUpdateFlowerRow(row.id, "name", val)
                                    }
                                    suggestions={FLOWER_NAME_SUGGESTIONS}
                                    placeholder="e.g. Rose, Orchid, Marigold, Lily"
                                    className="h-11 sm:h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                  />
                                </div>

                                <div className="w-full sm:w-auto shrink-0">
                                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                    Variety Type
                                  </label>
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    {[
                                      { value: "Natural", label: "Natural" },
                                      { value: "Artificial", label: "Artificial" },
                                      { value: "Mixed", label: "Mixed" },
                                    ].map((opt) => {
                                      const isSelected = row.type === opt.value;
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => handleUpdateFlowerRow(row.id, "type", opt.value as any)}
                                          className={`flex-1 sm:flex-initial h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                            isSelected
                                              ? "border border-[#E8546F] bg-[#FFF5F7] text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                                              : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="w-full sm:w-48 md:w-52 shrink-0">
                                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                    Color
                                  </label>
                                  <FlowerColourInput
                                    value={row.color ?? ""}
                                    onChange={(val) =>
                                      handleUpdateFlowerRow(row.id, "color", val)
                                    }
                                    placeholder="Select or enter color"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-center pt-1">
                            <button
                              type="button"
                              onClick={handleAddFlowerRow}
                              className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-5 sm:px-6 text-xs sm:text-sm font-semibold text-slate-700 hover:border-[#E8546F] hover:bg-[#FFF5F7] hover:text-[#E8546F] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                            >
                              <Plus className="size-4 text-[#E8546F]" />
                              <span>Add another floral spec</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* (8) Platform Details */}
                    {platformUsed === true && isPlatformConfirmed ? (
                      /* === COLLAPSED MINIMAL SUMMARY ROW === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white px-4.5 py-4 sm:px-5 sm:py-4.5 shadow-2xs flex items-center justify-between transition-all">
                        <div className="flex items-center gap-2.5">
                          <Layers className="size-4.5 text-[#E8546F]" />
                          <span className="text-sm font-bold text-slate-800">
                            Platform Used
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#2E6B44] tabular-nums">
                            Rs. {Number(confirmedPlatformPrice || platformPrice || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPlatformPrice(confirmedPlatformPrice || platformPrice);
                              setIsPlatformConfirmed(false);
                            }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                          >
                            <PenLine className="size-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* === EXPANDED EDITABLE CARD === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          8. DOES THIS DECORATION INCLUDE A PLATFORM?
                        </p>

                        <FormYesNoToggle
                          value={platformUsed}
                          onChange={(val) => {
                            setPlatformUsed(val);
                            if (!val) {
                              setPlatformPrice("");
                              setConfirmedPlatformPrice("");
                              setIsPlatformConfirmed(false);
                            }
                          }}
                        />

                        {/* When “Yes” is selected, reveal the platform details below */}
                        {platformUsed === true && (
                          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
                            {/* 1. Platform Shape (Required) */}
                            <div>
                              <div className="mb-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                  Platform Shape <span className="text-rose-500">*</span>
                                </label>
                                <p className="text-[11px] text-slate-400">
                                  Choose the shape of the platform
                                </p>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {PLATFORM_SHAPES.map((shape) => {
                                  const isSelected = platformShape === shape;
                                  return (
                                    <button
                                      key={shape}
                                      type="button"
                                      onClick={() => setPlatformShape(shape)}
                                      className={`flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl border text-xs transition-all cursor-pointer ${
                                        isSelected
                                          ? "border-[#E8546F] bg-[#FFF5F7] font-semibold text-[#E8546F] shadow-2xs ring-1 ring-[#E8546F]/20"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      {SHAPE_ICONS[shape]}
                                      <span className="truncate">{shape}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Custom Platform Shape Text Input */}
                              {platformShape === "Custom" && (
                                <div className="mt-2.5">
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Describe the custom shape <span className="text-rose-500">*</span>
                                  </label>
                                  <Input
                                    id="custom-platform-shape"
                                    value={customPlatformShape}
                                    onChange={(e) => setCustomPlatformShape(e.target.value)}
                                    placeholder="e.g. Octagonal multi-tiered deck"
                                    className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                  />
                                </div>
                              )}
                            </div>

                            {/* 2. Platform Colour (Required) */}
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                Platform Colour <span className="text-rose-500">*</span>
                              </label>
                              <div className="w-full max-w-md">
                                <PlatformColourInput
                                  id="platform-colour"
                                  value={platformColour}
                                  onChange={(val) => setPlatformColour(val)}
                                  placeholder="Select or add colour"
                                />
                              </div>
                            </div>

                            {/* 3. Platform Height (Optional) */}
                            <div>
                              <div className="mb-1.5 flex items-center justify-between w-full max-w-md">
                                <label className="text-xs font-semibold text-slate-700">
                                  Platform Height
                                </label>
                                <span className="text-[11px] text-slate-400">Optional</span>
                              </div>
                              <div className="relative w-full max-w-md">
                                <Input
                                  id="platform-height"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={platformHeight}
                                  onChange={(e) => setPlatformHeight(e.target.value)}
                                  placeholder="1.5"
                                  className="h-10 pr-10 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                                  ft
                                </span>
                              </div>
                            </div>

                            {/* 4. Platform Price on its own separate line */}
                            <div>
                              <div className="mb-1.5 flex items-center justify-between w-full max-w-md">
                                <label className="text-xs font-semibold text-slate-700">
                                  Platform Price <span className="text-rose-500">*</span>
                                </label>
                              </div>
                              <div className="flex items-center gap-2 w-full max-w-md">
                                <div className="relative flex-1">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                    Rs.
                                  </span>
                                  <Input
                                    id="platform-price"
                                    type="number"
                                    min="0"
                                    value={platformPrice}
                                    onChange={(e) => setPlatformPrice(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleConfirmPlatform();
                                      }
                                    }}
                                    placeholder="15000"
                                    className="h-10 pl-10 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleConfirmPlatform}
                                  className="h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-[#E8546F] text-white hover:bg-[#D43F5B] shadow-sm active:scale-[0.98]"
                                >
                                  <Check className="size-3.5 stroke-[2.5]" />
                                  <span>Done</span>
                                </button>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400">
                                Price for this platform
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* (9) Lighting Details */}
                    {lightsUsed === true && isLightingConfirmed ? (
                      /* === COLLAPSED MINIMAL SUMMARY ROW === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white px-4.5 py-4 sm:px-5 sm:py-4.5 shadow-2xs flex items-center justify-between transition-all">
                        <div className="flex items-center gap-2.5">
                          <Lightbulb className="size-4.5 text-[#E8546F]" />
                          <span className="text-sm font-bold text-slate-800">
                            Lighting
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#2E6B44] tabular-nums">
                            Rs. {Number(confirmedLightingPrice || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOverallLightingPriceInput(confirmedLightingPrice);
                              setIsLightingConfirmed(false);
                            }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                          >
                            <PenLine className="size-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* === EXPANDED EDITABLE CARD === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                          9. ARE LIGHTS USED IN THIS DECORATION?
                        </p>
                        <FormYesNoToggle
                          value={lightsUsed}
                          onChange={(val) => {
                            setLightsUsed(val);
                            if (val) {
                              if (lightRows.length === 0) {
                                setLightRows([
                                  { id: `light-${Date.now()}`, type: "Warm Spotlights", quantity: 1, unit: "piece" },
                                ]);
                              }
                            } else {
                              setIsLightingConfirmed(false);
                            }
                          }}
                        />

                        {/* Light Cards — shown ONLY when Yes */}
                        {lightsUsed === true && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                            {lightRows.map((row, index) => (
                              <div
                                key={row.id}
                                className="rounded-2xl border border-slate-200/90 bg-[#FAF7F5] p-4 sm:p-5 shadow-2xs transition-all"
                              >
                                <div className="flex items-center gap-2 mb-3.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    LIGHT {index + 1}
                                  </span>
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLightRow(row.id)}
                                      className="size-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      aria-label={`Remove Light ${index + 1}`}
                                    >
                                      <X className="size-3.5 stroke-[2.5]" />
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                      Light type <span className="text-rose-500">*</span>
                                    </label>
                                    <FlowerAutocompleteInput
                                      value={row.type}
                                      onChange={(val) =>
                                        handleUpdateLightType(row.id, val)
                                      }
                                      suggestions={LIGHT_TYPE_SUGGESTIONS}
                                      placeholder="e.g. Warm Spotlights, Fairy Lights"
                                      className="h-11 sm:h-12 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                    />
                                  </div>

                                  <div className="w-full sm:w-auto shrink-0">
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                      Quantity
                                    </label>
                                    <div className="flex items-center h-11 sm:h-12 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                                      {/* Stepper (- / count / +) */}
                                      <div className="flex items-center px-0.5">
                                        <button
                                          type="button"
                                          disabled={row.quantity <= 1}
                                          onClick={() => handleUpdateLightQuantity(row.id, -1)}
                                          className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus className="size-3.5" />
                                        </button>
                                        <span className="w-9 text-center text-sm font-bold text-slate-800 tabular-nums">
                                          {row.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateLightQuantity(row.id, 1)}
                                          className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus className="size-3.5" />
                                        </button>
                                      </div>

                                      {/* Thin vertical divider */}
                                      <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

                                      {/* Unit Dropdown */}
                                      <div className="relative flex items-center pr-1.5 pl-0.5">
                                        <select
                                          value={row.unit || "piece"}
                                          onChange={(e) =>
                                            handleUpdateLightUnit(row.id, e.target.value as LightingUnit)
                                          }
                                          className="h-8 appearance-none bg-transparent pr-6 pl-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 focus:outline-hidden cursor-pointer"
                                          aria-label="Light quantity unit"
                                        >
                                          <option value="piece">Piece</option>
                                          <option value="box">Box</option>
                                          <option value="set">Set</option>
                                          <option value="meter">Meter</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-slate-400" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div className="flex justify-center pt-1">
                              <button
                                type="button"
                                onClick={handleAddLightRow}
                                className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-5 sm:px-6 text-xs sm:text-sm font-semibold text-slate-700 hover:border-[#E8546F] hover:bg-[#FFF5F7] hover:text-[#E8546F] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                              >
                                <Plus className="size-4 text-[#E8546F]" />
                                <span>Add another light</span>
                              </button>
                            </div>

                            {/* Overall Lighting Price */}
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                              <label
                                htmlFor="overall-lighting-price-input"
                                className="text-xs font-bold uppercase tracking-wider text-slate-600 block"
                              >
                                Overall Lighting Price
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                    Rs.
                                  </span>
                                  <Input
                                    id="overall-lighting-price-input"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={overallLightingPriceInput}
                                    onChange={(e) => setOverallLightingPriceInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleConfirmLighting();
                                      }
                                    }}
                                    className="h-11 pl-11 pr-4 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleConfirmLighting}
                                  className="h-11 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-[#E8546F] text-white hover:bg-[#D43F5B] shadow-sm active:scale-[0.98]"
                                >
                                  <Check className="size-3.5 stroke-[2.5]" />
                                  <span>Done</span>
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                One combined price for all lighting equipment on this decoration.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* (10) Furniture & Props (Optional) */}
                    {furnitureUsed === true && isFurnitureConfirmed ? (
                      /* === COLLAPSED MINIMAL SUMMARY ROW === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white px-4.5 py-4 sm:px-5 sm:py-4.5 shadow-2xs flex items-center justify-between transition-all">
                        <div className="flex items-center gap-2.5">
                          <Armchair className="size-4.5 text-[#E8546F]" />
                          <div>
                            <span className="text-sm font-bold text-slate-800">
                              Furniture & Props
                            </span>
                            {furnitureDetails.trim() && (
                              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-md">
                                {furnitureDetails}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#2E6B44] tabular-nums">
                            Rs. {Number(furniturePrice || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsFurnitureConfirmed(false)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                          >
                            <PenLine className="size-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* === EXPANDED / CARD WITH YES/NO BUTTONS === */
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E3650]">
                              10. FURNITURE & PROPS
                            </p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              Optional
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            Chairs, sofa, table, etc.
                          </span>
                        </div>

                        <p className="mb-3 text-[11px] text-slate-500 leading-relaxed">
                          Specify seating, royal throne chairs, sofas, center tables, or decorative furniture included in this decoration.
                        </p>

                        {/* Yes / No selection buttons matching Flowers and Lights */}
                        <FormYesNoToggle
                          value={furnitureUsed}
                          onChange={(val) => {
                            setFurnitureUsed(val);
                            if (!val) {
                              setIsFurnitureConfirmed(false);
                            }
                          }}
                        />

                        {/* Full Furniture Section — shown ONLY when Yes */}
                        {furnitureUsed === true && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5">
                            {/* Quick click suggestions */}
                            <div className="space-y-1.5">
                              <span className="block text-[11px] font-semibold text-slate-600">
                                Quick add suggestions:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {FURNITURE_SUGGESTIONS.map((sug) => {
                                  const isIncluded = furnitureDetails.toLowerCase().includes(sug.toLowerCase());
                                  return (
                                    <button
                                      key={sug}
                                      type="button"
                                      onClick={() => handleToggleFurnitureSuggestion(sug)}
                                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                                        isIncluded
                                          ? "border border-[#E8546F] bg-[#FFF5F7] text-[#E8546F] font-semibold shadow-2xs ring-1 ring-[#E8546F]/20"
                                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      {isIncluded ? (
                                        <Check className="size-3 stroke-[2.5]" />
                                      ) : (
                                        <Plus className="size-3 text-[#E8546F]" />
                                      )}
                                      <span>{sug}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Furniture Details Text Input */}
                            <div className="space-y-1.5">
                              <label
                                htmlFor="furniture-details-input"
                                className="block text-xs font-semibold text-slate-700"
                              >
                                Write furniture details
                              </label>
                              <Input
                                id="furniture-details-input"
                                value={furnitureDetails}
                                onChange={(e) => setFurnitureDetails(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleConfirmFurniture();
                                  }
                                }}
                                placeholder="e.g. 2 Royal Golden Throne Chairs, 1 Center Glass Table, 4 Banquet Chairs"
                                className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                              />
                            </div>

                            {/* Optional Furniture Price */}
                            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <label
                                  htmlFor="furniture-price-input"
                                  className="block text-xs font-semibold text-slate-700"
                                >
                                  Furniture Price <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                                </label>
                                <p className="text-[11px] text-slate-400">
                                  Leave blank or 0 if included in total pricing
                                </p>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-44">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                    Rs.
                                  </span>
                                  <Input
                                    id="furniture-price-input"
                                    type="number"
                                    min="0"
                                    value={furniturePrice}
                                    onChange={(e) => setFurniturePrice(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleConfirmFurniture();
                                      }
                                    }}
                                    placeholder="0"
                                    className="h-10 pl-10 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleConfirmFurniture}
                                  className="h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-[#E8546F] text-white hover:bg-[#D43F5B] shadow-sm active:scale-[0.98]"
                                >
                                  <Check className="size-3.5 stroke-[2.5]" />
                                  <span>Done</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Decoration Pricing */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Decoration Pricing
                        </h3>
                        <span className="text-[11px] font-medium text-slate-400">
                          Currency: NPR (Rs.)
                        </span>
                      </div>

                      {/* 1. Base Decoration Price / Starting Price */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div>
                          <label
                            htmlFor="base-decoration-price-input"
                            className="text-xs font-semibold text-slate-900 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Starting / Base Price</span>
                            <span className="text-[#E8546F] text-xs font-normal" aria-hidden="true">*</span>
                          </label>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Core decoration structure &amp; styling
                          </p>
                        </div>
                        <div className="relative w-full sm:w-52 shrink-0 flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none pointer-events-none">
                              Rs.
                            </span>
                            <Input
                              id="base-decoration-price-input"
                              type="number"
                              min="0"
                              value={baseDecorationPrice}
                              onChange={(e) => setBaseDecorationPrice(e.target.value)}
                              placeholder="0"
                              className="h-9 w-full rounded-lg border-slate-200 bg-white pl-9 pr-3 text-right text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus-visible:border-[#E8546F] focus-visible:ring-1 focus-visible:ring-[#E8546F] shadow-2xs"
                            />
                          </div>
                          {Number(baseDecorationPrice) > 0 && (
                            <span className="hidden sm:inline text-xs font-bold text-[#E8546F] tabular-nums shrink-0">
                              Rs. {Number(baseDecorationPrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Add-ons Row */}
                      <div className="flex items-start justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Layers className="size-3.5 text-slate-400 stroke-[2]" />
                            <span className="text-xs font-semibold text-slate-900">Add-ons</span>
                            <span className="text-[10px] text-slate-400 font-normal">(Auto-calculated)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Platform · Lighting · Furniture
                          </p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E8546F] hover:text-[#D43F5B] hover:underline cursor-pointer transition-colors focus-visible:outline-none"
                              >
                                <span>View breakdown</span>
                                <ChevronDown className="size-3 stroke-[2.5]" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              sideOffset={6}
                              className="w-64 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-lg space-y-2.5 z-50 text-slate-800"
                            >
                              <div className="border-b border-slate-100 pb-1.5">
                                <span className="text-xs font-bold text-slate-900">Add-on Breakdown</span>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">Platform</span>
                                  <span className="font-medium text-slate-900 tabular-nums">
                                    — Rs. {platformCost.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">Lighting</span>
                                  <span className="font-medium text-slate-900 tabular-nums">
                                    — Rs. {lightingCost.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">Furniture</span>
                                  <span className="font-medium text-slate-900 tabular-nums">
                                    — Rs. {furnitureCost.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-800">Add-ons Total</span>
                                <span className="text-[#E8546F] tabular-nums font-bold">
                                  — Rs. {Number(totalAddOnPrice || 0).toLocaleString()}
                                </span>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="text-right shrink-0 pt-0.5">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums block">
                            Rs. {Number(totalAddOnPrice || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Total Decoration Price */}
                      <div className="border-t border-slate-200/80 pt-3.5 flex items-baseline justify-between">
                        <span className="shrink-0 text-sm font-bold text-slate-900">
                          Total Decoration Price
                        </span>
                        <span className="flex-1 border-b border-dotted border-slate-200/80 mx-2 sm:mx-3" />
                        <span className="shrink-0 text-xl sm:text-2xl font-extrabold text-[#E8546F] tabular-nums">
                          Rs. {((Number(baseDecorationPrice) || 0) + (Number(totalAddOnPrice) || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>


                    {/* 12. Setup Summary Panel */}
                    <div className="rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 sm:p-5 shadow-2xs space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Sparkles className="size-3.5 text-[#E8546F]" />
                          <span>Setup Summary</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">Step 3 Review</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{decorName || "Untitled Setup"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Category</span>
                        <span className="font-semibold text-slate-800">{category || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Structure</span>
                        <span className="font-semibold text-slate-800">
                          {mainStructure === "Custom" ? customStructureInput || "Custom" : mainStructure || "Standard"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Dimensions</span>
                        <span className="font-semibold text-slate-800">{widthFt || 16} ft × {heightFt || 12} ft</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Floral Style</span>
                        <span className="font-semibold text-slate-800">{floralTag === "with_flowers" ? "With Flowers" : "Structure Only"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Events</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                          {selectedEventTypes.length > 0 ? selectedEventTypes.slice(0, 3).join(", ") + (selectedEventTypes.length > 3 ? ` +${selectedEventTypes.length - 3}` : "") : "All Events"}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-stone-200 flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-bold">Total Price (NPR)</span>
                        <span className="font-extrabold text-[#E8546F] tabular-nums text-sm sm:text-base">
                          Rs. {((Number(baseDecorationPrice) || 0) + (Number(totalAddOnPrice) || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── STICKY FOOTER FOR STEP 3: BACK + FINISH & SAVE ALL ─── */}
      {step === 3 && (
        <footer className="sticky bottom-0 z-30 w-full border-t border-slate-200/70 bg-white/95 px-6 py-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(2);
                scrollToTop();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              Back to Basic Details
            </button>
            <Button
              type="button"
              onClick={handleFinishAndSave}
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-[#E8546F] px-6 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#D43F5B] active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting
                ? "Saving..."
                : initialSetup
                ? "Update & Save Changes"
                : "Finish & Save All"}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );

  if (asModal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
        <DialogContent className="fixed inset-0 z-50 left-0 top-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none rounded-none border-none p-0 bg-[#FFFBFC] shadow-none flex flex-col gap-0 duration-200 overflow-hidden [&>button.absolute]:hidden">
          <DialogTitle className="sr-only">
            {initialSetup ? "Edit Decoration Setup" : "Upload New Decoration"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure photo, category, structure, dimensions, floral style, and pricing.
          </DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}

export function AddDecorationModal({
  open,
  onOpenChange,
  onSetupCreated,
  initialSetup,
  initialStep,
  initialPhotoUrl,
  initialName,
  initialCategory,
  initialEvents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupCreated?: ((setup: DecorationSetupItem) => void) | undefined;
  initialSetup?: DecorationSetupItem | undefined;
  initialStep?: (1 | 2 | 3) | undefined;
  initialPhotoUrl?: string | undefined;
  initialName?: string | undefined;
  initialCategory?: DecorationCategory | undefined;
  initialEvents?: string[] | undefined;
}) {
  return (
    <AddDecorationPage
      asModal
      open={open}
      onOpenChange={onOpenChange}
      onSetupCreated={onSetupCreated}
      initialSetup={initialSetup}
      initialStep={initialStep}
      initialPhotoUrl={initialPhotoUrl}
      initialName={initialName}
      initialCategory={initialCategory}
      initialEvents={initialEvents}
    />
  );
}

