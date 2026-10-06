import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Clock,
  ChevronRight,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  X,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  Calendar,
  CalendarDays,
  LayoutList,
  CalendarCheck,
  Users,
  RotateCcw,
  Table as TableIcon,
  Share2,
  FileEdit,
  UserCheck,
  Send,
} from "lucide-react";
import {
  type BookedClient,
  type BookingStage,
  type QuotationStatus,
  BOOKING_STAGES,
  useBookedClientsStore,
  computeDecorationItemPrice,
} from "@/lib/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BookedClientsCalendarView } from "./booked-clients-calendar-view";
import { ProposalDispatchModal } from "./proposal-dispatch-modal";

type FilterTab = "all" | "weekend" | "upcoming";
type SortOption = "date" | "name" | "balance";

export function BookedClientsPage() {
  const {
    clients,
    updateClientStage,
    updateClientQuotationStatus,
    resetClients,
  } = useBookedClientsStore();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<"all" | BookingStage>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedBooking, setSelectedBooking] = useState<BookedClient | null>(null);
  const [proposalModalClient, setProposalModalClient] = useState<BookedClient | null>(null);

  // View Mode: "table" | "list" | "calendar"
  const [viewMode, setViewMode] = useState<"table" | "list" | "calendar">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const v = p.get("view");
      if (v === "calendar") return "calendar";
      if (v === "list") return "list";
      if (v === "table") return "table";
    }
    return "table";
  });

  const [initialDate, setInitialDate] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("date") || undefined;
    }
    return undefined;
  });

  // Sync state from query parameters on load or popstate
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const v = p.get("view");
      if (v === "calendar" || v === "list" || v === "table") setViewMode(v);
      const d = p.get("date");
      if (d) setInitialDate(d);
      const clientId = p.get("client");
      if (clientId) {
        const found = clients.find((c) => c.id === clientId);
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
          (c.days_to_event === "today" || (typeof c.days_to_event === "number" && c.days_to_event <= 4)) &&
          c.stage !== "closed"
      ).length,
      upcoming: clients.filter(
        (c) => typeof c.days_to_event === "number" && c.days_to_event > 4 && c.stage !== "closed"
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
  }, [clients, activeTab, selectedStage, searchQuery, sortBy]);

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
              <span className="font-display font-semibold text-sm tracking-tight">
                All Clients
              </span>
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
              Active client bookings, multi-ceremony quotations, staff handlers, and proposal dispatch tracking.
            </p>
          </div>

          {/* Quick Stat Pill & View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* View Mode Toggle: Table / List / Calendar */}
            <div className="flex items-center rounded-full bg-[#F0EBE7] p-1 border border-[#E7DCD6] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  const url = new URL(window.location.href);
                  url.searchParams.set("view", "table");
                  window.history.replaceState({}, "", url.toString());
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white text-[#2B2320] shadow-xs"
                    : "text-[#8A7B76] hover:text-[#2B2320]"
                )}
              >
                <TableIcon className="size-3.5 text-[#E8546F]" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  const url = new URL(window.location.href);
                  url.searchParams.set("view", "list");
                  window.history.replaceState({}, "", url.toString());
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-white text-[#2B2320] shadow-xs"
                    : "text-[#8A7B76] hover:text-[#2B2320]"
                )}
              >
                <LayoutList className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("calendar");
                  const url = new URL(window.location.href);
                  url.searchParams.set("view", "calendar");
                  window.history.replaceState({}, "", url.toString());
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                  viewMode === "calendar"
                    ? "bg-[#E8546F] text-white shadow-xs"
                    : "text-[#8A7B76] hover:text-[#2B2320]"
                )}
              >
                <CalendarDays className="size-3.5" />
                <span>Calendar</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DCD6] bg-white px-3.5 py-1.5 shadow-2xs">
              <span className="size-2 rounded-full bg-[#E8546F] animate-pulse" />
              <span className="text-xs font-bold text-[#4A3F3C]">
                {clients.filter((c) => c.stage !== "closed").length} Active Bookings
              </span>
            </div>
          </div>
        </div>

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
                    : "text-[#8A7B76] hover:text-[#2B2320] hover:bg-white/50"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                    isSelected
                      ? "bg-[#FDEDEF] text-[#C33A56]"
                      : "bg-[#F0EBE7] text-[#8A7B76]"
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
        {viewMode === "calendar" ? (
          <BookedClientsCalendarView
            clients={filteredClients}
            initialDateStr={initialDate}
            onSelectBooking={(client) => setSelectedBooking(client)}
          />
        ) : filteredClients.length === 0 ? (
          <div className="rounded-[18px] border border-[#E7DCD6] bg-white p-12 text-center shadow-2xs">
            <CalendarCheck className="size-10 text-[#B7A9A3] mx-auto mb-2" />
            <h3 className="font-display text-lg font-bold text-[#2B2320]">No bookings found</h3>
            <p className="text-xs text-[#8A7B76] mt-1 max-w-sm mx-auto">
              {searchQuery || selectedStage !== "all"
                ? "No client records match the selected filter criteria. Try clearing search filters."
                : "No clients in this view."}
            </p>
            {(searchQuery || selectedStage !== "all" || activeTab !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStage("all");
                  setActiveTab("all");
                }}
                className="mt-4 rounded-full text-xs font-semibold"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* ── Client Overview Table ── */
          <div className="rounded-[22px] border border-[#E7DCD6] bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F7] border-b border-[#E7DCD6] text-[10.5px] font-extrabold uppercase tracking-wider text-[#8A7B76]">
                    <th className="py-3.5 px-4 font-bold">Client &amp; Journey</th>
                    <th className="py-3.5 px-4 font-bold">Contact Number</th>
                    <th className="py-3.5 px-4 font-bold">Assigned Handler</th>
                    <th className="py-3.5 px-4 font-bold text-center">Active Events</th>
                    <th className="py-3.5 px-4 font-bold">Quotation Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Investment (NPR)</th>
                    <th className="py-3.5 px-4 font-bold text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE7] text-xs">
                  {filteredClients.map((client) => {
                    const initials = client.client_name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const eventsCount = client.events_count || client.ceremonies?.length || 1;
                    const ceremonyNames = (client.ceremonies || [])
                      .map((c) => c.name)
                      .join(", ");

                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedBooking(client)}
                        className="hover:bg-[#FAF8F7]/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. Client & Function */}
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="flex items-center gap-3">
                            <div className="size-10 shrink-0 rounded-full bg-[#FDEDEF] text-[#C33A56] border border-[#F9CFD7] font-display font-bold text-xs flex items-center justify-center shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <strong className="font-display font-bold text-sm text-[#2B2320] block truncate group-hover:text-[#C33A56] transition-colors">
                                {client.client_name}
                              </strong>
                              <span className="text-[11px] text-[#8A7B76] block truncate">
                                {client.event_type}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-[#8A7B76] mt-0.5 truncate">
                                <MapPin className="size-3 text-[#B7A9A3] shrink-0" />
                                <span className="truncate">{client.venue}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact Number */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {client.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#4A3F3C]">
                                {client.phone}
                              </span>
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a
                                  href={`tel:${client.phone}`}
                                  className="size-6 rounded-full bg-stone-100 hover:bg-[#FDEDEF] hover:text-[#C33A56] flex items-center justify-center text-[#8A7B76] transition-colors"
                                  title="Call client"
                                >
                                  <Phone className="size-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="size-6 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                                  title="WhatsApp client"
                                >
                                  <MessageCircle className="size-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">No phone</span>
                          )}
                        </td>

                        {/* 3. Assigned Staff Handler */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F7] border border-[#E7DCD6] text-xs font-semibold text-[#4A3F3C]">
                            <UserCheck className="size-3 text-[#8A7B76]" />
                            <span className="capitalize">{client.handler || "suvash mukhiya"}</span>
                          </div>
                        </td>

                        {/* 4. Active Events Count */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#FDEDEF] text-[#C33A56] border border-[#F9CFD7] shadow-2xs"
                            title={ceremonyNames || `${eventsCount} scheduled functions`}
                          >
                            <Sparkles className="size-3 text-[#E8546F]" />
                            {eventsCount} {eventsCount === 1 ? "Event" : "Events"}
                          </span>
                          {ceremonyNames && (
                            <div
                              className="text-[10px] text-[#8A7B76] truncate max-w-[140px] mx-auto mt-0.5"
                              title={ceremonyNames}
                            >
                              {ceremonyNames}
                            </div>
                          )}
                        </td>

                        {/* 5. Quotation Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderQuotationStatusBadge(client.quotation_status)}
                        </td>

                        {/* 6. Investment (NPR) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-display font-black text-sm text-[#2B2320] tabular-nums">
                            Rs. {client.total_amount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#8A7B76] capitalize mt-0.5">
                            {client.payment_status.replace("_", " ")} · {renderDaysBadge(client.days_to_event)}
                          </div>
                        </td>

                        {/* 7. Quick Actions: [View Proposal Link] & [Edit Quotation] */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* [View Proposal Link] */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setProposalModalClient(client)}
                              className="h-8 px-2.5 rounded-xl border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                              title="View unique tracking URL and WhatsApp dispatch preview"
                            >
                              <Share2 className="size-3 text-emerald-600" />
                              <span>View Proposal Link</span>
                            </Button>

                            {/* [Edit Quotation] */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 px-2.5 rounded-xl border-[#E7DCD6] text-[#4A3F3C] hover:bg-[#FAF8F7] hover:border-[#E8546F]/50 text-xs font-bold gap-1.5 shadow-2xs"
                              title="Edit quotation and customize ceremony cards"
                            >
                              <Link
                                to="/quotations/new"
                                search={{ clientId: client.id, from: "/booked-clients" }}
                              >
                                <FileEdit className="size-3 text-[#E8546F]" />
                                <span>Edit Quotation</span>
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Cards / List View ── */
          <div className="space-y-2.5">
            {filteredClients.map((client) => {
              const initials = client.client_name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const eventsCount = client.events_count || client.ceremonies?.length || 1;

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedBooking(client)}
                  className="group relative flex items-center justify-between rounded-[18px] border border-[#E7DCD6] bg-white p-4 transition-all hover:border-[#E8546F]/50 hover:shadow-md cursor-pointer gap-4"
                >
                  {/* Left Side: Avatar + Stacked 2-Line Container with explicit 4px gap */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Initials Avatar */}
                    <div className="size-11 shrink-0 rounded-full bg-[#FDEDEF] text-[#C33A56] border border-[#F9CFD7] font-display font-bold text-sm flex items-center justify-center shadow-2xs">
                      {initials}
                    </div>

                    {/* Stacked Two-Line Info: flex-col with explicit ~4px gap, no overlapping */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      {/* Line 1: Client Name + Event Type */}
                      <div className="flex items-center gap-2 min-w-0">
                        <strong className="font-display text-sm sm:text-base font-bold text-[#2B2320] truncate group-hover:text-[#C33A56] transition-colors">
                          {client.client_name}
                        </strong>
                        <span className="text-xs text-[#8A7B76] truncate shrink-0">
                          · {client.event_type}
                        </span>
                        <span className="text-[10px] font-bold text-[#C33A56] bg-rose-50 px-2 py-0.2 rounded-full border border-rose-200 shrink-0">
                          {eventsCount} {eventsCount === 1 ? "Event" : "Events"}
                        </span>
                      </div>

                      {/* Line 2: Venue only */}
                      <div className="flex items-center gap-1.5 text-xs text-[#8A7B76] min-w-0">
                        <MapPin className="size-3 text-[#B7A9A3] shrink-0" />
                        <span className="truncate">{client.venue}</span>
                        <span className="mx-1">·</span>
                        <span className="capitalize">{client.handler || "suvash mukhiya"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Status Badge + Days + Quick Actions */}
                  <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {renderQuotationStatusBadge(client.quotation_status)}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProposalModalClient(client)}
                      className="h-8 px-2.5 rounded-xl border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold gap-1 shadow-2xs cursor-pointer"
                      title="View Proposal Link"
                    >
                      <Share2 className="size-3 text-emerald-600" />
                      <span className="hidden sm:inline">Proposal</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 px-2.5 rounded-xl border-[#E7DCD6] text-[#4A3F3C] text-xs font-bold gap-1 shadow-2xs"
                      title="Edit Quotation"
                    >
                      <Link to="/quotations/new" search={{ clientId: client.id, from: "/booked-clients" }}>
                        <FileEdit className="size-3 text-[#E8546F]" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                    </Button>

                    {/* Days-to-event badge */}
                    {renderDaysBadge(client.days_to_event)}

                    {/* Chevron */}
                    <ChevronRight className="size-4 text-[#8A7B76] group-hover:text-[#E8546F] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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

              {/* Total Price Line: sum of every decoration setup's price listed below */}
              <div className="flex items-baseline gap-2 py-1">
                <span className="text-sm font-semibold text-[#8A7B76]">Total:</span>
                <span className="font-display text-2xl font-bold text-[#2B2320] tabular-nums">
                  ₹{(selectedBooking.decorations || [])
                    .reduce((sum, d) => sum + computeDecorationItemPrice(d), 0)
                    .toLocaleString()}
                </span>
              </div>

              {/* Decoration Setups Included (with live per-item flower-cost totals) */}
              {selectedBooking.decorations && selectedBooking.decorations.length > 0 && (
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
                            ₹{itemPrice.toLocaleString()}
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
