import React from 'react';
import { Category } from '../types';
import { CATEGORIES } from '../data/decorations';
import {
  LayoutGrid,
  Sparkles,
  DoorOpen,
  Landmark,
  UtensilsCrossed,
  Camera,
  ClipboardList,
} from 'lucide-react';

interface CategoryChipsProps {
  categories?: readonly Category[];
  selectedCategory: Category | string;
  onSelectCategory: (category: Category | string) => void;
  counts: Record<string, number>;
}

const CATEGORY_ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  All: LayoutGrid,
  Stage: Sparkles,
  Entrance: DoorOpen,
  Mandap: Landmark,
  Table: UtensilsCrossed,
  Backdrops: Camera,
  'Welcome Board': ClipboardList,
};

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories = CATEGORIES,
  selectedCategory,
  onSelectCategory,
  counts,
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-none justify-start md:justify-center">
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat] || LayoutGrid;
        const isSelected = selectedCategory === cat;
        const count = counts[cat] || 0;

        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all shrink-0 border ${
              isSelected
                ? 'bg-white text-[#ef5b78] border-[#ef5b78] shadow-md shadow-[#ef5b78]/15 ring-2 ring-[#ef5b78]/10'
                : 'bg-white/70 hover:bg-white text-[#80777d] hover:text-[#1d1a1c] border-[#f0e9ea] hover:border-[#dfd3d6]'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                isSelected
                  ? 'bg-[#ef5b78] text-white'
                  : 'bg-[#f4eff1] text-[#80777d] group-hover:text-[#ef5b78] group-hover:bg-[#fde7ed]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span>{cat}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                isSelected
                  ? 'bg-[#fde7ed] text-[#ef5b78]'
                  : 'bg-[#f0e9ea] text-[#80777d]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

