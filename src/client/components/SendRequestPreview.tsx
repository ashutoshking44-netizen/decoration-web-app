import React, { useState } from "react";
import { SendToCompanies, MOCK_COMPANY_GROUPS, CompanyGroup } from "./SendToCompanies";
import { SentConfirmation } from "./SentConfirmation";

export interface SendRequestPreviewProps {
  isOpen?: boolean;
  onClose?: () => void;
  groups?: CompanyGroup[];
}

export const SendRequestPreview: React.FC<SendRequestPreviewProps> = ({
  isOpen = true,
  onClose,
  groups = MOCK_COMPANY_GROUPS,
}) => {
  const [step, setStep] = useState<"select" | "sent">("select");
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>(["c1", "c2"]);
  const [simulatedError, setSimulatedError] = useState<string>("");

  if (!isOpen) return null;

  const handleToggle = (id: string | number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (simulatedError) setSimulatedError("");
  };

  const handleSend = () => {
    if (selectedIds.length === 0) {
      setSimulatedError("Please select at least one company to send your request.");
      return;
    }
    setStep("sent");
  };

  const handleDone = () => {
    if (onClose) {
      onClose();
    } else {
      setStep("select");
    }
  };

  // Resolve selected company names
  const selectedCompanies = groups.filter((g) => selectedIds.includes(g.id)).map((g) => g.name);

  return (
    <div className="send-request-preview-backdrop" onClick={onClose}>
      <div
        className="send-request-preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Send Request Preview"
      >
        {/* Optional Close Button */}
        {onClose && (
          <button
            type="button"
            className="send-request-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            ✕
          </button>
        )}

        {/* View toggle for easy demonstration */}
        <div className="send-request-step-tabs" role="tablist" aria-label="Step preview">
          <button
            type="button"
            role="tab"
            aria-selected={step === "select"}
            className={`step-tab-btn ${step === "select" ? "active" : ""}`}
            onClick={() => setStep("select")}
          >
            1. Select Companies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={step === "sent"}
            className={`step-tab-btn ${step === "sent" ? "active" : ""}`}
            onClick={() => setStep("sent")}
          >
            2. Confirmation Screen
          </button>
        </div>

        {/* Content */}
        {step === "select" ? (
          <SendToCompanies
            groups={groups}
            selected={selectedIds}
            onToggle={handleToggle}
            onSend={handleSend}
            error={simulatedError}
          />
        ) : (
          <SentConfirmation
            companies={
              selectedCompanies.length > 0 ? selectedCompanies : ["Everest Events & Decor"]
            }
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
};

export default SendRequestPreview;
