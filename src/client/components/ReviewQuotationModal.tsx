import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { DecorationItem } from '../ClientHomePage';
import type { StoredQuotation } from '../lib/quotationStorage';
import { QuotationCompanyPicker, type CompanyPickerGroup } from './QuotationCompanyPicker';

export interface ReviewQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: DecorationItem[];
  quotation: StoredQuotation;
  onRemoveItem: (eventName: string, itemId: number) => void;
  onClearAll: () => void;
  onProceedToInquiry: (selectedCompanies: string[]) => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(+(y || 0), +(m || 1) - 1, +(d || 1));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const fmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN');

export const ReviewQuotationModal: React.FC<ReviewQuotationModalProps> = ({
  isOpen,
  onClose,
  catalog,
  quotation,
  onRemoveItem,
  onClearAll,
  onProceedToInquiry,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

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

  const { plannedEvents, eventQuotes } = quotation;

  const totalItemCount = Object.values(eventQuotes).reduce(
    (acc, list) => acc + (list ? list.length : 0),
    0
  );

  const grandTotal = plannedEvents.reduce((acc, ev) => {
    const itemIds = eventQuotes[ev.name] || [];
    const eventTotal = itemIds.reduce((sum, id) => {
      const match = catalog.find((i) => i.id === id);
      return sum + (match ? match.p : 0);
    }, 0);
    return acc + eventTotal;
  }, 0);

  // Derive company groups live from selected items
  const quotationCompanyGroups = useMemo<CompanyPickerGroup[]>(() => {
    const allItemIds = Object.values(eventQuotes).flat();
    const map: Record<string, CompanyPickerGroup> = {};
    for (const id of allItemIds) {
      const itm = catalog.find((i) => i.id === id);
      if (!itm) continue;
      const coName = itm.ownerCompanyName || itm.vendor || 'Everest Events & Decor';
      if (!map[coName]) {
        map[coName] = { id: coName, name: coName, count: 0 };
      }
      map[coName].count += 1;
    }
    return Object.values(map);
  }, [eventQuotes, catalog]);

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const userUncheckedCompaniesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = quotationCompanyGroups.map((g) => g.id);
    setSelectedCompanies((prev) => {
      const retained = prev.filter((id) => currentIds.includes(id));
      const newToSelect = currentIds.filter(
        (id) => !prev.includes(id) && !userUncheckedCompaniesRef.current.has(id)
      );
      return [...retained, ...newToSelect];
    });
  }, [quotationCompanyGroups]);

  const handleQuotationCompanyToggle = (coId: string) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(coId)) {
        userUncheckedCompaniesRef.current.add(coId);
        return prev.filter((id) => id !== coId);
      } else {
        userUncheckedCompaniesRef.current.delete(coId);
        return [...prev, coId];
      }
    });
  };

  return (
    <dialog
      id="review-dialog"
      ref={dialogRef}
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="review-title"
    >
      <div className="review-dialog-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <h2 className="serif" id="review-title" style={{ margin: 0 }}>
              Your quotation
            </h2>
            <div
              style={{
                color: 'var(--mute)',
                fontSize: '12px',
                marginTop: 4,
              }}
            >
              Review decorations selected for each of your events.
            </div>
          </div>
          <button
            type="button"
            className="detail-x"
            onClick={onClose}
            aria-label="Close quotation"
            style={{
              position: 'static',
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 0,
              background: '#f5eff2',
              color: 'var(--mute)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="review-dialog-body">
        {plannedEvents.length === 0 || totalItemCount === 0 ? (
          <div
            style={{
              padding: '36px 12px',
              textAlign: 'center',
              color: 'var(--mute)',
            }}
          >
            No decorations added to quotation yet.
          </div>
        ) : (
          <div>
            {plannedEvents.map((ev) => {
              const itemIds = eventQuotes[ev.name] || [];
              const items = itemIds
                .map((id) => catalog.find((i) => i.id === id))
                .filter((item): item is DecorationItem => Boolean(item));
              const subtotal = items.reduce((sum, item) => sum + item.p, 0);

              return (
                <div key={ev.name} className="review-event-group">
                  <div className="review-event-header">
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        {ev.name}
                      </strong>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--mute)',
                          marginLeft: 8,
                        }}
                      >
                        · {formatDate(ev.date)}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'var(--card)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: '1px solid var(--line)',
                        color: 'var(--brand)',
                        fontWeight: 600,
                      }}
                    >
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--mute)',
                        padding: '8px 0',
                      }}
                    >
                      No decorations added for this event yet.
                    </div>
                  ) : (
                    <ul className="list" style={{ margin: '6px 0' }}>
                      {items.map((it) => (
                        <li
                          key={it.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '8px 0',
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={it.img}
                              alt={it.t}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                objectFit: 'cover',
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{it.t}</div>
                              <small style={{ color: 'var(--mute)' }}>
                                by {it.ownerCompanyName || it.vendor || 'Everest Events & Decor'}
                              </small>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <strong style={{ fontSize: 13 }}>{fmt(it.p)}</strong>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(ev.name, it.id)}
                              style={{
                                background: 'none',
                                border: 0,
                                color: 'var(--mute)',
                                cursor: 'pointer',
                                fontSize: 14,
                                padding: '4px 8px',
                              }}
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      fontSize: '13px',
                      color: 'var(--mute)',
                    }}
                  >
                    <span>{ev.name} subtotal:</span>
                    <strong style={{ color: 'var(--ink)' }}>{fmt(subtotal)}</strong>
                  </div>
                </div>
              );
            })}

            {/* Quotation Company Picker */}
            <QuotationCompanyPicker
              groups={quotationCompanyGroups}
              selected={selectedCompanies}
              onToggle={handleQuotationCompanyToggle}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0 6px',
                fontSize: '16px',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Estimated Grand Total</span>
              <b className="price" style={{ color: 'var(--brand)', fontSize: '20px', fontWeight: 700 }}>
                {fmt(grandTotal)}
              </b>
            </div>
          </div>
        )}
      </div>

      <div className="acts review-dialog-footer">
        <button
          type="button"
          className="pill review-clear-btn"
          onClick={onClearAll}
          disabled={totalItemCount === 0}
        >
          Clear all
        </button>
        <button
          type="button"
          className="pill review-close-btn"
          onClick={onClose}
        >
          Close
        </button>
        <button
          type="button"
          className="pill pri review-primary-btn"
          onClick={() => onProceedToInquiry(selectedCompanies)}
          disabled={totalItemCount === 0 || selectedCompanies.length === 0}
        >
          Send request
        </button>
      </div>
    </dialog>
  );
};

