import React, { useState } from "react";

export interface CompanyItem {
  id: number | string;
  image: string;
  title: string;
}

export interface CompanyGroup {
  id: number | string;
  name: string;
  logo?: string;
  items: CompanyItem[];
}

export interface SendToCompaniesProps {
  groups?: CompanyGroup[];
  selected?: (number | string)[];
  onToggle?: (id: number | string) => void;
  onSend?: () => void;
  error?: string;
}

export const MOCK_COMPANY_GROUPS: CompanyGroup[] = [];

export const SendToCompanies: React.FC<SendToCompaniesProps> = ({
  groups = MOCK_COMPANY_GROUPS,
  selected: controlledSelected,
  onToggle,
  onSend,
  error,
}) => {
  // Support internal state if un-controlled for seamless preview
  const isControlled = controlledSelected !== undefined;
  const [internalSelected, setInternalSelected] = useState<(string | number)[]>(["c1", "c2"]);

  const selectedList = isControlled ? controlledSelected : internalSelected;

  const handleToggle = (id: string | number) => {
    if (onToggle) {
      onToggle(id);
    }
    if (!isControlled) {
      setInternalSelected((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    }
  };

  const selectedCount = selectedList.length;

  let buttonLabel = "Select a company";
  if (selectedCount === 1) {
    buttonLabel = "Send request";
  } else if (selectedCount > 1) {
    buttonLabel = `Send request to ${selectedCount} companies`;
  }

  return (
    <div className="send-to-container">
      {/* Header */}
      <div className="send-to-header">
        <h2 className="send-to-title serif">
          Send my request <em className="send-to-title-accent">to</em>
        </h2>
        <p className="send-to-subtitle">Choose who should prepare your quotation.</p>
      </div>

      {/* Company Cards List */}
      <div className="send-to-list" role="group" aria-label="Select companies">
        {groups.map((group) => {
          const isSelected = selectedList.includes(group.id);
          const initial = (group.name || "C").trim().charAt(0).toUpperCase();

          // Thumbnail logic: up to 4 thumbnails with "+N" tile if more
          const hasMore = group.items.length > 4;
          const displayThumbs = hasMore ? group.items.slice(0, 3) : group.items.slice(0, 4);
          const overflowCount = hasMore ? group.items.length - 3 : 0;

          return (
            <div key={group.id} className={`company-card ${isSelected ? "selected" : ""}`}>
              {/* Hidden Checkbox covering entire card for complete tap target & accessibility */}
              <input
                type="checkbox"
                id={`company-toggle-${group.id}`}
                className="company-card-checkbox"
                checked={isSelected}
                onChange={() => handleToggle(group.id)}
                aria-label={`Select ${group.name}`}
              />

              {/* Company Header Row */}
              <div className="company-card-header">
                <div className="company-info-wrap">
                  {/* Round Logo / Avatar */}
                  <div className="company-logo-avatar" aria-hidden="true">
                    {group.logo ? (
                      <img
                        src={group.logo}
                        alt=""
                        className="company-logo-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="company-logo-initial">{initial}</span>
                  </div>

                  <div className="company-text-meta">
                    <h3 className="company-name">{group.name}</h3>
                    <span className="company-decor-count">
                      {group.items.length} {group.items.length === 1 ? "decoration" : "decorations"}
                    </span>
                  </div>
                </div>

                {/* Circular Check Indicator */}
                <div
                  className={`company-check-indicator ${isSelected ? "checked" : ""}`}
                  aria-hidden="true"
                >
                  {isSelected ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </div>
              </div>

              {/* Thumbnails Row */}
              {group.items.length > 0 && (
                <div className="company-card-thumbnails">
                  {displayThumbs.map((item) => (
                    <img
                      key={item.id}
                      src={item.image}
                      alt={item.title}
                      title={item.title}
                      className="company-thumbnail"
                      loading="lazy"
                    />
                  ))}
                  {hasMore && (
                    <div
                      className="company-thumbnail-more"
                      title={`${overflowCount} more decorations`}
                    >
                      +{overflowCount}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Note with Icon */}
      <div className="send-to-info-note">
        <svg
          className="send-to-info-icon"
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <p className="send-to-info-text">
          Your name, phone number, and WhatsApp number will be shared with the companies you select.
        </p>
      </div>

      {/* Inline Error Text */}
      {error && (
        <div className="send-to-error" role="alert">
          <svg
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Full-width 52px Pink Send Button */}
      <div className="send-to-action-wrap">
        <button
          type="button"
          className="send-to-submit-btn"
          disabled={selectedCount === 0}
          onClick={onSend}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default SendToCompanies;
