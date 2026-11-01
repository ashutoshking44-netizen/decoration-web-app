import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EventDatePicker } from './EventDatePicker';
import { EVENT_TYPES, type PlannedEvent } from '../lib/quotationStorage';

export interface PlanEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (plannedEvents: PlannedEvent[]) => void;
  initialEvents?: PlannedEvent[];
}

export const PlanEventModal: React.FC<PlanEventModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialEvents = [],
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [planStep, setPlanStep] = useState(0);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [eventDates, setEventDates] = useState<Record<string, string>>({});
  const [eventVenues, setEventVenues] = useState<Record<string, string>>({});
  const [planError, setPlanError] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0] || '', []);

  // Sync open state with native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        setPlanError('');
        setPlanStep(0);
        if (initialEvents.length > 0) {
          setSelectedEventTypes(initialEvents.map((e) => e.name));
          const datesMap: Record<string, string> = {};
          const venuesMap: Record<string, string> = {};
          initialEvents.forEach((e) => {
            datesMap[e.name] = e.date;
            venuesMap[e.name] = e.venue;
          });
          setEventDates(datesMap);
          setEventVenues(venuesMap);
        } else {
          setSelectedEventTypes([]);
          setEventDates({});
          setEventVenues({});
        }
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, initialEvents]);

  // Total steps: step 0 is selecting events, subsequent steps are details for each chosen event
  const totalPlanSteps = Math.max(1, selectedEventTypes.length + 1);
  const stepEventName = planStep > 0 ? selectedEventTypes[planStep - 1] : null;
  const isLastPlanStep = planStep >= selectedEventTypes.length;
  const stepLabels = ['Events', ...selectedEventTypes];

  const mouseDownOnBackdropRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isOutside =
        e.clientY < rect.top ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width;
      mouseDownOnBackdropRef.current = isOutside;
    } else {
      mouseDownOnBackdropRef.current = false;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) return;
    if (!mouseDownOnBackdropRef.current) return;
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isOutside =
        e.clientY < rect.top ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width;
      if (isOutside) {
        onClose();
      }
    }
  };

  const toggleEventType = (type: string) => {
    setSelectedEventTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      if (next.length > 0) {
        setPlanError('');
      }
      return next;
    });
  };

  const handlePlanBack = () => {
    setPlanError('');
    setPlanStep((s) => Math.max(0, s - 1));
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 0: event types selection
    if (planStep === 0) {
      if (selectedEventTypes.length === 0) {
        setPlanError('Please choose at least one event.');
        return;
      }
      setPlanError('');
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
    setPlanError('');

    if (!isLastPlanStep) {
      // Prefill next event's venue if not set
      const nextName = selectedEventTypes[planStep];
      if (nextName && !eventVenues[nextName]) {
        setEventVenues((prev) => ({
          ...prev,
          [nextName]: (ev && prev[ev]) || '',
        }));
      }
      setPlanStep(planStep + 1);
      return;
    }

    // Final step: sort events earliest date first
    const sorted: PlannedEvent[] = [...selectedEventTypes]
      .map((name) => ({
        name,
        date: eventDates[name] || '',
        venue: (eventVenues[name] || '').trim(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    onComplete(sorted);
  };

  return (
    <dialog
      id="inq"
      ref={dialogRef}
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="plan-title"
    >
      <div className="stepper" aria-label={`Step ${planStep + 1} of ${totalPlanSteps}`}>
        <div className="stepper-meta">
          <strong>
            Step {planStep + 1} of {totalPlanSteps}
          </strong>
          <span>{planStep === 0 ? 'Choose events' : `${stepEventName} details`}</span>
        </div>
        <div className="stepper-track">
          {stepLabels.map((_, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`step-bar${planStep >= i ? ' done' : ''}`}>
                  <span />
                </div>
              )}
              <div
                className={`step-dot${
                  planStep > i ? ' done' : planStep === i ? ' active' : ''
                }`}
              >
                {planStep > i ? '✓' : i + 1}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="step-labels">
          {stepLabels.map((l, i) => (
            <span key={i} className={planStep === i ? 'active' : ''}>
              {l}
            </span>
          ))}
        </div>
      </div>

      <h2 className="serif" id="plan-title">
        Plan your event
      </h2>
      <div
        style={{
          color: 'var(--mute)',
          fontSize: '12px',
          marginBottom: 16,
        }}
      >
        Tell us about your celebration and our team will call you with ideas and a quotation.
      </div>

      <form onSubmit={handlePlanSubmit}>
        <div className="form-grid">
          {planStep === 0 && (
            <div className="form-col-full">
              <label id="plan-events-label">
                Event type{' '}
                <span style={{ color: 'var(--mute)', fontWeight: 400 }}>
                  (choose one or more)
                </span>
              </label>
              <div
                className="type-pills"
                role="group"
                aria-labelledby="plan-events-label"
              >
                {EVENT_TYPES.map((type) => {
                  const isSelected = selectedEventTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`type-pill${isSelected ? ' selected' : ''}`}
                      onClick={() => toggleEventType(type)}
                      role="checkbox"
                      aria-checked={isSelected}
                    >
                      {isSelected && (
                        <span style={{ fontWeight: 700, fontSize: '11px' }}>
                          ✓
                        </span>
                      )}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stepEventName && (
            <>
              <div className="form-col-full">
                <label
                  htmlFor={`date-${stepEventName}`}
                  style={{ marginBottom: 10, display: 'block' }}
                >
                  {stepEventName} date *
                </label>
                <EventDatePicker
                  value={eventDates[stepEventName] || ''}
                  onChange={(newIso) => {
                    setEventDates((prev) => ({
                      ...prev,
                      [stepEventName]: newIso,
                    }));
                    setPlanError('');
                  }}
                  minDate={todayStr}
                  eventName={stepEventName}
                />
              </div>
              <div className="form-col-full">
                <label htmlFor={`venue-${stepEventName}`}>
                  {stepEventName} venue / location
                </label>
                <input
                  id={`venue-${stepEventName}`}
                  placeholder="e.g. Hotel Yak & Yeti, Kathmandu"
                  value={eventVenues[stepEventName] || ''}
                  onChange={(e) =>
                    setEventVenues((prev) => ({
                      ...prev,
                      [stepEventName]: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}
        </div>

        {planError && (
          <div
            role="alert"
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: 12,
              fontWeight: 500,
            }}
          >
            {planError}
          </div>
        )}

        <div className="acts">
          {planStep === 0 ? (
            <button type="button" className="pill" onClick={onClose}>
              Cancel
            </button>
          ) : (
            <button type="button" className="pill" onClick={handlePlanBack}>
              ← Back
            </button>
          )}
          <button type="submit" className="pill pri">
            {planStep > 0 && isLastPlanStep ? 'Start shopping →' : 'Next →'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

