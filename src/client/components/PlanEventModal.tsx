import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { EventDatePicker } from "./EventDatePicker";
import { BottomSheet } from "./BottomSheet";
import { useIsPhone } from "../lib/useMediaQuery";
import { EVENT_TYPES, type PlannedEvent } from "../lib/quotationStorage";

export interface PlanEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (plannedEvents: PlannedEvent[]) => void;
  initialEvents?: PlannedEvent[];
}

const NO_EVENTS: PlannedEvent[] = [];

/**
 * "Plan your event" multi-step form.
 *
 * - Desktop / tablet: centered modal dialog (unchanged look).
 * - Phones (iOS / Android): bottom sheet that slides up and can be dragged
 *   down to close; the action buttons stay pinned at the bottom.
 */
export const PlanEventModal: React.FC<PlanEventModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialEvents = NO_EVENTS,
}) => {
  const isPhone = useIsPhone();
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [planStep, setPlanStep] = useState(0);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [eventDates, setEventDates] = useState<Record<string, string>>({});
  const [eventVenues, setEventVenues] = useState<Record<string, string>>({});
  const [planError, setPlanError] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0] || "", []);

  // Reset the form each time the popup opens, prefilled from any existing plan
  const initialEventsRef = useRef(initialEvents);
  initialEventsRef.current = initialEvents;
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initial = initialEventsRef.current;
      setPlanError("");
      setPlanStep(0);
      setSelectedEventTypes(initial.map((e) => e.name));
      setEventDates(Object.fromEntries(initial.map((e) => [e.name, e.date])));
      setEventVenues(Object.fromEntries(initial.map((e) => [e.name, e.venue])));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Desktop: keep the native <dialog> in sync with `isOpen`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || isPhone) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen, isPhone]);

  // ── Step model ──
  const totalPlanSteps = Math.max(1, selectedEventTypes.length + 1);
  const stepEventName = planStep > 0 ? selectedEventTypes[planStep - 1] : null;
  const isLastPlanStep = planStep >= selectedEventTypes.length;
  const stepLabels = ["Events", ...selectedEventTypes];

  const toggleEventType = (type: string) => {
    setSelectedEventTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      if (next.length > 0) setPlanError("");
      return next;
    });
  };

  const handlePlanBack = () => {
    setPlanError("");
    setPlanStep((s) => Math.max(0, s - 1));
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 0: event types selection
    if (planStep === 0) {
      if (selectedEventTypes.length === 0) {
        setPlanError("Please choose at least one event.");
        return;
      }
      setPlanError("");
      setPlanStep(1);
      return;
    }

    // Step 1..n: date and venue for each selected event
    const ev = selectedEventTypes[planStep - 1];
    if (!ev) return;
    const evDate = eventDates[ev];
    if (!evDate) {
      setPlanError(`Please choose a date for ${ev}.`);
      return;
    }
    if (todayStr && evDate < todayStr) {
      setPlanError(`Date for ${ev} cannot be in the past.`);
      return;
    }
    setPlanError("");

    if (!isLastPlanStep) {
      // Prefill next event's venue with this one (still editable)
      const nextName = selectedEventTypes[planStep];
      if (nextName && !eventVenues[nextName]) {
        setEventVenues((prev) => ({ ...prev, [nextName]: (ev && prev[ev]) || "" }));
      }
      setPlanStep(planStep + 1);
      return;
    }

    // Final step: sort events earliest date first
    const sorted: PlannedEvent[] = [...selectedEventTypes]
      .map((name) => ({
        name,
        date: eventDates[name] || "",
        venue: (eventVenues[name] || "").trim(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    onComplete(sorted);
  };

  // ── Shared pieces ──
  const stepper = (
    <div className="stepper" aria-label={`Step ${planStep + 1} of ${totalPlanSteps}`}>
      <div className="stepper-meta">
        <strong>
          Step {planStep + 1} of {totalPlanSteps}
        </strong>
        <span>{planStep === 0 ? "Choose events" : `${stepEventName} details`}</span>
      </div>
      <div className="stepper-track">
        {stepLabels.map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className={`step-bar${planStep >= i ? " done" : ""}`}>
                <span />
              </div>
            )}
            <div className={`step-dot${planStep > i ? " done" : planStep === i ? " active" : ""}`}>
              {planStep > i ? "✓" : i + 1}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="step-labels">
        {stepLabels.map((l, i) => (
          <span key={i} className={planStep === i ? "active" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );

  const intro = (
    <p className="plan-intro">
      Tell us about your celebration and our team will call you with ideas and a quotation.
    </p>
  );

  const fields = (
    <>
      <div className="form-grid">
        {planStep === 0 && (
          <div className="form-col-full">
            <label id={`${formId}-events-label`}>
              Event type{" "}
              <span style={{ color: "var(--mute)", fontWeight: 400 }}>(choose one or more)</span>
            </label>
            <div className="type-pills" role="group" aria-labelledby={`${formId}-events-label`}>
              {EVENT_TYPES.map((type) => {
                const isSelected = selectedEventTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={`type-pill${isSelected ? " selected" : ""}`}
                    onClick={() => toggleEventType(type)}
                    role="checkbox"
                    aria-checked={isSelected}
                  >
                    {isSelected && <span style={{ fontWeight: 700, fontSize: "11px" }}>✓</span>}
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stepEventName && (
          <>
            {/* data-vaul-no-drag: swiping the calendar must not drag the sheet */}
            <div className="form-col-full" data-vaul-no-drag>
              <label
                htmlFor={`date-${stepEventName}`}
                style={{ marginBottom: 10, display: "block" }}
              >
                {stepEventName} date *
              </label>
              <EventDatePicker
                value={eventDates[stepEventName] || ""}
                onChange={(newIso) => {
                  setEventDates((prev) => ({ ...prev, [stepEventName]: newIso }));
                  setPlanError("");
                }}
                minDate={todayStr}
                eventName={stepEventName}
              />
            </div>
            <div className="form-col-full" data-vaul-no-drag>
              <label htmlFor={`venue-${stepEventName}`}>{stepEventName} venue / location</label>
              <input
                id={`venue-${stepEventName}`}
                placeholder="e.g. Hotel Yak & Yeti, Kathmandu"
                value={eventVenues[stepEventName] || ""}
                onChange={(e) =>
                  setEventVenues((prev) => ({ ...prev, [stepEventName]: e.target.value }))
                }
              />
            </div>
          </>
        )}
      </div>

      {planError && (
        <div role="alert" className="plan-error">
          {planError}
        </div>
      )}
    </>
  );

  /** Cancel/Back + Next. `form` attr lets the sheet footer submit the form. */
  const actions = (
    <>
      {planStep === 0 ? (
        <button type="button" className="pill" onClick={onClose}>
          Cancel
        </button>
      ) : (
        <button type="button" className="pill" onClick={handlePlanBack}>
          ← Back
        </button>
      )}
      <button type="submit" form={formId} className="pill pri">
        {planStep > 0 && isLastPlanStep ? "Start shopping →" : "Next →"}
      </button>
    </>
  );

  const pressedOnBackdropRef = useRef(false);
  /** True when the pointer is on the dialog's backdrop (outside its box). */
  const isBackdropEvent = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  // ── Phones: draggable bottom sheet ──
  if (isPhone) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Plan your event"
        className="plan-sheet"
        repositionInputs
        footer={<div className="plan-sheet-actions">{actions}</div>}
      >
        {stepper}
        {intro}
        <form id={formId} onSubmit={handlePlanSubmit} noValidate>
          {fields}
        </form>
      </BottomSheet>
    );
  }

  // ── Desktop / tablet: centered dialog ──
  return (
    <dialog
      id="inq"
      ref={dialogRef}
      // Close only when the press AND release both happen on the dimmed backdrop
      // (so selecting text inside and releasing outside doesn't close it)
      onMouseDown={(e) => {
        pressedOnBackdropRef.current = isBackdropEvent(e);
      }}
      onClick={(e) => {
        if (pressedOnBackdropRef.current && isBackdropEvent(e)) onClose();
        pressedOnBackdropRef.current = false;
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={`${formId}-title`}
    >
      {stepper}
      <h2 className="serif" id={`${formId}-title`}>
        Plan your event
      </h2>
      {intro}
      <form id={formId} onSubmit={handlePlanSubmit}>
        {fields}
        <div className="acts">{actions}</div>
      </form>
    </dialog>
  );
};
