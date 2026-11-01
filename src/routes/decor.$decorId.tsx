import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  fetchLiveDecorations,
} from "@/client/api";
import {
  fromApi,
  getSpecs,
  formatDimensions,
  type DecorationItem,
  type DecorationSpecs,
} from "@/client/ClientHomePage";
import { matchesDecoration } from "@/client/lib/slug";
import {
  getStoredQuotation,
  saveStoredQuotation,
  subscribeQuotation,
  addItemToQuotation,
  toggleItemInQuotation,
  type PlannedEvent,
  type StoredQuotation,
} from "@/client/lib/quotationStorage";
import { PlanEventModal } from "@/client/components/PlanEventModal";
import { ReviewQuotationModal } from "@/client/components/ReviewQuotationModal";
import { ContactInquiryModal, type BuyNowDecorationItem } from "@/client/components/ContactInquiryModal";
import "@/client/client.css";

export const Route = createFileRoute("/decor/$decorId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Decoration Details - Everest Events & Decor" },
      {
        name: "description",
        content: "Explore luxury wedding and event decorations, structure details, dimensions, and instant quotation estimates.",
      },
    ],
  }),
  component: DecorationDetailRouteComponent,
});

function DecorationDetailRouteComponent() {
  const { decorId } = Route.useParams();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<DecorationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quotationToast, setQuotationToast] = useState("");

  // Modals state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<BuyNowDecorationItem | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedQuotationCompanies, setSelectedQuotationCompanies] = useState<string[]>([]);

  // Synchronized quotation state
  const [quotation, setQuotation] = useState<StoredQuotation>(() => getStoredQuotation());

  useEffect(() => {
    return subscribeQuotation((sync) => {
      setQuotation(sync);
    });
  }, []);


  useEffect(() => {
    let cancelled = false;
    fetchLiveDecorations()
      .then((list) => {
        if (!cancelled) {
          setCatalog(list.map(fromApi));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load decorations:", err);
        if (!cancelled) {
          setCatalog([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Find the matching decoration by slug, id, or sid
  const item: DecorationItem | null = useMemo(() => {
    if (!decorId || catalog.length === 0) return null;
    return catalog.find((i) => matchesDecoration(decorId, i)) || null;
  }, [decorId, catalog]);

  // Update dynamic page title
  useEffect(() => {
    if (item) {
      document.title = `${item.t} | Everest Events & Decor`;
    }
  }, [item]);

  const specs: DecorationSpecs | null = useMemo(() => {
    if (!item) return null;
    return getSpecs(item);
  }, [item]);

  const images = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images;
    }
    return item.img ? [item.img] : [];
  }, [item]);

  const activeImage = images[selectedPhotoIdx] || images[0] || item?.img || "";

  // Active event name in quotation
  const activeEvent = useMemo(() => {
    return quotation.activeEventName || quotation.plannedEvents[0]?.name || null;
  }, [quotation]);

  // Check if item is in quotation for active event
  const isItemAdded = useMemo(() => {
    if (!item || !activeEvent) return false;
    return (quotation.eventQuotes[activeEvent] || []).includes(item.id);
  }, [item, activeEvent, quotation.eventQuotes]);

  // Total quotation count
  const totalQuotationCount = useMemo(() => {
    const allIds = new Set<number>();
    Object.values(quotation.eventQuotes).forEach((ids) => {
      if (Array.isArray(ids)) {
        ids.forEach((id) => allIds.add(id));
      }
    });
    return allIds.size;
  }, [quotation.eventQuotes]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // "+ Add to quotation" action
  const handleAddToQuotation = () => {
    if (!item) return;

    // If user has not planned any events yet: open the "Plan your event" overlay!
    if (quotation.plannedEvents.length === 0) {
      setPlanModalOpen(true);
      return;
    }

    if (!activeEvent) {
      setPlanModalOpen(true);
      return;
    }

    const currentList = quotation.eventQuotes[activeEvent] || [];
    const isCurrentlyAdded = currentList.includes(item.id);

    if (!isCurrentlyAdded) {
      const updated = addItemToQuotation(activeEvent, item.id);
      setQuotation(updated);
      setQuotationToast(`Added "${item.t}" to your ${activeEvent} quotation!`);
      setTimeout(() => setQuotationToast(""), 3500);
    } else {
      // If already added, open the review quotation modal so they can review their quotation
      setReviewModalOpen(true);
    }
  };

  // Handle plan completed from the PlanEventModal
  const handlePlanComplete = (sortedEvents: PlannedEvent[]) => {
    if (!item) return;
    const firstEvent = sortedEvents[0]?.name;
    if (!firstEvent) return;

    const currentQuotes = quotation.eventQuotes || {};
    const existingList = currentQuotes[firstEvent] || [];
    const nextQuotes = {
      ...currentQuotes,
      [firstEvent]: existingList.includes(item.id)
        ? existingList
        : [...existingList, item.id],
    };

    const updated = saveStoredQuotation({
      plannedEvents: sortedEvents,
      activeEventName: firstEvent,
      eventQuotes: nextQuotes,
    });

    setQuotation(updated);
    setPlanModalOpen(false);
    setQuotationToast(`Added "${item.t}" to your new ${firstEvent} quotation!`);
    setTimeout(() => setQuotationToast(""), 3500);
  };

  const handleRemoveQuotationItem = (eventName: string, itemId: number) => {
    const updated = toggleItemInQuotation(eventName, itemId);
    setQuotation(updated);
  };

  const handleClearAllQuotation = () => {
    const updated = saveStoredQuotation({
      eventQuotes: {},
    });
    setQuotation(updated);
    setReviewModalOpen(false);
  };



  // Loading skeleton state
  if (loading) {
    return (
      <div className="client-portal-root">
        <div className="decor-page-view" style={{ minHeight: "100vh" }}>
          <div
            className="detail-img"
            style={{
              background: "#f7eff1",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div className="detail-body" style={{ padding: "56px 48px" }}>
            <div style={{ width: 120, height: 24, borderRadius: 999, background: "#f0e9ea", marginBottom: 16 }} />
            <div style={{ width: "70%", height: 48, borderRadius: 8, background: "#f0e9ea", marginBottom: 20 }} />
            <div style={{ width: "40%", height: 32, borderRadius: 8, background: "#f0e9ea", marginBottom: 30 }} />
            <div style={{ width: "100%", height: 120, borderRadius: 12, background: "#f0e9ea", marginBottom: 20 }} />
            <div style={{ width: "100%", height: 160, borderRadius: 12, background: "#f0e9ea" }} />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!item) {
    return (
      <div className="client-portal-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" className="pill">
            ← Back to decorations
          </Link>
          <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
            Everest Events &amp; Decor
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌸</div>
            <h1 className="serif" style={{ fontSize: 36, margin: "0 0 12px", color: "var(--ink)", fontWeight: 500 }}>
              Decoration Not Found
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--mute)", lineHeight: 1.6, marginBottom: 24 }}>
              We could not find the decoration setup with the link &quot;{decorId}&quot;. It may have been renamed or moved in the catalog.
            </p>
            <Link to="/" className="pill pri" style={{ textDecoration: "none", display: "inline-block" }}>
              Browse All Decorations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedPrice = item.p > 0 ? `Rs. ${item.p.toLocaleString("en-IN")}` : "Custom Quote";
  const vendorName = item.ownerCompanyName || item.vendor || "Everest Events & Decor";

  return (
    <div className="client-portal-root">
      {/* Official Sticky Top Navigation Header */}
      <header className="decor-official-header">
        <div className="header-left">
          <Link
            to="/"
            className="official-back-btn"
            aria-label="Back to catalog"
            title="Back to catalog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 1 }}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        </div>

        <Link to="/" className="header-title" title="Home catalog">
          Everest Events &amp; Decor
        </Link>

        <div className="header-right">
          <button
            type="button"
            className="official-icon-btn"
            onClick={handleShare}
            aria-label="Share decoration link"
            title={copiedLink ? "Link copied!" : "Share decoration"}
          >
            {copiedLink ? (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef5b78"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>
          <a
            href="tel:9828223787"
            className="header-call-btn"
            title="Call Decorator"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="call-label">Call Decorator</span>
          </a>
        </div>
      </header>

      <div className="decor-page-view">
        {/* Left Column: Image with gradient and thumbnails */}
        <div
          className="detail-img"
          style={{
            background: `linear-gradient(160deg, ${item.g?.[0] || "#fde7ed"}, ${item.g?.[1] || "#fffafb"})`,
          }}
        >
          <img
            key={activeImage}
            src={activeImage}
            alt={item.t}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="ph-nav prev big"
                aria-label="Previous photo"
                onClick={() =>
                  setSelectedPhotoIdx((i) => (i - 1 + images.length) % images.length)
                }
              >
                ‹
              </button>
              <button
                type="button"
                className="ph-nav next big"
                aria-label="Next photo"
                onClick={() =>
                  setSelectedPhotoIdx((i) => (i + 1) % images.length)
                }
              >
                ›
              </button>
              <div className="thumbs" role="group" aria-label="Photos">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={`thumb${i === selectedPhotoIdx ? " on" : ""}`}
                    aria-label={`Photo ${i + 1} of ${images.length}`}
                    onClick={() => setSelectedPhotoIdx(i)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Title, Metadata, Specs, and Footer */}
        <div className="detail-body">
          <div className="detail-meta">
            <span className="detail-cat">{item.cat}</span>
            <span>by {vendorName}</span>
          </div>

          <h1 className="serif" id="detail-title">
            {item.t}
          </h1>

          {item.d && (
            <p
              className="detail-desc"
              style={{
                color: "var(--mute)",
                fontSize: "13.5px",
                marginTop: "6px",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              {item.d}
            </p>
          )}

          {specs && (
            <div className="spec">
              {/* Overview */}
              <section className="spec-sec">
                <h4>Overview</h4>
                <dl className="spec-dl">
                  <div>
                    <dt>Structure type</dt>
                    <dd>
                      {typeof specs.structure === "string" && specs.structure
                        ? specs.structure
                        : item.cat}
                    </dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{formatDimensions(specs.dimensions)}</dd>
                  </div>
                </dl>
              </section>

              {/* Floral */}
              {specs.floral && (
                <section className="spec-sec">
                  <h4>
                    Floral <em>Included in base design</em>
                  </h4>
                  <dl className="spec-dl">
                    <div>
                      <dt>Flower style</dt>
                      <dd>
                        {typeof specs.floral.style === "string"
                          ? specs.floral.style
                          : "Floral arrangement"}
                      </dd>
                    </div>
                    {specs.floral.varietyType && (
                      <div>
                        <dt>Variety type</dt>
                        <dd>{String(specs.floral.varietyType)}</dd>
                      </div>
                    )}
                  </dl>
                  {Array.isArray(specs.floral.flowers) &&
                    specs.floral.flowers.length > 0 &&
                    specs.floral.flowers.map((f, i) => {
                      const colour =
                        f.colour ||
                        (specs.floral?.color && specs.floral.color !== "-"
                          ? specs.floral.color
                          : "");
                      return (
                        <div className="spec-row" key={`${f.name}-${i}`}>
                          <div>
                            <b>{f.name}</b>
                            <small>
                              Variety: {f.kind}
                              {colour ? ` · Colour: ${colour}` : ""}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                </section>
              )}

              {/* Applicable events */}
              {Array.isArray(specs.events) && specs.events.length > 0 && (
                <section className="spec-sec">
                  <h4>Applicable events</h4>
                  <div className="spec-chips">
                    {specs.events.map((ev) => (
                      <span key={ev} className="spec-chip">
                        {ev}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Included add-ons */}
              {(specs.platform ||
                specs.lighting ||
                (specs.addons?.length ?? 0) > 0) && (
                <section className="spec-sec">
                  <h4>Included add-ons</h4>
                  {specs.platform && typeof specs.platform === "object" && (
                    <div className="spec-row">
                      <div>
                        <b>Platform · {specs.platform.name}</b>
                        <small>
                          {specs.platform.size} · {specs.platform.color}
                        </small>
                      </div>
                      <strong>
                        {specs.platform.price != null
                          ? `Rs. ${specs.platform.price.toLocaleString("en-IN")}`
                          : "Included"}
                      </strong>
                    </div>
                  )}
                  {Array.isArray(specs.addons) &&
                    specs.addons.map((a, i) => (
                      <div className="spec-row" key={`${a.title}-${i}`}>
                        <div>
                          <b>{a.title}</b>
                          {a.sub && <small>{a.sub}</small>}
                        </div>
                        <strong>
                          {a.price > 0
                            ? `Rs. ${a.price.toLocaleString("en-IN")}`
                            : "Included"}
                        </strong>
                      </div>
                    ))}
                  {specs.lighting && typeof specs.lighting === "object" && (
                    <div className="spec-row">
                      <div>
                        <b>Lighting · {specs.lighting.name}</b>
                        <small>Quantity: {specs.lighting.qty}</small>
                      </div>
                      <strong>
                        {specs.lighting.price != null
                          ? `Rs. ${specs.lighting.price.toLocaleString("en-IN")}`
                          : "Included"}
                      </strong>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Price Footer */}
          <div className="detail-foot">
            <div className="detail-foot-price">
              <span className="spec-k">Starting price</span>
              <b>
                {formattedPrice}
                {item.u || ""}
              </b>
              <small>Includes core base + confirmed add-ons</small>
            </div>
            <div className="acts">
              <button
                type="button"
                className="pill buy-btn"
                onClick={() => {
                  if (!item) return;
                  setBuyNowItem({
                    id: item.id,
                    sid: item.sid,
                    t: item.t,
                    p: item.p,
                    u: item.u,
                    img: activeImage,
                    cat: item.cat,
                    d: item.d,
                    vendor: item.vendor,
                    ownerCompanyId: item.ownerCompanyId,
                    ownerCompanyName: item.ownerCompanyName,
                  });
                  setContactModalOpen(true);
                }}
              >
                Buy now
              </button>
              <button
                type="button"
                className={`pill pri${isItemAdded ? " added" : ""}`}
                onClick={handleAddToQuotation}
              >
                {isItemAdded ? "✓ Added to quotation" : "+ Add to quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Quotation Bar */}
      {totalQuotationCount > 0 && (
        <div className="bar show" id="bar">
          <span id="qc" className="bar-count-text">
            {totalQuotationCount} item{totalQuotationCount > 1 ? "s" : ""} in quotation
          </span>
          <button
            type="button"
            className="pill pri"
            id="vq"
            onClick={() => setReviewModalOpen(true)}
          >
            Review quotation
          </button>
        </div>
      )}

      {/* Quotation Toast Notification */}
      {quotationToast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            zIndex: 120,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✨</span>
          <span>{quotationToast}</span>
        </div>
      )}

      {/* Multi-step Plan Your Event Modal (overlay from image) */}
      <PlanEventModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onComplete={handlePlanComplete}
        initialEvents={quotation.plannedEvents}
      />

      {/* Review Quotation Modal */}
      <ReviewQuotationModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        catalog={catalog}
        quotation={quotation}
        onRemoveItem={handleRemoveQuotationItem}
        onClearAll={handleClearAllQuotation}
        onProceedToInquiry={(companies) => {
          setReviewModalOpen(false);
          setSelectedQuotationCompanies(companies);
          setBuyNowItem(null);
          setContactModalOpen(true);
        }}
      />

      {/* Contact & Inquiry Modal (Matches standard Finalize Inquiry dialog) */}
      <ContactInquiryModal
        isOpen={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setBuyNowItem(null);
        }}
        buyNowItem={buyNowItem}
        quotation={quotation}
        catalog={catalog}
        selectedCompanies={selectedQuotationCompanies}
        onSuccess={() => {
          setQuotation(getStoredQuotation());
        }}
      />
    </div>
  );
}
