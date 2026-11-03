import React from "react";
import { BottomSheet, SheetPill, SheetSection } from "./BottomSheet";

export interface SortBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  fStyle: string;
  setFStyle: (st: string) => void;
  styleOptions: string[];
  setFColor?: (c: string) => void;
}

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "low", label: "Price: Low to High" },
  { id: "high", label: "Price: High to Low" },
  { id: "name", label: "Name: A - Z" },
] as const;

/** Mobile "Sort & Style" sheet: Sort By + Style only. */
export const SortBottomSheet: React.FC<SortBottomSheetProps> = ({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  fStyle,
  setFStyle,
  styleOptions,
  setFColor,
}) => {
  const hasActiveSort = sortBy !== "featured" || Boolean(fStyle);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Sort & Style"
      footer={
        <>
          {hasActiveSort && (
            <button
              type="button"
              className="sheet-reset"
              onClick={() => {
                setSortBy("featured");
                setFStyle("");
                setFColor?.("");
              }}
            >
              Reset
            </button>
          )}
          <button type="button" className="pill pri sheet-apply" onClick={onClose}>
            Apply
          </button>
        </>
      }
    >
      <SheetSection title="Sort By">
        {SORT_OPTIONS.map((s) => (
          <SheetPill key={s.id} active={sortBy === s.id} onSelect={() => setSortBy(s.id)}>
            {s.label}
          </SheetPill>
        ))}
      </SheetSection>

      {styleOptions.length > 0 && (
        <SheetSection title="Style">
          <SheetPill active={!fStyle} onSelect={() => setFStyle("")}>
            All Styles
          </SheetPill>
          {styleOptions.map((st) => (
            <SheetPill key={st} active={fStyle === st} onSelect={() => setFStyle(st)}>
              {st}
            </SheetPill>
          ))}
        </SheetSection>
      )}
    </BottomSheet>
  );
};

export default SortBottomSheet;
