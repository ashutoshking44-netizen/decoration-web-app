import { createFileRoute, redirect } from "@tanstack/react-router";
import { CompanyDashboard } from "@/components/company/company-dashboard";
import { getActiveCompanyId } from "@/lib/company-profile";

export const Route = createFileRoute("/company")({
  ssr: false,
  beforeLoad: () => {
    if (!getActiveCompanyId()) throw redirect({ to: "/companies" });
  },
  head: () => ({
    meta: [
      { title: "Company Dashboard — Decoration Portal" },
      { name: "description", content: "Manage decoration enquiries, bookings, inventory, team requirements and upcoming functions." },
      { property: "og:title", content: "Company Dashboard — Decoration Portal" },
      { property: "og:description", content: "Decoration operations, team planning and upcoming functions in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyDashboard,
});
