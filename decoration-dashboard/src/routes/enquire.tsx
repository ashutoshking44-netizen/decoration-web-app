import { createFileRoute } from "@tanstack/react-router";
import { ClientEnquiryForm } from "@/components/company/client-enquiry-form";

export type EnquireSearch = {
  s?: string | undefined; // studio name
  w?: string | undefined; // studio WhatsApp number
};

/**
 * Public client-facing enquiry form. Intentionally has NO company-profile
 * redirect so it works for anyone who opens the shared link.
 */
export const Route = createFileRoute("/enquire")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): EnquireSearch => ({
    s: typeof search["s"] === "string" ? search["s"] : undefined,
    w:
      typeof search["w"] === "string" || typeof search["w"] === "number"
        ? String(search["w"])
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Decoration Enquiry — Request a Quotation" },
      {
        name: "description",
        content: "Tell us about your event and receive a personalised decoration quotation.",
      },
    ],
  }),
  component: EnquireRouteComponent,
});

function EnquireRouteComponent() {
  const { s, w } = Route.useSearch();
  return <ClientEnquiryForm studioName={s} studioWhatsapp={w} />;
}
