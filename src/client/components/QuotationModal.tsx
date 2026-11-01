import React from 'react';
import { DecorationItem } from '../types';
import { X, ShoppingBag, Trash2, PhoneCall } from 'lucide-react';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DecorationItem[];
  onClearAll: () => void;
  onRemoveItem: (id: number) => void;
  onOpenInquiry: () => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  items,
  onClearAll,
  onRemoveItem,
  onOpenInquiry,
}) => {
  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.p, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0e9ea]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fde7ed] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#ef5b78]" />
            </div>
            <div>
              <h2 className="font-serif-cormorant text-2xl font-medium text-[#1d1a1c]">Your Quotation</h2>
              <p className="text-xs text-[#80777d]">{items.length} item{items.length !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-[#f0e9ea] flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-[#80777d]" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#e2d9dc] mx-auto mb-3" />
              <p className="text-[#80777d] text-sm">No items in your quotation yet.</p>
              <p className="text-[#a49ca1] text-xs mt-1">Browse decorations and click "Add Quote".</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-[#f0e9ea] hover:border-[#ef5b78]/20 hover:bg-[#fde7ed]/10 transition group"
              >
                <img
                  src={item.img}
                  alt={item.t}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-[#1d1a1c] line-clamp-1">{item.t}</h4>
                  <p className="text-xs text-[#80777d] mt-0.5">{item.cat} · {item.vendor}</p>
                  <p className="text-sm font-semibold text-[#ef5b78] mt-1">
                    Rs. {item.p.toLocaleString('en-IN')}{item.u || ''}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#a49ca1] hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t border-[#f0e9ea] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#80777d]">Estimated Total</span>
              <div className="text-right">
                <span className="text-xs text-[#80777d] block">from</span>
                <span className="font-serif-cormorant text-2xl font-medium text-[#1d1a1c]">
                  Rs. {total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClearAll}
                className="flex-1 py-2.5 rounded-full border border-[#f0e9ea] text-[#80777d] hover:bg-[#f0e9ea] text-sm font-medium transition"
              >
                Clear All
              </button>
              <button
                onClick={() => { onClose(); onOpenInquiry(); }}
                className="flex-1 py-2.5 rounded-full bg-[#ef5b78] hover:bg-[#e04766] text-white text-sm font-semibold shadow-md shadow-[#ef5b78]/25 transition flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                Request Quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

