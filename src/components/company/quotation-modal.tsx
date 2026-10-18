import React from "react";
import { QuotationStudioPage } from "./quotation-studio-page";

export { QuotationStudioPage };
export * from "./quotation-studio-page";
export default QuotationStudioPage;

export function QuotationModal({
  open,
  onOpenChange,
  setup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup?: any;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f0ede8]">
      <QuotationStudioPage initialSetup={setup} onExit={() => onOpenChange(false)} />
    </div>
  );
}
