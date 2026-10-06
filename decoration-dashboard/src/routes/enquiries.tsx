import { createFileRoute, redirect } from "@tanstack/react-router";
import { EnquiriesTriagePage } from "@/components/company/enquiries-triage-page";
import { loadProfile } from "@/lib/company-profile";

export const Route = createFileRoute("/enquiries")({
  ssr: false,
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Enquiries & Quotations — Decoration Portal" },
      {
        name: "description",
        content:
          "Manage incoming client enquiries, track quotation pipeline stages, and launch quotations.",
      },
      { property: "og:title", content: "Enquiries & Quotations — Decoration Portal" },
      {
        property: "og:description",
        content:
          "Manage incoming client enquiries, track quotation pipeline stages, and launch quotations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnquiriesTriagePage,
});
