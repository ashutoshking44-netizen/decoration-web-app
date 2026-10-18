import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Clock,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  X,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Users,
  RotateCcw,
  Share2,
  FileEdit,
  Send,
} from "lucide-react";
import {
  type BookedClient,
  type BookingStage,
  type QuotationStatus,
  BOOKING_STAGES,
  useBookedClientsStore,
  computeDecorationItemPrice,
  formatCurrency,
  getClientTotal,
  getCeremonySubtotal,
  findClientById,
} from "@/lib/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ProposalDispatchModal } from "./proposal-dispatch-modal";
import { BookedCalendarStrip } from "./booked-calendar-strip";
import { BookedClientCard, BookedStatTiles } from "./booked-client-card";
import { EditClientDialog } from "./edit-client-dialog";
import { resolveClientDate } from "@/lib/booked-dates";

type FilterTab = "all" | "weekend" | "upcoming";
type SortOption = "date" | "name" | "balance";

export function BookedClientsPage() {
  const { clients, updateClientStage, updateClientQuotationStatus, updateClient, resetClients } =
    useBookedClientsStore();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<"all" | BookingStage>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedBooking, setSelectedBooking] = useState<BookedClient | null>(null);
  const [proposalModalClient, setProposalModalClient] = useState<BookedClient | null>(null);
  const [editingClient, setEditingClient] = useState<BookedClient | null>(null);
  /** Set by clicking a booked day in the calendar; limits the cards to that day. */
  const [dateFilter, setDateFilter] = useState<{ iso: string; label: string } | null>(null);
  // Sync state from query parameters on load or popstate
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const clientId = p.get("client") || p.get("clientId");
      if (clientId) {
        const found =
          clients.find(
            (c) => c.id === clientId || c.enquiry_id === clientId || c.proposal_id === clientId,
          ) || findClientById(clientId);
        if (found) setSelectedBooking(found);
      }
    }
  }, [clients]);

  // Status Tab Counts
  const tabCounts = useMemo(() => {
    return {
      all: clients.filter((c) => c.stage !== "closed").length,
      weekend: clients.filter(
        (c) =>
          (c.days_to_event === "today" ||
            (typeof c.days_to_event === "number" && c.days_to_event <= 4)) &&
          c.stage !== "closed",
      ).length,
      upcoming: clients.filter(
        (c) => typeof c.days_to_event === "number" && c.days_to_event > 4 && c.stage !== "closed",
      ).length,
    };
  }, [clients]);

  // Filter & Sort logic
  const filteredClients = useMemo(() => {
    return clients
      .filter((item) => {
        // Exclude closed items by default unless explicitly selected in Stage dropdown
        if (item.stage === "closed" && selectedStage !== "closed") return false;

        // Tab Filter
        if (activeTab === "weekend") {
          const isSoon =
            item.days_to_event === "today" ||
            (typeof item.days_to_event === "number" && item.days_to_event <= 4);
          if (!isSoon) return false;
        }
        if (activeTab === "upcoming") {
          const isFuture = typeof item.days_to_event === "number" && item.days_to_event > 4;
          if (!isFuture) return false;
        }

        // Day picked in the booking calendar
        if (dateFilter && resolveClientDate(item)?.iso !== dateFilter.iso) return false;

        // Stage Dropdown Filter
        if (selectedStage !== "all" && item.stage !== selectedStage) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.client_name.toLowerCase().includes(q);
          const matchEvent = item.event_type.toLowerCase().includes(q);
          const matchVenue = item.venue.toLowerCase().includes(q);
          if (!matchName && !matchEvent && !matchVenue) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.client_name.localeCompare(b.client_name);
        }
        if (sortBy === "balance") {
          return b.balance_due - a.balance_due;
        }
        // Default: Sort by Date / Days remaining
        const getDayWeight = (d: number | "today" | "complete") => {
          if (d === "today") return 0;
          if (d === "complete") return 9999;
          return d;
        };
        return getDayWeight(a.days_to_event) - getDayWeight(b.days_to_event);
      });
  }, [clients, activeTab, selectedStage, searchQuery, sortBy, dateFilter]);

  // Days Badge Renderer
  const renderDaysBadge = (days: number | "today" | "complete") => {
    if (days === "today") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDEDEF] text-[#C33A56] border border-[#F9CFD7] tabular-nums whitespace-nowrap shrink-0">
          <Clock className="size-3 text-[#E8546F]" />
          Today
        </span>
      );
    }
    if (days === "complete") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 tabular-nums whitespace-nowrap shrink-0">
          <CheckCircle2 className="size-3 text-gray-500" />
          Complete
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FBF6F3] text-[#4A3F3C] border border-[#E7DCD6] tabular-nums whitespace-nowrap shrink-0">
        <Clock className="size-3 text-[#8A7B76]" />
        {days} {days === 1 ? "day" : "days"}
      </span>
    );
  };

  // Quotation Status Badge Renderer
  const renderQuotationStatusBadge = (status?: QuotationStatus) => {
    const s = status || "Draft";
    if (s === "Sent via WhatsApp") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sent via WhatsApp
        </span>
      );
    }
    if (s === "Approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="size-3 text-blue-600" />
          Approved
        </span>
      );
    }
    if (s === "Pending Review") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-purple-500" />
          Pending Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Draft
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBF6F3] text-[#2B2320]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E7DCD6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/company"
              className="flex size-8 items-center justify-center rounded-full text-[#8A7B76] hover:bg-[#F0EBE7] hover:text-[#2B2320] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="h-4 w-px bg-[#E7DCD6]" />
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-rose-50 text-[#E8546F]">
                <Users className="size-4" />
              </div>
              <span className="font-display font-semibold text-sm tracking-tight">All Clients</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/enquiries"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-rose-50 text-xs font-bold text-[#E8546F] border border-rose-200/80 hover:bg-rose-100 transition-colors"
            >
              <Send className="size-3" />
              <span>New Enquiries</span>
              <span className="rounded-full bg-[#E8546F] text-white px-1.5 py-0.2 text-[10px] font-black">
                7
              </span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={resetClients}
              className="h-8 rounded-full border-[#E7DCD6] text-xs font-semibold text-[#8A7B76] hover:text-[#2B2320]"
              title="Reset sample clients"
            >
              <RotateCcw className="size-3 mr-1" />
              Reset Data
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-5">
        {/* Page Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2B2320]">
              All Clients &amp; Quotation Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#8A7B76] mt-1">
              Active client bookings, multi-ceremony quotations, staff handlers, and proposal
              dispatch tracking.
            </p>
          </div>

          {/* Quick Stat Pill & View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DCD6] bg-white px-3.5 py-1.5 shadow-2xs">
              <span className="size-2 rounded-full bg-[#E8546F] animate-pulse" />
              <span className="text-xs font-bold text-[#4A3F3C]">
                {clients.filter((c) => c.stage !== "closed").length} Active Bookings
              </span>
            </div>
          </div>
        </div>

        {/* Summary + booking calendar (hover a booked day to see who it is) */}
        <div className="space-y-4">
          <BookedStatTiles clients={clients.filter((c) => c.stage !== "closed")} />
          <BookedCalendarStrip
            clients={clients.filter((c) => c.stage !== "closed")}
            onPickDate={(iso, label) =>
              setDateFilter((cur) => (cur?.iso === iso ? null : { iso, label }))
            }
            selectedIso={dateFilter?.iso ?? null}
          />
        </div>

        {dateFilter && (
          <div>
            <button
              type="button"
              onClick={() => setDateFilter(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F3D5DB] bg-[#FDEDEF] px-3.5 py-1.5 text-xs font-semibold text-[#C33A56] transition hover:bg-[#FBD9DF]"
              aria-label={`Clear date filter ${dateFilter.label}`}
            >
              Filter: {dateFilter.label}
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#E7DCD6]">
          {(
            [
              { id: "all", label: "All Bookings", count: tabCounts.all },
              { id: "weekend", label: "This Weekend / Soon", count: tabCounts.weekend },
              { id: "upcoming", label: "Upcoming", count: tabCounts.upcoming },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer rounded-t-lg",
                  isSelected
                    ? "text-[#C33A56] bg-white border-t border-x border-[#E7DCD6] -mb-px"
                    : "text-[#8A7B76] hover:text-[#2B2320] hover:bg-white/50",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                    isSelected ? "bg-[#FDEDEF] text-[#C33A56]" : "bg-[#F0EBE7] text-[#8A7B76]",
                  )}
                >
                  {tab.count}
                </span>
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8546F]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar + Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Input: Single line, nowrap, text-ellipsis */}
          <div className="sm:col-span-6 relative">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7B76] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by client name, event type, or venue…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full border border-[#E7DCD6] bg-white text-xs font-medium text-[#2B2320] placeholder:text-[#B7A9A3] focus:outline-none focus:ring-2 focus:ring-[#E8546F]/30 focus:border-[#E8546F] shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="size-5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7B76] hover:text-[#2B2320]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Stage: All Dropdown */}
          <div className="sm:col-span-3 relative">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as "all" | BookingStage)}
              className="w-full h-10 pl-3.5 pr-8 rounded-full border border-[#E7DCD6] bg-white text-xs font-bold text-[#4A3F3C] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E8546F]/30 focus:border-[#E8546F] shadow-2xs"
            >
              <option value="all">Stage: All Stages</option>
              {BOOKING_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  Stage: {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A7B76] pointer-events-none" />
          </div>

          {/* Sort: Date Dropdown */}
          <div className="sm:col-span-3 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full h-10 pl-3.5 pr-8 rounded-full border border-[#E7DCD6] bg-white text-xs font-bold text-[#4A3F3C] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E8546F]/30 focus:border-[#E8546F] shadow-2xs"
            >
              <option value="date">Sort: Event Date</option>
              <option value="name">Sort: Client Name</option>
              <option value="balance">Sort: Balance Due</option>
            </select>
            <ChevronDown className="size-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A7B76] pointer-events-none" />
          </div>
        </div>

        {/* Booked Client Table View, Cards View, OR Calendar View */}
        {filteredClients.length === 0 ? (
          <div className="rounded-[18px] border border-[#E7DCD6] bg-white p-12 text-center shadow-2xs">
            <CalendarCheck className="size-10 text-[#B7A9A3] mx-auto mb-2" />
            <h3 className="font-display text-lg font-bold text-[#2B2320]">No bookings found</h3>
            <p className="text-xs text-[#8A7B76] mt-1 max-w-sm mx-auto">
              {searchQuery || selectedStage !== "all"
                ? "No client records match the selected filter criteria. Try clearing search filters."
                : "No clients in this view."}
            </p>
            {(searchQuery || selectedStage !== "all" || activeTab !== "all" || dateFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStage("all");
                  setActiveTab("all");
                  setDateFilter(null);
                }}
                className="mt-4 rounded-full text-xs font-semibold"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          /* ── Cards view ── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <BookedClientCard
                key={client.id}
                client={client}
                onOpen={() => setSelectedBooking(client)}
                onEdit={() => setEditingClient(client)}
                extra={
                  <div className="flex items-center justify-between gap-2 border-t border-[#F5EAE6] pt-2.5 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      {renderQuotationStatusBadge(client.quotation_status)}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setProposalModalClient(client)}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        <Share2 className="size-3" /> Proposal
                      </button>
                      <Link
                        to="/quotations/new"
                        search={{ clientId: client.id, from: "/booked-clients" }}
                        className="inline-flex items-center gap-1 text-[#4A3F3C] hover:underline"
                      >
                        <FileEdit className="size-3 text-[#E8546F]" /> Quotation
                      </Link>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Easy edit form */}
      <EditClientDialog
        client={editingClient}
        onClose={() => setEditingClient(null)}
        onSave={(id, patch) => {
          updateClient(id, patch);
          setSelectedBooking((cur) => (cur && cur.id === id ? { ...cur, ...patch } : cur));
        }}
      />

      {/* WhatsApp Proposal Dispatch Modal */}
      <ProposalDispatchModal
        open={Boolean(proposalModalClient)}
        onOpenChange={(open) => !open && setProposalModalClient(null)}
        client={proposalModalClient}
        onQuotationStatusChange={(newStatus) => {
          if (proposalModalClient) {
            updateClientQuotationStatus(proposalModalClient.id, newStatus);
          }
        }}
      />

      {/* Booking Detail Modal (opens on row click) */}
      <Dialog
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] p-6 bg-white border border-[#E7DCD6]">
          {selectedBooking && (
            <div className="space-y-6">
              {/* Modal Header */}
              <DialogHeader className="pb-3 border-b border-[#F0EBE7]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7B76] bg-[#FBF6F3] px-2.5 py-0.5 rounded-full border border-[#E7DCD6]">
                        {selectedBooking.event_type}
                      </span>
                    </div>
                    <DialogTitle className="font-display text-2xl font-bold text-[#2B2320] mt-1.5">
                      {selectedBooking.client_name}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A7B76] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-[#E8546F]" />
                        {selectedBooking.event_date}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-[#8A7B76]" />
                        {selectedBooking.venue}
                      </span>
                    </div>
                  </div>

                  {/* Call & WhatsApp Quick Actions */}
                  {selectedBooking.phone && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full border-[#E7DCD6]"
                        asChild
                      >
                        <a href={`tel:${selectedBooking.phone}`} title="Call Client">
                          <Phone className="size-3.5 text-[#4A3F3C]" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full border-[#E7DCD6]"
                        asChild
                      >
                        <a
                          href={`https://wa.me/${selectedBooking.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp Client"
                        >
                          <MessageCircle className="size-3.5 text-emerald-600" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {/* Total Price Line: shared single source of truth across the app */}
              <div className="flex items-baseline gap-2 py-1">
                <span className="text-sm font-semibold text-[#8A7B76]">Total:</span>
                <span className="font-display text-2xl font-bold text-[#2B2320] tabular-nums">
                  {formatCurrency(getClientTotal(selectedBooking))}
                </span>
              </div>

              {/* Events & Ceremonies Included (with each event's subtotal) */}
              {selectedBooking.ceremonies && selectedBooking.ceremonies.length > 0 && (
                <div className="rounded-[18px] border border-[#E7DCD6] bg-white p-4.5 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A3F3C] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-[#E8546F]" />
                      Events & Ceremonies ({selectedBooking.ceremonies.length})
                    </span>
                  </span>
                  <div className="divide-y divide-[#F0EBE7]">
                    {selectedBooking.ceremonies.map((c, i) => {
                      const eventSubtotal = getCeremonySubtotal(c);
                      return (
                        <div key={c.id || i} className="py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-[#2B2320] font-semibold text-sm">
                              {c.name}
                            </strong>
                            <span className="font-extrabold text-[#4A3F3C] tabular-nums text-sm">
                              {formatCurrency(eventSubtotal)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8A7B76]">
                            {c.date && <span>{c.date}</span>}
                            {c.date && c.venue && <span>·</span>}
                            {c.venue && <span>{c.venue}</span>}
                          </div>
                          {c.setupName && (
                            <div className="text-[11px] text-[#4A3F3C] flex items-center gap-1.5 pt-0.5">
                              <Sparkles className="size-3 text-[#E8546F]" />
                              <span>{c.setupName}</span>
                            </div>
                          )}
                          {c.items && c.items.length > 1 && (
                            <div className="pl-4 pt-1 space-y-0.5">
                              {c.items.map((it, idx) => (
                                <div
                                  key={it.id || idx}
                                  className="flex justify-between text-[11px] text-[#6B5F5C]"
                                >
                                  <span>{it.name}</span>
                                  <span className="font-medium tabular-nums">
                                    {formatCurrency(it.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paid Add-ons */}
              {selectedBooking.paid_addons && selectedBooking.paid_addons.length > 0 && (
                <div className="rounded-[18px] border border-[#E7DCD6] bg-white p-4.5 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4A3F3C] flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#8A7B76]" />
                    Paid Add-ons ({selectedBooking.paid_addons.length})
                  </span>
                  <div className="divide-y divide-[#F0EBE7]">
                    {selectedBooking.paid_addons.map((a, i) => {
                      const price =
                        typeof a.price === "number" && a.price > 0
                          ? a.price
                          : (Number(a.quantity) || 1) * (Number(a.unitPrice) || 0);
                      return (
                        <div
                          key={a.id || i}
                          className="flex items-center justify-between py-2 text-xs"
                        >
                          <div>
                            <strong className="text-[#2B2320] font-semibold">{a.name}</strong>
                            {a.quantity ? (
                              <span className="text-[11px] text-[#8A7B76] ml-2">
                                (Qty: {a.quantity}
                                {a.unit ? ` ${a.unit}` : ""})
                              </span>
                            ) : null}
                          </div>
                          <span className="font-extrabold text-[#4A3F3C] tabular-nums">
                            {formatCurrency(price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Legacy Decoration Setups Included (when ceremonies not present) */}
              {(!selectedBooking.ceremonies || selectedBooking.ceremonies.length === 0) &&
                selectedBooking.decorations &&
                selectedBooking.decorations.length > 0 && (
                  <div className="rounded-[18px] border border-[#E7DCD6] bg-white p-4.5 space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A3F3C] flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-[#8A7B76]" />
                      Decoration Setups Included ({selectedBooking.decorations.length})
                    </span>
                    <div className="divide-y divide-[#F0EBE7]">
                      {selectedBooking.decorations.map((d, i) => {
                        const itemPrice = computeDecorationItemPrice(d);
                        return (
                          <div key={i} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <strong className="text-[#2B2320] font-semibold">{d.name}</strong>
                              <span className="text-[11px] text-[#8A7B76] ml-2">({d.type})</span>
                            </div>
                            <span className="font-extrabold text-[#4A3F3C] tabular-nums">
                              {formatCurrency(itemPrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE7]">
                <Button
                  variant="outline"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-full h-9 px-5 text-xs font-semibold text-[#8A7B76]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
