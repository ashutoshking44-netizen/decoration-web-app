import React from "react";

export interface CompanyPickerGroup {
  id: string;
  name: string;
  count: number;
}

export interface QuotationCompanyPickerProps {
  groups: CompanyPickerGroup[];
  selected: string[];
  onToggle: (companyId: string) => void;
}

export const QuotationCompanyPicker: React.FC<QuotationCompanyPickerProps> = ({
  groups,
  selected,
  onToggle,
}) => {
  if (!groups || groups.length === 0) return null;

  const isSingle = groups.length === 1;
  const singleCompanyName = groups[0]?.name;

  return (
    <div className="quote-company-picker-section">
      {/* Heading & Subtext */}
      <div className="quote-company-picker-head">
        <h4 className="quote-company-picker-title">
          {isSingle ? (
            <>You have chosen decorations from {singleCompanyName}</>
          ) : (
            <>
              You have chosen decorations from{" "}
              <b className="quote-company-count-highlight">{groups.length}</b> companies
            </>
          )}
        </h4>
        <p className="quote-company-picker-subtext">
          {isSingle ? "Your request will be sent to this company." : "Send quotation request to:"}
        </p>
      </div>

      {/* Company rows list */}
      <div
        className="quote-company-picker-list"
        role="group"
        aria-label="Select companies to send quotation request"
      >
        {groups.map((group) => {
          const isSelected = selected.includes(group.id);
          return (
            <div key={group.id} className={`quote-company-row ${isSelected ? "selected" : ""}`}>
              {/* Hidden native checkbox covering the entire row */}
              <input
                type="checkbox"
                id={`quote-co-check-${group.id}`}
                className="quote-company-checkbox"
                checked={isSelected}
                onChange={() => onToggle(group.id)}
                aria-label={`Select ${group.name}`}
              />

              {/* Left: Custom Checkbox + Company Name */}
              <div className="quote-company-row-left">
                <div
                  className={`quote-company-custom-check ${isSelected ? "checked" : ""}`}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="quote-company-name">{group.name}</span>
              </div>

              {/* Right: Item Count */}
              <span className="quote-company-count-badge">
                {group.count} {group.count === 1 ? "decoration" : "decorations"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="quote-company-info-note">
        <svg
          className="quote-company-info-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>
          Your name, phone number, and WhatsApp number will be shared with the companies you select.
        </span>
      </div>
    </div>
  );
};

export default QuotationCompanyPicker;
