import { createFileRoute, redirect } from "@tanstack/react-router";
import { QuotationStudioPage } from "@/components/company/quotation-studio-page";
import { loadProfile } from "@/lib/company-profile";
import { useDecorationSetupsStore, loadStoredSetups } from "@/lib/decoration-setups";
import { useMemo } from "react";

export type QuotationsNewSearch = {
  from?: string | undefined;
  setupId?: string | undefined;
  clientId?: string | undefined;
  step?: number | undefined;
};

export const Route = createFileRoute("/quotations/new")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): QuotationsNewSearch => {
    const fromVal = search["from"];
    const setupIdVal = search["setupId"];
    const clientIdVal = search["clientId"];
    const stepVal = search["step"];
    const parsedStep =
      typeof stepVal === "number"
        ? stepVal
        : typeof stepVal === "string"
        ? parseInt(stepVal, 10)
        : undefined;

    return {
      from: typeof fromVal === "string" ? fromVal : undefined,
      setupId: typeof setupIdVal === "string" ? setupIdVal : undefined,
      clientId: typeof clientIdVal === "string" ? clientIdVal : undefined,
      step: parsedStep && !isNaN(parsedStep) ? parsedStep : undefined,
    };
  },
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Quotation Studio — Decoration Portal" },
      {
        name: "description",
        content: "Generate professional client-ready quotation proposals with floral recipes, add-ons, and pricing.",
      },
      { property: "og:title", content: "Quotation Studio — Decoration Portal" },
      {
        property: "og:description",
        content: "Generate professional client-ready quotation proposals with floral recipes, add-ons, and pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotationsNewRouteComponent,
});

function QuotationsNewRouteComponent() {
  const { from, setupId, clientId, step } = Route.useSearch();
  const { setups } = useDecorationSetupsStore();

  const initialSetup = useMemo(() => {
    if (!setupId) return null;
    return (
      setups.find((s) => s.id === setupId) ??
      loadStoredSetups().find((s) => s.id === setupId) ??
      null
    );
  }, [setupId, setups]);

  return (
    <QuotationStudioPage
      key={clientId ? `client-${clientId}` : initialSetup ? `setup-${initialSetup.id}` : "new"}
      initialSetup={initialSetup}
      clientId={clientId}
      initialStep={step}
      from={from}
    />
  );
}
