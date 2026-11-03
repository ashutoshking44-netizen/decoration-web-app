import React from "react";
import { BottomSheet, SheetPill, SheetSection } from "./BottomSheet";

export interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Selected companies (multi-select). Empty array = all companies. */
  fCompanies: string[];
  setFCompanies: (companies: string[]) => void;
  companyOptions: string[];
  /** Selected price range id (single-select). Empty string = any price. */
  fPrice: string;
  setFPrice: (p: string) => void;
  PRICE_RANGES: readonly { id: string; label: string; min: number; max: number }[];
}

/** Mobile "Filters" sheet: Company (multi-select) + Price Range (single-select). */
export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  fCompanies,
  setFCompanies,
  companyOptions,
  fPrice,
  setFPrice,
  PRICE_RANGES,
}) => {
  const hasActiveFilters = fCompanies.length > 0 || Boolean(fPrice);

  const toggleCompany = (company: string) => {
    setFCompanies(
      fCompanies.includes(company)
        ? fCompanies.filter((c) => c !== company)
        : [...fCompanies, company],
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      footer={
        <>
          {hasActiveFilters && (
            <button
              type="button"
              className="sheet-reset"
              onClick={() => {
                setFCompanies([]);
                setFPrice("");
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
      {/* Company: select as many as you like */}
      <SheetSection title="Company">
        <SheetPill active={fCompanies.length === 0} onSelect={() => setFCompanies([])}>
          All Companies
        </SheetPill>
        {companyOptions.map((c) => (
          <SheetPill key={c} active={fCompanies.includes(c)} onSelect={() => toggleCompany(c)}>
            {c}
          </SheetPill>
        ))}
      </SheetSection>

      {/* Price Range: only one at a time */}
      <SheetSection title="Price Range">
        <SheetPill active={!fPrice} onSelect={() => setFPrice("")}>
          Any Price
        </SheetPill>
        {PRICE_RANGES.map((r) => (
          <SheetPill key={r.id} active={fPrice === r.id} onSelect={() => setFPrice(r.id)}>
            {r.label}
          </SheetPill>
        ))}
      </SheetSection>
    </BottomSheet>
  );
};

export default FilterBottomSheet;
