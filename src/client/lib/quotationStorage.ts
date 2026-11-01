export interface PlannedEvent {
  name: string;
  date: string;
  venue: string;
}

export interface StoredQuotation {
  plannedEvents: PlannedEvent[];
  activeEventName: string | null;
  eventQuotes: Record<string, number[]>;
}

export const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Mehendi',
  'Haldi',
  'Sangeet',
  'Reception',
  'Bratabandha / Pasni',
  'Birthday',
  'Corporate event',
  'Other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const STORAGE_KEY_EVENTS = 'everest_planned_events';
const STORAGE_KEY_ACTIVE = 'everest_active_event';
const STORAGE_KEY_QUOTES = 'everest_event_quotes';
const SYNC_EVENT_NAME = 'everest_quotation_sync';

export function getStoredQuotation(): StoredQuotation {
  if (typeof window === 'undefined') {
    return { plannedEvents: [], activeEventName: null, eventQuotes: {} };
  }
  try {
    const rawEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
    const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const rawQuotes = localStorage.getItem(STORAGE_KEY_QUOTES);

    const plannedEvents: PlannedEvent[] = rawEvents ? JSON.parse(rawEvents) : [];
    const validEvents = Array.isArray(plannedEvents) ? plannedEvents : [];
    const activeEventName =
      rawActive || (validEvents.length > 0 && validEvents[0] ? validEvents[0].name : null);
    const eventQuotes: Record<string, number[]> = rawQuotes ? JSON.parse(rawQuotes) : {};

    return {
      plannedEvents: validEvents,
      activeEventName: typeof activeEventName === 'string' ? activeEventName : null,
      eventQuotes: typeof eventQuotes === 'object' && eventQuotes !== null ? eventQuotes : {},
    };
  } catch (err) {
    console.warn('[QuotationStorage] Error reading quotation from localStorage:', err);
    return { plannedEvents: [], activeEventName: null, eventQuotes: {} };
  }
}

export function saveStoredQuotation(state: Partial<StoredQuotation>): StoredQuotation {
  if (typeof window === 'undefined') {
    return { plannedEvents: [], activeEventName: null, eventQuotes: {} };
  }
  try {
    const current = getStoredQuotation();
    const nextEvents = state.plannedEvents !== undefined ? state.plannedEvents : current.plannedEvents;
    let nextActive = state.activeEventName !== undefined ? state.activeEventName : current.activeEventName;

    // Validate that active event exists if events are present
    if (nextEvents.length > 0) {
      if (!nextActive || !nextEvents.some((e) => e.name === nextActive)) {
        nextActive = nextEvents[0]?.name || null;
      }
    } else {
      nextActive = null;
    }

    const nextQuotes = state.eventQuotes !== undefined ? state.eventQuotes : current.eventQuotes;

    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(nextEvents));
    if (nextActive === null) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE, nextActive);
    }
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(nextQuotes));

    const updated: StoredQuotation = {
      plannedEvents: nextEvents,
      activeEventName: nextActive,
      eventQuotes: nextQuotes,
    };

    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: updated }));
    return updated;
  } catch (err) {
    console.error('[QuotationStorage] Error saving quotation to localStorage:', err);
    return getStoredQuotation();
  }
}

export function clearStoredQuotation(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    localStorage.removeItem(STORAGE_KEY_QUOTES);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  } catch (err) {
    console.error('[QuotationStorage] Error clearing quotation in localStorage:', err);
  }
}

export function subscribeQuotation(callback: (quotation: StoredQuotation) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    callback(getStoredQuotation());
  };
  window.addEventListener(SYNC_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

export function addItemToQuotation(eventName: string, itemId: number): StoredQuotation {
  const current = getStoredQuotation();
  const list = current.eventQuotes[eventName] || [];
  if (list.includes(itemId)) {
    return current;
  }
  return saveStoredQuotation({
    eventQuotes: {
      ...current.eventQuotes,
      [eventName]: [...list, itemId],
    },
  });
}

export function toggleItemInQuotation(eventName: string, itemId: number): StoredQuotation {
  const current = getStoredQuotation();
  const list = current.eventQuotes[eventName] || [];
  const exists = list.includes(itemId);
  const updatedList = exists ? list.filter((id) => id !== itemId) : [...list, itemId];
  return saveStoredQuotation({
    eventQuotes: {
      ...current.eventQuotes,
      [eventName]: updatedList,
    },
  });
}

export function isItemInQuotation(eventName: string | null, itemId: number): boolean {
  if (!eventName) return false;
  const current = getStoredQuotation();
  return (current.eventQuotes[eventName] || []).includes(itemId);
}

export function getTotalQuotationCount(): number {
  const current = getStoredQuotation();
  const allIds = new Set<number>();
  Object.values(current.eventQuotes).forEach((ids) => {
    ids.forEach((id) => allIds.add(id));
  });
  return allIds.size;
}

