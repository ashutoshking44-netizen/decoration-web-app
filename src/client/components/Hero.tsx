import React from 'react';
import { Gem } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fde7ed]/60 via-[#fffafb] to-[#fffafb] pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-[#f0e9ea]/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fde7ed] border border-[#ef5b78]/30 text-[#ef5b78] text-xs font-medium tracking-wide uppercase">
            <Gem className="w-3.5 h-3.5" />
            Bespoke Event Experiences
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif-cormorant font-normal tracking-tight text-[#1d1a1c] leading-[1.15]">
            Crafting Unforgettable <span className="italic text-[#ef5b78]">Moments</span> with Exquisite Decor
          </h2>

          <p className="text-sm sm:text-base text-[#80777d] font-normal max-w-2xl mx-auto">
            Explore our hand-crafted portfolio of wedding stages, floral mandaps, ambient illuminations, and bespoke centerpieces designed for royal celebrations.
          </p>
        </div>
      </div>
    </section>
  );
};

