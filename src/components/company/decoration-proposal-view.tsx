import React, { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  Share2,
  ExternalLink,
  MessageCircle,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import type { BookedClient, ClientCeremonyItem } from "@/lib/clients";
import { healEmptyQuotationCeremonies, getCeremonySubtotal, getClientTotal } from "@/lib/clients";
import { ceremoniesFromEnquiry, loadStoredEnquiries } from "@/lib/enquiries";
import { useCompanyProfile } from "@/lib/company-profile";
import { usePaymentQrs } from "@/lib/payment-qr";
import { compressImage } from "@/lib/photographer-gallery";
import { saveEnquiryPhotos } from "@/lib/enquiry-photos";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  useProposalActivity,
  saveStoredProposalActivity,
  getStoredProposalActivity,
} from "@/lib/proposal-activity";
import {
  getDecorItemBreakdown,
  generateDecorSummary,
  findCatalogSetup,
  formatNepaliNumber,
  toTitleCase,
  type DecorItemBreakdown,
} from "@/lib/decor-item-breakdown";

export interface DayItem {
  n: string;
  s: string;
  p: number;
  pending?: boolean | undefined;
  setupId?: string | undefined;
  category?: string | undefined;
  imageUrl?: string | undefined;
  photo?: string | undefined;
  description?: string | undefined;
}

export interface DaySchedule {
  bs: string;
  ad: string;
  name: string;
  venue: string;
  photos: { src: string; cap: string; g: string }[];
  items: DayItem[];
  notes: string[];
}

export function parseCeremonyDate(rawDate: string): { bs: string; ad: string } {
  if (!rawDate) return { bs: "", ad: "" };
  const trimmed = rawDate.trim();

  // Format: "BS_DATE · AD_DATE"
  if (trimmed.includes("·")) {
    const [part1, ...rest] = trimmed.split("·");
    return { bs: part1 ? part1.trim() : "", ad: rest.join("·").trim() };
  }

  // Format: "AD_DATE (BS_DATE)" or "BS_DATE (AD_DATE)"
  const parenMatch = trimmed.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    const outside = parenMatch[1] ? parenMatch[1].trim() : "";
    const inside = parenMatch[2] ? parenMatch[2].trim() : "";
    const nepaliMonths =
      /^(Baisakh|Jestha|Ashadh|Shrawan|Bhadra|Aswin|Ashwin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra|208\d)/i;
    if (nepaliMonths.test(inside)) {
      return { bs: inside, ad: outside };
    }
    return { bs: outside, ad: inside };
  }

  return { bs: trimmed, ad: "" };
}

export function assertNoSampleDataRendered(days: DaySchedule[], clientName?: string) {
  const isDev =
    Boolean(import.meta.env.DEV) ||
    (typeof process !== "undefined" &&
      Boolean(process.env) &&
      process.env["NODE_ENV"] !== "production");
  if (isDev) {
    const FORBIDDEN_NAMES = ["Shivam & Gauri", "Shivam and Gauri"];
    if (clientName && FORBIDDEN_NAMES.includes(clientName)) {
      const msg = `[DEV WARNING] Sample client name "${clientName}" rendered in proposal view!`;
      console.warn(msg);
      throw new Error(msg);
    }
    const sampleEventTitles = ["ENGAGEMENT DAY", "HALDI DAY", "MEHENDI DAY", "PRE-RECEPTION"];
    if (
      days.length >= 4 &&
      sampleEventTitles.every((title) => days.some((d) => d.name === title))
    ) {
      const msg = "[DEV WARNING] Hardcoded sample days sequence rendered in proposal view!";
      console.warn(msg);
      throw new Error(msg);
    }
    days.forEach((d) => {
      d.items.forEach((it) => {
        if (it.n === "Ambient Décor Lighting" && it.s === "Included in ceremonial setup") {
          const msg =
            "[DEV WARNING] Injected sample item 'Ambient Décor Lighting' detected in proposal view!";
          console.warn(msg);
          throw new Error(msg);
        }
        if (it.n === "Floral Accents & Props" && it.s === "Fresh seasonal florals") {
          const msg =
            "[DEV WARNING] Injected sample item 'Floral Accents & Props' detected in proposal view!";
          console.warn(msg);
          throw new Error(msg);
        }
      });
    });
  }
}

const npr = (n: number) => {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + "," + last3;
};

