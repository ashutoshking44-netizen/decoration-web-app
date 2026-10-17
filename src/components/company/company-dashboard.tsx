import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Boxes,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CornerDownLeft,
  ExternalLink,
  FileText,
  House,
  LogOut,
  Lightbulb,
  Menu,
  MessageCircle,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  dashboardFixture,
  useCompanyDashboard,
  type CalendarDay,
  type ClientResult,
  type DashboardData,
  type Permission,
  type UpcomingFunction,
} from "@/lib/company-dashboard";
import { logoutCompany, useCompanyProfile } from "@/lib/company-profile";
import { ShareEnquiryFormButton } from "./share-enquiry-form-button";
import { useDecorationSetupsStore } from "@/lib/decoration-setups";
import { formatCurrency, useBookedClientsStore } from "@/lib/clients";

const navGroups: {
  label: string;
  items: {
    label: string;
    subtitle?: string;
    icon: ComponentType<{ className?: string }>;
    to?: string;
  }[];
}[] = [
  {
    label: "Overview",
    items: [
      { label: "Home", icon: House, to: "/company" },
      {
        label: "Decorations",
        subtitle: "Designs & Setups Catalog",
        icon: Sparkles,
        to: "/inventory",
      },
      {
        label: "Event Management",
        subtitle: "Monthly Operations View",
        icon: CalendarDays,
        to: "/booked-clients",
      },
    ],
  },
  {
    label: "Clients",
    items: [
      {
        label: "New Enquiries",
        subtitle: "Triage & Availability Check",
        icon: FileText,
        to: "/enquiries",
      },
      { label: "All Clients", icon: Users, to: "/booked-clients" },
    ],
  },
  {
    label: "Workspace",
    items: [{ label: "Settings", icon: Settings, to: "/settings" }],
  },
];

const actionItems: {
  label: string;
  permission: Permission;
  icon: ComponentType<{ className?: string }>;
}[] = [{ label: "Notifications", permission: "notifications", icon: Bell }];

export function CompanyDashboard() {
  const { data: baseData, loading } = useCompanyDashboard();
  const { profile } = useCompanyProfile();
  const greetingName = useMemo(() => {
    const first = (profile?.ownerName || profile?.name || "").trim().split(/\s+/)[0];
    return first || "there";
  }, [profile?.ownerName, profile?.name]);
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);
  const todayLabel = useMemo(() => {
    const today = new Date();
    return `${weekdayNames[today.getDay()]}, ${today.getDate()} ${adMonths[today.getMonth()]} ${today.getFullYear()}`;
  }, []);
  const data = useMemo<DashboardData>(() => {
    if (!profile?.name) return baseData;
    const initials = profile.name
      .trim()
      .split(/\s+/)
      .map((word: string) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return {
      ...baseData,
      company: {
        ...baseData.company,
        name: profile.name,
        initials,
        profileComplete: Boolean(profile.phone && profile.email && profile.city),
      },
    };
  }, [baseData, profile]);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const { addSetup: addDecorationSetup } = useDecorationSetupsStore();

  useEffect(() => {
    let lastSpace = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const now = Date.now();
      if (now - lastSpace < 450) {
        event.preventDefault();
        setSearchOpen(true);
        lastSpace = 0;
      } else lastSpace = now;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <Sidebar
        data={data}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={cn(
          "min-h-screen transition-[margin] duration-300",
          collapsed ? "md:ml-16" : "md:ml-60",
        )}
      >
        <MobileHeader onOpen={() => setMobileOpen(true)} company={data.company.name} />
        <ActionBar
          permissions={data.permissions}
          onCreateQuotation={() =>
            navigate({ to: "/quotations/new", search: { from: "/company" } })
          }
        />
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Company overview
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold leading-none sm:text-[2.15rem]">
                {timeGreeting}, {greetingName}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Here’s what needs your attention today.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <div className="flex items-center gap-2">
                <ShareEnquiryFormButton />
                <Button
                  onClick={() => navigate({ to: "/add-decoration", search: { from: "/company" } })}
                  className="h-10 gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-rose hover:bg-primary/90 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Sparkles className="size-4" />
                  <span>Add Decoration</span>
                </Button>
              </div>
              <p className="hidden text-xs font-medium text-muted-foreground sm:block">
                {todayLabel}
              </p>
            </div>
          </header>

          {!data.company.profileComplete && noticeVisible && (
            <div className="mb-8 flex min-h-12 items-center justify-between gap-4 rounded-lg border border-primary/20 bg-rose-faint px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <Lightbulb className="size-4 shrink-0 text-primary" />
                <span>
                  <strong>Complete your company details</strong>
                  <span className="hidden text-muted-foreground sm:inline">
                    {" "}
                    — add contact information to keep client documents ready.
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => setNoticeVisible(false)}
                aria-label="Dismiss company details notice"
              >
                <X />
              </Button>
            </div>
          )}

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <DashboardContent
              data={data}
              onSearch={() => setSearchOpen(true)}
              onAddDecoration={() =>
                navigate({ to: "/add-decoration", search: { from: "/company" } })
              }
            />
          )}
        </div>
      </main>
      <SearchOverlay
        open={searchOpen}
        onOpenChange={setSearchOpen}
        clients={data.clients}
        upcoming={data.upcoming}
      />
    </div>
  );
}

