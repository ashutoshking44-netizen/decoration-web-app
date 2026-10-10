import { useState, useMemo, ComponentType } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  HeartHandshake,
  Instagram,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
  XCircle,
  FileText,
  SlidersHorizontal,
  CreditCard,
  Ban,
  Archive,
  CalendarX,
  FileClock,
  FileEdit,
  Menu,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Users,
  MessageSquare,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ceremoniesFromEnquiry,
  useEnquiriesStore,
  type EnquiryItem,
  type EnquirySource,
} from "@/lib/enquiries";
import { useBookedClientsStore, type BookedClient, type ClientCeremonyItem } from "@/lib/clients";
import { ProposalDispatchModal } from "./proposal-dispatch-modal";
import { ShareEnquiryFormButton } from "./share-enquiry-form-button";
import { EnquiryExtraDetails } from "./enquiry-extra-details";
import { ProposalPreviewModal } from "./proposal-preview-modal";
import {
  useProposalActivity,
  computeProposalGrandTotal,
  countPendingPriceItems,
} from "@/lib/proposal-activity";
import { getDecorItemBreakdown, formatNepaliNumber } from "@/lib/decor-item-breakdown";

export type PipelineStageId =
  | "new_enquiries"
  | "quotation_pending"
  | "quotations_made"
  | "quotation_sent"
  | "interested"
  | "not_interested"
  | "advance_pending"
  | "booked"
  | "cancelled"
  | "booked_elsewhere"
  | "lost"
  | "passed_on"
  | "booking_cancelled"
  | "pending_quotations";

export interface PipelineStageConfig {
  id: PipelineStageId;
  name: string;
  category: "PIPELINE" | "OTHER STAGES";
  icon: ComponentType<{ className?: string }>;
  description: string;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  // PIPELINE (11 stages)
  {
    id: "new_enquiries",
    name: "New Enquiries",
    category: "PIPELINE",
    icon: Sparkles,
    description: "Enquiries and clients currently under New Enquiries",
  },
  {
    id: "quotation_pending",
    name: "Quotation Pending",
    category: "PIPELINE",
    icon: Clock,
    description: "Enquiries and clients currently under Quotation Pending",
  },
  {
    id: "quotations_made",
    name: "Quotations Made",
    category: "PIPELINE",
    icon: FileEdit,
    description: "Enquiries and clients currently under Quotations Made",
  },
  {
    id: "quotation_sent",
    name: "Quotation Sent",
    category: "PIPELINE",
    icon: Send,
    description: "Enquiries and clients currently under Quotation Sent",
  },
  {
    id: "interested",
    name: "Interested",
    category: "PIPELINE",
    icon: HeartHandshake,
    description: "Enquiries and clients currently under Interested",
  },
  {
    id: "not_interested",
    name: "Not Interested",
    category: "PIPELINE",
    icon: XCircle,
    description: "Enquiries and clients currently under Not Interested",
  },
  {
    id: "advance_pending",
    name: "Advance Pending",
    category: "PIPELINE",
    icon: CreditCard,
    description: "Enquiries and clients currently under Advance Pending",
  },
  {
    id: "booked",
    name: "Booked",
    category: "PIPELINE",
    icon: CheckCircle2,
    description: "Enquiries and clients currently under Booked",
  },
  {
    id: "cancelled",
    name: "Cancelled",
    category: "PIPELINE",
    icon: Ban,
    description: "Enquiries and clients currently under Cancelled",
  },
  {
    id: "booked_elsewhere",
    name: "Booked Elsewhere",
    category: "PIPELINE",
    icon: ExternalLink,
    description: "Enquiries and clients currently under Booked Elsewhere",
  },
  {
    id: "lost",
    name: "Lost",
    category: "PIPELINE",
    icon: Archive,
    description: "Enquiries and clients currently under Lost",
  },

  // OTHER STAGES (3 stages)
  {
    id: "passed_on",
    name: "Passed On",
    category: "OTHER STAGES",
    icon: Share2,
    description: "Enquiries and clients currently under Passed On",
  },
  {
    id: "booking_cancelled",
    name: "Booking Cancelled",
    category: "OTHER STAGES",
    icon: CalendarX,
    description: "Enquiries and clients currently under Booking Cancelled",
  },
  {
    id: "pending_quotations",
    name: "Pending Quotations",
    category: "OTHER STAGES",
    icon: FileClock,
    description: "Enquiries and clients currently under Pending Quotations",
  },
];

type UnifiedRecord =
  | { type: "enquiry"; data: EnquiryItem }
  | { type: "client"; data: BookedClient };

