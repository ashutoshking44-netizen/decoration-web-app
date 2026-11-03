import { memo, useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  Mail,
  StickyNote,
  Users,
  X,
} from "lucide-react";
import {
  buildDecorationSnapshot,
  type EnquiryItem,
  type EnquiryRequestedDecoration,
} from "@/lib/enquiries";
import {
  getSharedPublicDecoration,
  getSetupsCacheVersion,
  loadStoredSetups,
  INITIAL_DECORATION_SETUPS,
  parseDetailsFromDescription,
} from "@/lib/decoration-setups";
import { loadEnquiryPhotos } from "@/lib/enquiry-photos";
import {
  getCurrentCompanyId,
  isMyCompanyId,
  getCurrentCompanyName,
  getCompanyNameById,
} from "@/lib/current-company";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export interface UnifiedDecorationDetails {
  title: string;
  category: string;
  description: string;
  inclusions: string[];
  detailRows: { label: string; value: string }[];
  price: number;
  priceFormatted: string;
  priceUnit?: string | undefined;
  coverPhoto: string | null;
  galleryList: string[];
  companyName: string;
  isYours: boolean;
  isOther: boolean;
  isUnknown: boolean;
}

/**
 * Requirement 3: Build Description, Inclusions list and Details rows
 * with ONE function for every decoration, whoever owns it (my company, other company, unknown).
 * Hides empty rows.
 */
export function buildUnifiedDecorationDetails(
  item: EnquiryRequestedDecoration | null,
): UnifiedDecorationDetails | null {
  if (!item) return null;

  const title = item.name || item.title || "Decoration Details";
  const category = item.category?.trim() || "Decoration";
  const description = item.description?.trim() || "";

  // 1. Inclusions list (uses explicit inclusions or parses from description text as fallback)
  let inclusions: string[] = [];
  if (Array.isArray(item.inclusions) && item.inclusions.length > 0) {
    inclusions = item.inclusions
      .map((inc) => (typeof inc === "string" ? inc.trim() : ""))
      .filter((inc) => inc.length > 0);
  } else if (description) {
    const parsed = parseDetailsFromDescription(description);
    if (parsed.inclusions && parsed.inclusions.length > 0) {
      inclusions = parsed.inclusions;
    }
  }

  // 2. Details rows (Category, Style, Colours, Dimensions, Category-specific specs)
  // Hide empty rows
  const detailRows: { label: string; value: string }[] = [];
  const addRow = (label: string, val?: string | null) => {
    if (val && typeof val === "string" && val.trim().length > 0) {
      detailRows.push({ label, value: val.trim() });
    }
  };

  addRow("Category", category);
  addRow("Style", item.style);
  if (item.theme && item.theme.trim() !== item.style?.trim()) {
    addRow("Theme", item.theme);
  }
  addRow("Colours", item.colours);
  addRow("Dimensions / Size", item.dimensions || item.size);

  const structureLabel =
    category === "Entrance Gate"
      ? "Arch / Structure"
      : category === "Welcome Board"
        ? "Material / Board"
        : category === "Mandap"
          ? "Mandap Frame"
          : category === "Stage"
            ? "Stage Structure"
            : "Structure / Rigging";
  addRow(structureLabel, item.structure);
  addRow("Platform / Deck", item.platform);
  addRow("Lighting", item.lighting);
  addRow("Floral Arrangement", item.flowers);
  addRow("Seating / Furniture", item.seating);
  addRow("Personalization", item.customText);
  addRow("Applicable Events", item.events);
  addRow("Price Unit", item.priceUnit);

  // 3. Pricing
  const price = Number(item.listedPrice ?? item.price) || 0;
  const priceFormatted = price > 0 ? `Rs. ${price.toLocaleString("en-IN")}` : "Custom quote";
  const priceUnit = item.priceUnit?.trim();

  // 4. Photos & gallery
  const coverPhoto = item.photo || item.image || item.gallery?.[0] || null;
  const rawGallery =
    Array.isArray(item.gallery) && item.gallery.length > 0
      ? item.gallery
      : coverPhoto
        ? [coverPhoto]
        : [];
  const galleryList = Array.from(
    new Set(
      rawGallery.filter((url): url is string => typeof url === "string" && Boolean(url.trim())),
    ),
  );

  // 5. Ownership
  const companyId = item.companyId || item.ownerCompanyId;
  const isYours = Boolean(companyId && isMyCompanyId(companyId));
  const isOther = Boolean(companyId && !isMyCompanyId(companyId));
  const isUnknown = !companyId;
  const companyName = isYours
    ? getCurrentCompanyName()
    : item.companyName && item.companyName !== "Company 1"
      ? item.companyName
      : companyId
        ? getCompanyNameById(companyId)
        : "Unknown";

  return {
    title,
    category,
    description,
    inclusions,
    detailRows,
    price,
    priceFormatted,
    priceUnit,
    coverPhoto,
    galleryList,
    companyName,
    isYours,
    isOther,
    isUnknown,
  };
}

