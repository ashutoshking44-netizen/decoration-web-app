import React from 'react';
import { Sparkles, ShoppingBag, Heart, PhoneCall } from 'lucide-react';

interface NavbarProps {
  quoteCount: number;
  likedCount: number;
  onOpenQuote: () => void;
  onOpenInquiry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  quoteCount,
  likedCount,
  onOpenQuote,
  onOpenInquiry,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#f0e9ea] shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7a4a1d] to-[#e6b566] p-[2px] shadow-sm flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="font-serif-cormorant text-2xl font-bold bg-gradient-to-tr from-[#7a4a1d] to-[#ef5b78] bg-clip-text text-transparent">
                E
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1d1a1c]">
                Everest Events <span className="text-[#ef5b78]">&</span> Decor
              </h1>
              <Sparkles className="w-4 h-4 text-[#ef5b78] hidden sm:inline" />
            </div>
            <p className="text-xs text-[#80777d] tracking-wide font-light hidden sm:block">
              Luxury Wedding & Event Production
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Liked count pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#fde7ed]/50 text-[#ef5b78] text-xs font-medium border border-[#ef5b78]/20">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{likedCount}</span>
          </div>

          {/* Quotation bag button */}
          <button
            onClick={onOpenQuote}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#fff] border border-[#f0e9ea] text-[#1d1a1c] hover:border-[#ef5b78] hover:text-[#ef5b78] transition shadow-sm text-xs font-medium"
            aria-label="View Quotation"
          >
            <ShoppingBag className="w-4 h-4 text-[#ef5b78]" />
            <span className="hidden sm:inline">Quotation</span>
            {quoteCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#ef5b78] text-white text-[11px] font-bold flex items-center justify-center animate-scale">
                {quoteCount}
              </span>
            )}
          </button>

          {/* Inquire CTA */}
          <button
            onClick={onOpenInquiry}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ef5b78] hover:bg-[#e04766] text-white text-xs font-semibold shadow-md shadow-[#ef5b78]/25 transition active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Book Inquiry</span>
          </button>
        </div>
      </div>
    </header>
  );
};