export function EnquiriesTriagePage() {
  const navigate = useNavigate();
  const {
    enquiries,
    isLoaded,
    triggerPrompt,
    cancelPrompt,
    markInterestedLater,
    markNotAvailable,
    savePrivateNote,
    restoreEnquiry,
    createQuotationForEnquiry,
    resetEnquiries,
    softDeleteQuotation,
    undoDeleteQuotation,
  } = useEnquiriesStore();

  const { clients, softDeleteClient, undoDeleteClient } = useBookedClientsStore();

  // Active Stage Filter State
  const [selectedStage, setSelectedStage] = useState<PipelineStageId>("new_enquiries");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | EnquirySource>("all");
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savedNotesMessage, setSavedNotesMessage] = useState<Record<string, boolean>>({});

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Proposal Dispatch and Live Preview modal states
  const [dispatchClient, setDispatchClient] = useState<BookedClient | null>(null);
  const [previewProposalClient, setPreviewProposalClient] = useState<BookedClient | null>(null);

  // Archive / Decline dialog state
  const [declineTarget, setDeclineTarget] = useState<EnquiryItem | null>(null);
  const [declineReason, setDeclineReason] = useState("Date conflict / Studio fully booked");

  // Delete quotation dialog state
  const [deleteTarget, setDeleteTarget] = useState<{
    record: UnifiedRecord;
    clientObject: BookedClient;
    quotationNumber: string;
    grandTotal: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quotation Settings dialog state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [defaultValidityDays, setDefaultValidityDays] = useState("14");
  const [defaultVatRate, setDefaultVatRate] = useState("13");
  const [defaultAdvancePercent, setDefaultAdvancePercent] = useState("50");

  // Handle note typing
  const handleNoteChange = (id: string, value: string) => {
    setEditingNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveNote = (id: string) => {
    const note = editingNotes[id];
    if (note !== undefined) {
      savePrivateNote(id, note);
      setSavedNotesMessage((prev) => ({ ...prev, [id]: true }));
      toast.success("Private note saved for internal staff");
      setTimeout(() => {
        setSavedNotesMessage((prev) => ({ ...prev, [id]: false }));
      }, 2500);
    }
  };

  // Launch quotation builder
  const handleLaunchQuotation = (enquiry: EnquiryItem) => {
    toast.info(`Setting up quotation for ${enquiry.client_name}...`);
    const client = createQuotationForEnquiry(enquiry.id);
    if (client) {
      navigate({
        to: "/quotations/new",
        search: { clientId: client.id },
      });
    }
  };

  // Helper to map stage to records
  const getStageRecords = (stageId: PipelineStageId): UnifiedRecord[] => {
    switch (stageId) {
      case "new_enquiries":
        return enquiries
          .filter((e) => e.status === "unreviewed" || (e.status as any) === "new" || !e.status)
          .map((e) => ({ type: "enquiry", data: e }));

      case "quotation_pending":
        return enquiries
          .filter(
            (e) =>
              (e.status === "interested" && e.prompt_state === "later") ||
              ((e.status === "unreviewed" || (e.status as any) === "new" || !e.status) &&
                e.prompt_state === "asking_quotation")
          )
          .map((e) => ({ type: "enquiry", data: e }));

      case "quotations_made": {
        const enquiryMade = enquiries
          .filter((e) => e.status === "quotation_created")
          .map((e) => ({ type: "enquiry" as const, data: e }));
        const clientDrafts = clients
          .filter((c) => c.quotation_status === "Draft")
          .map((c) => ({ type: "client" as const, data: c }));
        return [...enquiryMade, ...clientDrafts];
      }

      case "quotation_sent":
        return clients
          .filter((c) => c.quotation_status === "Sent via WhatsApp")
          .map((c) => ({ type: "client", data: c }));

      case "interested":
        return enquiries
          .filter((e) => e.status === "interested")
          .map((e) => ({ type: "enquiry", data: e }));

      case "not_interested":
        return enquiries
          .filter(
            (e) =>
              e.status === "not_available" &&
              (e.decline_reason?.toLowerCase().includes("budget") ||
                e.decline_reason?.toLowerCase().includes("radius") ||
                e.decline_reason?.toLowerCase().includes("not interested"))
          )
          .map((e) => ({ type: "enquiry", data: e }));

      case "advance_pending":
        return clients
          .filter(
            (c) =>
              c.payment_status === "balance_due" ||
              c.payment_status === "partial"
          )
          .map((c) => ({ type: "client", data: c }));

      case "booked":
        return clients
          .filter(
            (c) =>
              c.stage === "confirmed" ||
              c.stage === "decor_confirmed" ||
              c.stage === "crew_assigned" ||
              c.stage === "setup_scheduled" ||
              c.stage === "delivered"
          )
          .map((c) => ({ type: "client", data: c }));

      case "cancelled":
        return enquiries
          .filter(
            (e) =>
              e.status === "not_available" &&
              e.decline_reason?.toLowerCase().includes("conflict")
          )
          .map((e) => ({ type: "enquiry", data: e }));

      case "booked_elsewhere":
        return enquiries
          .filter(
            (e) =>
              e.status === "not_available" &&
              (e.decline_reason?.toLowerCase().includes("duplicate") ||
                e.decline_reason?.toLowerCase().includes("elsewhere"))
          )
          .map((e) => ({ type: "enquiry", data: e }));

      case "lost":
        return enquiries
          .filter((e) => e.status === "archived")
          .map((e) => ({ type: "enquiry", data: e }));

      case "passed_on":
        return enquiries
          .filter((e) => e.decline_reason?.toLowerCase().includes("passed"))
          .map((e) => ({ type: "enquiry", data: e }));

      case "booking_cancelled":
        return [];

      case "pending_quotations":
        return clients
          .filter((c) => c.quotation_status === "Pending Review")
          .map((c) => ({ type: "client", data: c }));

      default:
        return [];
    }
  };

  // Compute live counts for each stage
  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStageId, number> = {} as any;
    for (const stage of PIPELINE_STAGES) {
      counts[stage.id] = getStageRecords(stage.id).length;
    }
    return counts;
  }, [enquiries, clients]);

  // Current active stage config
  const activeStageConfig: PipelineStageConfig = useMemo(() => {
    const found = PIPELINE_STAGES.find((s) => s.id === selectedStage);
    return found ?? (PIPELINE_STAGES[0] as PipelineStageConfig);
  }, [selectedStage]);

  // Records for active stage, filtered by search query & source
  const currentStageRecords = useMemo(() => {
    const raw = getStageRecords(selectedStage);
    return raw.filter((item) => {
      // Source filter (applies to enquiry items)
      if (
        sourceFilter !== "all" &&
        item.type === "enquiry" &&
        item.data.source !== sourceFilter
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (item.type === "enquiry") {
          const matchName = item.data.client_name.toLowerCase().includes(q);
          const matchPhone = item.data.phone.includes(q);
          const matchCeremony = item.data.ceremony_type.toLowerCase().includes(q);
          const matchVenue = item.data.venue.toLowerCase().includes(q);
          const matchLocation = item.data.location.toLowerCase().includes(q);
          return (
            matchName || matchPhone || matchCeremony || matchVenue || matchLocation
          );
        } else {
          const matchName = item.data.client_name.toLowerCase().includes(q);
          const matchPhone = (item.data.phone || "").includes(q);
          const matchEvent = item.data.event_type.toLowerCase().includes(q);
          const matchVenue = item.data.venue.toLowerCase().includes(q);
          return matchName || matchPhone || matchEvent || matchVenue;
        }
      }

      return true;
    });
  }, [selectedStage, enquiries, clients, searchQuery, sourceFilter]);

  // Group stages by category for the sidebar
  const pipelineStagesList = useMemo(
    () => PIPELINE_STAGES.filter((s) => s.category === "PIPELINE"),
    []
  );
  const otherStagesList = useMemo(
    () => PIPELINE_STAGES.filter((s) => s.category === "OTHER STAGES"),
    []
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FBF6F3] text-[#2B2320]">
      {/* ── 1. Top Header Bar (Fixed at top) ── */}
      <header className="h-16 shrink-0 border-b border-[#E7DCD6] bg-white/95 backdrop-blur z-40 shadow-2xs">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
          {/* Left: Back button + Title & Subtitle Context */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden flex size-8 items-center justify-center rounded-lg border border-[#E7DCD6] bg-white text-[#6E5D57] hover:bg-[#FFF0F3] hover:text-[#D6415C] transition-colors"
              title="Toggle Pipeline Menu"
              aria-label="Toggle Pipeline Stages"
            >
              <Menu className="size-4" />
            </button>

            {/* Back Button */}
            <Link
              to="/company"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7DCD6] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#6E5D57] hover:bg-[#FFF0F3] hover:text-[#D6415C] hover:border-[#FDC2CD] transition-colors shadow-2xs shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <div className="h-4 w-px bg-[#E7DCD6] hidden sm:block" />

            {/* Page Title */}
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#2B2320]">
              Enquiries &amp; Quotations
            </h1>
          </div>

          {/* Center: Global Search Input */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8A7B76] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by client or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-full border border-[#E7DCD6] bg-[#FBF6F3] text-xs font-medium text-[#2B2320] placeholder:text-[#8A7B76] focus:outline-none focus:ring-1 focus:ring-[#E8546F] focus:border-[#E8546F] transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7B76] hover:text-[#D6415C] cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Quotation Settings & Primary Highlighted + Create Quotation Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Share public enquiry form with clients */}
            <ShareEnquiryFormButton />

            {/* Quotation Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="h-9 rounded-full border-[#E7DCD6] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#5B4C47] hover:text-[#D6415C] hover:bg-[#FFF0F3] hover:border-[#FDC2CD] shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Quotation Settings"
            >
              <SlidersHorizontal className="size-3.5 text-[#8A7B76]" />
              <span className="hidden md:inline">Quotation Settings</span>
            </Button>

            {/* Primary Highlighted "+ Create Quotation" Button */}
            <Link
              to="/quotations/new"
              className="inline-flex items-center gap-1.5 h-9 rounded-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] px-3 sm:px-4 text-xs font-bold text-white shadow-sm hover:from-[#D6415C] hover:to-[#C3334E] hover:shadow transition-all shrink-0 cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span className="whitespace-nowrap">+ Create Quotation</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Fixed Sidebar + Scrollable Main Content Layout ── */}
      <div className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* Desktop Fixed Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-stone-200/70 bg-white h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 select-none">
          <SidebarContent
            selectedStage={selectedStage}
            stageCounts={stageCounts}
            pipelineStagesList={pipelineStagesList}
            otherStagesList={otherStagesList}
            onSelectStage={(id) => setSelectedStage(id)}
            resetEnquiries={resetEnquiries}
          />
        </aside>

        {/* Mobile Slide-Over Sidebar Backdrop & Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl p-3.5 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid size-6 place-items-center rounded-md bg-[#FFF0F3] text-[#E8546F]">
                      <Sparkles className="size-3.5" />
                    </div>
                    <span className="font-display text-sm font-bold text-[#2B2320]">
                      Pipeline Stages
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 text-stone-400 hover:text-stone-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <SidebarContent
                  selectedStage={selectedStage}
                  stageCounts={stageCounts}
                  pipelineStagesList={pipelineStagesList}
                  otherStagesList={otherStagesList}
                  onSelectStage={(id) => {
                    setSelectedStage(id);
                    setIsMobileSidebarOpen(false);
                  }}
                  resetEnquiries={resetEnquiries}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Main Content Area (Scrolls independently) ── */}
        <main className="flex-1 h-full overflow-y-auto min-w-0 p-4 sm:p-6 lg:p-8">
          {/* ── Quotations Made: Card Grid View ── */}
          {selectedStage === "quotations_made" ? (
            <QuotationsMadeGrid
              records={currentStageRecords}
              isLoaded={isLoaded}
              onOpenQuotation={(clientId) =>
                navigate({ to: "/quotations/new", search: { clientId } })
              }
              onViewProposal={(client) => setPreviewProposalClient(client)}
              onDispatchProposal={(client) => setDispatchClient(client)}
              onDeleteQuotation={(record, clientObject, quotationNumber, grandTotal) =>
                setDeleteTarget({ record, clientObject, quotationNumber, grandTotal })
              }
              onViewNewEnquiries={() => {
                setSelectedStage("new_enquiries");
                setSearchQuery("");
              }}
              newEnquiriesCount={stageCounts.new_enquiries}
            />
          ) : currentStageRecords.length === 0 ? (
            /* ── Conditional Empty State Card ── */
            <div className="rounded-2xl border border-[#E7DCD6] bg-white p-12 sm:p-16 text-center shadow-soft max-w-xl mx-auto my-6">
              {/* Document Icon */}
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FFF0F3] border border-[#FDC2CD] text-[#D6415C] mb-4 shadow-2xs">
                <FileText className="size-8 stroke-[1.5]" />
              </div>

              {/* Heading */}
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2B2320]">
                No clients in {activeStageConfig.name}
              </h3>

              {/* Descriptive Helper Text */}
              <p className="text-xs sm:text-sm text-[#7A6B66] mt-2 max-w-md mx-auto leading-relaxed">
                You currently have no clients or quotations under {activeStageConfig.name}.
              </p>

              {/* Helpful Quick Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStage("new_enquiries");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCD6] bg-white px-4 py-2 text-xs font-semibold text-[#5B4C47] hover:bg-[#FFF0F3] hover:text-[#D6415C] hover:border-[#FDC2CD] transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="size-3.5" />
                  <span>
                    View New Enquiries ({stageCounts.new_enquiries})
                  </span>
                </button>

                <Link
                  to="/quotations/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-[#D6415C] hover:to-[#C3334E] transition-all"
                >
                  <Plus className="size-3.5" />
                  <span>+ Create Quotation</span>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Existing Record List/Table Inside Main Area ── */
            <div className="space-y-4">
              {currentStageRecords.map((record) => {
                if (record.type === "enquiry") {
                  const enquiry = record.data;
                  const currentNote =
                    editingNotes[enquiry.id] !== undefined
                      ? editingNotes[enquiry.id]
                      : enquiry.private_note || "";

                  const formattedAmount = (enquiry.estimated_budget_npr || 595000).toLocaleString();
                  const nepaliDateDisplay = enquiry.date_bs
                    ? enquiry.date_bs.toLowerCase().includes("pending") || enquiry.date_bs.includes("BS")
                      ? enquiry.date_bs
                      : `${enquiry.date_bs} BS`
                    : "Date pending";
                  // Only show what the enquiry actually has (website enquiries have none of these)
                  const packageTierDisplay = enquiry.package_tier;
                  const timeSlotDisplay = enquiry.time_slot;
                  const guestCountDisplay = enquiry.guest_count;
                  const cleanPhone = (enquiry.phone || "").replace(/[^0-9+]/g, "");
                  const cleanWa = (enquiry.whatsapp_number || enquiry.phone || "").replace(/[^0-9]/g, "");
                  const clientInitial = (enquiry.client_name || "").trim().charAt(0).toUpperCase() || "C";

                  const timestampDisplay = (() => {
                    if (
                      enquiry.time_ago_display &&
                      (enquiry.time_ago_display.includes("AM") || enquiry.time_ago_display.includes("PM"))
                    ) {
                      return enquiry.time_ago_display;
                    }
                    try {
                      const d = new Date(enquiry.created_at);
                      if (!isNaN(d.getTime())) {
                        return d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      }
                    } catch {
                      // fallback below
                    }
                    return enquiry.time_ago_display || "Recent inquiry";
                  })();

                  return (
                    <article
                      key={enquiry.id}
                      className={cn(
                        "rounded-2xl border bg-white shadow-soft transition-all duration-200 overflow-hidden",
                        enquiry.status === "not_available"
                          ? "border-stone-200 opacity-60 bg-stone-50"
                          : enquiry.prompt_state === "asking_quotation"
                          ? "border-[#E8546F] ring-2 ring-[#E8546F]/20 shadow-md"
                          : "border-[#E7DCD6] hover:border-[#FDC2CD]"
                      )}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E7DCD6]">
                        {/* ── Left 8 Columns: Client Header, Contact Info, Scheduled Events, Total, Call Client ── */}
                        <div className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-4">
                          <div className="space-y-4">
                            {/* Header Row: Avatar, Name, Status, Event Tag, Contact Pills, Source, Timestamp, Menu */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5">
                                {/* Circular Client Initial Avatar */}
                                <div className="size-10 rounded-full bg-[#FFF0F3] text-[#E8546F] font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                                  {clientInitial}
                                </div>

                                <div className="space-y-1.5">
                                  {/* Line 1: Name, Status Pill, Event Count Tag */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#2B2320]">
                                      {enquiry.client_name}
                                    </h3>

                                    {/* Status Pill */}
                                    {(enquiry.status === "unreviewed" || (enquiry.status as any) === "new" || !enquiry.status) && (
                                      <span className="rounded-full bg-[#E8546F] text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider shadow-2xs">
                                        NEW
                                      </span>
                                    )}
                                    {enquiry.status === "interested" && (
                                      <span className="rounded-full bg-[#FFE4E9] border border-[#FDC2CD] text-[#C2284E] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                        INTERESTED
                                      </span>
                                    )}
                                    {enquiry.status === "quotation_created" && (
                                      <span className="rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                        QUOTATION MADE
                                      </span>
                                    )}
                                    {enquiry.status === "not_available" && (
                                      <span className="rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                                        DECLINED
                                      </span>
                                    )}

                                    {/* Event Count Tag */}
                                    <span className="rounded-full bg-[#FFF0F3] border border-[#FFD0D9] text-[#E8546F] text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                                      {enquiry.events?.length || 1} {(enquiry.events?.length || 1) > 1 ? "EVENTS" : "EVENT"}
                                    </span>
                                  </div>

                                  {/* Line 2: Phone Pill & WhatsApp Pill */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCD6] bg-[#FAF6F4] hover:bg-[#FFF0F3] hover:border-[#FDC2CD] px-2.5 py-0.5 text-xs text-[#2B2320] font-medium transition shadow-2xs"
                                      title={`Call ${enquiry.phone}`}
                                    >
                                      <Phone className="size-3 text-stone-400" />
                                      <span>{enquiry.phone}</span>
                                    </a>

                                    <a
                                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                                        `Namaste ${enquiry.client_name}, thank you for contacting us regarding your ${enquiry.ceremony_type} decoration! How can we assist you today?`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[#A7E8BD] bg-[#E8FAF0] hover:bg-[#D5F5E3] px-2.5 py-0.5 text-xs font-medium text-[#128C7E] transition shadow-2xs"
                                      title="Open WhatsApp Chat"
                                    >
                                      <MessageCircle className="size-3 text-[#128C7E] fill-current" />
                                      <span>{enquiry.whatsapp_number || enquiry.phone}</span>
                                    </a>
                                  </div>

                                  {/* Line 3: Source Channel & Inquiry Timestamp */}
                                  <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap pt-0.5">
                                    <span className="inline-flex items-center gap-1.5 text-stone-600 font-medium">
                                      {(enquiry.source === "Website" || (enquiry.source as any) === "client_panel") && <Globe className="size-3 text-stone-400" />}
                                      {enquiry.source === "Instagram" && <Instagram className="size-3 text-stone-400" />}
                                      {enquiry.source === "Facebook" && <MessageCircle className="size-3 text-stone-400" />}
                                      {enquiry.source === "Referral" && <UserCheck className="size-3 text-stone-400" />}
                                      {enquiry.source === "Walk-in" && <Compass className="size-3 text-stone-400" />}
                                      <span>{(enquiry.source as string) === "client_panel" ? "Website" : enquiry.source} Inquiry</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-stone-400">
                                      <Clock className="size-3 text-stone-400" />
                                      <span>{timestampDisplay}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Three Dots Menu Button */}
                              <button
                                type="button"
                                className="size-8 rounded-full border border-stone-200 hover:border-stone-300 hover:bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-700 transition shrink-0 cursor-pointer shadow-2xs"
                                title="More options"
                                onClick={() => {
                                  navigator.clipboard?.writeText?.(`${enquiry.client_name} - ${enquiry.phone}`);
                                  toast.info(`Copied ${enquiry.client_name}'s contact info`);
                                }}
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </div>

                            {/* ── Scheduled Events Section ── */}
                            <div className="pt-1">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                                SCHEDULED EVENTS ({enquiry.events?.length || 1})
                              </div>

                              <div className="rounded-xl border border-stone-200/90 bg-[#FAF9F8]/70 hover:bg-[#FAF9F8] p-3.5 sm:p-4 transition-colors space-y-2.5">
                                {/* Row 1: Ceremony Type & Subtotal */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-[#E8546F] inline-block shrink-0" />
                                    <span className="font-bold text-stone-900 text-sm capitalize">
                                      {enquiry.ceremony_type}
                                    </span>
                                  </div>
                                  <div className="font-bold text-stone-900 text-sm tracking-tight">
                                    Rs. {formattedAmount}
                                  </div>
                                </div>

                                {/* Row 2: Nepali Date, Venue, Package Style / Tier, Guests */}
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-stone-600">
                                  <span className="font-semibold text-stone-800">
                                    {nepaliDateDisplay}
                                  </span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-600 font-medium">
                                    {enquiry.venue}
                                  </span>
                                  {packageTierDisplay && (
                                    <>
                                      <span className="text-stone-300">•</span>
                                      <span className="inline-block rounded border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700 shadow-2xs">
                                        {packageTierDisplay}
                                      </span>
                                    </>
                                  )}
                                  {guestCountDisplay ? (
                                    <>
                                      <span className="text-stone-300">•</span>
                                      <span className="inline-flex items-center gap-1 text-stone-500">
                                        <Users className="size-3 text-stone-400" />
                                        <span>{guestCountDisplay} Guests</span>
                                      </span>
                                    </>
                                  ) : null}
                                </div>

                                {/* Row 3: Time Slot */}
                                {timeSlotDisplay && (
                                  <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-0.5">
                                    <Clock className="size-3 text-stone-400 shrink-0" />
                                    <span>{timeSlotDisplay}</span>
                                  </div>
                                )}
                              </div>

                              <EnquiryExtraDetails enquiry={enquiry} />
                            </div>
                          </div>

                          {/* ── Bottom of Left Section: Estimated Total & Call Client Button ── */}
                          <div className="pt-2 space-y-3">
                            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                ESTIMATED TOTAL
                              </span>
                              <span className="text-base sm:text-lg font-bold text-[#E8546F]">
                                Rs. {formattedAmount}
                              </span>
                            </div>

                            <div>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-4 py-1.5 text-xs font-semibold shadow-2xs hover:border-stone-300 transition-colors cursor-pointer"
                                title={`Call ${enquiry.client_name}`}
                              >
                                <Phone className="size-3.5 text-stone-500" />
                                <span>Call Client</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* ── Right 4 Columns: Action & Response Panel ── */}
                        <div className="lg:col-span-4 p-5 sm:p-6 bg-white flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-[#E7DCD6]">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-1.5 text-stone-400">
                              <MessageSquare className="size-3.5 text-[#E8546F]" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                                RESPOND
                              </span>
                            </div>

                            {/* Interactive Prompt State */}
                            {enquiry.prompt_state === "asking_quotation" ? (
                              <div className="rounded-xl border-2 border-[#E8546F] bg-white p-3.5 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-display text-sm font-bold text-[#2B2320]">
                                    Great — make a quotation?
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => cancelPrompt(enquiry.id)}
                                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                                    title="Cancel prompt"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                                <p className="text-[11px] text-stone-500 leading-snug">
                                  Launch builder with {enquiry.client_name}&apos;s event details pre-loaded.
                                </p>

                                <div className="space-y-2 pt-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleLaunchQuotation(enquiry)}
                                    className="w-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] hover:from-[#D6415C] hover:to-[#C3334E] text-white text-xs font-bold rounded-lg shadow-sm shadow-[#E8546F]/20 justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Sparkles className="size-3.5" />
                                    <span>Create quotation now</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      markInterestedLater(enquiry.id);
                                      toast.info(
                                        `Marked ${enquiry.client_name} as Interested. Quotation pending.`
                                      );
                                    }}
                                    className="w-full border-stone-200 bg-white text-stone-700 hover:bg-[#FFF0F3] hover:text-[#D6415C] hover:border-[#FDC2CD] text-xs font-semibold rounded-lg justify-center cursor-pointer transition-colors"
                                  >
                                    <span>I&apos;ll create later</span>
                                  </Button>
                                </div>
                              </div>
                            ) : enquiry.status === "not_available" ? (
                              <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                                <div className="text-xs text-stone-600">
                                  <span className="font-bold text-stone-800">Reason:</span>{" "}
                                  {enquiry.decline_reason || "Not interested / Studio unavailable"}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    restoreEnquiry(enquiry.id);
                                    toast.success(`Restored ${enquiry.client_name} to active triage`);
                                  }}
                                  className="w-full h-8 text-xs font-semibold text-stone-700 hover:text-[#D6415C] hover:bg-[#FFF0F3] hover:border-[#FDC2CD] rounded-lg cursor-pointer"
                                >
                                  <RotateCcw className="size-3 mr-1" />
                                  Restore to Unreviewed
                                </Button>
                              </div>
                            ) : (
                              /* The 2 Response Buttons matching Reference Image: Interested & Not interested */
                              <div className="flex flex-col gap-2.5">
                                {/* Button 1: Interested */}
                                <button
                                  type="button"
                                  onClick={() => triggerPrompt(enquiry.id)}
                                  className="w-full rounded-xl border border-[#A7E8BD] bg-[#E8FAF0] hover:bg-[#D5F5E3] text-[#0E7A53] py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
                                >
                                  <ThumbsUp className="size-4 text-[#0E7A53]" />
                                  <span>Interested</span>
                                </button>

                                {/* Button 2: Not interested */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeclineTarget(enquiry);
                                    setDeclineReason("Date conflict / Studio fully booked");
                                  }}
                                  className="w-full rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
                                >
                                  <ThumbsDown className="size-4 text-stone-500" />
                                  <span>Not interested</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Private Staff Note Field */}
                          <div className="pt-3 border-t border-stone-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-stone-500">
                              <label
                                htmlFor={`note-${enquiry.id}`}
                                className="flex items-center gap-1 font-semibold text-stone-600"
                              >
                                <Lock className="size-3 text-stone-400" />
                                <span>Private Staff Note</span>
                              </label>
                              {savedNotesMessage[enquiry.id] && (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <Check className="size-3" /> Saved
                                </span>
                              )}
                            </div>

                            <div className="relative">
                              <textarea
                                id={`note-${enquiry.id}`}
                                rows={2}
                                placeholder="Add a private note the client never sees..."
                                value={currentNote}
                                onChange={(e) => handleNoteChange(enquiry.id, e.target.value)}
                                onBlur={() => handleSaveNote(enquiry.id)}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-[#E8546F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#E8546F] resize-none leading-relaxed transition-all shadow-2xs"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-stone-400">
                                Auto-saves when you click away
                              </span>
                              {currentNote !== (enquiry.private_note || "") && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveNote(enquiry.id)}
                                  className="text-[10px] font-bold text-[#D6415C] hover:underline cursor-pointer"
                                >
                                  Save now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                } else {
                  // Booked Client Record Card
                  const client = record.data;
                  return (
                    <article
                      key={client.id}
                      className="rounded-2xl border border-[#E7DCD6] bg-white p-5 sm:p-6 shadow-soft hover:border-[#FDC2CD] transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2B2320]">
                              {client.client_name}
                            </h3>
                            {client.phone && (
                              <a
                                href={`tel:${client.phone}`}
                                className="inline-flex items-center gap-1 rounded-full bg-[#FAF6F4] border border-[#E7DCD6] px-2.5 py-0.5 text-xs font-semibold text-[#2B2320] hover:bg-[#FFF0F3] hover:text-[#D6415C] hover:border-[#FDC2CD] transition-colors"
                              >
                                <Phone className="size-3 text-[#E8546F]" />
                                <span>{client.phone}</span>
                              </a>
                            )}
                            <span className="rounded-full bg-[#FFF0F3] border border-[#FDC2CD] px-2.5 py-0.5 text-[11px] font-bold text-[#C2284E]">
                              Stage: {client.stage.replace("_", " ")}
                            </span>
                            {client.quotation_status && (
                              <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                                Quotation: {client.quotation_status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#FDC2CD] bg-[#FFF0F3] px-3 py-1.5 text-xs font-bold text-[#A82442]">
                              <Sparkles className="size-3.5 text-[#E8546F]" />
                              <span>{client.event_type}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-xl border border-[#E7DCD6] bg-[#FAF6F4] px-3 py-1.5 text-xs font-semibold text-[#2B2320]">
                              <CalendarDays className="size-3.5 text-[#E8546F]" />
                              <span>{client.event_date}</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCD6] bg-[#FAF6F4] px-3 py-1.5 text-xs font-semibold text-[#5C4D47]">
                              <MapPin className="size-3.5 text-[#8A7B76]" />
                              <span>{client.venue}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial balance and actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E7DCD6]">
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-[#7A6B66]">
                              Total:{" "}
                              <strong className="text-[#2B2320]">
                                Rs. {client.total_amount?.toLocaleString() || 0}
                              </strong>
                            </div>
                            <div className="text-xs font-bold text-[#D6415C]">
                              Balance Due: Rs. {client.balance_due?.toLocaleString() || 0}
                            </div>
                          </div>

                          <Link
                            to="/quotations/new"
                            search={{ clientId: client.id }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E8546F] to-[#D6415C] hover:from-[#D6415C] hover:to-[#C3334E] px-4 py-2 text-xs font-bold text-white shadow-xs shadow-[#E8546F]/15 transition-all"
                          >
                            <FileEdit className="size-3.5" />
                            <span>Open Quotation</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                }
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Delete Quotation Confirmation Modal ── */}
      {deleteTarget && (() => {
        const dt = deleteTarget;
        const isEnq = dt.record.type === "enquiry";
        const enquiry = isEnq ? (dt.record.data as EnquiryItem) : null;
        const client  = !isEnq ? (dt.record.data as BookedClient) : null;

        // Detect advanced stages that block deletion
        const isAdvancedStage =
          client?.stage === "confirmed" ||
          client?.stage === "decor_confirmed" ||
          client?.stage === "crew_assigned" ||
          client?.stage === "setup_scheduled" ||
          client?.stage === "delivered";
        const hasPayment = (client?.paid_amount ?? 0) > 0;
        const isBlocked = isAdvancedStage || hasPayment;

        // Client engagement signals
        const hasOpened  = false; // activity comes from QuotationsMadeCard; use grandTotal as proxy
        const isInterested = false;

        const totalStr = dt.grandTotal > 0
          ? `NPR ${dt.grandTotal.toLocaleString()}`
          : "NPR —";

        return (
          <Dialog open onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
            <DialogContent className="sm:max-w-md bg-white text-[#2B2320]">
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-[#C2284E]">
                  <Trash2 className="size-5" />
                  <span>Delete this quotation?</span>
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 mt-1">
                    <p className="text-sm text-stone-700 font-medium">
                      {dt.quotationNumber} · {dt.clientObject.client_name} · {totalStr}
                    </p>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      The client's live proposal link will stop working. This can't be
                      undone after 10 seconds.
                    </p>

                    {isBlocked && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 mt-1">
                        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-800">
                          This quotation has a payment or booking attached. Cancel
                          the booking first before deleting.
                        </p>
                      </div>
                    )}

                    {!isBlocked && hasOpened && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 mt-1">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-700">
                          The client has already opened this proposal.
                        </p>
                      </div>
                    )}

                    {!isBlocked && isInterested && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 mt-1">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-700">
                          The client has marked Interested.
                        </p>
                      </div>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="gap-2 sm:gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  autoFocus
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="text-xs"
                >
                  {isBlocked ? "Close" : "Cancel"}
                </Button>

                {!isBlocked && (
                  <Button
                    size="sm"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        // Simulate async (in a real app this would be an API call)
                        await new Promise((r) => setTimeout(r, 600));

                        const id = dt.record.type === "enquiry"
                          ? (dt.record.data as EnquiryItem).id
                          : (dt.record.data as BookedClient).id;
                        const label = `${dt.quotationNumber} · ${dt.clientObject.client_name}`;

                        if (dt.record.type === "enquiry") {
                          softDeleteQuotation(id, label);
                        } else {
                          softDeleteClient(id);
                        }

                        setDeleteTarget(null);

                        // 10-second undo toast
                        toast(`Quotation deleted.`, {
                          duration: 10000,
                          action: {
                            label: "Undo",
                            onClick: () => {
                              if (dt.record.type === "enquiry") {
                                undoDeleteQuotation(id);
                              } else {
                                undoDeleteClient(id);
                              }
                              toast.success(`Quotation restored for ${dt.clientObject.client_name}.`);
                            },
                          },
                        });
                      } catch {
                        toast.error("Couldn't delete. Please try again.");
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="text-xs bg-[#C2284E] hover:bg-[#a81f42] text-white font-bold flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <><Loader2 className="size-3.5 animate-spin" /><span>Deleting…</span></>
                    ) : (
                      <><Trash2 className="size-3.5" /><span>Delete</span></>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Decline / Not Available Modal Dialog ── */}
      <Dialog open={!!declineTarget} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white text-[#2B2320]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <XCircle className="size-5 text-[#D6415C]" />
              <span>Mark Not Available / Decline</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Update pipeline stage for {declineTarget?.client_name} ({declineTarget?.ceremony_type}{" "}
              on {declineTarget?.date_bs}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-xs font-bold text-stone-700">
              Select reason (routes into respective stage):
            </label>
            <div className="space-y-1.5">
              {[
                "Date conflict / Studio fully booked",
                "Minimum spend / budget threshold not met",
                "Duplicate inquiry / Booked elsewhere",
                "Venue outside operational radius",
                "Passed on to partner vendor",
              ].map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all",
                    declineReason === reason
                      ? "border-[#E8546F] bg-[#FFF0F3] text-[#A82442]"
                      : "border-stone-200 hover:bg-stone-50 text-stone-700"
                  )}
                >
                  <input
                    type="radio"
                    name="decline-reason"
                    checked={declineReason === reason}
                    onChange={() => setDeclineReason(reason)}
                    className="accent-[#E8546F]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineTarget(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (declineTarget) {
                  markNotAvailable(declineTarget.id, declineReason);
                  toast.info(`Updated status for ${declineTarget.client_name}`);
                  setDeclineTarget(null);
                }
              }}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              Confirm &amp; Update Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quotation Settings Modal Dialog ── */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-md bg-white text-[#2B2320]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="size-5 text-[#E8546F]" />
              <span>Quotation Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Configure default terms, tax, and proposal settings for Enquiries &amp; Quotations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Default Proposal Validity (Days)
              </label>
              <input
                type="number"
                value={defaultValidityDays}
                onChange={(e) => setDefaultValidityDays(e.target.value)}
                className="w-full h-8 px-3 rounded-lg border border-[#E7DCD6] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E8546F]"
              />
              <span className="text-[10px] text-[#8A7B76]">
                Proposals automatically expire after this period unless renewed.
              </span>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Standard VAT / Tax Rate (%)
              </label>
              <input
                type="number"
                value={defaultVatRate}
                onChange={(e) => setDefaultVatRate(e.target.value)}
                className="w-full h-8 px-3 rounded-lg border border-[#E7DCD6] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E8546F]"
              />
              <span className="text-[10px] text-[#8A7B76]">
                Applied by default to billable decorations and inventory.
              </span>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Required Booking Advance (%)
              </label>
              <input
                type="number"
                value={defaultAdvancePercent}
                onChange={(e) => setDefaultAdvancePercent(e.target.value)}
                className="w-full h-8 px-3 rounded-lg border border-[#E7DCD6] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E8546F]"
              />
              <span className="text-[10px] text-[#8A7B76]">
                Token advance required before moving client to Booked status.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowSettingsModal(false);
                toast.success("Quotation settings updated successfully");
              }}
              className="text-xs bg-gradient-to-r from-[#E8546F] to-[#D6415C] hover:from-[#D6415C] hover:to-[#C3334E] text-white font-bold"
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Dispatch Modal */}
      {dispatchClient && (
        <ProposalDispatchModal
          open={!!dispatchClient}
          onOpenChange={(open) => {
            if (!open) setDispatchClient(null);
          }}
          client={dispatchClient}
        />
      )}

      {/* Client-Facing Decoration Proposal Preview Modal */}
      <ProposalPreviewModal
        open={!!previewProposalClient}
        onOpenChange={(open) => {
          if (!open) setPreviewProposalClient(null);
        }}
        client={previewProposalClient}
      />
    </div>
  );
}

// ── Sidebar Content Component (Used for desktop & mobile) ──
function SidebarContent({
  selectedStage,
  stageCounts,
  pipelineStagesList,
  otherStagesList,
  onSelectStage,
  resetEnquiries,
}: {
  selectedStage: PipelineStageId;
  stageCounts: Record<PipelineStageId, number>;
  pipelineStagesList: PipelineStageConfig[];
  otherStagesList: PipelineStageConfig[];
  onSelectStage: (id: PipelineStageId) => void;
  resetEnquiries: () => void;
}) {
  return (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="space-y-2.5">
        {/* ── Category: PIPELINE ── */}
        <div>
          <div className="flex items-center justify-between px-2.5 py-0.5 mb-0.5">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-stone-400">
              PIPELINE
            </span>
            <span className="text-[10.5px] text-stone-400 font-normal">
              {pipelineStagesList.length} Stages
            </span>
          </div>
          <nav className="space-y-0.5">
            {pipelineStagesList.map((stage) => {
              const count = stageCounts[stage.id] ?? 0;
              const isSelected = selectedStage === stage.id;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 rounded-full text-[12.5px] transition-all cursor-pointer group",
                    isSelected
                      ? "bg-[#FFF0F3] text-[#E8546F] font-semibold"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-normal"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        isSelected
                          ? "text-[#E8546F] stroke-[1.8]"
                          : "text-stone-400 group-hover:text-stone-600 stroke-[1.4]"
                      )}
                    />
                    <span className="truncate">{stage.name}</span>
                  </div>

                  {/* Counter aligned to the right */}
                  <span
                    className={cn(
                      "ml-auto text-[11px] tabular-nums transition-colors",
                      isSelected
                        ? "text-[#E8546F] font-bold"
                        : "text-stone-400 group-hover:text-stone-600 font-normal"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Category: OTHER STAGES ── */}
        <div>
          <div className="pt-2 mt-1 border-t border-stone-100 flex items-center justify-between px-2.5 py-0.5 mb-0.5">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-stone-400">
              OTHER STAGES
            </span>
            <span className="text-[10.5px] text-stone-400 font-normal">
              {otherStagesList.length} Stages
            </span>
          </div>
          <nav className="space-y-0.5">
            {otherStagesList.map((stage) => {
              const count = stageCounts[stage.id] ?? 0;
              const isSelected = selectedStage === stage.id;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 rounded-full text-[12.5px] transition-all cursor-pointer group",
                    isSelected
                      ? "bg-[#FFF0F3] text-[#E8546F] font-semibold"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-normal"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        isSelected
                          ? "text-[#E8546F] stroke-[1.8]"
                          : "text-stone-400 group-hover:text-stone-600 stroke-[1.4]"
                      )}
                    />
                    <span className="truncate">{stage.name}</span>
                  </div>

                  {/* Counter aligned to the right */}
                  <span
                    className={cn(
                      "ml-auto text-[11px] tabular-nums transition-colors",
                      isSelected
                        ? "text-[#E8546F] font-bold"
                        : "text-stone-400 group-hover:text-stone-600 font-normal"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Reset Sample Data Button */}
      <div className="pt-2 border-t border-stone-100 mt-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Reset sample leads? Real client enquiries will remain untouched.")) {
              resetEnquiries();
              toast.success("Sample leads refreshed. Real client enquiries preserved.");
            }
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-white text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
        >
          <RotateCcw className="size-3 text-stone-400" />
          <span>Reset Sample Leads</span>
        </button>
      </div>
    </div>
  );
}

// ── Branded Source Badge component ──
function SourceBadge({ source }: { source: EnquirySource }) {
  switch (source) {
    case "Instagram":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100 border border-pink-200/80 px-2.5 py-0.5 text-[11px] font-bold text-pink-700 shadow-2xs">
          <Instagram className="size-3" />
          <span>Instagram</span>
        </span>
      );
    case "Website":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 shadow-2xs">
          <Globe className="size-3" />
          <span>Website</span>
        </span>
      );
    case "Facebook":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 shadow-2xs">
          <MessageCircle className="size-3" />
          <span>Facebook</span>
        </span>
      );
    case "Referral":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 shadow-2xs">
          <UserCheck className="size-3" />
          <span>Referral</span>
        </span>
      );
    case "Walk-in":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
          <Compass className="size-3" />
          <span>Walk-in</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
          <span>{source}</span>
        </span>
      );
  }
}

// ─────────────────────────────────────────────────────────────
// ── Quotations Made: Card Grid View ──────────────────────────
// ─────────────────────────────────────────────────────────────

function formatElapsed(isoString: string): string {
  try {
    const then = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffDays >= 1) {
      return then.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (diffHr >= 1) {
      const remainMin = diffMin % 60;
      return `${diffHr}h ${remainMin}m ago`;
    }
    if (diffMin >= 1) return `${diffMin}m ago`;
    return "Just now";
  } catch {
    return isoString;
  }
}

function formatNPR(amount: number): string {
  const str = Math.round(amount).toString();
  if (str.length <= 3) return "NPR " + str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "NPR " + grouped + "," + last3;
}

function extractMonthChip(dateStr: string): string {
  if (!dateStr) return "UPCOMING";
  const parts = dateStr.split(/[\s,·\(\)\-]+/);
  const monthNames = [
    "baishakh", "jestha", "ashadh", "shrawan", "bhadra", "ashwin",
    "kartik", "mangsir", "poush", "magh", "falgun", "chaitra",
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const month = parts.find((p) => monthNames.includes(p.toLowerCase()));
  const year = parts.find((p) => /^\d{4}$/.test(p) && parseInt(p) > 2000);
  if (month && year) return `${month.toUpperCase()} ${year}`;
  if (month) return month.toUpperCase();
  return parts.slice(0, 2).join(" ").toUpperCase() || "UPCOMING";
}

function getRecordAsBookedClient(record: UnifiedRecord): BookedClient {
  if (record.type === "client") return record.data;
  const enq = record.data;
  return {
    id: enq.id,
    client_name: enq.client_name,
    event_type: enq.ceremony_type,
    event_date: `${enq.date_bs}${enq.date_ad ? ` (${enq.date_ad})` : ""}`,
    venue: enq.venue,
    stage: "confirmed",
    payment_status: "balance_due",
    payment_note: "Quotation created from incoming enquiry",
    total_amount: enq.estimated_budget_npr || 85000,
    paid_amount: 0,
    balance_due: enq.estimated_budget_npr || 85000,
    days_to_event: 30,
    needs_attention: false,
    phone: enq.phone,
    handler: enq.assigned_handler || "Pooja Thapa",
    events_count: 1,
    quotation_status: "Draft",
    proposal_id: `prop-${enq.id.replace("enq-", "")}`,
    ceremonies: ceremoniesFromEnquiry(enq) ?? [
      {
        id: "c-1",
        name: enq.ceremony_type,
        date: `${enq.date_bs}${enq.date_ad ? ` · ${enq.date_ad}` : ""}`,
        venue: enq.venue,
        setupPrice: enq.estimated_budget_npr || 85000,
      },
    ],
    notes: enq.private_note,
  };
}

// Skeleton card placeholder
function QuotationCardSkeleton() {
  return (
    <div className="rounded-[20px] border border-[#E7DCD6] bg-white shadow-soft p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-stone-200 rounded w-3/5" />
          <div className="h-2.5 bg-stone-100 rounded w-2/5" />
        </div>
        <div className="size-7 rounded-full bg-stone-100" />
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="h-2.5 bg-stone-100 rounded w-4/5" />
        <div className="h-2.5 bg-stone-100 rounded w-3/5" />
      </div>
      <div className="rounded-xl bg-[#FAF6F4] p-3 mb-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-2.5 bg-stone-200 rounded w-1/4" />
          <div className="h-3 bg-stone-200 rounded-full w-1/3" />
        </div>
        <div className="h-3.5 bg-stone-200 rounded w-3/4" />
        <div className="h-2.5 bg-stone-100 rounded w-1/2" />
      </div>
      <div className="rounded-xl bg-stone-50 p-2.5 mb-3 space-y-2">
        <div className="h-2.5 bg-stone-200 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-stone-200 rounded-full flex-1" />
          <div className="h-6 bg-stone-200 rounded-full flex-1" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-2">
        <div className="h-8 bg-stone-100 rounded-xl flex-1" />
        <div className="h-8 bg-stone-100 rounded-xl flex-1" />
      </div>
      <div className="h-8 bg-[#F5F2EF] rounded-xl mt-3" />
    </div>
  );
}

// ── Individual Quotation Card ──
function QuotationsMadeCard({
  record,
  onOpenQuotation,
  onViewProposal,
  onDispatchProposal,
  onDeleteQuotation,
}: {
  record: UnifiedRecord;
  onOpenQuotation: (clientId: string) => void;
  onViewProposal: (client: BookedClient) => void;
  onDispatchProposal?: ((client: BookedClient) => void) | undefined;
  onDeleteQuotation?: ((record: UnifiedRecord, clientObject: BookedClient, quotationNumber: string, grandTotal: number) => void) | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);


  const isEnquiry = record.type === "enquiry";
  const enquiry = isEnquiry ? (record.data as EnquiryItem) : null;
  const client = !isEnquiry ? (record.data as BookedClient) : null;

  const clientObject = useMemo(() => getRecordAsBookedClient(record), [record]);

  // Derived display values
  const clientName = enquiry?.client_name ?? client?.client_name ?? "";
  const phone = enquiry?.phone ?? client?.phone ?? "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const cleanWa = (enquiry?.whatsapp_number ?? phone).replace(/[^0-9]/g, "");
  const clientInitial = clientName.trim().charAt(0).toUpperCase() || "C";
  const source: EnquirySource | undefined = enquiry?.source;
  const handler = enquiry?.assigned_handler ?? client?.handler;

  // Proposal ID and Quotation Number
  const proposalId = client?.proposal_id || (enquiry ? `prop-${enquiry.id.replace("enq-", "")}` : `prop-${clientObject.id}`);
  const quotationNumber = client?.proposal_id
    ? client.proposal_id.replace("prop-", "Q-").toUpperCase().slice(0, 10)
    : `Q-${(enquiry?.id ?? "").replace("enq-", "").slice(0, 6).toUpperCase()}`;

  // Timestamps
  const enquiredAt = enquiry?.created_at ?? "";
  const enquiredDisplay = enquiredAt ? `Enquired ${formatElapsed(enquiredAt)}` : "Enquired recently";

  const quotationCreatedAt = enquiry?.responded_at ?? "";
  const quotationDisplay = quotationCreatedAt
    ? `Quotation ${formatElapsed(quotationCreatedAt)}`
    : client?.quotation_status
    ? `Quotation: ${client.quotation_status}`
    : "Quotation created";

  // Ceremonies
  const rawCeremonies = client?.ceremonies ?? [];
  const ceremonies: ClientCeremonyItem[] = rawCeremonies.length > 0
    ? rawCeremonies
    : [
        {
          id: "c-1",
          name: enquiry?.ceremony_type || client?.event_type || "Wedding Ceremony",
          date: enquiry?.date_bs ? `${enquiry.date_bs}${enquiry.date_ad ? ` · ${enquiry.date_ad}` : ""}` : client?.event_date || "Date on record",
          venue: enquiry?.venue || client?.venue || "Venue on record",
          setupPrice: enquiry?.estimated_budget_npr || client?.total_amount || 0,
        },
      ];

  const visibleCeremonies = isExpanded ? ceremonies : ceremonies.slice(0, 3);
  const hiddenCount = ceremonies.length - 3;

  // Month chip and package label
  const firstCeremonyDate = ceremonies[0]?.date ?? enquiry?.date_bs ?? client?.event_date ?? "";
  const monthChip = extractMonthChip(firstCeremonyDate);
  const packageLabel = enquiry?.package_tier || `${ceremonies.length} ${ceremonies.length > 1 ? "DAYS" : "DAY"} DÉCOR PACKAGE`;

  // Activity tracking hook
  const { activity, updateActivity } = useProposalActivity(proposalId);

  // Grand Total & Pending calculations
  const grandTotal = computeProposalGrandTotal(ceremonies, client?.total_amount || enquiry?.estimated_budget_npr);
  const hasAmount = grandTotal > 0;
  const advanceAmount = Math.round(grandTotal * 0.4);
  const pendingCount = countPendingPriceItems(ceremonies);

  // Interactive shareable proposal link
  const origin = typeof window !== "undefined" ? window.location.origin : "https://decorportal.com";
  const proposalUrl = `${origin}/proposal/${proposalId}`;

  // WhatsApp proposal text
  const ceremonyLines = ceremonies
    .map((c) => {
      const priceText = c.setupPrice ? ` — NPR ${Number(c.setupPrice).toLocaleString()}` : " (Price TBC)";
      return `• *${c.name.toUpperCase()}* (${c.date})\n  📍 ${c.venue}${priceText}`;
    })
    .join("\n\n");

  const fullWaMessage = `🌸 *NAMASTE ${clientName.toUpperCase()}!* 🌸\nWarm greetings from our Decoration Studio.\n\nWe have prepared your personalized multi-day decoration quotation:\n\n━━━━━━━━━━━━━━━━━━━━━━\n💍 *EVENT SCHEDULE:*\n━━━━━━━━━━━━━━━━━━━━━━\n${ceremonyLines}\n\n━━━━━━━━━━━━━━━━━━━━━━\n💎 *GRAND TOTAL:* NPR ${grandTotal.toLocaleString()}\n💳 *40% ADVANCE:* NPR ${advanceAmount.toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━━━\n\n🔗 *VIEW YOUR LIVE INTERACTIVE PROPOSAL:*\n${proposalUrl}\n\nFeel free to review your options and let us know your thoughts!`;

  const waEncoded = encodeURIComponent(fullWaMessage);

  // Send to client handler
  const handleSendToClient = () => {
    if (pendingCount > 0) {
      toast.warning(`Note: ${pendingCount} item has pending price in this quotation. Opening WhatsApp with current details.`);
    } else {
      toast.success(`Opening WhatsApp for ${clientName}`);
    }
    const targetUrl = cleanWa
      ? `https://wa.me/${cleanWa}?text=${waEncoded}`
      : `https://wa.me/?text=${waEncoded}`;
    window.open(targetUrl, "_blank");
  };

  // Copy WhatsApp message handler
  const handleCopyWaText = () => {
    navigator.clipboard?.writeText?.(fullWaMessage);
    toast.success(`Copied proposal WhatsApp message for ${clientName}!`);
  };

  // Stage / quotation status chips
  const stageChip = client?.stage ? client.stage.replace(/_/g, " ") : null;
  const quotationStatusChip = client?.quotation_status ?? null;

  return (
    <article className="h-full rounded-[20px] border border-[#E7DCD6] bg-white shadow-soft hover:border-[#FDC2CD] hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* ── Card Body ── */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* 1. Header row: Avatar + Name + Quotation# + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            {/* Round avatar: pink gradient circle with initial */}
            <div className="size-10 rounded-full bg-gradient-to-br from-[#FFF0F3] to-[#FFD6DF] text-[#E8546F] font-bold text-sm flex items-center justify-center shrink-0 border border-[#FDC2CD] shadow-2xs">
              {clientInitial}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-bold text-[#2B2320] leading-snug truncate" title={clientName}>
                {clientName}
              </h3>
              <span className="text-[10.5px] font-mono text-stone-400 tracking-wider">
                {quotationNumber}
              </span>
            </div>
          </div>

          {/* Radix "..." menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-7 rounded-full border border-stone-200 hover:border-stone-300 hover:bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-700 transition shrink-0 cursor-pointer shadow-2xs"
                title="More actions"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-lg border-[#E7DCD6]">
              <DropdownMenuItem
                onClick={() => onViewProposal(clientObject)}
                className="text-xs font-semibold cursor-pointer text-stone-800 py-2"
              >
                <ExternalLink className="size-3.5 mr-2 text-[#E8546F]" />
                <span>View Decoration Proposal</span>
              </DropdownMenuItem>
              {onDispatchProposal && (
                <DropdownMenuItem
                  onClick={() => onDispatchProposal(clientObject)}
                  className="text-xs font-semibold cursor-pointer text-stone-800 py-2"
                >
                  <MessageCircle className="size-3.5 mr-2 text-[#128C7E]" />
                  <span>Dispatch via WhatsApp</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onOpenQuotation(client?.id ?? enquiry?.id ?? "")}
                className="text-xs font-semibold cursor-pointer text-stone-700 py-2"
              >
                <FileEdit className="size-3.5 mr-2 text-stone-500" />
                <span>Open Quotation Studio</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard?.writeText?.(proposalUrl);
                  toast.success("Live proposal link copied!");
                }}
                className="text-xs cursor-pointer text-stone-600 py-2"
              >
                <Globe className="size-3.5 mr-2 text-stone-400" />
                <span>Copy Live Proposal Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard?.writeText?.(`${clientName} · ${phone}`);
                  toast.success(`Copied ${clientName}'s contact details`);
                }}
                className="text-xs cursor-pointer text-stone-600 py-2"
              >
                <Phone className="size-3.5 mr-2 text-stone-400" />
                <span>Copy Client Contact</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCopyWaText}
                className="text-xs cursor-pointer text-stone-600 py-2"
              >
                <Share2 className="size-3.5 mr-2 text-stone-400" />
                <span>Copy WhatsApp Text</span>
              </DropdownMenuItem>
              {/* ── Delete quotation — admin/manager only ── */}
              {onDeleteQuotation && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteQuotation(record, clientObject, quotationNumber, grandTotal)}
                    className="text-xs font-semibold cursor-pointer text-[#C2284E] py-2 focus:text-[#C2284E] focus:bg-rose-50"
                  >
                    <Trash2 className="size-3.5 mr-2 text-[#C2284E]" />
                    <span>Delete quotation</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

        {/* 2. Meta lines: enquiry time + quotation time */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <Clock className="size-3 shrink-0" />
            <span>{enquiredDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#E8546F]">
            <FileEdit className="size-3 shrink-0 text-[#E8546F]" />
            <span>{quotationDisplay}</span>
          </div>
        </div>

        {/* 3. Event block, mirroring the proposal's schedule */}
        <div className="rounded-2xl bg-[#FAF6F4] border border-[#EDE5DF] p-3.5 space-y-2.5">
          {/* Header row inside event block: Month + Package Label */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A7B76]">
              {monthChip}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#FFF0F3] text-[#D6415C] border border-[#FDC2CD] shadow-2xs">
              {packageLabel}
            </span>
          </div>

          {/* Ceremony rows */}
          <div className="space-y-2 pt-0.5">
            {visibleCeremonies.map((c, i) => (
              <div key={c.id ?? i} className="space-y-0.5 border-b border-[#F0E8E3] last:border-b-0 pb-1.5 last:pb-0">
                <div className="flex items-start gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#E8546F] shrink-0 mt-1.5" />
                  <span className="text-[12px] font-bold text-[#2B2320] uppercase tracking-wide">
                    {c.name}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 pl-3">
                  {c.date}
                </div>
                {c.venue && (
                  <div className="text-[10px] text-stone-400 uppercase tracking-wide pl-3 truncate">
                    {c.venue}
                  </div>
                )}
                {c.setupName && (
                  <div className="text-[10.5px] text-stone-500 pl-3 flex items-center justify-between gap-1">
                    <span className="truncate italic">✨ {c.setupName}</span>
                    {c.setupPrice ? (
                      <span className="shrink-0 font-medium text-stone-600">
                        {formatNPR(c.setupPrice)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-amber-600 font-semibold text-[10px]">
                        Pending price
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Expand/Collapse toggle for > 3 days */}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-center py-1 mt-1 text-[11px] font-bold text-[#D6415C] hover:text-[#C2284E] flex items-center justify-center gap-1 hover:underline cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  <span>+ {hiddenCount} more {hiddenCount === 1 ? "day" : "days"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Staff-only: Full price breakdown accordion */}
        {ceremonies.some((c) => c.setupName && (c.setupPrice ?? 0) > 0) && (
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-bold transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="size-3 text-stone-400" />
                Full price breakdown
              </span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${isBreakdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isBreakdownOpen && (
              <div className="px-3 py-2.5 space-y-3 bg-white border-t border-stone-100">
                {ceremonies.map((c, idx) => {
                  if (!c.setupName) return null;
                  const itemBd = getDecorItemBreakdown({
                    n: c.setupName,
                    s: c.category ? `${c.category} arrangement` : "Ceremonial setup",
                    p: Number(c.setupPrice) || 0,
                    pending: !c.setupPrice,
                    setupId: c.setupId,
                    category: c.category,
                  });
                  return (
                    <div key={c.id ?? idx} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2B2320]">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">{c.date}</span>
                      </div>
                      <div className="rounded-lg bg-[#FAF6F3] border border-[#EDE5DF] p-2.5 space-y-2 text-[11px]">
                        {/* Item name + subtitle */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-semibold text-[#2B2320]">{itemBd.itemName}</div>
                            <div className="text-stone-400 text-[10.5px] leading-snug mt-0.5">{itemBd.subtitle}</div>
                          </div>
                          <div className="shrink-0 font-bold text-[#2B2320] text-[12px]">
                            {itemBd.itemTotal > 0 ? `NPR ${formatNepaliNumber(itemBd.itemTotal)}` : "Pending"}
                          </div>
                        </div>
                        {/* Priced Components */}
                        {itemBd.pricedComponents.length > 0 && (
                          <div className="pt-1.5 border-t border-[#EDE5DF] space-y-1">
                            <div className="text-[9.5px] font-bold uppercase tracking-widest text-stone-400 mb-1">Components</div>
                            {itemBd.pricedComponents.map((comp) => (
                              <div key={comp.id} className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-stone-700">{comp.name}</span>
                                  <span className="text-stone-400 ml-1 text-[10px]">{comp.specs}</span>
                                </div>
                                <span className={`shrink-0 font-semibold ${comp.status === "included" ? "text-[#9a7a1a]" : comp.status === "tbc" ? "text-amber-600" : "text-stone-700"}`}>
                                  {comp.displayPrice}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Base design */}
                        {itemBd.baseDesign.visible && (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-[#EDE5DF]">
                            <span className="text-stone-500">{itemBd.baseDesign.label}</span>
                            <span className="font-semibold text-stone-700">NPR {formatNepaliNumber(itemBd.baseDesign.price)}</span>
                          </div>
                        )}
                        {/* Total */}
                        {itemBd.itemTotal > 0 && (
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EDE5DF]">
                            <span className="font-bold text-[#2B2320]">{itemBd.totalRow.label}</span>
                            <span className="font-bold text-[#2B2320]">NPR {formatNepaliNumber(itemBd.totalRow.price)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Tag row: Handler + Source + Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {handler && (
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-stone-600 shadow-2xs">
              <UserCheck className="size-2.5 text-stone-400" />
              <span>Handler · {handler}</span>
            </span>
          )}
          {source && (
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-stone-600 shadow-2xs">
              <Globe className="size-2.5 text-stone-400" />
              <span>Source · {source.toUpperCase()}</span>
            </span>
          )}
          {stageChip && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FDC2CD] bg-[#FFF0F3] px-2 py-0.5 text-[10.5px] font-bold text-[#C2284E] shadow-2xs capitalize">
              {stageChip}
            </span>
          )}
          {quotationStatusChip && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10.5px] font-bold text-purple-700 shadow-2xs">
              {quotationStatusChip}
            </span>
          )}
        </div>

        {/* 5. Client activity row: view tracking, read-only decision chip, and add-ons */}
        <div className="rounded-xl bg-[#F8F5F2] border border-[#EDE6E1] px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-medium text-stone-600">
          {/* Tracking line: Views */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Eye className="size-3 text-stone-400 shrink-0" />
            <span className="truncate">
              {activity.viewCount > 0
                ? `${activity.viewCount === 1 ? "Opened 1x" : `Opened ${activity.viewCount}x`}${
                    activity.lastViewedAt ? ` · ${formatElapsed(activity.lastViewedAt)}` : ""
                  }`
                : "Not opened yet"}
            </span>
          </div>

          {/* Right side: Decision chip (if marked) + Add-ons count */}
          <div className="flex items-center gap-2 shrink-0">
            {activity.interest === "interested" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs">
                <ThumbsUp className="size-2.5 text-emerald-600" />
                <span>Interested</span>
              </span>
            )}
            {activity.interest === "not_for_us" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 shadow-2xs">
                <ThumbsDown className="size-2.5 text-stone-500" />
                <span>Not for us</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-[#E8546F] shrink-0" />
              <span>
                {activity.addonsSelectedCount > 0
                  ? `${activity.addonsSelectedCount} add-on${activity.addonsSelectedCount > 1 ? "s" : ""} picked`
                  : "0 add-ons"}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Action row 1: Call */}
        <div className="grid grid-cols-1 gap-2">
          <a
            href={`tel:${cleanPhone}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E7DCD6] bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-700 py-1.5 text-[11px] font-semibold transition shadow-2xs"
          >
            <Phone className="size-3 text-stone-500" />
            <span>Call</span>
          </a>
        </div>

        {/* 7. Action row 2: View quotation + Send to client */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onViewProposal(clientObject)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E7DCD6] bg-white hover:bg-[#FFF0F3] hover:border-[#FDC2CD] hover:text-[#D6415C] text-stone-700 py-2 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
          >
            <ExternalLink className="size-3" />
            <span>View quotation</span>
          </button>
          <button
            type="button"
            onClick={handleSendToClient}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#0e7060] text-white py-2 text-[11px] font-bold transition shadow-xs cursor-pointer"
          >
            <MessageCircle className="size-3 fill-current" />
            <span>Send to client</span>
          </button>
        </div>

        {/* 8. Action row 3: Copy WhatsApp text */}
        <div>
          <button
            type="button"
            onClick={handleCopyWaText}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-500 hover:text-stone-800 px-3 py-1 text-[10.5px] font-medium transition cursor-pointer shadow-2xs"
          >
            <Share2 className="size-2.5" />
            <span>Copy WhatsApp text</span>
          </button>
        </div>
      </div>

      {/* ── Footer: Amount & Payment Schedule or Add Package CTA ── */}
      {hasAmount ? (
        <div className="px-4 py-3 bg-[#FAF6F4] border-t border-[#EDE5DF] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-400">
              QUOTATION
            </span>
            <span className="font-display text-sm font-bold text-[#2B2320]">
              {formatNPR(grandTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10.5px] text-stone-500 font-medium">
            <span>40% advance: {formatNPR(advanceAmount)}</span>
            <span className="text-stone-400">· 60% on event day</span>
          </div>

          {pendingCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
              <span>{pendingCount} {pendingCount === 1 ? "item" : "items"} pending price</span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenQuotation(client?.id ?? enquiry?.id ?? "")}
          className="w-full py-3 bg-gradient-to-r from-[#E8546F] to-[#D6415C] hover:from-[#D6415C] hover:to-[#C3334E] text-white text-[11px] font-bold tracking-wide transition cursor-pointer"
        >
          + ADD PACKAGE AMOUNT
        </button>
      )}
    </article>
  );
}

// ── Quotations Made Grid wrapper ──
function QuotationsMadeGrid({
  records,
  isLoaded,
  onOpenQuotation,
  onViewProposal,
  onDispatchProposal,
  onDeleteQuotation,
  onViewNewEnquiries,
  newEnquiriesCount,
}: {
  records: UnifiedRecord[];
  isLoaded: boolean;
  onOpenQuotation: (clientId: string) => void;
  onViewProposal: (client: BookedClient) => void;
  onDispatchProposal?: ((client: BookedClient) => void) | undefined;
  onDeleteQuotation?: ((record: UnifiedRecord, clientObject: BookedClient, quotationNumber: string, grandTotal: number) => void) | undefined;
  onViewNewEnquiries: () => void;
  newEnquiriesCount: number;
}) {
  // Skeleton loading state
  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-4 gap-5 items-start">
        {Array.from({ length: 8 }).map((_, i) => (
          <QuotationCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E7DCD6] bg-white p-12 sm:p-16 text-center shadow-soft max-w-xl mx-auto my-6">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FFF0F3] border border-[#FDC2CD] text-[#D6415C] mb-4 shadow-2xs">
          <FileEdit className="size-8 stroke-[1.5]" />
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2B2320]">
          No quotations made yet
        </h3>
        <p className="text-xs sm:text-sm text-[#7A6B66] mt-2 max-w-md mx-auto leading-relaxed">
          Quotations you create from new enquiries will appear here as cards.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onViewNewEnquiries}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCD6] bg-white px-4 py-2 text-xs font-semibold text-[#5B4C47] hover:bg-[#FFF0F3] hover:text-[#D6415C] hover:border-[#FDC2CD] transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="size-3.5" />
            <span>View New Enquiries ({newEnquiriesCount})</span>
          </button>
          <Link
            to="/quotations/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E8546F] to-[#D6415C] px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-[#D6415C] hover:to-[#C3334E] transition-all"
          >
            <Plus className="size-3.5" />
            <span>+ Create Quotation</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-4 gap-5 items-stretch">
      {records.map((record) => (
        <QuotationsMadeCard
          key={record.type === "enquiry" ? record.data.id : record.data.id}
          record={record}
          onOpenQuotation={onOpenQuotation}
          onViewProposal={onViewProposal}
          onDispatchProposal={onDispatchProposal}
          onDeleteQuotation={onDeleteQuotation}
        />
      ))}
    </div>
  );
}


