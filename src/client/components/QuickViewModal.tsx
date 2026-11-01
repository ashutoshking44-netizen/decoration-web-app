import React from 'react';
import { DecorationItem } from '../types';
import { X, Heart, Plus, Check, PhoneCall, Tag } from 'lucide-react';

interface QuickViewModalProps {
  item: DecorationItem | null;
  isLiked: boolean;
  isInQuote: boolean;
  onClose: () => void;
  onToggleLike: (id: number) => void;
  onToggleQuote: (id: number) => void;
  onOpenInquiry: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  item,
  isLiked,
  isInQuote,
  onClose,
  onToggleLike,
  onToggleQuote,
  onOpenInquiry,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[92vh]">
        {/* Image panel */}
        <div className="relative w-full sm:w-2/5 aspect-[4/5] sm:aspect-auto sm:min-h-[420px] flex-shrink-0">
          <img
            src={item.img}
            alt={item.t}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow sm:hidden"
          >
            <X className="w-5 h-5 text-[#1d1a1c]" />
          </button>

          {/* Category badge */}
          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-[#1d1a1c]">
            {item.cat}
          </span>
        </div>

        {/* Content panel */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Close desktop */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-[#f0e9ea] hidden sm:flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-[#80777d]" />
          </button>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-[#80777d] font-medium mb-1">{item.vendor}</p>
              <h2 className="font-serif-cormorant text-2xl font-medium text-[#1d1a1c] leading-snug">
                {item.t}
              </h2>
            </div>

            <p className="text-sm text-[#80777d] leading-relaxed">{item.d}</p>

            {/* Tags */}
            {item.tags && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0e9ea] text-[#80777d] text-[11px] font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Pricing */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#fde7ed]/40 to-white border border-[#f0e9ea]">
              <span className="text-xs text-[#80777d]">Starting from</span>
              <p className="font-serif-cormorant text-3xl font-medium text-[#1d1a1c] mt-1">
                Rs. {item.p.toLocaleString('en-IN')}
                {item.u && <span className="text-base font-sans font-normal text-[#80777d]">{item.u}</span>}
              </p>
              <p className="text-xs text-[#80777d] mt-1">
                Includes setup, styling & professional installation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3 border-t border-[#f0e9ea] mt-4">
            <div className="flex gap-3">
              <button
                onClick={() => onToggleLike(item.id)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition active:scale-90 ${
                  isLiked
                    ? 'bg-[#ef5b78] border-[#ef5b78] text-white'
                    : 'border-[#f0e9ea] text-[#80777d] hover:border-[#ef5b78] hover:text-[#ef5b78]'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => onToggleQuote(item.id)}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 ${
                  isInQuote
                    ? 'bg-[#fde7ed] text-[#ef5b78] border border-[#ef5b78]/30 hover:bg-[#ef5b78] hover:text-white'
                    : 'bg-[#ef5b78] hover:bg-[#e04766] text-white shadow-md shadow-[#ef5b78]/25'
                }`}
              >
                {isInQuote ? (
                  <><Check className="w-4 h-4" /> Added to Quotation</>
                ) : (
                  <><Plus className="w-4 h-4" /> Add to Quotation</>
                )}
              </button>
            </div>

            <button
              onClick={() => { onClose(); onOpenInquiry(); }}
              className="w-full py-2.5 rounded-full border border-[#f0e9ea] text-[#1d1a1c] hover:bg-[#f0e9ea] text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-[#ef5b78]" />
              Inquire About This Package
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

