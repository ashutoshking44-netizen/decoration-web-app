import React, { useRef, useEffect, useState } from 'react';
import { submitEnquiry } from '../api';
import { saveStoredQuotation, type PlannedEvent, type StoredQuotation } from '../lib/quotationStorage';
import type { DecorationItem } from '../ClientHomePage';

export interface BuyNowDecorationItem {
  id: number | string;
  sid?: string;
  t: string;
  p: number;
  u?: string;
  img: string;
  cat?: string;
  d?: string;
  vendor?: string;
  ownerCompanyId?: string;
  ownerCompanyName?: string;
}

export interface ContactInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, operates in "Buy this decoration" mode for a single item
  buyNowItem?: BuyNowDecorationItem | null;
  // If buyNowItem is not provided, operates in quotation request mode using quotation & catalog
  quotation?: StoredQuotation;
  catalog?: DecorationItem[];
  selectedCompanies?: string[];
  onSuccess?: () => void;
}

const fmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN');

export const ContactInquiryModal: React.FC<ContactInquiryModalProps> = ({
  isOpen,
  onClose,
  buyNowItem = null,
  quotation,
  catalog = [],
  selectedCompanies = [],
  onSuccess,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [whatsappTouched, setWhatsappTouched] = useState(false);

  // Buy now specific fields
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          /* already open */
        }
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

    // Prevent closing if mouse drag started inside the dialog (e.g. resizing textarea or selecting text)
    if (!mouseDownOnBackdropRef.current) return;

    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isOutside =
        e.clientY < rect.top ||
        e.clientY > rect.top + rect.height ||
        e.clientX < rect.left ||
        e.clientX > rect.left + rect.width;
      if (isOutside) {
        handleClose();
      }
    }
  };

  const isValidPhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (!/^\+?[0-9]+$/.test(trimmed)) return false;
    const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return true;
    if (digits.length === 13 && digits.startsWith('977')) return true;
    return false;
  };

  const getPhoneError = (val: string, label: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return `${label} is required`;
    if (!/^\+?[0-9]+$/.test(trimmed)) return 'Digits only (leading + allowed)';
    const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (digits.length === 10) return '';
    if (digits.length === 13 && digits.startsWith('977')) return '';
    return 'Enter a valid 10-digit number or +977 format';
  };

  const handlePhoneChange = (val: string) => {
    setContactPhone(val);
    if (whatsappSameAsPhone) {
      setContactWhatsapp(val);
    }
  };

  const handleWhatsappSameChange = (checked: boolean) => {
    setWhatsappSameAsPhone(checked);
    if (checked) {
      setContactWhatsapp(contactPhone);
    }
  };

  const resetForm = () => {
    setContactName('');
    setContactPhone('');
    setContactWhatsapp('');
    setWhatsappSameAsPhone(true);
    setPhoneTouched(false);
    setWhatsappTouched(false);
    setEventDate('');
    setEventVenue('');
    setContactMessage('');
    setIsSubmitted(false);
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);
    setWhatsappTouched(true);

    const effectiveWa = whatsappSameAsPhone ? contactPhone : contactWhatsapp;
    if (!contactName.trim() || !isValidPhone(contactPhone) || !isValidPhone(effectiveWa)) {
      return;
    }

    setIsSending(true);
    setSubmitError('');

    try {
      if (buyNowItem) {
        // Direct single-item order
        await submitEnquiry({
          type: 'direct-order',
          name: contactName.trim(),
          phone: contactPhone.trim(),
          whatsappNumber: effectiveWa.trim(),
          whatsappSameAsPhone,
          message: contactMessage.trim(),
          venue: eventVenue.trim(),
          grandTotal: buyNowItem.p,
          companies: [buyNowItem.ownerCompanyName || buyNowItem.vendor || 'Everest Events & Decor'],
          events: [
            {
              name: 'Direct Decoration Purchase',
              date: eventDate || (new Date().toISOString().split('T')[0] ?? ''),
              venue: eventVenue.trim() || 'Kathmandu',
              subtotal: buyNowItem.p,
              decorations: [
                {
                  id: buyNowItem.sid || String(buyNowItem.id),
                  decorationId: buyNowItem.sid || String(buyNowItem.id),
                  title: buyNowItem.t,
                  category: buyNowItem.cat || '',
                  price: buyNowItem.p,
                  image: buyNowItem.img,
                  vendor: buyNowItem.vendor,
                  ownerCompanyId: buyNowItem.ownerCompanyId,
                  ownerCompanyName: buyNowItem.ownerCompanyName,
                  description: buyNowItem.d,
                },
              ],
            },
          ],
        });
      } else {
        // Quotation request
        const plannedEvents: PlannedEvent[] = quotation?.plannedEvents || [];
        const eventQuotes = quotation?.eventQuotes || {};

        const eventsPayload = plannedEvents
          .map((ev) => {
            const itemIds = eventQuotes[ev.name] || [];
            const evItems = itemIds
              .map((id) => catalog.find((i) => i.id === id))
              .filter((i): i is DecorationItem => Boolean(i));
            return {
              name: ev.name,
              date: ev.date || (new Date().toISOString().split('T')[0] ?? ''),
              venue: ev.venue || 'Kathmandu',
              subtotal: evItems.reduce((sum, it) => sum + it.p, 0),
              decorations: evItems.map((it) => ({
                id: it.sid || String(it.id),
                decorationId: it.sid || String(it.id),
                title: it.t,
                category: it.cat,
                price: it.p,
                image: it.img,
                vendor: it.ownerCompanyName || it.vendor || 'Everest Events & Decor',
                ownerCompanyId: it.ownerCompanyId,
                ownerCompanyName: it.ownerCompanyName || it.vendor,
                description: it.d,
              })),
            };
          })
          .filter((ev) => ev.decorations.length > 0);

        const totalQuoteSum = eventsPayload.reduce((sum, ev) => sum + ev.subtotal, 0);

        const targetCompanies =
          selectedCompanies.length > 0
            ? selectedCompanies
            : Array.from(
                new Set(
                  eventsPayload.flatMap((ev) =>
                    ev.decorations.map((d) => d.ownerCompanyName || d.vendor || 'Everest Events & Decor')
                  )
                )
              );

        await submitEnquiry({
          type: 'quotation-request',
          name: contactName.trim(),
          phone: contactPhone.trim(),
          whatsappNumber: effectiveWa.trim(),
          whatsappSameAsPhone,
          message: contactMessage.trim(),
          venue: quotation?.plannedEvents[0]?.venue ?? 'Kathmandu',
          grandTotal: totalQuoteSum,
          companies: targetCompanies,
          events: eventsPayload,
        });

        // Clear stored quotes for quotation cart
        saveStoredQuotation({ eventQuotes: {} });
      }

      setIsSubmitted(true);
      setIsSending(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmitError(err.message || 'Failed to submit request. Please try again or call us directly.');
      setIsSending(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <dialog
      id="contact-dialog"
      ref={dialogRef}
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      aria-labelledby="contact-title"
    >
      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '24px 8px' }}>
          <div
            style={{ fontSize: 52, marginBottom: 12 }}
            role="img"
            aria-label="Celebration"
          >
            🎉
          </div>
          <h2 className="serif" style={{ fontSize: 32, margin: '0 0 10px' }}>
            Thank you!
          </h2>
          <p
            style={{
              color: 'var(--mute)',
              fontSize: 13,
              maxWidth: 380,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            {buyNowItem
              ? `We have received your order for ${buyNowItem.t}. Our team will come to you with your quotation.`
              : 'We have received your request. Our team will come to you with your quotation.'}
          </p>
          <button type="button" className="pill pri" onClick={handleClose}>
            Close
          </button>
        </div>
      ) : (
        <>
          <h2 className="serif" id="contact-title">
            {buyNowItem ? 'Buy this decoration' : 'Finalize inquiry'}
          </h2>

          {buyNowItem && (
            <div className="buy-summary">
              <img
                src={buyNowItem.img}
                alt={buyNowItem.t}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <b>{buyNowItem.t}</b>
                <small>
                  by {buyNowItem.ownerCompanyName || buyNowItem.vendor || 'Everest Events & Decor'}
                </small>
              </div>
              <strong>
                {fmt(buyNowItem.p)}
                {buyNowItem.u || ''}
              </strong>
            </div>
          )}

          <div
            className="contact-dialog-privacy"
            style={{
              color: 'var(--mute)',
              fontSize: '12px',
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Please enter your contact details so our team can follow up with
            your personalized proposal. Your name, phone number, and WhatsApp number
            will be shared with the selected companies.
          </div>

          <form onSubmit={handleSubmit} className="contact-form">
            <div>
              <label htmlFor="contact-name">Your name *</label>
              <input
                id="contact-name"
                name="name"
                required
                placeholder="e.g. Aarav Sharma"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="contact-phone">Phone number *</label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="e.g. 9801234567"
                value={contactPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => setPhoneTouched(true)}
                aria-invalid={phoneTouched && !isValidPhone(contactPhone)}
              />
              {phoneTouched && !isValidPhone(contactPhone) && (
                <span className="contact-field-error" role="alert">
                  {getPhoneError(contactPhone, 'Phone number')}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="contact-whatsapp">WhatsApp number *</label>
              <input
                id="contact-whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="e.g. 9801234567"
                value={whatsappSameAsPhone ? contactPhone : contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                onBlur={() => setWhatsappTouched(true)}
                readOnly={whatsappSameAsPhone}
                disabled={whatsappSameAsPhone}
                className={whatsappSameAsPhone ? 'contact-input-disabled' : ''}
                aria-invalid={
                  (!whatsappSameAsPhone ? whatsappTouched : phoneTouched) &&
                  !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp)
                }
              />
              {((!whatsappSameAsPhone && whatsappTouched) || (whatsappSameAsPhone && phoneTouched)) &&
                !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp) && (
                  <span className="contact-field-error" role="alert">
                    {getPhoneError(whatsappSameAsPhone ? contactPhone : contactWhatsapp, 'WhatsApp number')}
                  </span>
                )}
            </div>

            <div className="contact-checkbox-row">
              <label htmlFor="contact-whatsapp-same" className="contact-checkbox-label">
                <input
                  type="checkbox"
                  id="contact-whatsapp-same"
                  name="whatsappSameAsPhone"
                  checked={whatsappSameAsPhone}
                  onChange={(e) => handleWhatsappSameChange(e.target.checked)}
                />
                <span>Same as phone number</span>
              </label>
            </div>

            {buyNowItem && (
              <>
                <div>
                  <label htmlFor="contact-date">Event date (optional)</label>
                  <input
                    id="contact-date"
                    name="date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="contact-venue">Venue / location (optional)</label>
                  <input
                    id="contact-venue"
                    name="venue"
                    placeholder="e.g. Hotel Yak & Yeti, Kathmandu"
                    value={eventVenue}
                    onChange={(e) => setEventVenue(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={3}
                placeholder="Any extra preferences, timing, or questions..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                style={{
                  minHeight: '84px',
                  maxHeight: '240px',
                  resize: 'vertical',
                  overflowY: 'auto',
                }}
              />
            </div>

            {submitError && (
              <p role="alert" style={{ color: '#c0392b', fontSize: 13, margin: '0 0 12px' }}>
                {submitError}
              </p>
            )}

            <div className="acts">
              <button
                type="button"
                className="pill"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill pri"
                disabled={
                  isSending ||
                  !contactName.trim() ||
                  !isValidPhone(contactPhone) ||
                  !isValidPhone(whatsappSameAsPhone ? contactPhone : contactWhatsapp)
                }
              >
                {isSending ? 'Sending…' : buyNowItem ? 'Place order' : 'Send request'}
              </button>
            </div>
          </form>
        </>
      )}
    </dialog>
  );
};

export default ContactInquiryModal;

