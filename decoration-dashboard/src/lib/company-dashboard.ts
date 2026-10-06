import { useEffect, useState } from "react";

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
  { bs: 3, ad: 20, currentMonth: true, event: "Site Visit" }, { bs: 4, ad: 21, currentMonth: true },
  { bs: 5, ad: 22, currentMonth: true }, { bs: 6, ad: 23, currentMonth: true },
  { bs: 7, ad: 24, currentMonth: true }, { bs: 8, ad: 25, currentMonth: true, event: "Function" },
  { bs: 9, ad: 26, currentMonth: true }, { bs: 10, ad: 27, currentMonth: true },
  { bs: 11, ad: 28, currentMonth: true }, { bs: 12, ad: 29, currentMonth: true },
  { bs: 13, ad: 30, currentMonth: true }, { bs: 14, ad: 31, currentMonth: true, event: "Site Visit" },
  { bs: 15, ad: 1, currentMonth: true }, { bs: 16, ad: 2, currentMonth: true },
  { bs: 17, ad: 3, currentMonth: true, current: true, event: "Function" }, { bs: 18, ad: 4, currentMonth: true },
  { bs: 19, ad: 5, currentMonth: true }, { bs: 20, ad: 6, currentMonth: true },
  { bs: 21, ad: 7, currentMonth: true }, { bs: 22, ad: 8, currentMonth: true },
  { bs: 23, ad: 9, currentMonth: true, event: "Function" }, { bs: 24, ad: 10, currentMonth: true },
  { bs: 25, ad: 11, currentMonth: true }, { bs: 26, ad: 12, currentMonth: true },
  { bs: 27, ad: 13, currentMonth: true }, { bs: 28, ad: 14, currentMonth: true },
  { bs: 29, ad: 15, currentMonth: true }, { bs: 30, ad: 16, currentMonth: true },
  { bs: 31, ad: 17, currentMonth: true }, { bs: 1, ad: 18, currentMonth: false },
  { bs: 2, ad: 19, currentMonth: false },
];

export const dashboardFixture: DashboardData = {
  company: { name: "Gulab Decor", caption: "Business Suite", initials: "GD", profileComplete: false },
  permissions: ["date-check", "quotations", "payments", "enquiries", "notifications", "quick-action"],
  enquiries: { today: 8, yesterday: 5, month: 47 },
  bookings: { count: 16, averageMinutes: 42 },
  inventory: { reserved: 128, conflicts: 3 },
  calendar: days,
  team: {
    month: "Mangsir 2083",
    required: 21,
    assigned: 14,
    roles: [
      { name: "Designer", short: "DSG", assigned: 2, required: 3 },
      { name: "Florist", short: "FLR", assigned: 1, required: 2 },
      { name: "Lighting", short: "LGT", assigned: 2, required: 2 },
      { name: "Fabric", short: "FAB", assigned: 2, required: 3 },
      { name: "Rigging", short: "RIG", assigned: 1, required: 2 },
      { name: "Setup", short: "SET", assigned: 3, required: 4 },
      { name: "Teardown", short: "TDN", assigned: 2, required: 3 },
      { name: "Vendor", short: "VND", assigned: 1, required: 2 },
    ],
    dates: [
      { day: 17, open: 2, functions: [{ title: "Aarav & Riya — Wedding", roles: ["Florist", "Setup"] }] },
      { day: 23, open: 3, functions: [{ title: "Shrestha Reception", roles: ["Designer", "Fabric", "Teardown"] }] },
      { day: 28, open: 2, functions: [{ title: "Karki Mehendi", roles: ["Rigging", "Vendor"] }] },
    ],
  },
  clients: [
    { id: "aarav-riya", initials: "AR", name: "Aarav & Riya", status: "Booked", functions: 3, matched: "Client name", details: "Kathmandu · Maya Shrestha · 98•• ••••12" },
    { id: "anisha-karki", initials: "AK", name: "Anisha Karki", status: "Enquiry", functions: 1, matched: "Location", details: "Bhaktapur · Pratik Rana · 98•• ••••41" },
    { id: "shrestha-family", initials: "SF", name: "Shrestha Family", status: "Booked", functions: 2, matched: "Handler", details: "Lalitpur · Maya Shrestha · 98•• ••••63" },
  ],
  upcoming: [
    { id: "aarav-riya-wedding", days: 0, date: "Sep 16", client: "Aarav & Riya", type: "Wedding Reception", location: "The Soaltee, Kathmandu", phone: "+9779800000012", assignments: ["Designer · Nisha", "Lighting · Ramesh", "Setup · 2 open"] },
    { id: "karki-mehendi", days: 3, date: "Sep 19", client: "Anisha Karki", type: "Mehendi", location: "Heritage Garden, Bhaktapur", phone: "+9779800000041", assignments: ["Florist · Suman", "Fabric · 1 open"] },
    { id: "shrestha-reception", days: 7, date: "Sep 23", client: "Shrestha Family", type: "Reception", location: "Hotel Himalaya, Lalitpur", phone: "+9779800000063", assignments: ["Designer · Nisha", "Rigging · 1 open", "Teardown · 1 open"] },
    { id: "rai-corporate", days: 12, date: "Sep 28", client: "Rai Group", type: "Corporate Dinner", location: "Hyatt Regency, Kathmandu", phone: "+9779800000088", assignments: ["Lighting · Ramesh", "Vendor · 1 open"] },
    { id: "thapa-engagement", days: 16, date: "Oct 02", client: "Thapa Family", type: "Engagement", location: "Vivanta, Lalitpur", phone: "+9779800000094", assignments: ["Designer · Nisha", "Fabric · Sita"] },
    { id: "lama-anniversary", days: 20, date: "Oct 06", client: "Lama Family", type: "Anniversary", location: "Gokarna Forest Resort", phone: "+9779800000099", assignments: ["Florist · Suman", "Setup · 1 open"] },
  ],
  isOwner: true,
  additionalSections: [],
};

export function useCompanyDashboard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(timer);
  }, []);
  return { data: dashboardFixture, loading };
}
