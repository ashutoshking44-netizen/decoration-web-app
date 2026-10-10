import { useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, MapPin, Phone, StickyNote, User, Wallet } from "lucide-react";
import { BOOKING_STAGES, type BookedClient, type BookingStage } from "@/lib/clients";
import { daysUntil, resolveClientDate, toStoredEventDate } from "@/lib/booked-dates";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnquiryDatePicker, adDateLabel, bsDateLabel } from "./enquiry-date-picker";
import { cn } from "@/lib/utils";

const SOURCES = ["Instagram", "Facebook", "Website", "Referral", "Walk-in", "Enquiry"];
const LOCATION_TYPES = ["Inside Kathmandu Valley", "Outside Kathmandu Valley"];
const EVENT_TYPES = ["Wedding", "Engagement", "Mehendi", "Haldi", "Sangeet", "Reception", "Birthday", "Corporate event"];

const inputCls =
  "w-full min-h-11 rounded-xl border border-[#E7DCD6] bg-white px-3 py-2 text-base text-[#2B2320] outline-none transition placeholder:text-[#B5A7A1] focus:border-[#E8546F] focus:ring-2 focus:ring-[#E8546F]/20 sm:text-sm";

function Section({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-3 rounded-2xl border p-4", tone)}>
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-[#2B2320]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#5B4C47]">{label}</span>
      {children}
    </label>
  );
}

/**
 * One easy form for everything about a booked client. Remount it (key = client id)
 * for each client so the fields start from that client's values.
 */
export function EditClientDialog({
  client,
  onClose,
  onSave,
}: {
  client: BookedClient | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<BookedClient>) => void;
}) {
  return (
    <Dialog open={Boolean(client)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden rounded-3xl border-[#EFE3DD] bg-[#FBF6F3] p-0 sm:max-w-3xl">
        {client && <EditForm key={client.id} client={client} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  client,
  onClose,
  onSave,
}: {
  client: BookedClient;
  onClose: () => void;
  onSave: (id: string, patch: Partial<BookedClient>) => void;
}) {
  const [name, setName] = useState(client.client_name);
  const [source, setSource] = useState(client.source ?? "");
  const [handler, setHandler] = useState(client.handler ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [sameWa, setSameWa] = useState(!client.whatsapp || client.whatsapp === client.phone);
  const [whatsapp, setWhatsapp] = useState(client.whatsapp ?? "");
  const [eventType, setEventType] = useState(client.event_type);
  const [locationType, setLocationType] = useState(client.location_type ?? LOCATION_TYPES[0]!);
  const [city, setCity] = useState(client.city ?? "");
  const [venue, setVenue] = useState(client.venue);
  const [dateIso, setDateIso] = useState(resolveClientDate(client)?.iso ?? "");
  const [total, setTotal] = useState(String(client.total_amount));
  const [paid, setPaid] = useState(String(client.paid_amount));
  const [stage, setStage] = useState<BookingStage>(client.stage);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [error, setError] = useState("");

  const save = () => {
    if (!name.trim()) {
      setError("Client name is required");
      return;
    }
    const days = dateIso ? daysUntil(dateIso) : null;
    onSave(client.id, {
      client_name: name.trim(),
      source: source || undefined,
      handler: handler.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: sameWa ? undefined : whatsapp.trim() || undefined,
      event_type: eventType.trim() || client.event_type,
      location_type: locationType,
      city: city.trim() || undefined,
      venue: venue.trim(),
      ...(dateIso
        ? {
            event_date: toStoredEventDate(dateIso),
            days_to_event:
              days === null ? client.days_to_event : days < 0 ? ("complete" as const) : days === 0 ? ("today" as const) : days,
          }
        : {}),
      total_amount: Math.max(0, Number(total) || 0),
      paid_amount: Math.max(0, Number(paid) || 0),
      stage,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader className="border-b border-[#EFE3DD] bg-white px-5 py-4 text-left">
        <DialogTitle className="font-display text-lg font-semibold text-[#2B2320]">
          Edit client — {client.client_name}
        </DialogTitle>
        <DialogDescription className="text-xs text-[#8A7B76]">
          Change anything below, then press Save.
        </DialogDescription>
      </DialogHeader>

      <div className="grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-4">
          <Section title="Client details" icon={<User className="size-4 text-sky-600" />} tone="border-sky-200 bg-sky-50/60">
            <Field label="Client name *">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source">
                <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="">—</option>
                  {[...new Set([...SOURCES, ...(source ? [source] : [])])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Handled by">
                <input className={inputCls} value={handler} onChange={(e) => setHandler(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Contact" icon={<Phone className="size-4 text-violet-600" />} tone="border-violet-200 bg-violet-50/60">
            <Field label="Phone number">
              <input
                className={inputCls}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <label className="flex min-h-9 items-center gap-2 text-sm text-[#4A3F3C]">
              <input
                type="checkbox"
                className="size-4 accent-[#E8546F]"
                checked={sameWa}
                onChange={(e) => setSameWa(e.target.checked)}
              />
              WhatsApp is the same as phone
            </label>
            {!sameWa && (
              <Field label="WhatsApp number">
                <input
                  className={inputCls}
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </Field>
            )}
          </Section>

          <Section title="Event & location" icon={<MapPin className="size-4 text-amber-600" />} tone="border-amber-200 bg-amber-50/60">
            <Field label="Event type">
              <input
                className={inputCls}
                list="edit-client-event-types"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
              <datalist id="edit-client-event-types">
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location">
                <select className={inputCls} value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City / area">
                <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
            </div>
            <Field label="Venue">
              <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </Field>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Event date" icon={<CalendarDays className="size-4 text-rose-600" />} tone="border-rose-200 bg-rose-50/60">
            <p className="text-xs text-[#6E5D57]">
              {dateIso ? (
                <>
                  <b className="text-[#2B2320]">{bsDateLabel(dateIso)} BS</b> · {adDateLabel(dateIso)}
                </>
              ) : (
                "No date set — tap a day on the calendar."
              )}
            </p>
            <EnquiryDatePicker
              single
              dates={dateIso ? [{ id: "event-date", dateAd: dateIso }] : []}
              onChange={(next) => {
                const exact = next.filter((d) => d.dateAd);
                const added = exact.filter((d) => d.dateAd !== dateIso);
                setDateIso(added.length ? added[added.length - 1]!.dateAd : "");
              }}
            />
          </Section>

          <Section title="Payment & progress" icon={<Wallet className="size-4 text-emerald-600" />} tone="border-emerald-200 bg-emerald-50/60">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total (Rs.)">
                <input
                  className={inputCls}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </Field>
              <Field label="Paid (Rs.)">
                <input
                  className={inputCls}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Stage">
              <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as BookingStage)}>
                {BOOKING_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Notes" icon={<StickyNote className="size-4 text-stone-500" />} tone="border-stone-200 bg-white">
            <textarea
              rows={3}
              className={cn(inputCls, "resize-none")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about this booking…"
            />
          </Section>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#EFE3DD] bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <p className="text-xs font-medium text-[#D6415C]">{error}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-[#E7DCD6] bg-white px-5 text-sm font-semibold text-[#5B4C47] transition hover:bg-[#FFF0F3]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] px-6 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(232,84,111,.3)] transition hover:brightness-95"
          >
            <CheckCircle2 className="size-4" />
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}
