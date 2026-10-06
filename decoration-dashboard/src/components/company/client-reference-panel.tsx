import { useState } from "react";
import { ExternalLink, ImageIcon, Info, Plus, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** What the client told us on the public enquiry form, for one event. */
export interface ClientReference {
  requirements: string[];
  note: string;
  photos: string[];
  categoryDetails?: Record<string, { note?: string | undefined; photoUrl?: string | undefined; link?: string | undefined }> | undefined;
}

const CATEGORY_CHIPS = new Set(["Stage", "Mandap", "Entrance Gate", "Backdrop", "Welcome Board"]);

/**
 * Shown above the decoration catalog while configuring an event in the
 * Quotation Studio, when the quotation was started from a client enquiry.
 * Requirement chips double as quick catalog filters.
 */
export function ClientReferencePanel({
  clientName,
  eventName,
  reference,
  onPickCategory,
  onPickFlowers,
  onCreateFromPhoto,
}: {
  clientName?: string | undefined;
  eventName: string;
  reference: ClientReference;
  onPickCategory?: ((category: string) => void) | undefined;
  onPickFlowers?: (() => void) | undefined;
  /** Start a new catalog decoration from a client reference photo. */
  onCreateFromPhoto?: ((photoUrl: string) => void) | undefined;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const { requirements, note, photos, categoryDetails } = reference;
  const hasCategoryDetails =
    categoryDetails &&
    Object.values(categoryDetails).some((d) => d.note || d.photoUrl);

  if (requirements.length === 0 && !note && photos.length === 0 && !hasCategoryDetails) return null;

  return (
    <div className="rounded-2xl border border-[#FDC2CD] bg-[#FFF8F9] p-4 sm:p-5 space-y-3.5 shadow-2xs">
      <div className="flex items-center gap-2">
        <Info className="size-4 text-[#e14b68] shrink-0" />
        <h3 className="text-sm font-bold text-slate-900">
          {clientName ? `${clientName}'s` : "Client's"} request for {eventName}
        </h3>
        <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e14b68]">
          From enquiry
        </span>
      </div>

      {requirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            They asked for (tap to filter the catalog)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {requirements.map((r) => {
              const isCategory = CATEGORY_CHIPS.has(r);
              const isFlowers = r === "Flowers & Lighting";
              const clickable = isCategory || isFlowers;
              const catDet = categoryDetails?.[r];

              return (
                <button
                  key={r}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (isCategory) onPickCategory?.(r);
                    else if (isFlowers) onPickFlowers?.();
                  }}
                  className={cn(
                    "rounded-full border border-[#FDC2CD] bg-white px-3 py-1 text-xs font-semibold text-[#C2284E] transition flex items-center gap-1.5",
                    clickable ? "cursor-pointer hover:bg-[#FFF0F3]" : "cursor-default",
                  )}
                >
                  <span>{r}</span>
                  {catDet?.photoUrl && <span className="text-[10px]" title="Photo attached">📷</span>}
                </button>
              );
            })}
          </div>

          {/* If there are category-specific notes, photos, or links, highlight them */}
          {hasCategoryDetails && (
            <div className="grid gap-2 sm:grid-cols-2 pt-1.5">
              {Object.entries(categoryDetails!).map(([catName, det]) => {
                if (!det.note && !det.photoUrl && !det.link) return null;
                return (
                  <div
                    key={catName}
                    className="flex items-start gap-2.5 rounded-xl border border-[#FCD2DA] bg-white p-2.5 text-xs shadow-2xs"
                  >
                    {det.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreview(det.photoUrl!)}
                        className="size-12 shrink-0 rounded-lg overflow-hidden border border-stone-200 hover:border-[#e14b68] transition cursor-pointer"
                        title="Click to view reference image"
                      >
                        <img
                          src={det.photoUrl}
                          alt={`${catName} reference`}
                          className="size-full object-cover"
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#2B2320] block text-xs">
                        {catName}
                      </span>
                      {det.note && (
                        <p className="text-[11px] text-[#6E5D57] mt-0.5 leading-snug">
                          {det.note}
                        </p>
                      )}
                      {det.link && (
                        <a
                          href={det.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D6415C] hover:underline mt-1 truncate max-w-full"
                          title={det.link}
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">Reference link</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {note && (
        <p className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-slate-700 border border-stone-200/80">
          <StickyNote className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
          <span>{note}</span>
        </p>
      )}

      {photos.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <ImageIcon className="size-3" />
            Reference photos from the client ({photos.length})
          </p>
          {onCreateFromPhoto && (
            <p className="text-[11px] text-slate-500">
              Don't have a matching design? Turn a photo into a new decoration in your catalog.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <div key={i} className="w-28 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setPreview(src)}
                  className="size-28 overflow-hidden rounded-xl border border-stone-200 shadow-2xs transition hover:border-[#e14b68] cursor-pointer"
                  title="View photo"
                >
                  <img
                    src={src}
                    alt={`Client reference ${i + 1}`}
                    className="size-full object-cover"
                  />
                </button>
                {onCreateFromPhoto && (
                  <button
                    type="button"
                    onClick={() => onCreateFromPhoto(src)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#e14b68] px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#d43d5a] cursor-pointer"
                  >
                    <Plus className="size-3" />
                    Create decoration
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
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
            alt="Client reference"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
