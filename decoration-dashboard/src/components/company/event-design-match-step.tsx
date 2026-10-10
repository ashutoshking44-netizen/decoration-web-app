import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ImagePlus,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage, type DecorationSetupItem } from "@/lib/decoration-setups";
import { extractPrice } from "./decoration-catalog-card";
import {
  availabilityOf,
  designMatchProblem,
  sameDecorationCategory,
  type DesignAvailability,
  type DesignMatchAnswer,
  type DesignPick,
} from "@/lib/design-match";

const ROSE = "#e14b68";

const AVAILABILITY_OPTIONS: { value: DesignAvailability; label: string }[] = [
  { value: "exact", label: "Exact Match" },
  { value: "similar", label: "Similar Design" },
];

export interface EventDesignMatchStepProps {
  eventName: string;
  activeEventIndex: number;
  totalEvents: number;
  nextEventName?: string | undefined;
  /** Designs the client picked from our catalogue for this event. */
  ourPicks: DesignPick[];
  /** Designs the client picked from other companies for this event. */
  references: DesignPick[];
  /** Our own catalogue designs (filtered by category per reference here). */
  ourCatalog: DecorationSetupItem[];
  answers: Record<string, DesignMatchAnswer>;
  onChangeAnswer: (ref: DesignPick, next: DesignMatchAnswer) => void;
  clientNote?: string | undefined;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 4 — Configure Event, for events where the client picked a design from
 * another company: compares the client's picks and records how we will provide
 * each inspiration design (a catalogue design, or a screenshot and written
 * requirements).
 */
export function EventDesignMatchStep({
  eventName,
  activeEventIndex,
  totalEvents,
  nextEventName,
  ourPicks,
  references,
  ourCatalog,
  answers,
  onChangeAnswer,
  clientNote,
  onBack,
  onContinue,
}: EventDesignMatchStepProps) {
  const [showErrors, setShowErrors] = useState(false);
  /** Key of the inspiration whose catalogue overlay is open. */
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const continuing = useRef(false);

  const handleContinue = () => {
    if (continuing.current) return; // ignore repeated clicks
    const firstInvalid = references.find((r) => designMatchProblem(answers[r.key]));
    if (firstInvalid) {
      setShowErrors(true);
      toast.error(designMatchProblem(answers[firstInvalid.key]) || "Please complete this step.");
      document
        .getElementById(`design-match-${firstInvalid.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    continuing.current = true;
    onContinue();
    // The step changes on continue; allow again if it does not.
    setTimeout(() => {
      continuing.current = false;
    }, 600);
  };

  /** Select (or, when clicked again, unselect) the answer to "Can we provide this design?". */
  const setAvailability = (
    ref: DesignPick,
    a: DesignMatchAnswer,
    next: DesignAvailability | null,
  ) => {
    if (!next) {
      // Unselected: clear the dependent matching method (hides the second card).
      // The picked design, screenshot and description stay in the answer.
      onChangeAnswer(ref, { ...a, availability: null, hasSimilar: undefined, method: null });
      return;
    }
    // Exact Match is complete on its own (no matching method). Similar Design
    // starts with no method chosen. Picked design / screenshot / description
    // stay in the answer either way.
    onChangeAnswer(ref, { ...a, availability: next, hasSimilar: undefined, method: null });
  };

  return (
    <div className="space-y-5 w-full animate-in fade-in-50 duration-300">
      <div className="w-full space-y-4 pb-28 sm:pb-32">
        {clientNote?.trim() && (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600">
            <span className="font-semibold text-stone-800">Client's note: </span>
            <span className="whitespace-pre-line">{clientNote.trim()}</span>
          </p>
        )}

        {/* ── Left: our design · Right: the client's inspiration, with its questions inside ── */}
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            {ourPicks.length > 0 ? (
              ourPicks.map((p) => <DesignCard key={p.key} pick={p} tone="ours" />)
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 text-center text-sm text-stone-500">
                No design from our catalogue was selected for {eventName}.
              </div>
            )}
          </div>

          <div className="space-y-3">
            {references.map((ref) => {
              const a = answers[ref.key];
              const av = availabilityOf(a);
              const problem = showErrors ? designMatchProblem(a) : null;
              return (
                <DesignCard
                  key={ref.key}
                  pick={ref}
                  tone="reference"
                  id={`design-match-${ref.key}`}
                >
                  {/* Card 1 — availability */}
                  <ChoiceGroup
                    question="Can we provide this design?"
                    columns={2}
                    value={av}
                    options={AVAILABILITY_OPTIONS}
                    onChange={(v) => a && setAvailability(ref, a, v)}
                  />

                  {/* Card 2 — how we match it (Similar Design only; Exact Match needs nothing more) */}
                  {a && av === "similar" && (
                    <ChoiceGroup
                      question="How would you like to match this design?"
                      columns={2}
                      value={a.method}
                      options={[
                        {
                          value: "catalog",
                          label: "Choose from Our Designs",
                          hint: "Pick a matching design from our catalogue.",
                          icon: <LayoutGrid className="size-3.5" />,
                        },
                        {
                          value: "upload",
                          label: "Upload a Screenshot",
                          hint: "Upload a reference and describe the details.",
                          icon: <ImagePlus className="size-3.5" />,
                        },
                      ]}
                      // Unselecting only hides the content; the picked design,
                      // screenshot and description stay in the answer.
                      onChange={(v) => {
                        onChangeAnswer(ref, { ...a, method: v });
                        // Open the catalogue straight away when nothing is picked yet.
                        if (v === "catalog" && !a.matchedSetupId) setPickerFor(ref.key);
                      }}
                    >
                      {a.method === "catalog" && (
                        <CatalogMatchSummary
                          reference={ref}
                          catalog={ourCatalog}
                          selectedId={a.matchedSetupId}
                          selectedName={a.matchedSetupName}
                          onOpen={() => setPickerFor(ref.key)}
                        />
                      )}
                      {a.method === "upload" && (
                        <ScreenshotRequirements
                          answer={a}
                          onChange={(patch) => onChangeAnswer(ref, { ...a, ...patch })}
                        />
                      )}
                    </ChoiceGroup>
                  )}

                  {problem && <ProblemText text={problem} />}

                  {a && (
                    <CatalogPickerDialog
                      open={pickerFor === ref.key}
                      onOpenChange={(open) => setPickerFor(open ? ref.key : null)}
                      reference={ref}
                      catalog={ourCatalog}
                      selectedId={a.matchedSetupId}
                      onConfirm={(setup) => {
                        onChangeAnswer(ref, {
                          ...a,
                          matchedSetupId: setup.id,
                          matchedSetupName: setup.name,
                        });
                        setPickerFor(null);
                      }}
                    />
                  )}
                </DesignCard>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── FIXED BOTTOM STICKY FOOTER NAVIGATION BAR (same as the catalogue step) ─── */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-stone-200/90 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="w-full px-6 sm:px-10 lg:px-14 py-3 sm:py-3.5">
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 shadow-2xs select-none"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95 shadow-xs select-none"
              style={{ backgroundColor: ROSE }}
            >
              <span>
                {activeEventIndex < totalEvents - 1
                  ? `Save & Configure Event ${activeEventIndex + 2} (${nextEventName || "Next Event"})`
                  : "Save All Events & Continue to Pricing"}
              </span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignCard({
  pick,
  tone,
  id,
  children,
}: {
  pick: DesignPick;
  tone: "ours" | "reference";
  id?: string | undefined;
  /** Shown inside the card, below the design details (the questions for an inspiration). */
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <article
      id={id}
      className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xs"
    >
      <div className="h-40 w-full bg-stone-100 sm:h-44">
        {pick.image && !broken ? (
          <img
            src={pick.image}
            alt={pick.name}
            className="size-full object-cover"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center gap-1.5 text-xs text-stone-400">
            <ImageIcon className="size-5" />
            No image
          </div>
        )}
      </div>
      <div className="space-y-1 px-3.5 py-3">
        <p
          className={cn(
            "text-[11px] font-semibold",
            tone === "ours" ? "text-emerald-700" : "text-amber-700",
          )}
        >
          {tone === "ours" ? "Our Catalogue" : "Client's Inspiration"}
        </p>
        <h4 className="truncate text-sm font-semibold text-stone-900" title={pick.name}>
          {pick.name}
        </h4>
        <p className="truncate text-xs text-stone-500">
          {[pick.category, tone === "reference" ? pick.companyName : undefined]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {children && (
        <div className="space-y-3.5 border-t border-stone-100 px-3.5 pb-3.5 pt-3">{children}</div>
      )}
    </article>
  );
}

/**
 * One question as a compact card. Choices are single-select; clicking the
 * selected choice again unselects it (onChange(null)). `children` is the
 * content for the current choice, shown inside the same card.
 */
function ChoiceGroup<T extends string>({
  question,
  value,
  options,
  columns,
  onChange,
  children,
}: {
  question: string;
  value: T | null;
  options: { value: T; label: string; hint?: string; icon?: React.ReactNode }[];
  columns: 2 | 3;
  onChange: (v: T | null) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
      <div className="space-y-2" role="radiogroup" aria-label={question}>
        <p className="text-[13px] font-semibold text-stone-800">{question}</p>
        <div
          className={cn(
            "grid gap-2",
            columns === 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {options.map((o) => {
            const selected = value === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                title={selected ? "Click again to unselect" : undefined}
                onClick={() => onChange(selected ? null : o.value)}
                className={cn(
                  "flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-[#e14b68] bg-[#fff6f8]"
                    : "border-stone-200 hover:border-stone-300",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border",
                    selected ? "border-[#e14b68] bg-[#e14b68] text-white" : "border-stone-300",
                  )}
                >
                  {selected && <Check className="size-2.5" strokeWidth={3.5} />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium leading-tight text-stone-900">
                    {o.icon}
                    {o.label}
                  </span>
                  {o.hint && (
                    <span
                      className="mt-0.5 block truncate text-[11px] text-stone-500"
                      title={o.hint}
                    >
                      {o.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Our designs in the same category as the client's inspiration. */
function useCategoryMatches(catalog: DecorationSetupItem[], category: string) {
  return useMemo(
    () => catalog.filter((s) => sameDecorationCategory(s.category, category)),
    [catalog, category],
  );
}

const setupImage = (s: DecorationSetupItem) => s.imageUrl || s.gallery?.[0];

const setupMeta = (category: string | undefined, price: number) =>
  [category, price > 0 ? `From Rs. ${price.toLocaleString("en-IN")}` : ""]
    .filter(Boolean)
    .join(" · ");

/** Inside the inspiration card: the confirmed design (with Change), or a button to browse. */
function CatalogMatchSummary({
  reference,
  catalog,
  selectedId,
  selectedName,
  onOpen,
}: {
  reference: DesignPick;
  catalog: DecorationSetupItem[];
  selectedId?: string | undefined;
  selectedName?: string | undefined;
  onOpen: () => void;
}) {
  const matches = useCategoryMatches(catalog, reference.category);

  if (selectedId) {
    const selected = catalog.find((s) => s.id === selectedId);
    const image = selected ? setupImage(selected) : undefined;
    const name = selected?.name || selectedName || "Selected design";
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#e14b68]/40 bg-white p-2 animate-in fade-in-50 duration-200">
        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-stone-100">
          {image ? (
            <img src={image} alt={name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-stone-400">
              <ImageIcon className="size-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[#e14b68]">
            <Check className="size-3" strokeWidth={3} /> Selected design
          </p>
          <p className="truncate text-sm font-semibold text-stone-900" title={name}>
            {name}
          </p>
          <p className="truncate text-[11px] text-stone-500">
            {setupMeta(
              selected?.category || reference.category,
              selected ? extractPrice(selected) : 0,
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-[#e14b68] hover:bg-[#fff6f8]"
    >
      <LayoutGrid className="size-4 text-stone-400" />
      Browse our {reference.category} designs ({matches.length})
    </button>
  );
}

/** Overlay with our catalogue (same category only); the pick is applied on Confirm Selection. */
function CatalogPickerDialog({
  open,
  onOpenChange,
  reference,
  catalog,
  selectedId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: DesignPick;
  catalog: DecorationSetupItem[];
  selectedId?: string | undefined;
  onConfirm: (setup: DecorationSetupItem) => void;
}) {
  const matches = useCategoryMatches(catalog, reference.category);
  // Draft pick inside the overlay; closing without confirming discards it.
  const [draftId, setDraftId] = useState<string | undefined>(selectedId);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraftId(selectedId);
  }
  const draft = matches.find((s) => s.id === draftId);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-stone-900/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[88dvh] max-w-3xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start gap-3 border-b border-stone-100 px-5 py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-base font-semibold text-stone-900">
                Choose from Our Designs
              </DialogPrimitive.Title>
              <p className="mt-0.5 truncate text-xs text-stone-500">
                {reference.category} · {matches.length} design{matches.length === 1 ? "" : "s"}{" "}
                similar to “{reference.name}”
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {matches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                We don't have any {reference.category || "matching"} designs in our catalogue yet —
                choose <span className="font-semibold text-stone-700">Upload a Screenshot</span>{" "}
                instead.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {matches.map((s) => {
                  const selected = s.id === draftId;
                  const image = setupImage(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDraftId(s.id)}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-white text-left transition-all duration-150",
                        selected
                          ? "border-[#e14b68] ring-2 ring-[#e14b68]/25"
                          : "border-stone-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm",
                      )}
                    >
                      <div className="relative aspect-[4/3] bg-stone-100">
                        {image ? (
                          <img
                            src={image}
                            alt={s.name}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-stone-400">
                            <ImageIcon className="size-5" />
                          </div>
                        )}
                        {selected && (
                          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-[#e14b68] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm animate-in zoom-in-75 duration-150">
                            <Check className="size-2.5" strokeWidth={3.5} /> Selected
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 px-2.5 py-2">
                        <p className="truncate text-xs font-semibold text-stone-900" title={s.name}>
                          {s.name}
                        </p>
                        <p className="truncate text-[11px] text-stone-500">
                          {setupMeta(s.category, extractPrice(s))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-stone-100 bg-stone-50/70 px-5 py-3">
            <p className="hidden min-w-0 flex-1 truncate text-xs text-stone-500 sm:block">
              {draft ? (
                <>
                  Selected: <span className="font-semibold text-stone-800">{draft.name}</span>
                </>
              ) : (
                "Select a design to confirm."
              )}
            </p>
            <DialogPrimitive.Close className="h-9 flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold sm:flex-none sm:px-4 text-stone-700 transition-colors hover:bg-stone-50">
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              disabled={!draft}
              onClick={() => draft && onConfirm(draft)}
              className="h-9 flex-[1.5] cursor-pointer whitespace-nowrap rounded-lg px-3 text-sm font-semibold sm:flex-none sm:px-4 text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: ROSE }}
            >
              Confirm Selection
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ScreenshotRequirements({
  answer,
  onChange,
}: {
  answer: DesignMatchAnswer;
  onChange: (patch: Partial<DesignMatchAnswer>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || busy) return; // one upload at a time
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      if (!dataUrl) throw new Error("empty image");
      // Replaces any earlier screenshot (never adds duplicates); the client's
      // original inspiration image is stored separately and is not touched.
      onChange({ screenshot: dataUrl });
    } catch {
      toast.error("Could not read this image. Please try another screenshot.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-stone-800">Upload a screenshot</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        {answer.screenshot ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
            <img
              src={answer.screenshot}
              alt="Uploaded screenshot"
              className="h-24 w-auto max-w-full rounded-md border border-stone-200 bg-white object-contain"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Replace
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange({ screenshot: undefined })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-500 hover:text-red-600 disabled:opacity-60"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-4 py-4 text-sm transition-colors hover:border-[#e14b68] hover:bg-[#fff6f8] disabled:cursor-wait"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin text-stone-400" />
            ) : (
              <ImagePlus className="size-4 text-stone-400" />
            )}
            <span className="font-medium text-stone-700">
              {busy ? "Processing image…" : "Click to upload or drop a screenshot"}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`design-req-${answer.referenceKey}`}
          className="text-sm font-semibold text-stone-800"
        >
          Describe the design requirements
        </label>
        <textarea
          id={`design-req-${answer.referenceKey}`}
          value={answer.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Describe the flowers, colours, backdrop style, materials, structure, and other details required to match the client's reference design..."
          className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#e14b68] focus:ring-2 focus:ring-[#e14b68]/15"
        />
      </div>
    </div>
  );
}

function ProblemText({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
      <AlertCircle className="size-4 shrink-0" />
      {text}
    </p>
  );
}