function DayCard({ d, open, onToggle }: { d: DaySchedule; open: boolean; onToggle: () => void }) {
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const total = d.items.reduce((s, i) => s + (Number(i.p) || 0), 0);
  const count = d.items.length;

  return (
    <div className="dp-daycard">
      <button type="button" className="dp-daytop" onClick={onToggle} aria-expanded={open}>
        <div>
          <div className="dp-bs">{d.bs}</div>
          {d.ad ? <div className="dp-ad">{d.ad}</div> : null}
          <h3 className="dp-dayname">{d.name}</h3>
          <div className="dp-venue">📍 {d.venue}</div>
        </div>
        <span className={"dp-chev" + (open ? " open" : "")}>⌄</span>
      </button>

      {d.items.length > 0 && (
        <>
          <div className="dp-minilist" aria-label="Decorations for this event">
            {d.items.map((it, k) => {
              const bd = getDecorItemBreakdown(it);
              return (
                <button
                  type="button"
                  key={k}
                  className={"dp-miniitem" + (open && expandedItemIndex === k ? " on" : "")}
                  onClick={() => {
                    // tapping the open photo again hides its details
                    setExpandedItemIndex(open && expandedItemIndex === k ? null : k);
                    if (!open) onToggle();
                  }}
                  aria-label={`View details of ${bd.itemName}`}
                >
                  <span
                    className="dp-minicard-photo"
                    style={bd.imageUrl ? { backgroundImage: `url(${bd.imageUrl})` } : undefined}
                  />
                  <span className="dp-minitext">
                    <b>{bd.itemName}</b>
                    <small>
                      {it.p > 0
                        ? `NPR ${formatNepaliNumber(it.p)}`
                        : it.pending
                          ? "To be confirmed"
                          : "Included"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          {!open && count > 1 && (
            <div className="dp-countpill">
              🎀 {count} décor elements · NPR {formatNepaliNumber(total)} · swipe to see all
            </div>
          )}
        </>
      )}

      {open && (
        <>
          <div className="dp-items">
            {d.items.length > 0 && expandedItemIndex === null && (
              <div
                style={{
                  padding: "6px 0 10px",
                  textAlign: "center",
                  color: "var(--ink-2)",
                  fontSize: "13px",
                }}
              >
                Tap a photo above to see its details
              </div>
            )}
            {d.items.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "var(--dp-ink-2)",
                  fontSize: "13px",
                }}
              >
                No décor elements selected for this event
              </div>
            ) : (
              d.items.map((i, k) => {
                if (k !== expandedItemIndex) return null;
                const breakdown = getDecorItemBreakdown(i);
                const isExpanded = expandedItemIndex === k;
                const hasBreakdownData = Boolean(
                  breakdown.structure ||
                  breakdown.florals ||
                  breakdown.pricedComponents.length > 0 ||
                  breakdown.imageUrl ||
                  i.p > 0,
                );

                const toggleBreakdown = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setExpandedItemIndex(isExpanded ? null : k);
                };

                return (
                  <div className="dp-item-wrapper" key={k}>
                    {/* Collapsed Item Row */}
                    <div
                      className="dp-item-header"
                      onClick={hasBreakdownData ? toggleBreakdown : undefined}
                    >
                      <div className="dp-item-content">
                        <div className="dp-item-name-row">
                          <span className="dp-item-title">{breakdown.itemName}</span>
                        </div>
                        <span className="dp-item-subtitle">{breakdown.subtitle}</span>

                        {hasBreakdownData && (
                          <button
                            type="button"
                            className="dp-bd-toggle-btn"
                            onClick={toggleBreakdown}
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? "Hide breakdown" : "View breakdown"}</span>
                            <span className={"dp-bd-chev" + (isExpanded ? " open" : "")}>⌄</span>
                          </button>
                        )}
                      </div>

                      <div className="dp-item-price-side">
                        <div
                          className={
                            "dp-item-price-num" + (i.p === 0 ? (i.pending ? " tbc" : " free") : "")
                          }
                        >
                          {i.p === 0 ? (
                            i.pending ? (
                              "To be confirmed"
                            ) : (
                              "Included"
                            )
                          ) : (
                            <>NPR {formatNepaliNumber(i.p)}</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Breakdown Block */}
                    {isExpanded && (
                      <div className="dp-breakdown-card">
                        {/* 1. Structure */}
                        {breakdown.structure && (
                          <div className="dp-bd-section">
                            <div className="dp-bd-sec-header">STRUCTURE SPECIFICATIONS</div>
                            <div className="dp-bd-kv-grid">
                              <div className="dp-bd-kv">
                                <span className="dp-bd-k">Structure Type:</span>
                                <span className="dp-bd-v">{breakdown.structure.structureType}</span>
                              </div>
                              {breakdown.structure.dimensions && (
                                <div className="dp-bd-kv">
                                  <span className="dp-bd-k">Dimensions:</span>
                                  <span className="dp-bd-v">{breakdown.structure.dimensions}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. Floral specifications & style, tagged 'Included in base design' */}
                        {breakdown.florals && (
                          <div className="dp-bd-section">
                            <div className="dp-bd-sec-header flex-header">
                              <span>FLORAL SPECIFICATIONS & STYLE</span>
                              <span className="dp-bd-tag">{breakdown.florals.tag}</span>
                            </div>
                            <div className="dp-bd-kv-grid">
                              {breakdown.florals.flowerStyle && (
                                <div className="dp-bd-kv">
                                  <span className="dp-bd-k">Flower Style:</span>
                                  <span className="dp-bd-v">{breakdown.florals.flowerStyle}</span>
                                </div>
                              )}
                              {breakdown.florals.varietyType && (
                                <div className="dp-bd-kv">
                                  <span className="dp-bd-k">Variety Type:</span>
                                  <span className="dp-bd-v">{breakdown.florals.varietyType}</span>
                                </div>
                              )}
                            </div>
                            {breakdown.florals.flowers.length > 0 && (
                              <div className="dp-bd-flower-pills">
                                {breakdown.florals.flowers.map((f, fi) => (
                                  <span className="dp-bd-flower-pill" key={fi}>
                                    🌸 {f.display}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Priced components */}
                        {breakdown.pricedComponents.length > 0 && (
                          <div className="dp-bd-section">
                            <div className="dp-bd-sec-header">PRICED COMPONENTS</div>
                            <div className="dp-bd-comp-list">
                              {breakdown.pricedComponents.map((c) => (
                                <div className="dp-bd-comp-row" key={c.id}>
                                  <div className="dp-bd-comp-info">
                                    <div className="dp-bd-comp-name">{c.name}</div>
                                    <div className="dp-bd-comp-specs">{c.specs}</div>
                                  </div>
                                  <div
                                    className={
                                      "dp-bd-comp-price" +
                                      (c.status === "included"
                                        ? " free"
                                        : c.status === "tbc"
                                          ? " tbc"
                                          : "")
                                    }
                                  >
                                    {c.displayPrice}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Base design row (structure + florals) */}
                        {breakdown.baseDesign.visible && (
                          <div className="dp-bd-section dp-bd-base-section">
                            <div className="dp-bd-comp-row dp-bd-base-row">
                              <div className="dp-bd-comp-info">
                                <div className="dp-bd-comp-name">{breakdown.baseDesign.label}</div>
                                <div className="dp-bd-comp-specs">
                                  Structural frame fabrication + fresh ceremonial flowers
                                </div>
                              </div>
                              <div className="dp-bd-comp-price">
                                NPR {formatNepaliNumber(breakdown.baseDesign.price)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5. Total row (skipped when the day has one item: DAY TOTAL says the same) */}
                        {d.items.length > 1 && (
                          <div className="dp-bd-total-row">
                            <div>
                              <div className="dp-bd-total-name">{breakdown.totalRow.label}</div>
                              <div className="dp-bd-total-note">{breakdown.totalRow.note}</div>
                            </div>
                            <div className="dp-bd-total-price">
                              NPR {formatNepaliNumber(breakdown.totalRow.price)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="dp-daysum">
            <span>DAY TOTAL</span>
            <b>NPR {formatNepaliNumber(total)}</b>
          </div>
        </>
      )}
    </div>
  );
}

export interface DecorationProposalViewProps {
  client?: BookedClient | null;
  onClose?: () => void;
  isModal?: boolean;
}

type PayAccount = {
  id: string;
  label: string;
  ownerName: string;
  accountNumber?: string | undefined;
  image: string;
  role: "main" | "optional";
};

/** Pop-up shown after "Pay advance": QR + bank details + payment screenshot upload. */
function PayAdvanceModal({
  open,
  onClose,
  amount,
  accounts,
  proposalId,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  accounts: PayAccount[];
  proposalId: string;
  onSubmitted: () => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const acc = accounts.find((a) => a.id === pick) ?? accounts[0];

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText?.(text);
    toast.success(`${what} copied`);
  };

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      setShot(await compressImage(file, 1400, 0.8));
    } catch {
      toast.error("Couldn't read that image.");
    }
    setBusy(false);
  };

  const submit = async () => {
    if (!shot) {
      fileRef.current?.click();
      return;
    }
    setBusy(true);
    await saveEnquiryPhotos(`payment-${proposalId}`, [shot]).catch(() => false);
    setBusy(false);
    toast.success("Screenshot received — we'll verify and confirm your booking.");
    setShot(null);
    onSubmitted();
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</div>
        <div className="truncate text-[15px] font-semibold text-stone-900">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => copy(value, label)}
        className="shrink-0 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-[#8A3B55] transition hover:bg-rose-100"
      >
        Copy
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto rounded-3xl bg-[#FFFCFA] p-6 sm:p-7">
        <DialogTitle className="sr-only">Advance payment</DialogTitle>
        <DialogDescription className="sr-only">Scan the QR to pay the advance</DialogDescription>
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8506F]">
            Advance payment
          </p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">
            Pay NPR {amount.toLocaleString("en-IN")}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            You&apos;re welcome to pay more if you&apos;d like to reduce your remaining balance.
          </p>
        </div>

        {!acc ? (
          <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500">
            Payment QR isn&apos;t available yet. Please contact the studio for payment details.
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPick(a.id)}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-semibold transition " +
                      (a.id === acc.id
                        ? "border-[#B8506F] bg-[#B8506F] text-white"
                        : "border-rose-200 bg-white text-[#B8506F] hover:bg-rose-50")
                    }
                  >
                    {a.label || "Bank"}
                  </button>
                ))}
              </div>
            )}

            <div className="mx-auto grid aspect-square w-full max-w-[300px] place-items-center rounded-3xl border border-rose-100 bg-white p-4">
              {acc.image ? (
                <img src={acc.image} alt="Payment QR" className="size-full object-contain" />
              ) : (
                <span className="text-sm text-stone-400">QR not available</span>
              )}
            </div>

            <Row label="Bank" value={acc.label || "Bank account"} />
            <Row label="Account name" value={acc.ownerName || "—"} />
            {acc.accountNumber && <Row label="Account number" value={acc.accountNumber} />}

            {shot && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <img
                  src={shot}
                  alt="Payment screenshot"
                  className="size-12 rounded-lg object-cover"
                />
                <span className="flex-1 text-xs font-semibold text-emerald-800">
                  Screenshot attached
                </span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-semibold text-emerald-800 underline"
                >
                  Change
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-2xl bg-gradient-to-r from-[#8A506A] to-[#B8506F] py-4 text-[15px] font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              {shot ? "Submit payment screenshot" : "Upload payment screenshot"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onFile(e.target.files)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DecorationProposalView({
  client,
  onClose,
  isModal = false,
}: DecorationProposalViewProps) {
  const { profile } = useCompanyProfile();
  const [open, setOpen] = useState(0);
  const [revealed, setRevealed] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payPick, setPayPick] = useState<string | null>(null);
  const { qrs: allPaymentQrs } = usePaymentQrs();

  // Bank/QR accounts the studio chose for this client: one Main, any Optional
  const payAccounts = useMemo(() => {
    const chosen = client?.payment_accounts ?? [];
    const picked = chosen
      .map((c) => {
        const qr = allPaymentQrs.find((q) => q.id === c.id);
        return qr ? { ...qr, role: c.role } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (a.role === "main" ? -1 : b.role === "main" ? 1 : 0));
    if (picked.length > 0) {
      // No Main chosen → treat the first picked account as Main
      return picked.some((a) => a.role === "main")
        ? picked
        : picked.map((a, i) => ({ ...a, role: i === 0 ? ("main" as const) : a.role }));
    }
    // Nothing chosen for this client → offer every saved QR (first = Main)
    return allPaymentQrs.map((q, i) => ({
      ...q,
      role: i === 0 ? ("main" as const) : ("optional" as const),
    }));
  }, [client?.payment_accounts, allPaymentQrs]);
  const mainAccount = payAccounts.find((a) => a.role === "main");

  const proposalId = useMemo(() => {
    if (!client) return "prop-default";
    return client.proposal_id || `prop-${client.id.replace(/^bk-/, "")}`;
  }, [client]);

  const { activity, updateActivity } = useProposalActivity(proposalId);

  // Map real client ceremonies to schedule days. NO sample DAYS fallback!
  const days: DaySchedule[] = useMemo(() => {
    if (!client) return [];
    // Heal empty quotation ceremonies from linked enquiry if needed
    const healedClient = healEmptyQuotationCeremonies(client);
    const effectiveClient = healedClient || client;

    const hasDecor =
      effectiveClient.ceremonies?.some((c) => (c.items?.length ?? 0) > 0 || c.setupName) ?? false;
    const fromEnquiry = hasDecor
      ? null
      : (() => {
          const linkedEnquiryId =
            effectiveClient.enquiry_id ||
            (effectiveClient.id.startsWith("enq-") ? effectiveClient.id : undefined);
          const enq = loadStoredEnquiries(true).find(
            (e) =>
              e.id === effectiveClient.id ||
              (linkedEnquiryId && e.id === linkedEnquiryId) ||
              (effectiveClient.proposal_id &&
                e.id.replace("enq-", "") ===
                  effectiveClient.proposal_id.replace(/^(prop-|q-)/i, "")) ||
              (e.client_name &&
                effectiveClient.client_name &&
                e.client_name.trim().toLowerCase() ===
                  effectiveClient.client_name.trim().toLowerCase()),
          );
          return enq ? ceremoniesFromEnquiry(enq) : null;
        })();
    const rawCeremonies: ClientCeremonyItem[] = fromEnquiry
      ? fromEnquiry
      : effectiveClient.ceremonies && effectiveClient.ceremonies.length > 0
        ? effectiveClient.ceremonies
        : [
            {
              id: "c-1",
              name: effectiveClient.event_type || "Wedding Ceremony",
              date: effectiveClient.event_date || "Date on record",
              venue: effectiveClient.venue || "Venue on record",
              setupPrice: effectiveClient.total_amount || 0,
            },
          ];

    return rawCeremonies.map((c, idx) => {
      const { bs, ad } = parseCeremonyDate(c.date);
      const eventName = (c.name || `Ceremony ${idx + 1}`).toUpperCase();
      const venue = c.venue || effectiveClient?.venue || "Venue on record";

      // 1. Build real items only directly from saved quotation
      let items: DayItem[] = [];

      if (c.items && c.items.length > 0) {
        items = c.items.map((it) => {
          const cat = findCatalogSetup(it.setupId || it.name);
          const autoSub = cat?.specifications
            ? generateDecorSummary(cat.specifications, it.category || cat.category)
            : it.category
              ? `${it.category} arrangement`
              : "Ceremonial setup";
          const price =
            Number(it.price) ||
            (Number((it as any).unitPrice)
              ? (Number((it as any).quantity) || 1) * Number((it as any).unitPrice)
              : 0) ||
            Number(c.setupPrice) ||
            Number(cat?.total_price) ||
            0;
          const img = it.imageUrl || it.photo || cat?.imageUrl || c.setupImage || "";
          return {
            n: it.name,
            s: it.description || (it as any).details || autoSub,
            p: price,
            pending: it.pending ?? (!price || price === 0),
            setupId: it.setupId || cat?.id,
            category: it.category || cat?.category,
            imageUrl: img,
            photo: img,
            description: it.description || (it as any).details || autoSub,
          };
        });
      } else if (c.setupName && c.setupName.includes(" + ")) {
        const parts = c.setupName.split(" + ");
        items = parts.map((partName) => {
          const trimmed = partName.trim();
          const cat = findCatalogSetup(trimmed);
          const autoSub = cat?.specifications
            ? generateDecorSummary(cat.specifications, cat.category)
            : cat?.category
              ? `${cat.category} arrangement`
              : "Ceremonial setup";
          const price = Number(cat?.total_price) || 0;
          const img = cat?.imageUrl || c.setupImage || "";
          return {
            n: trimmed,
            s: autoSub,
            p: price,
            pending: !price,
            setupId: cat?.id,
            category: cat?.category,
            imageUrl: img,
            photo: img,
            description: autoSub,
          };
        });
      } else if (c.setupName || c.setupPrice || c.subtotal || effectiveClient.total_amount) {
        const cat = findCatalogSetup(c.setupId || c.setupName || "");
        const catTitle = cat?.name || c.setupName || c.name || "Wedding Decoration";
        const autoSub = cat?.specifications
          ? generateDecorSummary(cat.specifications, c.category || cat?.category)
          : c.category
            ? `${c.category} arrangement`
            : "Ceremonial setup";
        const price =
          Number(c.setupPrice) ||
          Number(c.subtotal) ||
          Number(cat?.total_price) ||
          Number(effectiveClient.total_amount) ||
          0;
        const img = c.setupImage || cat?.imageUrl || "/gallery/wedding-1.jpg";
        items = [
          {
            n: catTitle,
            s: autoSub,
            p: price,
            pending:
              c.setupPrice === undefined || c.setupPrice === null || Number(c.setupPrice) === 0,
            setupId: c.setupId || cat?.id,
            category: c.category || cat?.category || "Stage",
            imageUrl: img,
            photo: img,
            description: autoSub,
          },
        ];
      } else {
        items = [];
      }

      // 2. Build real gallery photos from selected element(s) only
      const photos: { src: string; cap: string; g: string }[] = [];
      items.forEach((item, itemIdx) => {
        const cat = findCatalogSetup(item.setupId || item.n);
        const itemImg =
          item.imageUrl ||
          item.photo ||
          (c.items?.[itemIdx] as any)?.imageUrl ||
          (c.items?.[itemIdx] as any)?.photo;
        const imgUrl = itemImg || c.setupImage || cat?.imageUrl || "";
        const gradient = `g${(itemIdx % 5) + 1}`;
        if (imgUrl) {
          photos.push({
            src: imgUrl,
            cap: item.n,
            g: gradient,
          });
        }
        if (cat?.gallery && cat.gallery.length > 0) {
          cat.gallery.forEach((gSrc) => {
            if (gSrc && gSrc !== imgUrl) {
              photos.push({
                src: gSrc,
                cap: item.n,
                g: gradient,
              });
            }
          });
        }
      });

      // 3. Notes saved on this ceremony or quotation
      const notes: string[] = [];
      if (c.notes) {
        if (Array.isArray(c.notes)) notes.push(...c.notes);
        else if (typeof c.notes === "string" && c.notes.trim()) notes.push(c.notes.trim());
      } else if (client?.notes && idx === 0) {
        const lines = client.notes
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        notes.push(...lines);
      }

      return {
        bs: bs || `Day ${idx + 1}`,
        ad: ad,
        name: eventName,
        venue: venue,
        photos: photos,
        items: items,
        notes: notes,
      };
    });
  }, [client]);

  const isPlaceholderText = (text?: string | null): boolean => {
    if (!text) return true;
    const t = text.trim().toLowerCase();
    if (t.length === 0) return true;
    const commonPlaceholders = [
      "dsfsd",
      "asdf",
      "test",
      "dummy",
      "demo",
      "sample",
      "temp",
      "wtn events",
      "example",
    ];
    if (commonPlaceholders.includes(t)) return true;
    if (/^([a-z])\1+$/i.test(t)) return true;
    if (/^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(t)) return true;
    return false;
  };

  const clientName = client?.client_name || "Valued Client";
  const brandPhone = profile?.phone || "+977 9801234567";

  // Subtitle under the avatar: fallback to event name, client name celebration, or hide when empty
  const proposalSubtitle = useMemo(() => {
    if (profile?.name && !isPlaceholderText(profile.name)) {
      return profile.name;
    }
    const eventName = days[0]?.name || client?.event_type;
    if (eventName && !isPlaceholderText(eventName)) {
      return toTitleCase(eventName);
    }
    if (client?.client_name && !isPlaceholderText(client.client_name)) {
      return `${client.client_name}'s Celebration`;
    }
    return "";
  }, [profile?.name, days, client?.event_type, client?.client_name]);

  const brandInitials = useMemo(() => {
    if (profile?.name && !isPlaceholderText(profile.name)) {
      return profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
    }
    if (client?.client_name && !isPlaceholderText(client.client_name)) {
      return client.client_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return "🌸";
  }, [profile?.name, client?.client_name]);

  const displayBrandTitle = useMemo(() => {
    if (profile?.name && !isPlaceholderText(profile.name)) {
      return profile.name;
    }
    return clientName;
  }, [profile?.name, clientName]);

  // Dev-only check that warns/throws if sample data ever renders
  if (client) {
    assertNoSampleDataRendered(days, clientName);
  }

  // Real add-ons configured for this quotation
  const quotationAddons = useMemo(() => {
    const raw = client?.paid_addons || client?.addOns || [];
    return raw.map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price || (a.unitPrice ? a.unitPrice * (a.quantity || 1) : 0)),
      unit: a.unit || "item",
      desc: a.description || `${a.name} add-on service`,
      icon: a.icon || "✨",
    }));
  }, [client]);

  const [on, setOn] = useState<Record<string, boolean>>({});

  // Calculations
  const base = days.reduce((s, d) => s + d.items.reduce((a, i) => a + (Number(i.p) || 0), 0), 0);
  const addonsTotal = quotationAddons.reduce((s, a) => s + (on[a.id] ? a.price : 0), 0);
  const total = (base > 0 ? base : Number(client?.total_amount) || 0) + addonsTotal;

  // Track add-on selections to activity store (starts at 0 if no add-ons selected)
  useEffect(() => {
    if (!client) return;
    const count = Object.values(on).filter(Boolean).length;
    updateActivity({ addonsSelectedCount: count });
  }, [on, updateActivity, client]);

  const toggle = (id: string) => setOn((o) => ({ ...o, [id]: !o[id] }));

  // Reference look tiles collected from real selected items across all days
  const referenceTiles = useMemo(() => {
    const list: Array<{ name: string; image?: string | undefined; g: string }> = [];
    const seen = new Set<string>();
    days.forEach((d) => {
      d.items.forEach((item) => {
        if (!seen.has(item.n)) {
          seen.add(item.n);
          const bd = getDecorItemBreakdown(item);
          list.push({
            name: bd.itemName || item.n,
            image: item.imageUrl || item.photo || bd.imageUrl || undefined,
            g: `g${(list.length % 5) + 1}`,
          });
        }
      });
    });
    return list;
  }, [days]);

  // Social links: custom links from company profile if saved, or default links (hidden if company has none/disabled)
  const socialLinks: Array<{ name: string; icon: string; url: string }> = useMemo(() => {
    const p = profile as any;
    if (p?.socialLinks && typeof p.socialLinks === "object") {
      const entries = Array.isArray(p.socialLinks)
        ? p.socialLinks
        : Object.entries(p.socialLinks)
            .filter(([_, url]) => Boolean(url))
            .map(([k, url]) => ({
              name: k.charAt(0).toUpperCase() + k.slice(1),
              icon: k.toLowerCase().includes("face")
                ? "📘"
                : k.toLowerCase().includes("insta")
                  ? "◈"
                  : k.toLowerCase().includes("tik")
                    ? "♪"
                    : k.toLowerCase().includes("you")
                      ? "▶"
                      : "🔗",
              url: String(url),
            }));
      if (entries.length === 0) return [];
      return entries;
    }
    if (p?.social_links && typeof p.social_links === "object") {
      const entries = Array.isArray(p.social_links)
        ? p.social_links
        : Object.entries(p.social_links)
            .filter(([_, url]) => Boolean(url))
            .map(([k, url]) => ({
              name: k.charAt(0).toUpperCase() + k.slice(1),
              icon: k.toLowerCase().includes("face")
                ? "📘"
                : k.toLowerCase().includes("insta")
                  ? "◈"
                  : k.toLowerCase().includes("tik")
                    ? "♪"
                    : k.toLowerCase().includes("you")
                      ? "▶"
                      : "🔗",
              url: String(url),
            }));
      if (entries.length === 0) return [];
      return entries;
    }
    if (p?.hasSocialLinks === false || p?.showSocialLinks === false || p?.showSocial === false) {
      return [];
    }
    if (p?.facebook || p?.instagram || p?.tiktok || p?.youtube) {
      return [
        p.facebook ? { name: "Facebook", icon: "📘", url: p.facebook } : null,
        p.instagram ? { name: "Instagram", icon: "◈", url: p.instagram } : null,
        p.tiktok ? { name: "TikTok", icon: "♪", url: p.tiktok } : null,
        p.youtube ? { name: "YouTube", icon: "▶", url: p.youtube } : null,
      ].filter(Boolean) as Array<{ name: string; icon: string; url: string }>;
    }
    if (p && ("socialLinks" in p || "social_links" in p) && !p.socialLinks && !p.social_links) {
      return [];
    }
    return [
      { name: "Facebook", icon: "📘", url: "#" },
      { name: "Instagram", icon: "◈", url: "#" },
      { name: "TikTok", icon: "♪", url: "#" },
      { name: "YouTube", icon: "▶", url: "#" },
    ];
  }, [profile]);

  const packageLabel = `${days.length} ${days.length === 1 ? "DAY" : "DAYS"} DÉCOR PACKAGE`;

  const handleInterested = () => {
    updateActivity({ interest: "interested" });
    toast.success(
      "Thank you! Your interest has been confirmed. Our team will contact you shortly.",
    );
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/proposal/${proposalId}`;
    navigator.clipboard?.writeText?.(url);
    toast.success("Live proposal link copied to clipboard!");
  };

  const handleWhatsApp = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/proposal/${proposalId}`;
    const text = encodeURIComponent(
      `🌸 Namaste ${clientName}! Please review your live interactive decoration proposal here: ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Safe fallback if client is null — rendered AFTER all hooks have executed unconditionally
  if (!client) {
    return (
      <div className="dp-container">
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#6b3a42" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>
            No proposal details available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-container">
      {/* ── Scoped Styling matching exact proposal aesthetic ── */}
      <style>{`
        :root,
        .dp-container {
          /* ── Royal Blush Theme Variables ── */
          --ivory: #fffaf5;      /* page background, day cards */
          --pink-50: #fff4f6;    /* very light blush surfaces */
          --pink-100: #fde8ec;   /* blush sections */
          --pink-200: #f9d3db;
          --pink-300: #f4a8b8;   /* borders, dividers, hero bottom */
          --pink-400: #d98a9b;
          --rose: #e8455b;       /* buttons, "NPR", active dots */
          --rose-dark: #d0384f;
          --gold: #c9973f;       /* labels, rings, icons */
          --bronze: #9a6a1c;     /* gold text on light backgrounds */
          --burgundy: #5a1a26;   /* headings, client name, prices */
          --ink: #2b1216;        /* body text */
          --ink-2: #6b3a42;      /* secondary text */
          --muted: #9a7f84;
          --card: #ffffff;

          /* Legacy aliases mapped to Royal Blush tokens */
          --dp-cream: var(--ivory);
          --dp-cream-2: var(--card);
          --dp-gold: var(--gold);
          --dp-gold-soft: var(--bronze);
          --dp-rose: var(--rose);
          --dp-ink: var(--ink);
          --dp-ink-2: var(--ink-2);
          --dp-muted: var(--muted);

          font-family: 'Jost', system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.55;
          background: #ffffff;
          color: var(--ink);
          width: 100%;
          min-height: 100%;
          position: relative;
        }

        /* Ensure HTML and body on public view have white background */
        html,
        body {
          background-color: #ffffff;
        }

        /* Visible focus rings in --rose on all interactive elements */
        .dp-container button:focus-visible,
        .dp-container a:focus-visible {
          outline: 2px solid var(--rose);
          outline-offset: 2px;
        }

        .dp-page {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding-bottom: 24px;
          background: var(--ivory);
          border-left: 1px solid #fde8ec;
          border-right: 1px solid #fde8ec;
          box-shadow: 0 0 40px rgba(232, 69, 91, 0.08);
          position: relative;
          min-height: 100%;
        }

        @media (max-width: 560px) {
          .dp-page {
            border-left: none;
            border-right: none;
          }
        }

        /* Blush Section 3 (formerly .dp-dark) */
        .dp-dark {
          background: linear-gradient(180deg, var(--pink-100) 0%, var(--pink-200) 100%);
          color: var(--ink);
        }

        .dp-pad {
          padding: 38px 22px;
        }

        .dp-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        .dp-eyebrow {
          font-size: 11px;
          letter-spacing: .24em;
          color: var(--bronze);
          text-align: center;
          margin: 0 0 10px;
          font-weight: 700;
        }

        .dp-h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 500;
          text-align: center;
          margin: 0;
          line-height: 1.1;
          color: var(--burgundy);
        }

        .dp-lede {
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 17px;
          color: var(--ink-2);
          margin: 12px auto 0;
          max-width: 38ch;
          line-height: 1.45;
        }

        /* Top Bar in Modal */
        .dp-top-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          background: var(--pink-100);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--pink-200);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--ink);
        }

        .dp-top-nav .dp-modal-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--burgundy);
          letter-spacing: .04em;
        }

        .dp-top-nav .dp-nav-btn {
          background: var(--pink-200);
          color: var(--ink);
          border: 1px solid var(--pink-300);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background .15s ease, border-color .15s ease;
          cursor: pointer;
        }

        .dp-top-nav .dp-nav-btn:hover {
          background: var(--pink-300);
          border-color: var(--pink-400);
        }

        .dp-top-nav .dp-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--pink-200);
          color: var(--ink);
          border: 1px solid var(--pink-300);
          display: grid;
          place-items: center;
          transition: background .15s ease;
          cursor: pointer;
        }

        .dp-top-nav .dp-close-btn:hover {
          background: var(--pink-300);
        }

        /* ── Hero (pink) ── */
        .dp-hero {
          text-align: center;
          padding: 46px 22px 56px;
          background: linear-gradient(170deg, var(--pink-100) 0%, var(--pink-300) 100%);
          position: relative;
          overflow: hidden;
        }

        /* Subtle radial glow behind the avatar */
        .dp-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(55% 42% at 50% 0%, rgba(255,255,255,.55) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Gradient fade into the ivory schedule section */
        .dp-hero::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: linear-gradient(to bottom, transparent 0%, var(--ivory) 100%);
          pointer-events: none;
        }

        .dp-avatar {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          background: linear-gradient(145deg, #ffffff 0%, var(--pink-100) 100%);
          box-shadow: 0 0 0 3px var(--gold), 0 4px 24px rgba(232,69,91,.15);
          display: grid;
          place-items: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          color: var(--bronze);
          letter-spacing: .05em;
        }

        .dp-avatar .tick {
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--rose);
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 16px;
          border: 3px solid var(--pink-300);
        }

        .dp-brand {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          letter-spacing: .34em;
          font-size: 15px;
          color: var(--ink-2);
          margin: 22px 0 8px;
          position: relative;
          z-index: 1;
        }

        .dp-kicker {
          font-family: 'Cormorant Garamond', serif;
          letter-spacing: .22em;
          font-size: 21px;
          color: var(--burgundy);
          position: relative;
          z-index: 1;
          font-weight: 600;
        }

        .dp-dots {
          display: flex;
          gap: 9px;
          align-items: center;
          justify-content: center;
          margin: 22px 0;
          position: relative;
          z-index: 1;
        }

        .dp-dots .l {
          width: 56px;
          height: 1px;
          background: var(--pink-400);
        }

        .dp-dots .d {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--rose);
        }

        .dp-prepared {
          font-size: 11px;
          letter-spacing: .24em;
          color: var(--ink-2);
          margin: 8px 0 6px;
          position: relative;
          z-index: 1;
          font-weight: 600;
        }

        .dp-client {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          line-height: 1.1;
          margin: 0;
          color: var(--burgundy);
          position: relative;
          z-index: 1;
        }

        .dp-loc {
          color: var(--bronze);
          margin-top: 8px;
          font-size: 16px;
          position: relative;
          z-index: 1;
          font-weight: 500;
        }

        .dp-pkg {
          display: inline-flex;
          gap: 10px;
          align-items: center;
          margin-top: 22px;
          border: 1px solid var(--pink-400);
          border-radius: 999px;
          padding: 10px 22px;
          font-size: 12px;
          letter-spacing: .18em;
          color: var(--burgundy);
          background: rgba(255,255,255,.6);
          position: relative;
          z-index: 1;
          font-weight: 600;
        }

        .dp-pips {
          display: flex;
          gap: 7px;
          justify-content: center;
          margin-top: 24px;
          position: relative;
          z-index: 1;
        }

        .dp-pips i {
          width: 7px;
          height: 7px;
          border-radius: 99px;
          background: #f0b8c4;
        }

        .dp-pips i.on {
          width: 24px;
          background: var(--rose);
        }

        /* Schedule */
        .dp-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--ink-2);
          font-size: 11px;
          letter-spacing: .22em;
          margin-bottom: 22px;
          font-weight: 700;
        }

        .dp-divider::before,
        .dp-divider::after {
          content: "";
          height: 1px;
          background: var(--pink-300);
          flex: 1;
        }

        .dp-divider.on-dark {
          color: var(--ink-2);
        }

        .dp-divider.on-dark::before,
        .dp-divider.on-dark::after {
          background: var(--pink-400);
        }

        .dp-daycard {
          background: var(--card);
          border: 1px solid var(--pink-100);
          border-radius: 18px;
          padding: 18px 18px 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 14px rgba(90,26,38,.06);
        }

        .dp-daytop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          color: inherit;
          cursor: pointer;
        }

        .dp-bs {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 22px;
          color: var(--bronze);
          font-weight: 600;
        }

        .dp-ad {
          font-size: 12.5px;
          color: var(--ink-2);
          letter-spacing: .06em;
          margin-top: 2px;
        }

        .dp-dayname {
          font-family: 'Cormorant Garamond', serif;
          font-size: 25px;
          letter-spacing: .02em;
          margin: 8px 0 0;
          text-transform: uppercase;
          color: var(--burgundy);
          font-weight: 600;
        }

        .dp-venue {
          display: flex;
          gap: 7px;
          align-items: center;
          color: var(--ink-2);
          font-size: 13.5px;
          margin-top: 5px;
        }

        .dp-chev {
          color: var(--muted);
          font-size: 15px;
          flex: none;
          transition: transform .2s;
        }

        .dp-chev.open {
          transform: rotate(180deg);
        }

        .dp-minilist {
          display: flex;
          gap: 12px;
          margin-top: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 6px;
          scrollbar-width: none;
        }

        .dp-minilist::-webkit-scrollbar {
          display: none;
        }

        .dp-miniitem {
          flex: 0 0 80%;
          max-width: 270px;
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          text-align: left;
          background: var(--pink-50);
          border: 1px solid var(--pink-200);
          border-radius: 14px;
          cursor: pointer;
        }

        .dp-miniitem.on {
          border-color: var(--pink-400);
          box-shadow: 0 4px 14px rgba(217, 138, 155, 0.35);
        }

        .dp-minicard-photo {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: var(--pink-100) center / cover no-repeat;
        }

        .dp-minithumb {
          flex: 0 0 52px;
          width: 52px;
          height: 52px;
          border-radius: 10px;
          background: var(--pink-100) center / cover no-repeat;
          border: 1px solid var(--pink-200);
        }

        .dp-minitext {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .dp-miniitem .dp-minitext {
          padding: 10px 12px 12px;
        }

        .dp-minitext b {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dp-minitext small {
          font-size: 12.5px;
          color: var(--ink-2);
        }

        .dp-countpill {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          background: var(--pink-100);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          color: var(--ink-2);
          margin-top: 14px;
          font-weight: 500;
        }

        .dp-items {
          border-top: 1px dashed var(--pink-200);
          margin-top: 14px;
          padding-top: 12px;
        }

        .dp-item-wrapper {
          border-top: 1px solid var(--pink-100);
          padding: 10px 0;
        }

        .dp-item-wrapper:first-child {
          border-top: none;
          padding-top: 0;
        }

        .dp-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .dp-item-content {
          min-width: 0;
          flex: 1;
        }

        .dp-item-name-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dp-item-title {
          font-weight: 600;
          color: var(--ink);
          font-size: 15px;
          letter-spacing: .01em;
        }

        .dp-item-subtitle {
          display: block;
          font-size: 12px;
          line-height: 1.45;
          color: var(--muted);
          margin-top: 3px;
        }

        .dp-item-price-side {
          text-align: right;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dp-item-price-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--burgundy);
          line-height: 1.1;
        }

        .dp-item-price-num.free {
          font-family: 'Jost', sans-serif;
          font-size: 11.5px;
          letter-spacing: .08em;
          color: var(--bronze);
          text-transform: uppercase;
          font-weight: 600;
        }

        .dp-item-price-num.tbc {
          font-family: 'Jost', sans-serif;
          font-size: 11.5px;
          letter-spacing: .08em;
          color: var(--bronze);
          text-transform: uppercase;
          font-weight: 600;
        }

        .dp-bd-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          background: transparent;
          border: none;
          padding: 0;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--bronze);
          cursor: pointer;
          transition: color .15s ease;
          text-decoration: none;
        }

        .dp-bd-toggle-btn:hover {
          color: var(--burgundy);
          text-decoration: underline;
        }

        .dp-bd-chev {
          display: inline-block;
          font-size: 12px;
          line-height: 1;
          transition: transform .2s ease;
        }

        .dp-bd-chev.open {
          transform: rotate(180deg);
        }

        /* Expanded Breakdown Card */
        .dp-breakdown-card {
          margin-top: 10px;
          background: var(--pink-50);
          border: 1px solid var(--pink-200);
          border-radius: 14px;
          padding: 14px 14px 12px;
          box-shadow: 0 2px 10px rgba(90,26,38,.04);
          animation: dpFadeSlide .22s ease-out;
        }

        @keyframes dpFadeSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dp-bd-photo-preview {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 12px;
          max-height: 160px;
          background: var(--pink-100);
        }

        .dp-bd-photo-preview img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
        }

        .dp-bd-photo-tag {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(43, 18, 22, 0.75);
          backdrop-filter: blur(4px);
          color: #f7e7ce;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(201, 151, 63, 0.4);
        }

        .dp-bd-section {
          background: var(--card);
          border: 1px solid var(--pink-100);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }

        .dp-bd-sec-header {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .16em;
          color: var(--bronze);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .dp-bd-sec-header.flex-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dp-bd-tag {
          display: inline-flex;
          align-items: center;
          background: var(--pink-50);
          border: 1px solid var(--pink-200);
          color: var(--rose);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 999px;
        }

        .dp-bd-kv-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 5px;
          font-size: 12px;
        }

        @media (min-width: 440px) {
          .dp-bd-kv-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }

        .dp-bd-kv {
          display: flex;
          gap: 6px;
          color: var(--ink-2);
          line-height: 1.4;
        }

        .dp-bd-k {
          color: var(--muted);
          font-weight: 400;
        }

        .dp-bd-v {
          font-weight: 600;
          color: var(--ink);
        }

        .dp-bd-flower-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed var(--pink-200);
        }

        .dp-bd-flower-pill {
          background: var(--pink-50);
          border: 1px solid var(--pink-200);
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          color: var(--ink-2);
          font-weight: 500;
        }

        .dp-bd-comp-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dp-bd-comp-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 7px;
          border-bottom: 1px solid var(--pink-100);
        }

        .dp-bd-comp-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .dp-bd-comp-info {
          min-width: 0;
          flex: 1;
        }

        .dp-bd-comp-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
        }

        .dp-bd-comp-specs {
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 2px;
          line-height: 1.35;
        }

        .dp-bd-comp-price {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 16px;
          font-weight: 600;
          color: var(--burgundy);
          text-align: right;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dp-bd-comp-price.free {
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          color: var(--bronze);
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .dp-bd-comp-price.tbc {
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          color: var(--bronze);
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .dp-bd-base-section {
          background: var(--pink-50);
          border: 1px solid var(--pink-200);
        }

        .dp-bd-base-row .dp-bd-comp-name {
          color: var(--bronze);
        }

        .dp-bd-base-row .dp-bd-comp-price {
          font-size: 17px;
          color: var(--bronze);
          font-weight: 700;
        }

        .dp-bd-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding-top: 10px;
          margin-top: 4px;
          border-top: 1px dashed var(--pink-300);
        }

        .dp-bd-total-name {
          font-weight: 700;
          font-size: 13.5px;
          color: var(--burgundy);
        }

        .dp-bd-total-note {
          font-size: 11px;
          color: var(--muted);
          font-style: italic;
          margin-top: 1px;
        }

        .dp-bd-total-price {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 21px;
          font-weight: 700;
          color: var(--burgundy);
          text-align: right;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dp-daysum {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 12px;
          border-top: 1px solid var(--pink-200);
          padding-top: 12px;
          font-size: 12px;
          letter-spacing: .14em;
          color: var(--muted);
        }

        .dp-daysum b {
          font-family: 'Cormorant Garamond', serif;
          font-size: 23px;
          letter-spacing: 0;
          color: var(--burgundy);
          font-weight: 600;
        }

        .dp-notes {
          margin-top: 14px;
          background: var(--pink-50);
          border: 1px solid var(--pink-100);
          border-radius: 12px;
          padding: 13px 15px;
        }

        .dp-notes h5 {
          margin: 0 0 8px;
          font-size: 10.5px;
          letter-spacing: .18em;
          color: var(--bronze);
          font-weight: 700;
        }

        .dp-notes ul {
          margin: 0;
          padding-left: 17px;
          color: var(--ink-2);
          font-size: 13px;
          line-height: 1.6;
        }

        .dp-notes li {
          margin-bottom: 5px;
        }

        /* Slider */
        .dp-slider {
          margin-top: 16px;
          position: relative;
        }

        .dp-slabel {
          font-size: 10.5px;
          letter-spacing: .18em;
          color: var(--bronze);
          font-weight: 700;
          margin: 0 0 8px;
        }

        .dp-strack {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          border-radius: 14px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .dp-strack::-webkit-scrollbar {
          display: none;
        }

        .dp-slide {
          flex: 0 0 100%;
          scroll-snap-align: center;
          aspect-ratio: 4/3;
          position: relative;
          display: grid;
          place-items: end start;
          padding: 14px;
          overflow: hidden;
        }

        .dp-slide img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Subtle dark gradient overlay at bottom of photo for text legibility */
        .dp-slide::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(43,18,22,.65) 0%, transparent 55%);
          pointer-events: none;
        }

        .dp-slide .dp-cap {
          position: relative;
          z-index: 1;
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.65);
        }

        .dp-slide .dp-ph {
          position: absolute;
          top: 10px;
          left: 12px;
          font-size: 9.5px;
          letter-spacing: .16em;
          color: #ffffff;
          background: rgba(43,18,22,.65);
          backdrop-filter: blur(4px);
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .dp-snav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 0;
          background: rgba(43,18,22,.65);
          color: #ffffff;
          font-size: 18px;
          display: grid;
          place-items: center;
          z-index: 2;
          cursor: pointer;
        }

        .dp-snav.prev { left: 8px; }
        .dp-snav.next { right: 8px; }

        .dp-sdots {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-top: 10px;
        }

        .dp-sdots i {
          width: 6px;
          height: 6px;
          border-radius: 99px;
          background: var(--pink-300);
          transition: .2s;
        }

        .dp-sdots i.on {
          width: 20px;
          background: var(--rose);
        }

        /* Gallery */
        .dp-gwrap {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 4px 2px 12px;
          scroll-snap-type: x mandatory;
        }

        .dp-gtile {
          flex: 0 0 140px;
          scroll-snap-align: start;
          aspect-ratio: 1/1;
          border-radius: 14px;
          position: relative;
          border: 1px solid var(--pink-300);
          overflow: hidden;
          display: grid;
          place-items: end start;
          padding: 10px;
        }

        /* Dark gradient overlay at bottom of tile so caption is readable */
        .dp-gtile::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(43,18,22,.65) 0%, transparent 60%);
          pointer-events: none;
        }

        .dp-gtile span {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          line-height: 1.15;
          color: #ffffff;
          position: relative;
          z-index: 1;
          text-shadow: 0 1px 8px rgba(0,0,0,.6);
        }

        .dp-gtile::after {
          content: none;
          position: absolute;
          top: 10px;
          right: 12px;
          font-size: 9.5px;
          letter-spacing: .16em;
          color: #ffffff;
          background: rgba(43,18,22,.65);
          backdrop-filter: blur(4px);
          padding: 2px 7px;
          border-radius: 999px;
          text-transform: uppercase;
          z-index: 1;
        }

        .g1 { background: linear-gradient(160deg, #c9a227, #8d6a1c); }
        .g2 { background: linear-gradient(160deg, #e0879a, #8f4358); }
        .g3 { background: linear-gradient(160deg, #b8242f, #5d0f16); }
        .g4 { background: linear-gradient(160deg, #f0e6d2, #b9a582); }
        .g5 { background: linear-gradient(160deg, #8f1d24, #c9973f); }

        /* Included / Excluded */
        .dp-twocol {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 6px;
        }

        .dp-incard {
          border: 1px solid var(--pink-300);
          border-radius: 16px;
          padding: 16px 18px;
          background: var(--card);
          box-shadow: 0 2px 10px rgba(90,26,38,.03);
        }

        .dp-incard h4 {
          margin: 0 0 10px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px;
          font-weight: 600;
          color: var(--burgundy);
        }

        .dp-incard ul {
          margin: 0;
          padding-left: 17px;
          font-size: 13.5px;
          color: var(--ink-2);
          line-height: 1.65;
        }

        .dp-incard li {
          margin-bottom: 6px;
        }

        .dp-incard.no h4 {
          color: var(--rose-dark);
        }

        /* Social */
        .dp-social {
          background: var(--card);
          border-radius: 18px;
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border: 1px solid var(--pink-100);
        }

        .dp-social a {
          border: 1px solid var(--pink-100);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 14.5px;
          color: var(--ink);
          text-decoration: none;
          background: var(--card);
          transition: background .15s ease, border-color .15s ease;
        }

        .dp-social a:hover {
          background: var(--pink-50);
          border-color: var(--pink-200);
        }

        /* Reveal / Total */
        .dp-reveal {
          border: 1px solid var(--gold);
          border-radius: 18px;
          background: linear-gradient(150deg, var(--pink-100), var(--pink-300));
          padding: 36px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
          width: 100%;
          color: var(--burgundy);
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(232,69,91,.1);
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .dp-reveal:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(232,69,91,.15);
        }

        .dp-reveal .t {
          font-family: 'Cormorant Garamond', serif;
          font-size: 29px;
          margin-bottom: 20px;
          color: var(--burgundy);
          font-weight: 600;
        }

        .dp-reveal .orb {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          margin: 0 auto;
          border: 1px solid var(--gold);
          background: #ffffff;
          display: grid;
          place-items: center;
          font-size: 26px;
          color: var(--bronze);
          box-shadow: 0 4px 16px rgba(201,151,63,.25);
        }

        .dp-spark {
          position: absolute;
          color: var(--gold);
          opacity: .6;
        }

        .dp-totalcard {
          border-radius: 18px;
          background: var(--card);
          border: 1px solid var(--gold);
          padding: 30px 20px;
          text-align: center;
          color: var(--ink);
          box-shadow: 0 10px 30px rgba(232,69,91,.12);
        }

        .dp-totalcard .lab {
          font-size: 11px;
          letter-spacing: .24em;
          color: var(--muted);
          font-weight: 700;
        }

        .dp-bignum {
          font-family: 'Cormorant Garamond', serif;
          font-size: 46px;
          line-height: 1.1;
          margin: 14px 0 4px;
          color: var(--burgundy);
          font-weight: 600;
        }

        .dp-bignum small {
          font-family: 'Jost';
          font-size: 18px;
          color: var(--rose);
          letter-spacing: .06em;
          margin-right: 8px;
          font-weight: 600;
        }

        .dp-subnum {
          color: var(--ink-2);
          font-size: 14px;
        }

        .dp-hair {
          width: 56px;
          height: 1px;
          background: var(--pink-300);
          margin: 20px auto;
        }

        .dp-blurb {
          color: var(--ink-2);
          font-size: 14px;
          max-width: 34ch;
          margin: 0 auto;
          line-height: 1.5;
        }

        .dp-schedule {
          background: var(--pink-50);
          border: 1px solid var(--pink-100);
          border-radius: 14px;
          padding: 16px;
          margin-top: 22px;
          text-align: left;
        }

        .dp-srow {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: baseline;
          padding: 7px 0;
          font-size: 14px;
          color: var(--ink-2);
        }

        .dp-srow b {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          color: var(--burgundy);
          font-weight: 600;
          white-space: nowrap;
        }

        .dp-tcbtn {
          width: 100%;
          margin-top: 12px;
          border: 1px solid var(--rose);
          background: transparent;
          color: var(--ink);
          border-radius: 999px;
          padding: 13px;
          font-size: 13.5px;
          cursor: pointer;
          font-weight: 500;
          transition: background .15s ease;
        }

        .dp-tcbtn:hover {
          background: var(--pink-50);
        }

        .dp-paybtn {
          width: 100%;
          margin-top: 18px;
          border: 0;
          border-radius: 14px;
          padding: 16px;
          font-size: 15.5px;
          color: #ffffff;
          background: linear-gradient(90deg, var(--rose), var(--rose-dark));
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 4px 18px rgba(232,69,91,.28);
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .dp-paybtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(232,69,91,.35);
        }

        /* Addons */
        .dp-addon {
          background: var(--card);
          border: 1px solid var(--pink-100);
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 14px;
          box-shadow: 0 2px 10px rgba(90,26,38,.03);
        }

        .dp-addonhead {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .dp-aicon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--pink-100);
          display: grid;
          place-items: center;
          font-size: 22px;
          flex: none;
        }

        .dp-aname {
          font-family: 'Cormorant Garamond', serif;
          font-size: 23px;
          font-weight: 600;
          color: var(--ink);
        }

        .dp-aprice {
          font-size: 14px;
          color: var(--ink-2);
          margin-top: 2px;
        }

        .dp-aprice b {
          font-weight: 600;
          color: var(--burgundy);
        }

        .dp-switch {
          margin-left: auto;
          width: 58px;
          height: 32px;
          border-radius: 99px;
          background: var(--pink-200);
          border: 0;
          position: relative;
          flex: none;
          transition: .18s;
          cursor: pointer;
        }

        .dp-switch i {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,.2);
          transition: .18s;
        }

        .dp-switch.on {
          background: var(--rose);
        }

        .dp-switch.on i {
          left: 29px;
        }

        .dp-adesc {
          color: var(--ink-2);
          font-size: 14px;
          margin-top: 12px;
          line-height: 1.55;
        }

        .dp-tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .dp-tier {
          border: 1px solid var(--pink-200);
          border-radius: 14px;
          padding: 14px 8px;
          text-align: center;
          background: var(--card);
          position: relative;
          cursor: pointer;
        }

        .dp-tier.on {
          border-color: var(--rose);
          box-shadow: 0 0 0 1px var(--rose);
        }

        .dp-tier .n {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px;
          color: var(--ink);
        }

        .dp-tier .r {
          font-size: 9.5px;
          letter-spacing: .12em;
          color: var(--rose);
          margin: 4px 0 8px;
        }

        .dp-tier .p {
          font-size: 9.5px;
          letter-spacing: .14em;
          color: var(--muted);
        }

        .dp-tier .v {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          color: var(--burgundy);
          font-weight: 600;
        }

        .dp-badge {
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--rose);
          color: #ffffff;
          border-radius: 99px;
          padding: 3px 10px;
          font-size: 9px;
          letter-spacing: .1em;
          white-space: nowrap;
          font-weight: 600;
        }

      `}</style>

      {/* ── Top Bar (Useful in modal/preview view) ── */}
      {isModal && (
        <div className="dp-top-nav">
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="dp-close-btn"
                title="Close Proposal"
              >
                <X className="size-4" />
              </button>
            )}
            <span className="dp-modal-title">{displayBrandTitle} Live Proposal</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="dp-nav-btn"
              title="Copy shareable proposal link"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3 py-1.5 rounded-full bg-[#128C7E] hover:bg-[#0e7060] text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
              title="Share via WhatsApp"
            >
              <MessageCircle className="size-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Proposal Page ── */}
      <div className="dp-page">
        {/* 1. Hero */}
        <section className="dp-hero">
          <div className="dp-avatar">
            {brandInitials}
            <span className="tick">✓</span>
          </div>
          {proposalSubtitle ? <div className="dp-brand">{proposalSubtitle}</div> : null}
          <div className="dp-kicker">DECORATION PROPOSAL</div>
          <div className="dp-dots">
            <span className="l" />
            <span className="d" />
            <span className="d" />
            <span className="d" />
            <span className="l" />
          </div>
          <div className="dp-prepared">PREPARED EXCLUSIVELY FOR</div>
          <h1 className="dp-client dp-serif">{clientName}</h1>
          <div className="dp-loc">📍 {client.venue || days[0]?.venue || "Kathmandu Venue"}</div>
          <div className="dp-pkg">◆ {packageLabel}</div>
          <div className="dp-pips">
            {days.map((_, i) => (
              <i key={i} className={i === 0 ? "on" : ""} />
            ))}
          </div>
        </section>

        {/* 2. Event Schedule */}
        <section className="dp-pad" id="dp-schedule-section">
          <div className="dp-divider">EVENT SCHEDULE</div>
          {days.map((d, i) => (
            <DayCard
              key={i}
              d={d}
              open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </section>

        {/* 3. Dark Section: What We Will Build */}
        <section className="dp-dark dp-pad">
          <p className="dp-eyebrow">WHAT WE WILL BUILD</p>
          <h2 className="dp-h2">Your Décor</h2>
          <p className="dp-lede">
            {days.length} {days.length === 1 ? "day" : "days"}, one continuous theme — tap any day
            above to see every element and its price.
          </p>

          {referenceTiles.length > 0 && (
            <>
              <div className="dp-divider on-dark" style={{ marginTop: 34 }}>
                YOUR SELECTED DÉCOR
              </div>
              <div className="dp-gwrap">
                {referenceTiles.map((t, idx) => (
                  <div
                    key={idx}
                    className={`dp-gtile ${t.image ? "" : t.g}`}
                    style={
                      t.image
                        ? {
                            backgroundImage: `url(${t.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="dp-twocol" style={{ marginTop: 26 }}>
            <div className="dp-incard">
              <h4>Included in every setup</h4>
              <ul>
                <li>Installation and dismantling crew</li>
                <li>Structure, drapes, platforms and props</li>
                <li>Fresh seasonal flowers on the event morning</li>
                <li>On-site supervisor through the function</li>
                <li>Transport within Kathmandu valley</li>
              </ul>
            </div>
            <div className="dp-incard no">
              <h4>Not included</h4>
              <ul>
                <li>Flower baskets — petals supplied loose, arranged by you</li>
                <li>Venue rent, electricity load and generator</li>
                <li>Sound, DJ and catering</li>
                <li>Exact flower varieties — seasonal blooms substituted</li>
                <li>Anything marked &quot;to be confirmed&quot; above</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Optional Add-ons (Only rendered if quotation has configured add-ons) */}
        {quotationAddons.length > 0 && (
          <section className="dp-pad">
            <div className="dp-divider">OPTIONAL ADD-ONS</div>
            <p
              style={{
                textAlign: "center",
                color: "var(--dp-ink-2)",
                margin: "-6px auto 22px",
                maxWidth: "36ch",
                fontSize: 14.5,
              }}
            >
              Select any additional add-ons configured for this quotation. The total updates
              instantly.
            </p>

            {quotationAddons.map((a) => (
              <div className="dp-addon" key={a.id}>
                <div className="dp-addonhead">
                  <div className="dp-aicon">{a.icon}</div>
                  <div>
                    <div className="dp-aname">{a.name}</div>
                    <div className="dp-aprice">
                      <b>NPR {npr(a.price)}</b> / {a.unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={"dp-switch" + (on[a.id] ? " on" : "")}
                    onClick={() => toggle(a.id)}
                    aria-pressed={!!on[a.id]}
                    aria-label={"Add " + a.name}
                  >
                    <i />
                  </button>
                </div>
                {a.desc && <p className="dp-adesc">{a.desc}</p>}
              </div>
            ))}
          </section>
        )}

        {/* 5. Total Quotation */}
        <section
          className="dp-pad"
          style={quotationAddons.length > 0 ? { paddingTop: 0 } : undefined}
        >
          {!revealed ? (
            <button type="button" className="dp-reveal" onClick={() => setRevealed(true)}>
              <span className="dp-spark" style={{ top: 22, left: 24 }}>
                ✦
              </span>
              <span className="dp-spark" style={{ top: 26, right: 28, fontSize: 12 }}>
                ✧
              </span>
              <span className="dp-spark" style={{ bottom: 26, left: 30, fontSize: 12 }}>
                ✦
              </span>
              <span className="dp-spark" style={{ bottom: 22, right: 24, fontSize: 20 }}>
                ✧
              </span>
              <div className="t dp-serif">Tap to reveal your quotation</div>
              <div className="orb">↓</div>
            </button>
          ) : (
            <div className="dp-totalcard">
              <div className="lab">TOTAL QUOTATION</div>
              <div className="dp-bignum">
                <small>NPR</small>
                {npr(total)}
              </div>
              <div className="dp-subnum">
                Nepali Rupees — {days.length} {days.length === 1 ? "Day" : "Days"} Décor Package
              </div>
              <div className="dp-hair" />
              <p className="dp-blurb">
                Structure, fresh flowers, lighting, setup crew and same-night dismantling.
              </p>
              <div className="dp-schedule">
                <div className="dp-srow">
                  <span>1. Advance / booking confirmation (40%)</span>
                  <b>NPR {npr(Math.round(total * 0.4))}</b>
                </div>
                <div className="dp-srow">
                  <span>2. One day before the first setup (40%)</span>
                  <b>NPR {npr(Math.round(total * 0.4))}</b>
                </div>
                <div className="dp-srow">
                  <span>3. After the final event wraps (20%)</span>
                  <b>NPR {npr(total - Math.round(total * 0.4) * 2)}</b>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Payment Schedule: 40% Token advance on signing, 40% before setup day, 20% on handover.",
                    )
                  }
                  className="dp-tcbtn"
                >
                  📜 Terms &amp; conditions — view payment schedule
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayOpen(true);
                }}
                className="dp-paybtn"
              >
                ✓ Pay advance & confirm booking
              </button>

              <PayAdvanceModal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                amount={Math.round(total * 0.4)}
                accounts={payAccounts}
                proposalId={proposalId}
                onSubmitted={() => {
                  handleInterested();
                  setPayOpen(false);
                }}
              />
            </div>
          )}
        </section>

        {/* 6. Find Us Online (Rendered directly below Total quotation) */}
        {socialLinks.length > 0 && (
          <section className="dp-pad" style={{ paddingTop: 0 }}>
            <div className="dp-divider">FIND US ONLINE</div>
            <div className="dp-social">
              {socialLinks.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url || "#"}
                  target={item.url && item.url !== "#" ? "_blank" : undefined}
                  rel={item.url && item.url !== "#" ? "noopener noreferrer" : undefined}
                  onClick={item.url === "#" ? (e) => e.preventDefault() : undefined}
                >
                  {item.icon} {item.name}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
