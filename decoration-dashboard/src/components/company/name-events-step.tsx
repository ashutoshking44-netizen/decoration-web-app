import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trash2,
  Plus,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { toast } from "sonner";
import { type EventScheduleItem } from "@/lib/event-schedule";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ROSE = "hsl(350, 80%, 65%)";
const BORDER = "rgba(180, 150, 140, 0.28)";

const BS_MONTH_DISPLAY = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

export const PREDEFINED_EVENT_CATEGORIES = [
  {
    category: "Main Ceremonies",
    options: ["Wedding", "Reception", "Engagement"],
  },
  {
    category: "Pre-Wedding & Festivities",
    options: [
      "Haldi",
      "Mehendi",
      "Sangeet",
      "Sangeet & Mehendi",
      "Cocktail Party",
      "Welcome Dinner",
    ],
  },
  {
    category: "Celebrations & Parties",
    options: ["Birthday Party", "Anniversary Party", "Family Gathering"],
  },
  {
    category: "Traditional & Cultural",
    options: ["Bratabandha", "Pasni (Rice Feeding)", "Pooja & Hawan"],
  },
  {
    category: "Other",
    options: ["Corporate Event", "Custom Event..."],
  },
];

export const ALL_PREDEFINED_EVENT_TYPES = PREDEFINED_EVENT_CATEGORIES.flatMap(
  (c) => c.options
);