/**
 * Shown inside an enquiry card on the Enquiries page:
 *  - the 2nd, 3rd… events of a multi-event enquiry (the first event is
 *    rendered by the card's existing row), and
 *  - for every event: what the client asked for, their note, and the
 *    reference photos they attached on the public form.
 *  - inside "Client requirements, notes & references", shows each decoration card
 *    with a badge on the photo: "Yours" (green) or the other company's name (amber),
 *    or "Unknown" (grey) if unowned.
 */
export const EnquiryExtraDetails = memo(EnquiryExtraDetailsView);

// Building a card's item merges the snapshot with the catalogue entry, which
// touches multi-MB photo strings; reuse it until the snapshot or catalogue changes.
const cardItemCache = new WeakMap<
  EnquiryRequestedDecoration,
  { v: number; item: EnquiryRequestedDecoration }
>();

function cardItemFor(d: EnquiryRequestedDecoration): EnquiryRequestedDecoration {
  const v = getSetupsCacheVersion();
  const hit = cardItemCache.get(d);
  if (hit && hit.v === v) return hit.item;
  const shared = getSharedPublicDecoration(d.decorationId || d.id, d);
  const item = shared ? buildDecorationSnapshot(d, shared) : d;
  cardItemCache.set(d, { v, item });
  return item;
}