function MobileHeader({ onOpen, company }: { onOpen: () => void; company: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b bg-surface px-4 md:hidden">
      <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Open navigation">
        <Menu />
      </Button>
      <span className="font-display text-xl font-semibold">{company}</span>
      <div className="size-9" />
    </div>
  );
}

function Sidebar({
  data,
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
}: {
  data: DashboardData;
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Button
            variant="ghost"
            className={cn(
              "h-14 shrink-0 justify-start rounded-none border-b border-sidebar-border px-4 text-xs text-muted-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <ArrowLeft className="size-4" />
            {!collapsed && <span>Back to Main App</span>}
          </Button>
          <div
            className={cn(
              "flex h-20 shrink-0 items-center gap-3 border-b border-sidebar-border px-4",
              collapsed && "justify-center px-0",
            )}
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground shadow-rose">
              {data.company.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate font-display text-xl font-semibold leading-tight">
                  {data.company.name}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {data.company.caption}
                </div>
              </div>
            )}
          </div>
          <nav
            className="scrollbar-thin flex-1 overflow-y-auto py-4"
            aria-label="Company navigation"
          >
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <p
                  className={cn(
                    "mb-1 px-5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground",
                    collapsed && "sr-only",
                  )}
                >
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <Button
                    key={item.label}
                    variant="ghost"
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      if (item.label === "Event Management") {
                        navigate({ to: "/booked-clients", search: { view: "calendar" } });
                      } else if (item.to) {
                        navigate({ to: item.to });
                      }
                    }}
                    className={cn(
                      "relative h-auto min-h-11 w-full justify-start rounded-none px-3 py-1.5 text-left text-[13px] font-medium hover:bg-sidebar-accent cursor-pointer",
                      item.label === "Home" &&
                        "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-[10px] border border-sidebar-border bg-background",
                        item.label === "Home" &&
                          "border-primary bg-primary text-primary-foreground shadow-rose",
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    {!collapsed && (
                      <span className="min-w-0">
                        <span className="block truncate">{item.label}</span>
                        {item.subtitle && (
                          <span className="block truncate text-[9px] font-normal text-muted-foreground">
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            ))}
          </nav>
          <div
            className={cn("border-t border-sidebar-border p-4", collapsed && "px-1 text-center")}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs md:hidden"
              onClick={onMobileClose}
            >
              <X className="size-3.5" />
              <span>Close menu</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "mb-2 w-full gap-2 text-xs text-destructive hover:text-destructive",
                collapsed && "size-9 p-0",
              )}
              onClick={() => {
                logoutCompany();
                navigate({ to: "/companies" });
              }}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-3.5" />
              {!collapsed && <span>Log out</span>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("hidden w-full gap-2 text-xs md:flex", collapsed && "size-9 p-0")}
              onClick={onCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ArrowLeft
                className={cn("size-3.5 transition-transform", collapsed && "rotate-180")}
              />
              {!collapsed && <span>Collapse sidebar</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function ActionBar({
  permissions,
  onCreateQuotation,
}: {
  permissions: Permission[];
  onCreateQuotation: () => void;
}) {
  const visible = actionItems.filter((item) => permissions.includes(item.permission));
  return (
    <div className="sticky top-0 z-30 border-b bg-surface/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-end gap-2 px-4 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateQuotation}
          className="shrink-0 gap-1.5 border-primary/30 bg-rose-faint text-[11px] font-semibold text-primary hover:bg-rose-light hover:text-primary cursor-pointer"
        >
          <FileText className="size-3.5" />
          <span>Create Quotation</span>
        </Button>
        {visible.map((item) => (
          <Button
            key={item.label}
            variant="default"
            size="sm"
            className="relative shrink-0 text-[11px] shadow-rose cursor-pointer"
          >
            <item.icon />
            {item.label}
            {item.permission === "notifications" && (
              <span className="absolute right-0 top-0 grid size-4 -translate-y-1/3 translate-x-1/3 place-items-center rounded-full bg-destructive text-[9px] text-destructive-foreground">
                4
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DashboardContent({
  data,
  onSearch,
  onAddDecoration,
}: {
  data: DashboardData;
  onSearch: () => void;
  onAddDecoration?: () => void;
}) {
  return (
    <div className="space-y-8">
      <ModuleCards data={data} onAddDecoration={onAddDecoration} />
      {!data.isOwner && data.additionalSections.length > 0 && (
        <AdditionalSections sections={data.additionalSections} />
      )}
      <SearchBar clients={data.clients} upcoming={data.upcoming} onOpenOverlay={onSearch} />
      <DashboardDecorationsCatalog onAddDecoration={onAddDecoration} />
      <UpcomingFunctions items={data.upcoming} />
    </div>
  );
}

function DashboardDecorationsCatalog({
  onAddDecoration,
}: {
  onAddDecoration?: (() => void) | undefined;
}) {
  const navigate = useNavigate();
  const { setups } = useDecorationSetupsStore();

  const recentSetups = useMemo(() => {
    return setups.slice(0, 4);
  }, [setups]);

  return (
    <section className="space-y-4" aria-label="Decorations Catalog">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Decoration Designs
            </p>
            <span className="rounded-full bg-rose-faint border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
              {setups.length} Catalog Designs
            </span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-none sm:text-[1.75rem]">
            Live Catalog & Event Setups
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Browse and configure decoration designs, floral themes, and client packages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAddDecoration && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddDecoration}
              className="h-8 gap-1.5 rounded-xl border-border text-xs font-semibold hover:bg-rose-faint hover:text-primary cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Setup</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/inventory" })}
            className="h-8 gap-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-rose-faint cursor-pointer"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recentSetups.map((setup, index) => {
          const isRecentlyAdded = index === 0;
          return (
            <div
              key={setup.id}
              onClick={() => navigate({ to: "/inventory" })}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-soft transition-all duration-200 cursor-pointer"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={
                    setup.imageUrl ||
                    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop&q=80"
                  }
                  alt={setup.name}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="rounded-full bg-primary/95 text-primary-foreground px-2 py-0.5 text-[10px] font-bold shadow-xs">
                    {setup.category}
                  </span>
                  {isRecentlyAdded && (
                    <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold shadow-xs">
                      Recently Added
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px]">
                  <span className="font-mono bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-white/90">
                    {setup.sku}
                  </span>
                  {setup.applicable_events?.[0] && (
                    <span className="bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-white/90 truncate max-w-[120px]">
                      {setup.applicable_events[0]}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-3">
                <h3 className="font-display text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-1">
                  {setup.name}
                </h3>
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="text-[11px] text-muted-foreground">Estimated Setup</span>
                  <span className="font-semibold text-primary">
                    {setup.total_price ? formatCurrency(setup.total_price) : "Quote"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleCards({
  data,
}: {
  data: DashboardData;
  onAddDecoration?: (() => void) | undefined;
}) {
  const { clients } = useBookedClientsStore();
  const { upcomingCount, pendingAmount } = useMemo(() => {
    const live = clients.filter((c) => !c.deleted_at);
    return {
      upcomingCount: live.filter(
        (c) => typeof c.days_to_event === "number" && c.days_to_event >= 0 && c.days_to_event <= 7,
      ).length,
      pendingAmount: live.reduce((sum, c) => sum + (Number(c.balance_due) || 0), 0),
    };
  }, [clients]);
  return (
    <section
      aria-label="Dashboard summaries"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ModuleCard
        icon={FileText}
        title="Enquiries and Quotation"
        description="Manage new enquiries and quotations"
        breakdownHref="/enquiries"
      >
        <div className="grid grid-cols-3 divide-x divide-border py-2 text-center">
          {Object.entries(data.enquiries).map(([label, value]) => (
            <div key={label}>
              <strong className="block text-2xl font-bold tabular-nums">{value}</strong>
              <span className="text-[9px] capitalize text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </ModuleCard>
      <ModuleCard
        icon={Users}
        title="All Clients"
        description={`${data.bookings.count} confirmed bookings`}
        breakdownHref="/booked-clients"
      >
        <div className="flex min-h-[58px] flex-col justify-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0 text-primary" />
              Next 7 days
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {upcomingCount} {upcomingCount === 1 ? "Event" : "Events"}
            </span>
          </div>
          <div className="h-px bg-border/40" />
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <CircleDollarSign className="size-3.5 shrink-0 text-muted-foreground" />
              Pending deposit
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(pendingAmount)}
            </span>
          </div>
        </div>
      </ModuleCard>
      <CalendarWidget days={data.calendar} />
    </section>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  children,
  breakdownHref,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  breakdownHref?: string;
}) {
  return (
    <article className="flex min-h-[318px] flex-col rounded-2xl border bg-card p-4 shadow-soft">
      <div className="grid size-10 place-items-center rounded-[10px] bg-rose-light text-primary">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold leading-tight">{title}</h2>
      <p className="mt-1 min-h-8 text-[11px] leading-4 text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
      {breakdownHref ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mt-auto w-full justify-between px-1 text-xs text-primary"
        >
          <Link to={breakdownHref}>
            Full breakdown <ExternalLink className="size-3" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-auto w-full justify-between px-1 text-xs text-primary"
        >
          Full breakdown <ExternalLink className="size-3" />
        </Button>
      )}
    </article>
  );
}

const bsMonths = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const adMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function CalendarWidget({ days }: { days: CalendarDay[] }) {
  const [system, setSystem] = useState<"BS" | "AD">("BS");
  const [monthOffset, setMonthOffset] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const checkWidth = () => {
      // General rule: card width under ~320px triggers compact responsive mode
      setIsNarrow(el.offsetWidth < 325);
    };

    checkWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 290 || el.offsetWidth < 325);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getMonthTitle = () => {
    if (system === "BS") {
      const baseIndex = 4; // Bhadra
      const baseYear = 2083;
      const totalMonths = baseIndex + monthOffset;
      const monthIdx = ((totalMonths % 12) + 12) % 12;
      const year = baseYear + Math.floor(totalMonths / 12);
      return `${bsMonths[monthIdx]} ${year}`;
    } else {
      const baseIndex = 8; // September
      const baseYear = 2026;
      const totalMonths = baseIndex + monthOffset;
      const monthIdx = ((totalMonths % 12) + 12) % 12;
      const year = baseYear + Math.floor(totalMonths / 12);
      return `${adMonths[monthIdx]} ${year}`;
    }
  };

  return (
    <article
      ref={cardRef}
      className={cn(
        "@container flex min-h-[318px] flex-col justify-between rounded-[20px] border border-[#E7DCD6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-border dark:bg-card transition-all",
        isNarrow ? "p-4" : "p-[22px]",
      )}
    >
      {/* Row 1: Inline navigation with Month/Year on the left, BS/AD toggle on the right */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMonthOffset((prev) => prev - 1)}
            aria-label="Previous month"
            className="flex size-6 items-center justify-center rounded-full text-[#8A7B76] transition-colors hover:bg-[#F0E7E2]/60 hover:text-[#2B2320] focus-visible:outline-hidden shrink-0"
          >
            <ChevronLeft className="size-3.5 stroke-[2.2]" />
          </button>
          <h2
            className={cn(
              "font-display font-semibold leading-none text-[#2B2320] tracking-tight dark:text-foreground select-none px-0.5 whitespace-nowrap",
              isNarrow ? "text-[16px]" : "text-[20px]",
            )}
          >
            {getMonthTitle()}
          </h2>
          <button
            type="button"
            onClick={() => setMonthOffset((prev) => prev + 1)}
            aria-label="Next month"
            className="flex size-6 items-center justify-center rounded-full text-[#8A7B76] transition-colors hover:bg-[#F0E7E2]/60 hover:text-[#2B2320] focus-visible:outline-hidden shrink-0"
          >
            <ChevronRight className="size-3.5 stroke-[2.2]" />
          </button>
        </div>

        {/* BS/AD toggle pill - non-shrinking, maintains pill shape */}
        <div className="flex items-center rounded-full bg-[#F0E7E2] p-[2.5px] dark:bg-muted shrink-0 select-none">
          {(["BS", "AD"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSystem(item)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all select-none whitespace-nowrap",
                system === item
                  ? "bg-[#E8546F] text-white shadow-xs"
                  : "bg-transparent text-[#8A7B76] hover:text-[#2B2320] dark:text-muted-foreground dark:hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 onward: Weekday header + Date grid */}
      <div className="mt-3">
        <div className="grid grid-cols-7 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <span
              key={`${day}-${i}`}
              className={cn(
                "font-bold text-[#B7A9A3] select-none py-1",
                isNarrow ? "text-[10px]" : "text-[11px]",
              )}
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 place-items-center">
          {days.map((day, index) => {
            const dateVal = system === "BS" ? day.bs : day.ad;
            return (
              <div
                key={index}
                className={cn(
                  "relative flex items-center justify-center rounded-full font-semibold tabular-nums select-none",
                  isNarrow ? "size-[32px] text-[12.5px]" : "size-[38px] text-[13.5px]",
                  day.currentMonth
                    ? "text-[#2B2320] dark:text-foreground"
                    : "text-[#D8CBC5] dark:text-muted-foreground/35 font-normal",
                  day.current && "border-[1.5px] border-[#E8546F] text-[#E8546F] font-bold",
                )}
              >
                <span>{dateVal}</span>
                {day.event && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full",
                      day.event === "Function" ? "bg-[#C33A56]" : "bg-[#E8B14A]",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend row */}
      <div className="mt-4 border-t border-[#F0E7E2] pt-[14px] text-[11.5px] dark:border-border flex items-center gap-3.5 whitespace-nowrap select-none">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#8A7B76] whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-[#C33A56] shrink-0" />
          Function
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#8A7B76] whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-[#E8B14A] shrink-0" />
          Site Visit
        </span>
      </div>
    </article>
  );
}

function AdditionalSections({ sections }: { sections: string[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">Your Sections</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Button key={section} variant="outline" className="justify-between">
            {section}
            <ChevronRight />
          </Button>
        ))}
      </div>
    </section>
  );
}

function TeamRequired({ team }: { team: DashboardData["team"] }) {
  const [offset, setOffset] = useState(0);
  const remaining = team.required - team.assigned;
  const month = offset === 0 ? team.month : offset < 0 ? "Kartik 2083" : "Poush 2083";
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[10px] bg-rose-light text-primary">
            <UsersRound className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold leading-none">Team Required</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">{month}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setOffset((value) => value - 1)}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-28 text-center text-xs font-semibold">{month}</span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setOffset((value) => value + 1)}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
          <Button variant="link" size="sm" className="ml-1 px-1 text-primary">
            View →
          </Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Required", value: team.required, cls: "bg-muted" },
          { label: "Assigned", value: team.assigned, cls: "bg-success text-success-foreground" },
          { label: "Remaining", value: remaining, cls: "bg-rose-light text-primary" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl px-4 py-3", stat.cls)}>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em]">{stat.label}</span>
            <strong className="mt-1 block text-2xl font-bold tabular-nums">{stat.value}</strong>
          </div>
        ))}
      </div>
      {offset === 0 ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {team.roles.map((role) => (
              <span
                key={role.name}
                title={role.name}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums",
                  role.assigned < role.required
                    ? "border-primary/20 bg-rose-faint text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {role.short} {role.assigned}/{role.required}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Dates — date (roles required)
            </span>
            {team.dates.map((date) => (
              <Popover key={date.day}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 rounded-full text-[10px]">
                    {date.day}{" "}
                    <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {date.open}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 rounded-xl">
                  <p className="font-display text-lg font-semibold">Mangsir {date.day}</p>
                  {date.functions.map((item) => (
                    <div key={item.title} className="mt-3">
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Unassigned: {item.roles.join(", ")}
                      </p>
                      <Button size="sm" className="mt-3 w-full">
                        Assign team
                      </Button>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </>
      ) : (
        <div className="grid min-h-24 place-items-center text-center">
          <div>
            <UsersRound className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No team requirements this month</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SearchBar({
  clients,
  upcoming,
  onOpenOverlay,
}: {
  clients: ClientResult[];
  upcoming: UpcomingFunction[];
  onOpenOverlay?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setups } = useDecorationSetupsStore();

  const groupedResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Clients
    const clientItems = (
      !q
        ? clients.slice(0, 3)
        : clients.filter((c) =>
            `${c.name} ${c.details} ${c.status} ${c.matched}`.toLowerCase().includes(q),
          )
    ).map((c) => ({
      id: `client-${c.id}`,
      type: "client" as const,
      tag: "Client" as const,
      title: c.name,
      subtitle: c.details,
      status: c.status,
      initials: c.initials,
      action: () => {
        setOpen(false);
        window.history.pushState({}, "", `/company?client=${c.id}`);
        toast.success(`Selected client: ${c.name}`);
      },
    }));

    // 2. Upcoming Functions / Events
    const functionItems = (
      !q
        ? upcoming.slice(0, 3)
        : upcoming.filter((f) =>
            `${f.type} ${f.client} ${f.location} ${f.date} ${f.phone} ${f.assignments.join(" ")}`
              .toLowerCase()
              .includes(q),
          )
    ).map((f) => ({
      id: `func-${f.id}`,
      type: "event" as const,
      tag: "Event" as const,
      title: `${f.type} — ${f.client}`,
      subtitle: `${f.date} · ${f.location}`,
      status: f.date,
      phone: f.phone,
      action: () => {
        setOpen(false);
        window.history.pushState({}, "", `/company?function=${f.id}`);
        const el =
          document.getElementById(`function-${f.id}`) ||
          document.getElementById("upcoming-functions");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "transition-all");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
        }
        toast.success(`Viewing event: ${f.type} (${f.client})`);
      },
    }));

    // 3. Inventory & Setup Items
    const setupItems = (
      !q
        ? setups.slice(0, 3)
        : setups.filter((s) =>
            `${s.name} ${s.category} ${s.sku} ${s.description ?? ""}`.toLowerCase().includes(q),
          )
    ).map((s) => ({
      id: `setup-${s.id}`,
      type: "setup" as const,
      tag: "Setup" as const,
      title: s.name,
      subtitle: `${s.category} · SKU: ${s.sku}`,
      status: s.category,
      imageUrl: s.imageUrl,
      action: () => {
        setOpen(false);
        navigate({ to: "/inventory" });
        toast.success(`Opening inventory: ${s.name}`);
      },
    }));

    const all = [...clientItems, ...functionItems, ...setupItems];

    return {
      clients: clientItems,
      functions: functionItems,
      inventory: setupItems,
      all,
      totalCount: all.length,
    };
  }, [query, clients, upcoming, setups, navigate]);

  // Click outside to dismiss
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Global shortcut (Cmd+K / Ctrl+K / Space Space)
  useEffect(() => {
    let lastSpaceTime = 0;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (
        e.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        const now = Date.now();
        if (now - lastSpaceTime < 350) {
          e.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }
        lastSpaceTime = now;
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Ensure selectedIndex is within range
  useEffect(() => {
    if (selectedIndex >= groupedResults.all.length) {
      setSelectedIndex(0);
    }
  }, [groupedResults.all.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (open) {
      const el = document.getElementById(`search-item-${selectedIndex}`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (groupedResults.all.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % groupedResults.all.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (groupedResults.all.length === 0) return;
      setSelectedIndex(
        (prev) => (prev - 1 + groupedResults.all.length) % groupedResults.all.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = groupedResults.all[selectedIndex];
      if (selected) {
        selected.action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative z-30 w-full">
      <div
        className={cn(
          "group relative flex h-13 sm:h-14 w-full items-center gap-3 rounded-2xl border bg-card px-4 shadow-xs transition-all duration-200",
          open
            ? "border-primary/60 ring-3 ring-primary/15 shadow-sm"
            : "border-border/80 hover:border-border hover:shadow-xs",
        )}
      >
        <Search
          className={cn(
            "size-5 shrink-0 transition-colors duration-150",
            open ? "text-primary" : "text-muted-foreground/70",
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, functions, locations or setups…"
          className="min-w-0 flex-1 bg-transparent text-sm sm:text-base font-normal text-foreground outline-none placeholder:text-muted-foreground/60"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex shrink-0 items-center gap-1.5">
          {query ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
          <kbd className="hidden select-none items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 flex max-h-[460px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="scrollbar-thin flex-1 overflow-y-auto divide-y divide-border/40">
            {groupedResults.totalCount === 0 ? (
              <div className="grid min-h-44 place-items-center p-6 text-center">
                <div>
                  <Search className="mx-auto size-7 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    No matches found for "{query}"
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try searching for "Aarav", "Wedding", "Gate", "Mandap", or "Kathmandu"
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Clients Group */}
                {groupedResults.clients.length > 0 && (
                  <div className="p-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3 text-primary" />
                      <span>Clients ({groupedResults.clients.length})</span>
                    </div>
                    {groupedResults.clients.map((item) => {
                      const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          id={`search-item-${itemIndex}`}
                          type="button"
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border-l-2",
                            isSelected
                              ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                              : "border-transparent hover:bg-muted/60 text-foreground",
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-light font-display text-xs font-bold text-primary shadow-xs">
                            {item.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="truncate font-display text-sm font-semibold">
                                {item.title}
                              </strong>
                              <span
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                                  item.status === "Booked"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.subtitle}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-rose-faint px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                              Client
                            </span>
                            {isSelected && (
                              <CornerDownLeft className="hidden size-3 text-primary sm:block" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Upcoming Functions / Events Group */}
                {groupedResults.functions.length > 0 && (
                  <div className="p-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <CalendarCheck className="size-3 text-amber-600" />
                      <span>Upcoming Functions ({groupedResults.functions.length})</span>
                    </div>
                    {groupedResults.functions.map((item) => {
                      const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          id={`search-item-${itemIndex}`}
                          type="button"
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border-l-2",
                            isSelected
                              ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                              : "border-transparent hover:bg-muted/60 text-foreground",
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <CalendarDays className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="truncate font-display text-sm font-semibold">
                                {item.title}
                              </strong>
                              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                {item.status}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.subtitle}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Event
                            </span>
                            {isSelected && (
                              <CornerDownLeft className="hidden size-3 text-primary sm:block" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Inventory & Setup Items Group */}
                {groupedResults.inventory.length > 0 && (
                  <div className="p-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Boxes className="size-3 text-primary" />
                      <span>Inventory & Setup Items ({groupedResults.inventory.length})</span>
                    </div>
                    {groupedResults.inventory.map((item) => {
                      const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          id={`search-item-${itemIndex}`}
                          type="button"
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border-l-2",
                            isSelected
                              ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                              : "border-transparent hover:bg-muted/60 text-foreground",
                          )}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="size-8 shrink-0 rounded-lg object-cover border border-border/60 shadow-xs"
                            />
                          ) : (
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Sparkles className="size-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="truncate font-display text-sm font-semibold">
                                {item.title}
                              </strong>
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {item.status}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.subtitle}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Setup
                            </span>
                            {isSelected && (
                              <CornerDownLeft className="hidden size-3 text-primary sm:block" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground">
            <span>
              {groupedResults.totalCount} result{groupedResults.totalCount === 1 ? "" : "s"}{" "}
              {query ? `for "${query}"` : "recommended"}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">
                  ↵
                </kbd>{" "}
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">
                  ESC
                </kbd>{" "}
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchOverlay({
  open,
  onOpenChange,
  clients,
  upcoming = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientResult[];
  upcoming?: UpcomingFunction[];
}) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(["Aarav", "Kathmandu", "Entrance Gate", "Mandap"]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { setups } = useDecorationSetupsStore();

  const groupedResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Clients
    const clientItems = (
      !q
        ? clients.slice(0, 3)
        : clients.filter((c) =>
            `${c.name} ${c.details} ${c.status} ${c.matched}`.toLowerCase().includes(q),
          )
    ).map((c) => ({
      id: `modal-client-${c.id}`,
      type: "client" as const,
      tag: "Client" as const,
      title: c.name,
      subtitle: c.details,
      status: c.status,
      initials: c.initials,
      action: () => {
        setRecent((items) => [c.name, ...items.filter((item) => item !== c.name)].slice(0, 5));
        onOpenChange(false);
        window.history.pushState({}, "", `/company?client=${c.id}`);
        toast.success(`Selected client: ${c.name}`);
      },
    }));

    // 2. Upcoming Functions / Events
    const functionItems = (
      !q
        ? upcoming.slice(0, 3)
        : upcoming.filter((f) =>
            `${f.type} ${f.client} ${f.location} ${f.date} ${f.phone} ${f.assignments.join(" ")}`
              .toLowerCase()
              .includes(q),
          )
    ).map((f) => ({
      id: `modal-func-${f.id}`,
      type: "event" as const,
      tag: "Event" as const,
      title: `${f.type} — ${f.client}`,
      subtitle: `${f.date} · ${f.location}`,
      status: f.date,
      phone: f.phone,
      action: () => {
        setRecent((items) => [f.type, ...items.filter((item) => item !== f.type)].slice(0, 5));
        onOpenChange(false);
        window.history.pushState({}, "", `/company?function=${f.id}`);
        const el =
          document.getElementById(`function-${f.id}`) ||
          document.getElementById("upcoming-functions");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "transition-all");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
        }
        toast.success(`Viewing event: ${f.type} (${f.client})`);
      },
    }));

    // 3. Inventory & Setup Items
    const setupItems = (
      !q
        ? setups.slice(0, 3)
        : setups.filter((s) =>
            `${s.name} ${s.category} ${s.sku} ${s.description ?? ""}`.toLowerCase().includes(q),
          )
    ).map((s) => ({
      id: `modal-setup-${s.id}`,
      type: "setup" as const,
      tag: "Setup" as const,
      title: s.name,
      subtitle: `${s.category} · SKU: ${s.sku}`,
      status: s.category,
      imageUrl: s.imageUrl,
      action: () => {
        setRecent((items) => [s.name, ...items.filter((item) => item !== s.name)].slice(0, 5));
        onOpenChange(false);
        navigate({ to: "/inventory" });
        toast.success(`Opening inventory: ${s.name}`);
      },
    }));

    const all = [...clientItems, ...functionItems, ...setupItems];

    return {
      clients: clientItems,
      functions: functionItems,
      inventory: setupItems,
      all,
      totalCount: all.length,
    };
  }, [query, clients, upcoming, setups, onOpenChange, navigate]);

  useEffect(() => {
    if (selectedIndex >= groupedResults.all.length) {
      setSelectedIndex(0);
    }
  }, [groupedResults.all.length, selectedIndex]);

  useEffect(() => {
    if (open) {
      const el = document.getElementById(`modal-search-item-${selectedIndex}`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (groupedResults.all.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % groupedResults.all.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (groupedResults.all.length === 0) return;
      setSelectedIndex(
        (prev) => (prev - 1 + groupedResults.all.length) % groupedResults.all.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = groupedResults.all[selectedIndex];
      if (selected) {
        selected.action();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] w-[95vw] max-w-[1000px] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl">
        <DialogTitle className="sr-only">Search clients, functions and setups</DialogTitle>
        <DialogDescription className="sr-only">
          Type to search all company records.
        </DialogDescription>
        <div className="border-b p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Search className="size-6 shrink-0 text-primary" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, functions, locations or setups…"
              className="min-w-0 flex-1 bg-transparent font-display text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-2xl"
            />
          </div>
          <div className="scrollbar-thin mt-3 flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Recent:
            </span>
            {recent.map((item) => (
              <Button
                key={item}
                variant="secondary"
                size="sm"
                className="h-6 shrink-0 rounded-full text-[10px]"
                onClick={() => setQuery(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        <div className="scrollbar-thin max-h-[58vh] overflow-y-auto divide-y divide-border/40 p-2 sm:p-3">
          {groupedResults.totalCount === 0 ? (
            <div className="grid min-h-44 place-items-center p-6 text-center">
              <div>
                <Search className="mx-auto size-7 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold">No matching records</p>
                <p className="text-xs text-muted-foreground">
                  Try a client, venue, or setup category.
                </p>
              </div>
            </div>
          ) : (
            <>
              {groupedResults.clients.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Users className="size-3 text-primary" />
                    <span>Clients ({groupedResults.clients.length})</span>
                  </div>
                  {groupedResults.clients.map((item) => {
                    const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        id={`modal-search-item-${itemIndex}`}
                        type="button"
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors border-l-2",
                          isSelected
                            ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                            : "border-transparent hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-light font-display text-xs font-bold text-primary shadow-xs">
                          {item.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate font-display text-base font-semibold">
                              {item.title}
                            </strong>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-medium",
                                item.status === "Booked"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-rose-faint px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                            Client
                          </span>
                          {isSelected && (
                            <CornerDownLeft className="hidden size-3.5 text-primary sm:block" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedResults.functions.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <CalendarCheck className="size-3 text-amber-600" />
                    <span>Upcoming Functions ({groupedResults.functions.length})</span>
                  </div>
                  {groupedResults.functions.map((item) => {
                    const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        id={`modal-search-item-${itemIndex}`}
                        type="button"
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors border-l-2",
                          isSelected
                            ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                            : "border-transparent hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <CalendarDays className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate font-display text-base font-semibold">
                              {item.title}
                            </strong>
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              {item.status}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Event
                          </span>
                          {isSelected && (
                            <CornerDownLeft className="hidden size-3.5 text-primary sm:block" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedResults.inventory.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Boxes className="size-3 text-primary" />
                    <span>Inventory & Setup Items ({groupedResults.inventory.length})</span>
                  </div>
                  {groupedResults.inventory.map((item) => {
                    const itemIndex = groupedResults.all.findIndex((a) => a.id === item.id);
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        id={`modal-search-item-${itemIndex}`}
                        type="button"
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors border-l-2",
                          isSelected
                            ? "bg-rose-faint border-primary text-foreground ring-1 ring-primary/20"
                            : "border-transparent hover:bg-muted/60 text-foreground",
                        )}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="size-9 shrink-0 rounded-lg object-cover border border-border/60 shadow-xs"
                          />
                        ) : (
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="size-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="truncate font-display text-base font-semibold">
                              {item.title}
                            </strong>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                              {item.status}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Setup
                          </span>
                          {isSelected && (
                            <CornerDownLeft className="hidden size-3.5 text-primary sm:block" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            {groupedResults.totalCount} result{groupedResults.totalCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ESC
              </kbd>{" "}
              close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UpcomingFunctions({ items }: { items: UpcomingFunction[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const openFunction = (item: UpcomingFunction) =>
    window.history.pushState({}, "", `/company?function=${item.id}`);
  return (
    <section
      id="upcoming-functions"
      className="overflow-hidden rounded-2xl border bg-card shadow-soft"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[10px] bg-rose-light text-primary">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold leading-none">Upcoming Functions</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {items.length} events scheduled
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="rounded-full">
          {items[0]?.date ?? "No date"}
        </Button>
      </header>
      <div className="scrollbar-thin max-h-[400px] overflow-y-auto divide-y divide-border">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              id={`function-${item.id}`}
              role="link"
              tabIndex={0}
              onClick={() => openFunction(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openFunction(item);
              }}
              className="group cursor-pointer px-4 py-4 transition-colors hover:bg-rose-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-11 w-12 shrink-0 place-items-center rounded-lg text-center text-[9px] font-bold uppercase",
                    item.days === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span>
                    {item.days === 0 ? (
                      "Today"
                    ) : (
                      <>
                        {item.days}
                        <small className="block text-[8px] font-medium">days</small>
                      </>
                    )}
                  </span>
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <strong className="block truncate font-display text-lg leading-tight">
                    {item.client} · {item.type}
                  </strong>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.location}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
                  <Button variant="outline" size="icon" className="size-8" asChild>
                    <a href={`tel:${item.phone}`} aria-label={`Call ${item.client}`}>
                      <Phone />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" className="size-8" asChild>
                    <a
                      href={`https://wa.me/${item.phone.replace("+", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Message ${item.client}`}
                    >
                      <MessageCircle />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    aria-label="Toggle assignment details"
                  >
                    <ChevronDown
                      className={cn("transition-transform", expanded === item.id && "rotate-180")}
                    />
                  </Button>
                </div>
              </div>
              {expanded === item.id && (
                <div className="ml-[60px] mt-3 flex flex-wrap gap-2">
                  {item.assignments.map((assignment) => (
                    <span
                      key={assignment}
                      className="rounded-full border bg-surface px-2.5 py-1 text-[10px] text-muted-foreground"
                    >
                      {assignment}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="grid min-h-48 place-items-center text-center">
            <div>
              <CalendarDays className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">No upcoming functions</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-label="Loading dashboard" className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="min-h-[318px] rounded-2xl border bg-card p-4">
            <div className="dashboard-skeleton size-10 rounded-[10px]" />
            <div className="dashboard-skeleton mt-4 h-6 w-3/4 rounded" />
            <div className="dashboard-skeleton mt-2 h-4 w-full rounded" />
            <div className="dashboard-skeleton mt-8 h-16 w-full rounded-lg" />
            <div className="dashboard-skeleton mt-20 h-7 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="min-h-[330px] rounded-2xl border bg-card p-6">
        <div className="dashboard-skeleton h-9 w-48 rounded" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dashboard-skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="dashboard-skeleton mt-6 h-10 w-full rounded" />
      </div>
      <div className="dashboard-skeleton h-[84px] rounded-2xl" />
      <div className="min-h-[360px] rounded-2xl border bg-card p-6">
        <div className="dashboard-skeleton h-10 w-56 rounded" />
        <div className="space-y-4 pt-7">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dashboard-skeleton h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
