import React from 'react';
import { DecorationItem } from '../types';
import { Heart, Plus, Check, Eye } from 'lucide-react';
import { getDecorationSlug } from '../lib/slug';

interface DecorationCardProps {
  item: DecorationItem;
  isLiked: boolean;
  isInQuote?: boolean;
  onToggleLike: (id: number) => void;
  onToggleQuote?: (id: number) => void;
  onQuickView?: (item: DecorationItem) => void;
}

export const DecorationCard: React.FC<DecorationCardProps> = ({
  item,
  isLiked,
  onToggleLike,
  onQuickView,
}) => {
  const formattedPrice = 'Rs. ' + item.p.toLocaleString('en-IN');

  return (
    <article className="post group relative cursor-pointer bg-white rounded-2xl border border-[#f0e9ea] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#f25c7a]/15 hover:-translate-y-1 transition-all duration-300 flex flex-col focus-within:outline-none focus-within:ring-2 focus-within:ring-[#f25c7a]">
      {/* Image container */}
      <div className="ph relative aspect-[4/5] overflow-hidden bg-[#f5f2f4] w-full">
        <img
          src={item.img}
          alt={item.t}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Gradient vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none z-[1]" />

        {/* Top badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-[2] pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold text-[#1d1a1c] shadow-sm max-w-[70%] truncate">
            {item.vendor}
          </span>
          {item.imagesCount && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-medium text-white">
              1/{item.imagesCount}
            </span>
          )}
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3 z-[2] pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-medium text-[#1d1a1c] shadow-sm">
            {item.cat}
          </span>
        </div>

        {/* Heart save button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(item.id);
          }}
          className={`heart absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm transition-transform active:scale-90 z-[2] ${
            isLiked
              ? 'bg-[#ef5b78] text-white shadow-[#ef5b78]/30'
              : 'bg-white/90 text-[#80777d] hover:text-[#ef5b78] hover:bg-white'
          }`}
          aria-label={isLiked ? `Saved ${item.t}` : `Save ${item.t}`}
          aria-pressed={isLiked}
        >
          <Heart
            className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="pb p-4 flex flex-col flex-1 justify-between gap-2">
        <h4 className="post-title font-serif-cormorant text-xl font-medium text-[#1d1a1c] tracking-tight leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-[#ef5b78] transition-colors">
          <a
            href={`/decor/${getDecorationSlug(item)}`}
            className="post-title-link text-left outline-none after:absolute after:inset-0 after:z-[1] cursor-pointer"
          >
            {item.t}
          </a>
        </h4>

        <div className="post-price-line w-full text-xs text-[#80777d]">
          From{' '}
          <span className="price font-semibold text-sm text-[#1d1a1c]">
            {formattedPrice}
          </span>
          {item.u && (
            <span className="ml-1 text-[#80777d]">{item.u}</span>
          )}
        </div>
      </div>
    </article>
  );
};

