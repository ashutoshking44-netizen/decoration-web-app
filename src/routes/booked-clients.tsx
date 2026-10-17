import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookedClientsPage } from "@/components/company/booked-clients-page";
import { loadProfile } from "@/lib/company-profile";

export type BookedClientsSearch = {
  view?: "table" | "list" | "calendar" | undefined;
  date?: string | undefined;
  client?: string | undefined;
};

export const Route = createFileRoute("/booked-clients")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): BookedClientsSearch => {
    const viewVal = search["view"];
    const dateVal = search["date"];
    const clientVal = search["client"];
    return {
      view:
        viewVal === "calendar"
          ? "calendar"
          : viewVal === "list"
            ? "list"
            : viewVal === "table"
              ? "table"
              : undefined,
      date: typeof dateVal === "string" ? dateVal : undefined,
      client: typeof clientVal === "string" ? clientVal : undefined,
    };
  },
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "All Clients & Fulfillment — Decoration Portal" },
      {
        name: "description",
        content:
          "Manage all clients, fulfillment timeline stages, payment balances, and event execution.",
      },
      { property: "og:title", content: "All Clients & Fulfillment — Decoration Portal" },
      {
        property: "og:description",
        content: "Track all clients, event fulfillment stages, and payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookedClientsPage,
});
