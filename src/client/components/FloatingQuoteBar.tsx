import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingQuoteBarProps {
  quoteCount: number;
  totalEstimate: number;
  onOpenQuote: () => void;
}

export const FloatingQuoteBar: React.FC<FloatingQuoteBarProps> = ({
  quoteCount,
  totalEstimate,
  onOpenQuote,
}) => {
  if (quoteCount === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-0 z-30 flex justify-center px-4 pointer-events-none animate-slide-up">
      <div className="pointer-events-auto bg-[#1d1a1c] text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ef5b78] flex items-center justify-center font-bold text-xs text-white">
            {quoteCount}
          </div>
          <div className="text-xs">
            <span className="font-semibold block sm:inline">
              {quoteCount} item{quoteCount > 1 ? 's' : ''} selected
            </span>
            <span className="text-[#a49ca1] sm:ml-2">
              Est. ~Rs. {totalEstimate.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenQuote}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ef5b78] hover:bg-[#e04766] text-white text-xs font-semibold shadow-md transition active:scale-95"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>View Quotation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

