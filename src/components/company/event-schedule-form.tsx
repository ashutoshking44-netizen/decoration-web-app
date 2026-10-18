import React, { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Flower2,
  Heart,
  PartyPopper,
  Link as LinkIcon,
  Unlink,
  Check,
  Building2,
  Home,
  Clock,
  Info,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type EventScheduleItem,
  COMMON_CEREMONIES,
  POPULAR_EXTRA_CEREMONIES,
  VENUE_CLASSIFICATIONS,
  POPULAR_VENUES,
  BS_MONTH_NAMES,
  convertAdToBs,
  convertBsToAd,
  parseBsText,
  getDaysInBsMonth,
  addDaysToAd,
  createDefaultSchedule,
} from "@/lib/event-schedule";

export interface EventScheduleFormProps {
  initialSchedule?: EventScheduleItem[] | null;
  onSaveSchedule: (schedule: EventScheduleItem[]) => void;
  onBack: () => void;
  onContinue: (schedule: EventScheduleItem[]) => void;
}

export function EventScheduleForm({
  initialSchedule,
  onSaveSchedule,
  onBack,
  onContinue,
}: EventScheduleFormProps) {
  // Initialize schedule with provided items, or default 4 ceremonies
  const [events, setEvents] = useState<EventScheduleItem[]>(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      return initialSchedule;
    }
    return createDefaultSchedule();
  });

  // State for "+ Add Custom Event" popover / input
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customEventName, setCustomEventName] = useState("");
  const [selectedExtraPreset, setSelectedExtraPreset] = useState("");

  // Track which event currently has the BS Date Picker popover open (by event id)
  const [activeBsPickerId, setActiveBsPickerId] = useState<string | null>(null);

  // Auto-sync linked venues whenever an event changes
  useEffect(() => {
    let hasChanges = false;
    const updated = events.map((item, idx) => {
      if (idx > 0 && item.sameAsPreviousVenue) {
        const prev = events[idx - 1];
        if (
          prev &&
          (item.venueLocation !== prev.venueLocation ||
            item.venueClassification !== prev.venueClassification)
        ) {
          hasChanges = true;
          return {
            ...item,
            venueLocation: prev.venueLocation,
            venueClassification: prev.venueClassification,
          };
        }
      }
      return item;
    });

    if (hasChanges) {
      setEvents(updated);
      onSaveSchedule(updated);
    }
  }, [events, onSaveSchedule]);

  // Handle AD date changes -> auto-updates BS date
  const handleAdDateChange = (id: string, newAdIso: string) => {
    const bsInfo = convertAdToBs(newAdIso);
    const updated = events.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        dateAd: newAdIso,
        dateBs: bsInfo ? bsInfo.formatted : item.dateBs,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Handle BS text input changes -> auto-updates AD date if valid
  const handleBsTextChange = (id: string, text: string) => {
    const parsed = parseBsText(text);
    const updated = events.map((item) => {
      if (item.id !== id) return item;
      if (parsed) {
        const newAd = convertBsToAd(parsed.year, parsed.month, parsed.day);
        return {
          ...item,
          dateBs: text,
          dateAd: newAd || item.dateAd,
        };
      }
      return {
        ...item,
        dateBs: text,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Handle BS date selection from picker components
  const handleBsPickerSelect = (id: string, bsYear: number, bsMonth: number, bsDay: number) => {
    const adIso = convertBsToAd(bsYear, bsMonth, bsDay);
    const bsInfo = adIso ? convertAdToBs(adIso) : null;
    const bsFormatted = bsInfo?.formatted || `${BS_MONTH_NAMES[bsMonth]} ${bsDay}, ${bsYear}`;

    const updated = events.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        dateBs: bsFormatted,
        dateAd: adIso || item.dateAd,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
    setActiveBsPickerId(null);
  };

  // Set date to +1 day from previous event
  const handleSetConsecutiveDay = (index: number) => {
    if (index === 0) return;
    const prev = events[index - 1];
    if (!prev || !prev.dateAd) return;
    const nextAd = addDaysToAd(prev.dateAd, 1);
    const nextBs = convertAdToBs(nextAd)?.formatted || "";
    const updated = events.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        dateAd: nextAd,
        dateBs: nextBs,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
    toast.success(`Date synchronized to 1 day after ${prev.name}`);
  };

  // Toggle [Same as previous venue]
  const handleToggleSameVenue = (index: number) => {
    if (index === 0) return;
    const prev = events[index - 1];
    if (!prev) return;
    const updated = events.map((item, idx) => {
      if (idx !== index) return item;
      const nextToggle = !item.sameAsPreviousVenue;
      return {
        ...item,
        sameAsPreviousVenue: nextToggle,
        venueLocation: nextToggle ? prev.venueLocation : item.venueLocation,
        venueClassification: nextToggle ? prev.venueClassification : item.venueClassification,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Update venue location string
  const handleVenueLocationChange = (id: string, val: string) => {
    const updated = events.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        venueLocation: val,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Update venue classification
  const handleVenueClassificationChange = (id: string, val: string) => {
    const updated = events.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        venueClassification: val,
      };
    });
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Toggle or add a common ceremony
  const handleToggleCeremony = (presetName: string) => {
    const existingIndex = events.findIndex(
      (e) => e.name.toLowerCase() === presetName.toLowerCase(),
    );

    if (existingIndex >= 0) {
      if (events.length <= 1) {
        toast.error("At least one ceremony must remain in the schedule.");
        return;
      }
      const filtered = events.filter((_, i) => i !== existingIndex);
      setEvents(filtered);
      onSaveSchedule(filtered);
      toast.info(`Removed ${presetName} from timeline.`);
    } else {
      // Add ceremony to list
      const lastEvent = events[events.length - 1];
      const newAd = lastEvent ? addDaysToAd(lastEvent.dateAd, 1) : "2026-11-27";
      const newBs = convertAdToBs(newAd)?.formatted || "Mangsir 11, 2083";

      const preset = COMMON_CEREMONIES.find(
        (c) => c.name.toLowerCase() === presetName.toLowerCase(),
      );

      const newEvent: EventScheduleItem = {
        id: `evt-${Date.now()}`,
        name: presetName,
        dateAd: newAd,
        dateBs: newBs,
        venueClassification:
          preset?.defaultClassification || lastEvent?.venueClassification || "Banquet & Ballroom",
        venueLocation: lastEvent?.venueLocation || "Majestic Grand, Kathmandu",
        sameAsPreviousVenue: !!lastEvent,
        timing: preset?.defaultTiming || "Afternoon / Evening",
      };

      const updated = [...events, newEvent];
      setEvents(updated);
      onSaveSchedule(updated);
      toast.success(`Added ${presetName} to timeline!`);
    }
  };

  // Add custom event
  const handleAddCustomEvent = (nameToAdd?: string) => {
    const finalName = (nameToAdd || customEventName).trim();
    if (!finalName) {
      toast.error("Please enter a custom ceremony name");
      return;
    }

    const lastEvent = events[events.length - 1];
    const newAd = lastEvent ? addDaysToAd(lastEvent.dateAd, 1) : "2026-11-27";
    const newBs = convertAdToBs(newAd)?.formatted || "Mangsir 11, 2083";

    const newEvent: EventScheduleItem = {
      id: `evt-custom-${Date.now()}`,
      name: finalName,
      isCustom: true,
      dateAd: newAd,
      dateBs: newBs,
      venueClassification: lastEvent?.venueClassification || "Banquet & Ballroom",
      venueLocation: lastEvent?.venueLocation || "Majestic Grand, Kathmandu",
      sameAsPreviousVenue: !!lastEvent,
      timing: "Evening Function",
    };

    const updated = [...events, newEvent];
    setEvents(updated);
    onSaveSchedule(updated);
    setCustomEventName("");
    setSelectedExtraPreset("");
    setShowAddCustom(false);
    toast.success(`Added "${finalName}" to schedule!`);
  };

  // Reorder event
  const handleMoveEvent = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= events.length) return;
    const copy = [...events];
    const [moved] = copy.splice(index, 1);
    if (moved) {
      copy.splice(newIdx, 0, moved);
      setEvents(copy);
      onSaveSchedule(copy);
    }
  };

  // Remove event row
  const handleRemoveEvent = (id: string) => {
    if (events.length <= 1) {
      toast.error("At least one ceremony must remain in the schedule.");
      return;
    }
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    onSaveSchedule(updated);
  };

  // Continue to Step 03
  const handleContinueClick = () => {
    // Validate that each event has a name, valid date, and venue location
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e) continue;
      if (!e.name.trim()) {
        toast.error(`Please provide a name for Ceremony ${i + 1}`);
        return;
      }
      if (!e.dateAd && !e.dateBs) {
        toast.error(`Please provide an event date for ${e.name}`);
        return;
      }
      if (!e.venueLocation.trim()) {
        toast.error(`Please specify a venue location for ${e.name}`);
        return;
      }
    }

    onSaveSchedule(events);
    toast.success("Event schedule saved! Proceeding to catalog selection.");
    onContinue(events);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in-50 duration-300">
      {/* ─── SECTION 1: CEREMONY SELECTOR (MULTI-SELECT / ADD ROW) ─── */}
      <div className="rounded-2xl border border-stone-200/90 bg-[#faf8f7] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#e15b74] uppercase block">
              Event Selector · Multi-Select
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Select Wedding Journey Ceremonies
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Toggle common wedding ceremonies or add custom functions to build the complete
              timeline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-stone-200 text-slate-700 shadow-2xs">
              {events.length} Function{events.length > 1 ? "s" : ""} in Schedule
            </span>
          </div>
        </div>

        {/* Common ceremonies chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {COMMON_CEREMONIES.map((ceremony) => {
            const isSelected = events.some(
              (e) => e.name.toLowerCase() === ceremony.name.toLowerCase(),
            );

            return (
              <button
                key={ceremony.id}
                type="button"
                onClick={() => handleToggleCeremony(ceremony.name)}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group select-none",
                  isSelected
                    ? "bg-white border-[#e14b68] shadow-xs ring-1 ring-[#e14b68]/30"
                    : "bg-white/80 border-stone-200 hover:border-slate-300 hover:bg-white text-slate-700",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                      style={{
                        backgroundColor: isSelected ? "#e14b68" : "#94a3b8",
                      }}
                    >
                      {ceremony.id === "haldi" ? (
                        <Sparkles className="size-3.5" />
                      ) : ceremony.id === "mehendi" ? (
                        <Flower2 className="size-3.5" />
                      ) : ceremony.id === "wedding" ? (
                        <Heart className="size-3.5 fill-white" />
                      ) : (
                        <PartyPopper className="size-3.5" />
                      )}
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-snug">
                      {ceremony.name}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "size-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-colors",
                      isSelected
                        ? "bg-[#e14b68] text-white"
                        : "border border-stone-300 text-transparent group-hover:border-slate-400",
                    )}
                  >
                    <Check className="size-3 stroke-[3]" />
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">{ceremony.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* + Add Custom Event row & quick popover */}
        <div className="mt-4 pt-3.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddCustom((v) => !v)}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-slate-700 hover:border-slate-300 hover:bg-stone-50 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none"
            >
              <Plus className="size-3.5 text-[#e14b68]" />
              <span>+ Add Custom Event</span>
            </button>

            {/* Popular extra ceremonies quick buttons */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Suggestions:</span>
              {POPULAR_EXTRA_CEREMONIES.slice(0, 3).map((extra) => {
                const alreadyAdded = events.some(
                  (e) => e.name.toLowerCase() === extra.toLowerCase(),
                );
                return (
                  <button
                    key={extra}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleAddCustomEvent(extra)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors select-none",
                      alreadyAdded
                        ? "opacity-50 border-stone-200 bg-stone-100 text-slate-400 cursor-not-allowed"
                        : "border-stone-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 cursor-pointer",
                    )}
                  >
                    + {extra}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="size-3.5 text-slate-400" />
            <span>Dates auto-sync between Nepali (BS) and English (AD)</span>
          </div>
        </div>

        {/* Custom Event Creator Expandable Box */}
        {showAddCustom && (
          <div className="mt-3.5 p-4 rounded-xl bg-white border border-stone-200 shadow-2xs animate-in fade-in-50 duration-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              New Custom Function or Ceremony Name
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                autoFocus
                type="text"
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomEvent()}
                placeholder="e.g. Sangeet Night, Ring Ceremony, Groom's Cocktail, Pooja & Hawan"
                className="flex-1 h-10 px-3.5 text-sm rounded-xl bg-[#f8f7f5] border border-stone-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#e14b68]"
              />
              <button
                type="button"
                onClick={() => handleAddCustomEvent()}
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#e14b68] text-white hover:bg-[#cf3e5a] transition-colors cursor-pointer shrink-0 select-none shadow-xs"
              >
                + Add Ceremony
              </button>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="h-10 px-3 rounded-xl text-xs text-slate-500 hover:bg-stone-100 transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
            </div>

            {/* Quick tag selector inside adder */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Click to fill:</span>
              {POPULAR_EXTRA_CEREMONIES.map((extra) => (
                <button
                  key={extra}
                  type="button"
                  onClick={() => setCustomEventName(extra)}
                  className="px-2 py-0.5 rounded text-[10px] bg-stone-100 text-slate-600 hover:bg-stone-200 cursor-pointer"
                >
                  {extra}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 2: TIMELINE CARDS (PER EVENT FORM FIELDS) ─── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-[#e14b68]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Ceremony Timeline &amp; Specific Venues
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Order functions chronologically for accurate crew &amp; setup scheduling
          </span>
        </div>

        {events.map((event, idx) => {
          if (!event) return null;
          const isFirst = idx === 0;
          const isLast = idx === events.length - 1;
          const prevEvent = !isFirst ? (events[idx - 1] ?? null) : null;
          const isPickerOpen = activeBsPickerId === event.id;

          // Parse current date to extract components for BS date picker
          const parsedBs = parseBsText(event.dateBs);
          const currentBsYear = parsedBs?.year || 2083;
          const currentBsMonth = parsedBs?.month ?? 7;
          const currentBsDay = parsedBs?.day || 11;
          const daysInCurrentMonth = getDaysInBsMonth(currentBsYear, currentBsMonth);

          return (
            <div
              key={event.id}
              className={cn(
                "rounded-2xl border bg-white p-5 sm:p-6 shadow-2xs transition-all relative",
                "border-stone-200/90 hover:border-stone-300",
              )}
            >
              {/* Top row: Ceremony Title, badges, and reorder/delete actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-5">
                <div className="flex items-center gap-3">
                  <span className="size-7 rounded-full bg-[#fce7eb] text-[#e14b68] text-xs font-bold flex items-center justify-center shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{event.name}</h4>
                      {event.isCustom && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-slate-600 border border-stone-200">
                          Custom Function
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Ceremony {idx + 1} of {events.length}
                    </span>
                  </div>
                </div>

                {/* Right actions: Move Up / Down & Remove */}
                <div className="flex items-center gap-1">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={() => handleMoveEvent(idx, "up")}
                      title="Move ceremony earlier"
                      className="size-8 rounded-lg border border-stone-200 bg-white text-slate-600 hover:bg-stone-50 flex items-center justify-center cursor-pointer select-none"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                  )}
                  {!isLast && (
                    <button
                      type="button"
                      onClick={() => handleMoveEvent(idx, "down")}
                      title="Move ceremony later"
                      className="size-8 rounded-lg border border-stone-200 bg-white text-slate-600 hover:bg-stone-50 flex items-center justify-center cursor-pointer select-none"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  )}
                  {events.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEvent(event.id)}
                      title={`Remove ${event.name}`}
                      className="size-8 rounded-lg border border-stone-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center ml-1 cursor-pointer select-none"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Inputs Grid: Date Details (Col 1) & Venue Details (Col 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* ─── COLUMN 1: DUAL DATE INPUTS (BS / AD) ─── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-[#e14b68]" />
                      <span>Date Inputs (Per Event)</span>
                    </label>

                    {/* Auto-sync indicator pill */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span>⚡ BS ⇄ AD Synchronized</span>
                    </span>
                  </div>

                  {/* Nepali Date (BS) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Nepali Date (BS) <span className="text-[#e14b68]">*</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveBsPickerId(isPickerOpen ? null : event.id)}
                        className="text-[11px] font-semibold text-[#e15b74] hover:underline flex items-center gap-1 cursor-pointer select-none"
                      >
                        <Calendar className="size-3" />
                        <span>{isPickerOpen ? "Close Picker" : "Open BS Picker"}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Input
                        type="text"
                        value={event.dateBs}
                        onChange={(e) => handleBsTextChange(event.id, e.target.value)}
                        placeholder="e.g. Mangsir 11, 2083"
                        className="h-11 px-3.5 text-sm font-semibold rounded-xl bg-[#fbfaf8] border-stone-200 focus-visible:ring-1 focus-visible:ring-[#e14b68]"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveBsPickerId(isPickerOpen ? null : event.id)}
                        title="Pick BS Date"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-lg bg-white border border-stone-200 text-slate-500 hover:text-slate-800 hover:bg-stone-50 flex items-center justify-center cursor-pointer shadow-2xs"
                      >
                        <Calendar className="size-3.5 text-[#e14b68]" />
                      </button>
                    </div>

                    {/* Integrated BS Date Picker Dropdown */}
                    {isPickerOpen && (
                      <div className="mt-2.5 p-4 rounded-xl border border-stone-200 bg-white shadow-md animate-in fade-in-50 duration-200 z-10">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-3">
                          <span className="text-xs font-bold text-slate-900">
                            Select Bikram Sambat (BS) Date
                          </span>
                          <span className="text-[11px] font-bold text-[#e14b68]">
                            {BS_MONTH_NAMES[currentBsMonth]} {currentBsDay}, {currentBsYear}
                          </span>
                        </div>

                        {/* Year & Month selectors */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              BS YEAR
                            </label>
                            <select
                              value={currentBsYear}
                              onChange={(e) =>
                                handleBsPickerSelect(
                                  event.id,
                                  Number(e.target.value),
                                  currentBsMonth,
                                  Math.min(currentBsDay, 28),
                                )
                              }
                              className="w-full h-8 px-2 text-xs font-semibold rounded-lg bg-[#f8f7f5] border border-stone-200 text-slate-800"
                            >
                              {[2080, 2081, 2082, 2083, 2084, 2085, 2086].map((y) => (
                                <option key={y} value={y}>
                                  {y} BS
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              BS MONTH
                            </label>
                            <select
                              value={currentBsMonth}
                              onChange={(e) =>
                                handleBsPickerSelect(
                                  event.id,
                                  currentBsYear,
                                  Number(e.target.value),
                                  Math.min(
                                    currentBsDay,
                                    getDaysInBsMonth(currentBsYear, Number(e.target.value)),
                                  ),
                                )
                              }
                              className="w-full h-8 px-2 text-xs font-semibold rounded-lg bg-[#f8f7f5] border border-stone-200 text-slate-800"
                            >
                              {BS_MONTH_NAMES.map((m, idx) => (
                                <option key={m} value={idx}>
                                  {m} ({idx + 1})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Day numbers grid */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1.5">
                            SELECT DAY (GATTE)
                          </label>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                              const dayNum = i + 1;
                              const isSelectedDay = dayNum === currentBsDay;
                              return (
                                <button
                                  key={dayNum}
                                  type="button"
                                  onClick={() =>
                                    handleBsPickerSelect(
                                      event.id,
                                      currentBsYear,
                                      currentBsMonth,
                                      dayNum,
                                    )
                                  }
                                  className={cn(
                                    "h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer",
                                    isSelectedDay
                                      ? "bg-[#e14b68] text-white font-bold shadow-2xs"
                                      : "hover:bg-stone-100 text-slate-700 bg-[#fbfaf8]",
                                  )}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* English Date (AD) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">
                        English Date (AD) <span className="text-[#e14b68]">*</span>
                      </span>

                      {!isFirst && prevEvent?.dateAd && (
                        <button
                          type="button"
                          onClick={() => handleSetConsecutiveDay(idx)}
                          className="text-[11px] font-semibold text-[#e15b74] hover:underline cursor-pointer select-none"
                        >
                          +1 Day from {prevEvent.name}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        type="date"
                        value={event.dateAd}
                        onChange={(e) => handleAdDateChange(event.id, e.target.value)}
                        className="h-11 px-3.5 text-sm font-semibold rounded-xl bg-[#fbfaf8] border-stone-200 focus-visible:ring-1 focus-visible:ring-[#e14b68]"
                      />
                    </div>

                    {/* Human readable AD date pill */}
                    {event.dateAd && (
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock className="size-3 text-slate-400" />
                        <span>
                          {new Date(event.dateAd + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* ─── COLUMN 2: VENUE DETAILS & SAME AS PREVIOUS TOGGLE ─── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[#e14b68]" />
                      <span>Venue Details (Per Event)</span>
                    </label>

                    {/* Quick toggle: [Same as previous venue] (available on event 2+) */}
                    {!isFirst && prevEvent && (
                      <button
                        type="button"
                        onClick={() => handleToggleSameVenue(idx)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-2xs",
                          event.sameAsPreviousVenue
                            ? "bg-[#e14b68] text-white"
                            : "bg-white border border-stone-200 text-slate-600 hover:border-slate-300 hover:bg-stone-50",
                        )}
                        title={`Toggle same venue as ${prevEvent.name}`}
                      >
                        {event.sameAsPreviousVenue ? (
                          <LinkIcon className="size-3 stroke-[2.5]" />
                        ) : (
                          <Unlink className="size-3" />
                        )}
                        <span>[Same as previous venue]</span>
                      </button>
                    )}
                  </div>

                  {/* Inherited notification badge if sameAsPreviousVenue is active */}
                  {event.sameAsPreviousVenue && prevEvent && (
                    <div className="p-2.5 rounded-xl bg-pink-50/70 border border-pink-200/80 text-[11px] text-pink-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <LinkIcon className="size-3.5 text-[#e14b68] shrink-0" />
                        <span>
                          Linked to {prevEvent.name} venue:{" "}
                          <strong>{prevEvent.venueLocation || "Residence"}</strong>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSameVenue(idx)}
                        className="text-[10px] font-bold text-[#e14b68] hover:underline underline-offset-2 cursor-pointer ml-2"
                      >
                        Unlock / Edit
                      </button>
                    </div>
                  )}

                  {/* Venue Classification Dropdown */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Venue Classification
                    </label>
                    <select
                      disabled={event.sameAsPreviousVenue}
                      value={event.venueClassification}
                      onChange={(e) => handleVenueClassificationChange(event.id, e.target.value)}
                      className={cn(
                        "w-full h-11 px-3.5 text-xs font-semibold rounded-xl border transition-colors",
                        event.sameAsPreviousVenue
                          ? "bg-stone-100 text-slate-400 border-stone-200 cursor-not-allowed"
                          : "bg-[#fbfaf8] border-stone-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#e14b68]",
                      )}
                    >
                      {VENUE_CLASSIFICATIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Specific Venue Name / Location Text input */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Specific Venue &amp; Location <span className="text-[#e14b68]">*</span>
                    </label>
                    <Input
                      disabled={event.sameAsPreviousVenue}
                      type="text"
                      value={event.venueLocation}
                      onChange={(e) => handleVenueLocationChange(event.id, e.target.value)}
                      placeholder="e.g. Residence, Bhaisepati vs. Majestic Grand, Kathmandu"
                      className={cn(
                        "h-11 px-3.5 text-sm font-semibold rounded-xl transition-colors",
                        event.sameAsPreviousVenue
                          ? "bg-stone-100 text-slate-400 border-stone-200 cursor-not-allowed"
                          : "bg-[#fbfaf8] border-stone-200 text-slate-900 focus-visible:ring-1 focus-visible:ring-[#e14b68]",
                      )}
                    />

                    {/* Quick popular venue suggestions chips */}
                    {!event.sameAsPreviousVenue && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 mr-1">Popular:</span>
                        {POPULAR_VENUES.slice(0, 4).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleVenueLocationChange(event.id, v)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f3f2ee] text-slate-700 hover:bg-stone-200 transition-colors cursor-pointer select-none"
                          >
                            {v.split(",")[0]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── SECTION 3: VISUAL WEDDING JOURNEY TIMELINE STRIP ─── */}
      <div className="rounded-2xl border border-stone-200 bg-[#faf8f7] p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Wedding Journey Summary Timeline
          </span>
          <span className="text-xs font-semibold text-[#e14b68]">
            {events.length} Ceremony Milestone{events.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2 overflow-x-auto pb-1">
          {events.map((evt, idx) => {
            if (!evt) return null;
            const isLast = idx === events.length - 1;
            return (
              <React.Fragment key={evt.id}>
                <div className="p-3 rounded-xl bg-white border border-stone-200/90 shadow-2xs min-w-[200px] shrink-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-[#e14b68] uppercase">
                      Day {idx + 1}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-slate-600 truncate max-w-[120px]">
                      {evt.venueClassification.split(" ")[0]}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 truncate">{evt.name}</h5>
                  <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
                    {evt.dateBs}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-1">
                    <MapPin className="size-3 text-slate-400 shrink-0" />
                    <span>{evt.venueLocation || "Venue TBD"}</span>
                  </p>
                </div>

                {!isLast && (
                  <div className="hidden md:flex items-center justify-center shrink-0 text-slate-300">
                    <ChevronRight className="size-5" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 4: NAVIGATION ACTIONS ─── */}
      <div className="pt-4 border-t border-stone-200/80 flex items-center justify-between gap-3">
        {/* < Back (returns to Step 01: Client & Contact Details) */}
        <button
          type="button"
          onClick={onBack}
          className="h-11 px-5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-stone-50 transition-colors cursor-pointer shrink-0 select-none shadow-2xs"
        >
          <ChevronLeft className="size-4" />
          <span>&lt; Back (Step 01: Client Details)</span>
        </button>

        {/* Continue > (saves the schedule and proceeds to Step 03: Catalog Card Selection) */}
        <button
          type="button"
          onClick={handleContinueClick}
          className="h-11 px-8 rounded-xl text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:opacity-95 select-none"
          style={{
            backgroundColor: "#db7f90",
          }}
        >
          <span>Continue &gt; (Step 03: Catalog Card Selection)</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default EventScheduleForm;