export interface NameEventsStepProps {
  schedule: EventScheduleItem[];
  onScheduleChange: (schedule: EventScheduleItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Format AD date to "Mon, Oct 12, 2026" */
function formatAdSubtitle(iso?: string): string {
  if (!iso) return "Date to be confirmed";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Format Nepali Bikram Sambat date to "Aswin 26, 2083" */
function getBsDateDisplay(iso?: string, existingBs?: string): string {
  if (existingBs && existingBs.trim()) {
    const match = existingBs.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${month} ${day}, ${year}`;
    }
    return existingBs;
  }
  if (!iso) return "Nepali Date";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return existingBs || "Nepali Date";
    const jsDate = new Date(y, m - 1, d);
    const bs = new NepaliDate(jsDate);
    const month = BS_MONTH_DISPLAY[bs.getMonth()] ?? "Aswin";
    return `${month} ${bs.getDate()}, ${bs.getYear()}`;
  } catch {
    return existingBs || "Nepali Date";
  }
}

export function NameEventsStep({
  schedule,
  onScheduleChange,
  onBack,
  onContinue,
}: NameEventsStepProps) {
  // State for Change Event Date dialog
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [draftDateAd, setDraftDateAd] = useState<string>("");

  // State for Custom Name dialog
  const [customNamingEventId, setCustomNamingEventId] = useState<string | null>(null);
  const [customNameDraft, setCustomNameDraft] = useState<string>("");

  const editingEvent = schedule.find((item) => item.id === editingEventId);
  const customNamingEvent = schedule.find((item) => item.id === customNamingEventId);

  const handleSelectChange = (id: string, value: string) => {
    if (value === "Custom Event...") {
      setCustomNamingEventId(id);
      const currentItem = schedule.find((item) => item.id === id);
      setCustomNameDraft(
        currentItem?.isCustom && currentItem.name !== "Custom Event..."
          ? currentItem.name
          : ""
      );
      return;
    }

    const updated = schedule.map((item) =>
      item.id === id ? { ...item, name: value, isCustom: true } : item
    );
    onScheduleChange(updated);
  };

  const handleSaveCustomName = () => {
    if (!customNamingEventId) return;
    const trimmed = customNameDraft.trim();
    if (!trimmed) {
      toast.error("Please enter a custom event name");
      return;
    }
    const updated = schedule.map((item) =>
      item.id === customNamingEventId
        ? { ...item, name: trimmed, isCustom: true }
        : item
    );
    onScheduleChange(updated);
    setCustomNamingEventId(null);
    setCustomNameDraft("");
    toast.success(`Event named "${trimmed}"`);
  };

  const handleDeleteEvent = (id: string) => {
    const toRemove = schedule.find((item) => item.id === id);
    const updated = schedule.filter((item) => item.id !== id);
    onScheduleChange(updated);
    toast.info(toRemove?.name ? `Removed "${toRemove.name}"` : "Event removed");
  };

  const handleOpenChangeDate = (item: EventScheduleItem) => {
    setEditingEventId(item.id);
    setDraftDateAd(item.dateAd || new Date().toISOString().slice(0, 10));
  };

  const handleSaveChangedDate = () => {
    if (!editingEventId || !draftDateAd) return;
    const computedBs = getBsDateDisplay(draftDateAd);
    const updated = schedule.map((item) =>
      item.id === editingEventId
        ? {
            ...item,
            dateAd: draftDateAd,
            dateBs: computedBs,
          }
        : item
    );
    onScheduleChange(updated);
    setEditingEventId(null);
    toast.success(`Event date changed to ${computedBs}`);
  };

  /** Global action: Add single new event at bottom of list */
  const handleAddNewEvent = () => {
    const lastEvent = schedule[schedule.length - 1];
    const targetDateAd = lastEvent?.dateAd || new Date().toISOString().slice(0, 10);
    const targetDateBs = getBsDateDisplay(targetDateAd, lastEvent?.dateBs);

    const newEvent: EventScheduleItem = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      isCustom: false,
      dateAd: targetDateAd,
      dateBs: targetDateBs,
      venueClassification: lastEvent?.venueClassification || "Banquet & Ballroom",
      venueLocation: lastEvent?.venueLocation || "Venue to be confirmed",
      sameAsPreviousVenue: true,
    };
    onScheduleChange([...schedule, newEvent]);
    toast.success("New event added to itinerary");
  };

  const handleContinue = () => {
    const finalized = schedule.map((item, index) => {
      const trimmed = item.name.trim();
      return {
        ...item,
        name: trimmed || `Event ${index + 1}`,
        isCustom: Boolean(trimmed),
      };
    });
    onScheduleChange(finalized);
    onContinue();
  };

  return (
    <div className="w-full">
      {/* Matches the standard full-width layout grid of Steps 1 & 2 */}
      <div className="w-full space-y-6 pb-28 sm:pb-32">
        {/* ─── TOP HEADER BAR: TITLE + LIVE EVENT COUNTER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/70">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Name Your Events
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Select or assign an event name for each scheduled date in your quotation proposal.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fdf2f4] border border-[#f8d7dd] text-[#e14b68] text-xs font-bold shadow-2xs">
              <Sparkles className="size-3.5 text-[#e14b68]" />
              <span>
                {schedule.length} {schedule.length === 1 ? "Event" : "Events"} Planned
              </span>
            </div>
          </div>
        </div>

        {/* ─── EMPTY STATE (IF ALL EVENTS ARE REMOVED) ─── */}
        {schedule.length === 0 ? (
          <div
            className="w-full rounded-2xl border border-dashed px-6 py-14 text-center bg-white shadow-2xs"
            style={{ borderColor: BORDER }}
          >
            <div className="size-12 rounded-2xl bg-rose-50 text-[#e14b68] flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No events currently listed</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              You can go back to Step 2 to select dates from the calendar, or add an event directly below.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-10 px-4 rounded-xl text-xs font-semibold border-stone-200"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Back to Calendar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddNewEvent}
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#e14b68] hover:bg-[#cf3e5a] text-white shadow-xs"
              >
                <Plus className="size-3.5 mr-1" />
                Add an Event
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {schedule.map((item, index) => {
              const bsTitle = getBsDateDisplay(item.dateAd, item.dateBs);
              const adSubtitle = formatAdSubtitle(item.dateAd);
              const isDefaultGenericName =
                !item.isCustom && (item.name === `Event ${index + 1}` || !item.name);
              const selectValue = isDefaultGenericName ? "" : item.name;

              return (
                <div
                  key={item.id}
                  className="w-full rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-[#e14b68]/40 hover:shadow-xs"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                    {/* Left side: Date icon followed by prominent Nepali calendar date */}
                    <div className="md:w-60 lg:w-72 shrink-0 flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-[#fdf2f4] text-[#e14b68] flex items-center justify-center shrink-0">
                        <Calendar className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug truncate">
                          {bsTitle}
                        </h3>
                        <p className="text-xs font-medium text-stone-500 mt-0.5 truncate">
                          {adSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Center: Wide, stretched DROPDOWN selection field */}
                    <div className="flex-1 min-w-0">
                      <Select
                        value={selectValue}
                        onValueChange={(val) => handleSelectChange(item.id, val)}
                      >
                        <SelectTrigger className="h-11 w-full bg-[#f8f7f5] hover:bg-[#f3f2ee] focus:bg-white rounded-xl border border-stone-200/80 focus:border-[#e14b68] focus:ring-2 focus:ring-[#e14b68]/15 px-4 text-sm font-medium text-slate-900 shadow-2xs">
                          <SelectValue placeholder="Name this event" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-stone-200 shadow-xl bg-white max-h-80">
                          {selectValue && !ALL_PREDEFINED_EVENT_TYPES.includes(selectValue) && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1">
                                Current Custom Name
                              </SelectLabel>
                              <SelectItem value={selectValue} className="font-semibold text-slate-900">
                                {selectValue}
                              </SelectItem>
                            </SelectGroup>
                          )}

                          {PREDEFINED_EVENT_CATEGORIES.map((cat) => (
                            <SelectGroup key={cat.category}>
                              <SelectLabel className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1">
                                {cat.category}
                              </SelectLabel>
                              {cat.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-sm">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Right side: Two action buttons */}
                    <div className="shrink-0 flex items-center gap-2.5 justify-end">
                      {/* 1. Change event date button */}
                      <button
                        type="button"
                        onClick={() => handleOpenChangeDate(item)}
                        className="h-10 px-3.5 sm:px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer select-none shrink-0"
                        title="Change date for this event"
                      >
                        <Calendar className="size-4 text-stone-500" aria-hidden="true" />
                        <span>Change event date</span>
                      </button>

                      {/* 2. Delete/Trash icon button inside a clean circular container */}
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(item.id)}
                        className="size-10 rounded-full border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-stone-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer select-none shrink-0"
                        title="Delete this event"
                        aria-label="Delete this event"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ─── GLOBAL "ADD ANOTHER EVENT" ACTION BUTTON CENTERED AT THE BOTTOM ─── */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleAddNewEvent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-stone-300 hover:border-[#e14b68] bg-white hover:bg-[#fdf2f4] text-stone-700 hover:text-[#e14b68] text-sm font-semibold transition-all shadow-2xs cursor-pointer select-none group"
              >
                <div className="size-6 rounded-full bg-rose-50 group-hover:bg-[#e14b68] text-[#e14b68] group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="size-4" />
                </div>
                <span>+ Add another event</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CUSTOM EVENT NAME DIALOG ─── */}
      <Dialog
        open={Boolean(customNamingEventId)}
        onOpenChange={(open) => {
          if (!open) {
            setCustomNamingEventId(null);
            setCustomNameDraft("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Custom Event Name
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Enter a custom name for this ceremony on{" "}
              {customNamingEvent
                ? getBsDateDisplay(customNamingEvent.dateAd, customNamingEvent.dateBs)
                : "this date"}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label
              htmlFor="custom-name-input"
              className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2"
            >
              Event Name
            </label>
            <input
              id="custom-name-input"
              type="text"
              autoFocus
              value={customNameDraft}
              onChange={(e) => setCustomNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveCustomName()}
              placeholder="e.g. Sangeet & Cocktail Sundowner"
              className="w-full h-11 px-4 text-sm font-medium text-slate-900 bg-[#f8f7f5] rounded-xl border border-stone-200 focus:border-[#e14b68] focus:ring-2 focus:ring-[#e14b68]/15 focus:outline-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomNamingEventId(null);
                setCustomNameDraft("");
              }}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCustomName}
              className="rounded-xl text-xs font-semibold bg-[#e14b68] hover:bg-[#cf3e5a] text-white shadow-xs"
            >
              Apply Custom Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CHANGE EVENT DATE DIALOG ─── */}
      <Dialog
        open={Boolean(editingEventId)}
        onOpenChange={(open) => {
          if (!open) setEditingEventId(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Change Event Date
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Select a new date for {editingEvent?.name || "this event"}. The Nepali
              Bikram Sambat date will be updated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label
                htmlFor="dialog-date-picker"
                className="text-[11px] font-bold tracking-wider uppercase text-stone-500 block mb-2"
              >
                Selected English (AD) Date
              </label>
              <input
                id="dialog-date-picker"
                type="date"
                value={draftDateAd}
                onChange={(e) => setDraftDateAd(e.target.value)}
                className="w-full h-11 px-4 text-sm font-semibold text-slate-900 bg-[#f8f7f5] rounded-xl border border-stone-200 focus:border-[#e14b68] focus:ring-2 focus:ring-[#e14b68]/15 focus:outline-none"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#fdf2f4] border border-[#f8d7dd] flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-600">Nepali Calendar (BS):</span>
              <strong className="font-bold text-[#e14b68] text-sm">
                {getBsDateDisplay(draftDateAd)}
              </strong>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingEventId(null)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveChangedDate}
              className="rounded-xl text-xs font-semibold bg-[#e14b68] hover:bg-[#cf3e5a] text-white shadow-xs"
            >
              Save New Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── FIXED BOTTOM NAVIGATION BAR ─── */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ borderColor: BORDER }}
      >
        <div className="w-full px-6 sm:px-10 lg:px-14 py-3 sm:py-3.5">
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 shadow-2xs"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95 shadow-xs"
              style={{ backgroundColor: ROSE }}
            >
              Continue
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NameEventsStep;
