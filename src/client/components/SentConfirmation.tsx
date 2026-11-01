import React from 'react';

export interface SentConfirmationProps {
  companies?: (string | { id?: string | number; name: string; logo?: string })[];
  onDone?: () => void;
}

export const MOCK_CONFIRMATION_COMPANIES = [
  'Everest Events & Decor',
  'Luminous Decor',
];

/**
 * Format company names into natural language:
 * - 1: "Sent to A. It will send you its own quotation link."
 * - 2: "Sent to A and B. Each will send you its own quotation link."
 * - 3+: "Sent to A, B, and C. Each will send you its own quotation link."
 */
export function formatCompanyListSentence(
  companies: (string | { id?: string | number; name: string; logo?: string })[]
): string {
  const names = companies
    .map((c) => (typeof c === 'string' ? c : c.name))
    .filter(Boolean);

  if (names.length === 0) {
    return 'Sent to selected companies. Each will send you its own quotation link.';
  }
  if (names.length === 1) {
    return `Sent to ${names[0]}. They will send you their quotation link shortly.`;
  }
  if (names.length === 2) {
    return `Sent to ${names[0]} and ${names[1]}. Each will send you its own quotation link.`;
  }
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(', ');
  return `Sent to ${rest}, and ${last}. Each will send you its own quotation link.`;
}

export const SentConfirmation: React.FC<SentConfirmationProps> = ({
  companies = MOCK_CONFIRMATION_COMPANIES,
  onDone,
}) => {
  const messageText = formatCompanyListSentence(companies);

  return (
    <div className="sent-conf-container">
      {/* Pink Check Circle */}
      <div className="sent-conf-icon-wrap" aria-hidden="true">
        <div className="sent-conf-check-circle">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <h2 className="sent-conf-title serif">
        Request <em className="sent-conf-title-accent">sent</em>
      </h2>

      {/* Confirmation text */}
      <p className="sent-conf-desc">{messageText}</p>

      {/* Action Button */}
      <div className="sent-conf-action-wrap">
        <button
          type="button"
          className="sent-conf-btn"
          onClick={onDone}
        >
          Back to decorations
        </button>
      </div>
    </div>
  );
};

export default SentConfirmation;

