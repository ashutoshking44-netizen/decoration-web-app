import React, { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Flower2,
  Maximize2,
  Layers,
  Boxes,
  PenLine,
  Eye,
  Trash2,
  ChevronDown,
  Check,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DecorationSetupItem } from "@/lib/decoration-setups";
import {
  STATUS_CONFIG,
  extractSpecs,
  extractPrice,
  formatTitle,
  type DecorationCardStatus,
} from "./decoration-catalog-card";

export interface DecorationCatalogListItemProps {
  setup: DecorationSetupItem;
  onStatusChange?: (newStatus: DecorationCardStatus, setup: DecorationSetupItem) => void;
  onViewDetails?: (setup: DecorationSetupItem) => void;
  onCreateQuotation?: (setup: DecorationSetupItem) => void;
  onEdit?: (setup: DecorationSetupItem) => void;
  onDelete?: (setup: DecorationSetupItem) => void;
  className?: string;
}

export function DecorationCatalogListItem({
  setup,
  onStatusChange,
  onViewDetails,
  onCreateQuotation,
  onEdit,
  onDelete,
  className,
}: DecorationCatalogListItemProps) {
  const displayTitle = formatTitle(setup);
  const displayCategory = setup.category || "Mandap";

  const initialStatus: DecorationCardStatus = (setup.status as DecorationCardStatus) || "Live";

  const [currentStatus, setCurrentStatus] = useState<DecorationCardStatus>(initialStatus);

  useEffect(() => {
    if (setup.status) {
      setCurrentStatus(setup.status as DecorationCardStatus);
    }
  }, [setup.status]);

  const handleStatusSelect = (newStatus: DecorationCardStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus, setup);
  };

  const activeConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG["Live"]!;

  const hasFlowers = Boolean(
    (setup.specifications?.flowers_used && setup.specifications?.flowers?.length) ||
    setup.entranceGateSpecs?.floralUsage ||
    setup.mandapSpecs?.floralUsage,
  );

  const specs = extractSpecs(setup);
  const price = extractPrice(setup);

  const displayImage =
    setup.imageUrl ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80";

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-soft hover:shadow-md hover:border-border/80 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4",
        className,
      )}
    >
      {/* ─── Left Section: Thumbnail & Setup Info ─── */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Thumbnail Preview Image */}
        <div
          onClick={() => onViewDetails?.(setup)}
          className="relative size-14 sm:size-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60 shadow-2xs cursor-pointer group-hover:opacity-95"
        >
          <img
            src={displayImage}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&auto=format&fit=crop&q=80";
            }}
          />
        </div>

        {/* Setup Name & Category */}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onViewDetails?.(setup)}
            className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors truncate block text-left cursor-pointer"
          >
            {displayTitle}
          </button>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full bg-muted/60 border border-border/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 shadow-2xs">
              {displayCategory}
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-mono">{setup.sku}</span>
          </div>
        </div>
      </div>

      {/* ─── Center Section: Specifications (Dimensions & Floral/Structure tags) ─── */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 text-xs">
        {/* Dimensions Tag */}
        <div className="inline-flex items-center gap-1.5 text-foreground/85 font-medium bg-muted/30 border border-border/60 rounded-lg px-2.5 py-1 shadow-2xs">
          <Maximize2 className="size-3.5 text-muted-foreground shrink-0" />
          <span className="tabular-nums">{specs.dimensions}</span>
        </div>

        {/* Floral vs Structure Tag */}
        {hasFlowers ? (
          <span className="inline-flex items-center gap-1.5 text-primary bg-rose-light border border-border/80 rounded-lg px-2.5 py-1 font-medium shadow-2xs">
            <Flower2 className="size-3.5 text-primary shrink-0" />
            <span className="truncate max-w-[130px]">{specs.flowerType}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 font-medium shadow-2xs">
            <Boxes className="size-3.5 text-amber-600 shrink-0" />
            <span>Structure Only</span>
          </span>
        )}

        {/* Platform Tag (if any) */}
        {specs.platformStyle && specs.platformStyle !== "None" && (
          <span
            className="hidden xl:inline-flex items-center gap-1.5 text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-2.5 py-1 font-medium truncate max-w-[130px] shadow-2xs"
            title={`Platform: ${specs.platformStyle}`}
          >
            <Layers className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{specs.platformStyle}</span>
          </span>
        )}
      </div>

      {/* ─── Right Section: Price, Status Badge, & 3-Dot Action Menu ─── */}
      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-3.5 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-border/40">
        {/* Starting Price */}
        <div className="text-left md:text-right shrink-0 min-w-[95px]">
          <span className="text-[10px] text-muted-foreground block leading-none">
            Starting from
          </span>
          <span className="text-base sm:text-[17px] font-extrabold text-foreground tabular-nums tracking-tight mt-0.5 block">
            Rs. {price.toLocaleString()}
          </span>
        </div>

        {/* Status Dropdown Pill (Live / Paused / Draft) */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-semibold shadow-2xs backdrop-blur-xs transition-all cursor-pointer hover:shadow-xs active:scale-95 select-none shrink-0",
                  activeConfig.badgeClass,
                )}
                title="Change setup status"
              >
                <span className={cn("size-1.5 rounded-full shrink-0", activeConfig.dotClass)} />
                <span>{activeConfig.label}</span>
                <ChevronDown className="size-3 opacity-70 stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-32 rounded-xl border border-border bg-card p-1 text-xs shadow-soft z-50"
            >
              {(["Live", "Paused", "Draft"] as DecorationCardStatus[]).map((st) => {
                const cfg = STATUS_CONFIG[st] || STATUS_CONFIG["Live"]!;
                return (
                  <DropdownMenuItem
                    key={st}
                    onClick={(e) => handleStatusSelect(st, e)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                      currentStatus === st
                        ? "bg-muted font-bold text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 rounded-full", cfg.dotClass)} />
                      <span>{st}</span>
                    </span>
                    {currentStatus === st && <Check className="size-3 text-primary stroke-[2.5]" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Actions: View Details Button & 3-Dot Action Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewDetails?.(setup)}
            className="hidden sm:inline-flex rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 shadow-soft active:scale-[0.98] transition-all cursor-pointer"
          >
            View
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-8.5 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-border/80 hover:bg-muted/40 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="More actions"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 rounded-xl border border-border bg-card text-xs shadow-soft p-1"
            >
              <DropdownMenuItem
                onClick={() => onViewDetails?.(setup)}
                className="gap-2 cursor-pointer py-1.5 font-medium"
              >
                <Eye className="size-3.5 text-primary" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCreateQuotation?.(setup)}
                className="gap-2 cursor-pointer py-1.5 font-medium text-foreground hover:text-primary"
              >
                <FileText className="size-3.5 text-primary" />
                <span>Create Quotation</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit?.(setup)}
                className="gap-2 cursor-pointer py-1.5 font-medium"
              >
                <PenLine className="size-3.5 text-muted-foreground" />
                <span>Edit Setup</span>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete?.(setup)}
                  className="gap-2 cursor-pointer py-1.5 font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                  <span>Delete Setup</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default DecorationCatalogListItem;