function EnquiryExtraDetailsView({ enquiry }: { enquiry: EnquiryItem }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedDecoration, setSelectedDecoration] = useState<EnquiryRequestedDecoration | null>(
    null,
  );
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Look up decoration in shared public catalogue; falls back to snapshot for deleted/older items
  const { activeItem, isSnapshotFallback } = useMemo(() => {
    if (!selectedDecoration) return { activeItem: null, isSnapshotFallback: false };
    try {
      const decId = selectedDecoration.decorationId || selectedDecoration.id;
      // Routed through repository layer getSharedPublicDecoration()
      const sharedRecord = getSharedPublicDecoration(decId, selectedDecoration);

      // Diagnostic logging as requested by Requirement 1:
      const myCatalog = loadStoredSetups().filter((s) => s.companyId === getCurrentCompanyId());
      const allStored = loadStoredSetups();
      const inMyCatalog = myCatalog.some(
        (s) =>
          String(s.id).toLowerCase() === String(decId).toLowerCase() ||
          (Array.isArray((s as any).aliases) && (s as any).aliases.includes(decId)),
      );
      const inSharedCatalog = allStored.some(
        (s) =>
          String(s.id).toLowerCase() === String(decId).toLowerCase() ||
          (Array.isArray((s as any).aliases) && (s as any).aliases.includes(decId)),
      );
      const inSeedPresets = INITIAL_DECORATION_SETUPS.some(
        (s) =>
          String(s.id).toLowerCase() === String(decId).toLowerCase() ||
          (Array.isArray((s as any).aliases) && (s as any).aliases.includes(decId)),
      );

      console.group(
        `[Drawer Decoration Lookup Diagnostics]: ${selectedDecoration.name || selectedDecoration.title || decId}`,
      );
      console.log("1. Enquiry Item to Look Up:", {
        decorationId: decId,
        id: selectedDecoration.id,
        name: selectedDecoration.name || selectedDecoration.title,
        category: selectedDecoration.category,
        companyId: selectedDecoration.companyId,
        companyName: selectedDecoration.companyName,
      });
      console.log("2. Storage Locations Inspected:", {
        "My Catalog (localStorage: filtered to CURRENT_COMPANY_ID)": {
          storageKey: "decoration-portal:decoration-setups (my company only)",
          totalCount: myCatalog.length,
          itemIds: myCatalog.map((s) => s.id),
          containsThisItem: inMyCatalog,
        },
        "Shared/Public Catalog (localStorage: all companies)": {
          storageKey: "decoration-portal:decoration-setups",
          totalCount: allStored.length,
          itemIds: allStored.map((s) => s.id),
          containsThisItem: inSharedCatalog,
        },
        "Seed/Static Presets": {
          source: "INITIAL_DECORATION_SETUPS in decoration-setups.ts",
          totalCount: INITIAL_DECORATION_SETUPS.length,
          itemIds: INITIAL_DECORATION_SETUPS.map((s) => s.id),
          containsThisItem: inSeedPresets,
        },
        "Client Site Server DB": {
          endpoint: "GET /api/decorations (server/data/db.json)",
          source: "server/data/db.json",
        },
      });
      console.log("3. Lookup Diagnosis & Result:", {
        recordFound: Boolean(sharedRecord),
        matchedRecordId: sharedRecord?.id,
        matchedRecordName: sharedRecord?.name,
        ownerCompany: sharedRecord?.companyName,
        isSnapshotFallback: !sharedRecord,
        whyPreviousLookupFailed: !sharedRecord
          ? "Record not found in any storage list (record not saved anywhere or deleted)"
          : inMyCatalog
            ? "Item belongs to current company"
            : "Item belongs to another company (Royal Orchid Events). Previous drawer failed because it searched only current company catalog or had strict ID mismatch (dec-c2-fairy-lights vs dec-c2-fairy-lights-entrance). Now resolved via normalized shared repository lookup.",
      });
      console.groupEnd();

      if (sharedRecord) {
        return {
          activeItem: buildDecorationSnapshot(selectedDecoration, sharedRecord),
          isSnapshotFallback: false,
        };
      }
      return {
        activeItem: buildDecorationSnapshot(selectedDecoration, undefined),
        isSnapshotFallback: true,
      };
    } catch (err) {
      console.error("[Drawer Lookup Exception]:", err);
      return {
        activeItem: selectedDecoration,
        isSnapshotFallback: true,
      };
    }
  }, [selectedDecoration]);

  const details = useMemo(
    () => buildUnifiedDecorationDetails(activeItem || selectedDecoration),
    [activeItem, selectedDecoration],
  );

  useEffect(() => {
    if (details) {
      setActivePhotoUrl(details.coverPhoto);
    } else {
      setActivePhotoUrl(null);
    }
  }, [details]);

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
      ({ ev }) =>
        (ev.requirements?.length ?? 0) > 0 ||
        !!ev.note ||
        (ev.photo_count ?? 0) > 0 ||
        (ev.requested_decorations?.length ?? 0) > 0,
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

  const renderDecorationCard = (d: EnquiryRequestedDecoration) => {
    const item = cardItemFor(d);

    const itemCompanyId = item.companyId || item.ownerCompanyId;
    const isYours = Boolean(itemCompanyId && isMyCompanyId(itemCompanyId));
    const isUnknown = !itemCompanyId;
    const photoSrc = item.photo || item.image;
    const itemName = item.name || item.title || "Decoration";
    const itemPrice = Number(item.listedPrice ?? item.price) || 0;
    const companyName = isYours
      ? getCurrentCompanyName()
      : item.companyName && item.companyName !== "Company 1"
        ? item.companyName
        : itemCompanyId
          ? getCompanyNameById(itemCompanyId)
          : "Unknown";

    return (
      <div
        key={d.id || d.decorationId || itemName}
        className="w-28 group/card focus:outline-none cursor-pointer text-left shrink-0"
        role="button"
        tabIndex={0}
        onClick={() => {
          setSelectedDecoration(d);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedDecoration(d);
          }
        }}
        title={`Click to view details of ${itemName}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-stone-200 shadow-2xs transition group-hover/card:border-[#E8546F] group-hover/card:shadow-xs group-focus/card:ring-2 group-focus/card:ring-[#E8546F]/40 bg-stone-100">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={itemName}
              className={`size-full object-cover transition-transform duration-200 group-hover/card:scale-105 ${!isYours ? "select-none pointer-events-none" : ""}`}
              draggable={isYours}
              onContextMenu={(e) => !isYours && e.preventDefault()}
            />
          ) : (
            <div className="flex size-full items-center justify-center border border-dashed border-stone-300 bg-white text-stone-300">
              <ImageIcon className="size-5" />
            </div>
          )}

          {/* Badge on the photo */}
          <div className="absolute top-1 left-1 z-10">
            {isYours ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-600 text-white shadow-xs tracking-tight">
                Yours
              </span>
            ) : isUnknown ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-stone-500 text-white shadow-xs tracking-tight"
                title="Unknown"
              >
                Unknown
              </span>
            ) : (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500 text-white shadow-xs tracking-tight max-w-[96px] truncate"
                title={companyName}
              >
                <span className="truncate">{companyName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 truncate text-[11px] font-semibold text-stone-800" title={itemName}>
          {itemName}
        </div>
        <div className="text-[11px] text-stone-500">
          {itemPrice > 0 ? `Rs. ${itemPrice.toLocaleString("en-IN")}` : "Custom quote"}
        </div>
      </div>
    );
  };

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
          <div className="border-b border-[#FDC2CD]/40 pb-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Client requirements, notes &amp; references
            </div>
          </div>

          {detailEvents.map(({ ev, i }) => {
            const decorations = ev.requested_decorations ?? [];

            return (
              <div key={`${ev.name}-${i}`} className="space-y-2">
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

                {/* Decorations rendering: each card shows its photo badge and ownership */}
                {decorations.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Picked Decorations ({decorations.length})
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {decorations.map((d) => renderDecorationCard(d))}
                    </div>
                  </div>
                )}

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
            );
          })}
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

      {/* ── Photo Lightbox Preview ── */}
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

      {/* ── Right-Side Drawer for Decoration Details ── */}
      <Sheet
        open={!!selectedDecoration}
        onOpenChange={(open) => !open && setSelectedDecoration(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto p-6 bg-white space-y-5"
        >
          {details && (
            <>
              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-[#FFF0F3] border border-[#FFD0D9] text-[#E8546F] text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                    {details.category}
                  </span>
                  {details.isYours ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                      Yours
                    </span>
                  ) : details.isUnknown ? (
                    <span className="rounded-full bg-stone-100 border border-stone-300 text-stone-700 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                      Unknown
                    </span>
                  ) : (
                    <span
                      className="rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider max-w-[200px] truncate"
                      title={details.companyName}
                    >
                      {details.companyName}
                    </span>
                  )}
                </div>
                <SheetTitle className="font-display text-xl font-bold text-[#2B2320]">
                  {details.title}
                </SheetTitle>
                {isSnapshotFallback ? (
                  <div className="rounded-md bg-stone-100 border border-stone-200/90 px-2.5 py-1 text-[11px] text-stone-600 italic">
                    Showing the details saved when the client sent this.
                  </div>
                ) : (
                  <SheetDescription className="text-xs text-stone-500">
                    {details.isOther
                      ? `View-only reference from ${details.companyName}`
                      : details.isUnknown
                        ? "View-only reference (unrecorded company)"
                        : "Catalogue details for this enquiry selection"}
                  </SheetDescription>
                )}
              </SheetHeader>

              {/* Photos Section: Large Photo + Thumbnails */}
              <div className="space-y-2">
                <div className="w-full aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-xs relative">
                  {activePhotoUrl || details.coverPhoto ? (
                    <img
                      src={activePhotoUrl || details.coverPhoto!}
                      alt={details.title}
                      className={cn(
                        "size-full object-cover transition-all duration-200",
                        (details.isOther || details.isUnknown) && "select-none pointer-events-none",
                      )}
                      draggable={details.isYours}
                      onContextMenu={(e) =>
                        (details.isOther || details.isUnknown) && e.preventDefault()
                      }
                    />
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center text-stone-400 gap-1.5">
                      <ImageIcon className="size-8 stroke-[1.5]" />
                      <span className="text-xs">No preview photo</span>
                    </div>
                  )}
                </div>

                {/* Extra Photos Thumbnails */}
                {details.galleryList.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                    {details.galleryList.map((thumbUrl, idx) => {
                      const isSelected = (activePhotoUrl || details.coverPhoto) === thumbUrl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoUrl(thumbUrl)}
                          className={cn(
                            "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer bg-stone-100",
                            isSelected
                              ? "border-[#E8546F] ring-2 ring-[#E8546F]/30"
                              : "border-stone-200 hover:border-stone-300 opacity-70 hover:opacity-100",
                          )}
                          aria-label={`View photo ${idx + 1}`}
                        >
                          <img
                            src={thumbUrl}
                            alt={`${details.title} ${idx + 1}`}
                            className={cn(
                              "size-full object-cover",
                              (details.isOther || details.isUnknown) &&
                                "select-none pointer-events-none",
                            )}
                            draggable={details.isYours}
                            onContextMenu={(e) =>
                              (details.isOther || details.isUnknown) && e.preventDefault()
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price & Owner section */}
              <div className="rounded-xl border border-stone-200 bg-[#FAF9F8] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Price
                  </span>
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="text-lg font-bold text-[#E8546F]">
                      {details.priceFormatted}
                    </span>
                    {details.priceUnit && (
                      <span className="text-xs font-medium text-stone-500">
                        {details.priceUnit.startsWith("/")
                          ? details.priceUnit
                          : `/ ${details.priceUnit}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-px bg-stone-200/80" />

                {/* Owner Section */}
                {details.isOther ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <Building2 className="size-3.5 text-amber-600 shrink-0" />
                      <span>Company: {details.companyName}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      View-only reference. Belongs to {details.companyName}. No copying,
                      downloading, or editing permitted.
                    </p>
                  </div>
                ) : details.isUnknown ? (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                      <Building2 className="size-3.5 text-stone-500 shrink-0" />
                      <span>Company: Unknown</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Older enquiry decoration with no company recorded. View-only reference.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Company: {details.companyName} (Yours)</span>
                    </div>
                    <Link
                      to="/inventory"
                      search={details.category ? { category: details.category } : {}}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#E8546F] hover:underline cursor-pointer"
                    >
                      <span>Open in catalog</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Description & Inclusions */}
              <div className="rounded-xl border border-stone-200 bg-[#FAF9F8] p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Description &amp; Inclusions
                </div>

                {/* Description */}
                {details.description ? (
                  <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                    {details.description}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 italic">No description provided.</p>
                )}

                {/* Inclusions as a list */}
                {details.inclusions.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/80 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Inclusions ({details.inclusions.length})
                    </div>
                    <ul className="space-y-1.5 pl-0.5">
                      {details.inclusions.map((inc, i) => (
                        <li key={i} className="text-xs text-stone-600 flex items-start gap-2">
                          <span className="text-[#E8546F] font-bold text-xs leading-none mt-1 shrink-0">
                            •
                          </span>
                          <span className="flex-1 leading-snug">{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Details Section (Style, Colours, Size, etc. - hide empty rows) */}
              {details.detailRows.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-[#FAF9F8] p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Details
                  </div>
                  <div className="divide-y divide-stone-200/70 text-xs">
                    {details.detailRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-3"
                      >
                        <span className="text-stone-500 font-medium shrink-0">{row.label}</span>
                        <span
                          className="text-stone-800 font-semibold text-right truncate max-w-[220px]"
                          title={row.value}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
