import { useEffect, useState } from "react";
import { loadStoredEnquiries } from "./enquiries";
import { isMyBookedClient, loadStoredBookedClients } from "./clients";
import { enquiryBelongsToCurrentCompany } from "./company-scope";
import { loadProfile } from "./company-profile";

export type Permission =
  | "date-check"
  | "quotations"
  | "payments"
  | "enquiries"
  | "notifications"
  | "quick-action";

export type CalendarDay = {
  bs: number;
  ad: number;
  currentMonth: boolean;
  current?: boolean;
  event?: "Function" | "Site Visit";
};

export type TeamDate = {
  day: number;
  open: number;
  functions: { title: string; roles: string[] }[];
};

export type ClientResult = {
  id: string;
  initials: string;
  name: string;
  status: "Booked" | "Enquiry";
  functions: number;
  matched: string;
  details: string;
};

export type UpcomingFunction = {
  id: string;
  days: number;
  date: string;
  client: string;
  type: string;
  location: string;
  phone: string;
  assignments: string[];
};

export type DashboardData = {
  company: { name: string; caption: string; initials: string; profileComplete: boolean };
  permissions: Permission[];
  enquiries: { today: number; yesterday: number; month: number };
  bookings: { count: number; averageMinutes: number };
  inventory: { reserved: number; conflicts: number };
  calendar: CalendarDay[];
  team: {
    month: string;
    required: number;
    assigned: number;
    roles: { name: string; short: string; assigned: number; required: number }[];
    dates: TeamDate[];
  };
  clients: ClientResult[];
  upcoming: UpcomingFunction[];
  isOwner: boolean;
  additionalSections: string[];
};

const days: CalendarDay[] = [
  { bs: 30, ad: 16, currentMonth: false }, { bs: 31, ad: 17, currentMonth: false },
  { bs: 1, ad: 18, currentMonth: true }, { bs: 2, ad: 19, currentMonth: true },
  { bs: 3, ad: 20, currentMonth: true }, { bs: 4, ad: 21, currentMonth: true },
  { bs: 5, ad: 22, currentMonth: true }, { bs: 6, ad: 23, currentMonth: true },
  { bs: 7, ad: 24, currentMonth: true }, { bs: 8, ad: 25, currentMonth: true },
  { bs: 9, ad: 26, currentMonth: true }, { bs: 10, ad: 27, currentMonth: true },
  { bs: 11, ad: 28, currentMonth: true }, { bs: 12, ad: 29, currentMonth: true },
  { bs: 13, ad: 30, currentMonth: true }, { bs: 14, ad: 31, currentMonth: true },
  { bs: 15, ad: 1, currentMonth: true }, { bs: 16, ad: 2, currentMonth: true },
  { bs: 17, ad: 3, currentMonth: true, current: true }, { bs: 18, ad: 4, currentMonth: true },
  { bs: 19, ad: 5, currentMonth: true }, { bs: 20, ad: 6, currentMonth: true },
  { bs: 21, ad: 7, currentMonth: true }, { bs: 22, ad: 8, currentMonth: true },
  { bs: 23, ad: 9, currentMonth: true }, { bs: 24, ad: 10, currentMonth: true },
  { bs: 25, ad: 11, currentMonth: true }, { bs: 26, ad: 12, currentMonth: true },
  { bs: 27, ad: 13, currentMonth: true }, { bs: 28, ad: 14, currentMonth: true },
  { bs: 29, ad: 15, currentMonth: true }, { bs: 30, ad: 16, currentMonth: true },
  { bs: 31, ad: 17, currentMonth: true }, { bs: 1, ad: 18, currentMonth: false },
  { bs: 2, ad: 19, currentMonth: false },
];

export function buildLiveDashboardData(): DashboardData {
  const profile = loadProfile();
  const enquiries = loadStoredEnquiries().filter(enquiryBelongsToCurrentCompany);
  const clients = loadStoredBookedClients().filter(isMyBookedClient);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);

  const todayCount = enquiries.filter((e) => e.created_at?.startsWith(todayStr)).length;
  const yesterdayCount = enquiries.filter((e) => e.created_at?.startsWith(yesterdayStr)).length;
  const monthCount = enquiries.filter((e) => e.created_at?.startsWith(monthStr)).length;

  const clientResults: ClientResult[] = [
    ...clients.map((c) => ({
      id: c.id,
      initials: (c.client_name || "CL").slice(0, 2).toUpperCase(),
      name: c.client_name,
      status: "Booked" as const,
      functions: c.ceremonies?.length || c.events_count || 1,
      matched: "Client name",
      details: `${c.venue || "Venue"} · ${c.handler || "Staff"} · ${c.phone || ""}`.trim(),
    })),
    ...enquiries.map((e) => ({
      id: e.id,
      initials: (e.client_name || "EN").slice(0, 2).toUpperCase(),
      name: e.client_name,
      status: "Enquiry" as const,
      functions: e.events?.length || 1,
      matched: "Client name",
      details: `${e.venue || e.location || "Venue"} · ${e.assigned_handler || "Pending"} · ${e.phone || ""}`.trim(),
    })),
  ];

  const upcomingFunctions: UpcomingFunction[] = clients.map((c) => ({
    id: c.id,
    days: typeof c.days_to_event === "number" ? c.days_to_event : 0,
    date: c.event_date || "Date scheduled",
    client: c.client_name,
    type: c.event_type || "Event",
    location: c.venue || "Venue",
    phone: c.phone || "",
    assignments: c.crew_assignments?.map((cr) => `${cr.role} · ${cr.name}`) || [],
  }));

  const name = profile?.name || "Decoration Studio";
  const initials = (name || "DS").slice(0, 2).toUpperCase();

  return {
    company: {
      name,
      caption: "Business Suite",
      initials,
      profileComplete: Boolean(profile?.phone && profile?.email && profile?.city),
    },
    permissions: ["date-check", "quotations", "payments", "enquiries", "notifications", "quick-action"],
    enquiries: {
      today: todayCount,
      yesterday: yesterdayCount,
      month: monthCount,
    },
    bookings: {
      count: clients.length,
      averageMinutes: 30,
    },
    inventory: {
      reserved: 0,
      conflicts: 0,
    },
    calendar: days,
    team: {
      month: "Current Season",
      required: 0,
      assigned: 0,
      roles: [],
      dates: [],
    },
    clients: clientResults,
    upcoming: upcomingFunctions,
    isOwner: true,
    additionalSections: [],
  };
}

export const dashboardFixture: DashboardData = buildLiveDashboardData();

export function useCompanyDashboard() {
  const [data, setData] = useState<DashboardData>(buildLiveDashboardData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setData(buildLiveDashboardData());
    };
    refresh();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", refresh);
      window.addEventListener("enquiries-synced", refresh);
      window.addEventListener("decoration-setups-updated", refresh);

      return () => {
        window.removeEventListener("storage", refresh);
        window.removeEventListener("enquiries-synced", refresh);
        window.removeEventListener("decoration-setups-updated", refresh);
      };
    }
    return undefined;
  }, []);

  return { data, loading };
}
