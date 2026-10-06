import { useEffect, useState } from "react";
import { Clock, ImageIcon, Mail, StickyNote, Users, X } from "lucide-react";
import type { EnquiryItem } from "@/lib/enquiries";
import { loadEnquiryPhotos } from "@/lib/enquiry-photos";

/**
 * Shown inside an enquiry card on the Enquiries page:
 *  - the 2nd, 3rd… events of a multi-event enquiry (the first event is
 *    rendered by the card's existing row), and
 *  - for every event: what the client asked for, their note, and the
 *    reference photos they attached on the public form.
 */
export function EnquiryExtraDetails({ enquiry }: { enquiry: EnquiryItem }) {
  const [preview, setPreview] = useState<string | null>(null);
  const events = enquiry.events ?? [];
  const extraEvents = events.slice(1);

  // Per-event photos live in IndexedDB under "<enquiryId>#<eventIndex>".
  // Older enquiries stored one flat list under "<enquiryId>" (or inline).
  const [eventPhotos, setEventPhotos] = useState<Record<number, string[]>>({});
  const [legacyPhotos, setLegacyPhotos] = useState<string[]>([]);
  const perEventCounts = events.map((e) => e.photo_count ?? 0).join(",");
  const legacyExpected =
    (enquiry.reference_photo_count ?? 0) > 0 && !events.some((e) => (e.photo_count ?? 0) > 0)
      ? (enquiry.reference_photo_count ?? 0)
      : 0;

  useEffect(() => {
    let cancelled = false;
    events.forEach((e, i) => {
      if ((e.photo_count ?? 0) > 0) {
        void loadEnquiryPhotos(`${enquiry.id}#${i}`).then((p) => {
          if (!cancelled) setEventPhotos((prev) => ({ ...prev, [i]: p }));
        });
      }
    });
    if (legacyExpected > 0) {
      void loadEnquiryPhotos(enquiry.id).then((p) => {
        if (!cancelled) setLegacyPhotos(p);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry.id, perEventCounts, legacyExpected]);

  const legacy = [...(enquiry.reference_images ?? []), ...legacyPhotos];

  const detailEvents = events
    .map((ev, i) => ({ ev, i }))
    .filter(
      ({ ev }) => (ev.requirements?.length ?? 0) > 0 || !!ev.note || (ev.photo_count ?? 0) > 0,
    );

  const legacyMissing =
    legacyExpected > 0 && legacy.length === 0 && enquiry.reference_photos_saved === false;

  if (
    !enquiry.email &&
    extraEvents.length === 0 &&
    detailEvents.length === 0 &&
    legacy.length === 0 &&
    !legacyMissing
  )
    return null;

  const thumb = (src: string, i: number) => (
    <button
      key={i}
      type="button"
      onClick={() => setPreview(src)}
      className="size-16 overflow-hidden rounded-lg border border-stone-200 shadow-2xs transition hover:border-[#E8546F]"
      title="View photo"
    >
      <img src={src} alt={`Reference ${i + 1}`} className="size-full object-cover" />
    </button>
  );

  return (
    <div className="mt-2.5 space-y-2.5">
      {enquiry.email && (
        <a
          href={`mailto:${enquiry.email}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCD6] bg-[#FAF6F4] px-2.5 py-0.5 text-xs font-medium text-[#2B2320] shadow-2xs transition hover:border-[#FDC2CD] hover:bg-[#FFF0F3]"
        >
          <Mail className="size-3 text-stone-400" />
          {enquiry.email}
        </a>
      )}
      {extraEvents.map((ev, i) => (
        <div
          key={`${ev.name}-${i}`}
          className="space-y-2 rounded-xl border border-stone-200/90 bg-[#FAF9F8]/70 p-3.5 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 shrink-0 rounded-full bg-[#E8546F]" />
            <span className="text-sm font-bold capitalize text-stone-900">{ev.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-stone-600">
            <span className="font-semibold text-stone-800">{ev.date_bs}</span>
            <span className="text-stone-300">•</span>
            <span className="font-medium">{ev.venue}</span>
            {ev.guest_count ? (
              <>
                <span className="text-stone-300">•</span>
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <Users className="size-3 text-stone-400" />
                  {ev.guest_count} Guests
                </span>
              </>
            ) : null}
          </div>
          {ev.time_slot ? (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Clock className="size-3 shrink-0 text-stone-400" />
              <span>{ev.time_slot}</span>
            </div>
          ) : null}
        </div>
      ))}

      {detailEvents.length > 0 && (
        <div className="space-y-3 rounded-xl border border-[#FDC2CD]/70 bg-[#FFF8F9] p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Client requirements, notes &amp; references
          </div>
          {detailEvents.map(({ ev, i }) => (
            <div key={`${ev.name}-${i}`} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-bold capitalize text-stone-800">
                  {ev.name}
                  {events.length > 1 ? ` · ${ev.date_bs}` : ""}
                </span>
                {(ev.requirements ?? []).map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-[#FDC2CD] bg-[#FFF0F3] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2284E]"
                  >
                    {r}
                  </span>
                ))}
              </div>
              {ev.note && (
                <p className="flex items-start gap-1.5 text-xs text-stone-600">
                  <StickyNote className="mt-0.5 size-3 shrink-0 text-stone-400" />
                  <span>{ev.note}</span>
                </p>
              )}
              {(ev.photo_count ?? 0) > 0 &&
                ((eventPhotos[i]?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <ImageIcon className="size-3 text-stone-400" />
                    {eventPhotos[i]!.map((src, k) => thumb(src, k))}
                  </div>
                ) : ev.photos_saved === false ? (
                  <p className="rounded-lg bg-[#FFF8E6] px-3 py-2 text-xs text-[#8A5A00]">
                    The client attached {ev.photo_count} photo{ev.photo_count! > 1 ? "s" : ""} for
                    this event, but they couldn't be saved in this browser. Ask them to send the
                    photos on WhatsApp.
                  </p>
                ) : null)}
            </div>
          ))}
        </div>
      )}

      {legacy.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            <ImageIcon className="size-3" />
            Client reference photos ({legacy.length})
          </div>
          <div className="flex flex-wrap gap-2">{legacy.map((src, i) => thumb(src, i))}</div>
        </div>
      )}

      {legacyMissing && (
        <p className="rounded-lg bg-[#FFF8E6] px-3 py-2 text-xs text-[#8A5A00]">
          The client attached {legacyExpected} reference photo{legacyExpected > 1 ? "s" : ""}, but
          they couldn't be saved in this browser. Ask them to send the photos on WhatsApp.
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-stone-800"
            onClick={() => setPreview(null)}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <img
            src={preview}
            alt="Reference"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
