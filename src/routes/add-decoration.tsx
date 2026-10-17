import { createFileRoute, redirect } from "@tanstack/react-router";
import { AddDecorationPage } from "@/components/company/add-decoration-page";
import { getActiveCompanyId } from "@/lib/company-profile";
import { useDecorationSetupsStore, loadStoredSetups } from "@/lib/decoration-setups";
import { useMemo } from "react";

export type AddDecorationSearch = {
  from?: string | undefined;
  editId?: string | undefined;
};

export const Route = createFileRoute("/add-decoration")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AddDecorationSearch => {
    return {
      from: typeof search["from"] === "string" ? search["from"] : undefined,
      editId: typeof search["editId"] === "string" ? search["editId"] : undefined,
    };
  },
  beforeLoad: () => {
    if (!getActiveCompanyId()) throw redirect({ to: "/companies" });
  },
  head: () => ({
    meta: [
      { title: "Decoration Setup — Decoration Portal" },
      {
        name: "description",
        content:
          "Configure and manage decoration setups, floral recipes, frame dimensions, and event specifications.",
      },
      { property: "og:title", content: "Decoration Setup — Decoration Portal" },
      {
        property: "og:description",
        content:
          "Configure and manage decoration setups, floral recipes, frame dimensions, and event specifications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddDecorationRouteComponent,
});

function AddDecorationRouteComponent() {
  const { from, editId } = Route.useSearch();
  const { setups } = useDecorationSetupsStore();

  const initialSetup = useMemo(() => {
    if (!editId) return undefined;
    return setups.find((s) => s.id === editId) ?? loadStoredSetups().find((s) => s.id === editId);
  }, [editId, setups]);

  // When editId is provided, start directly on Step 2: Basic Details
  return (
    <AddDecorationPage
      key={initialSetup ? `edit-${initialSetup.id}` : editId ? `edit-${editId}` : "new"}
      initialSetup={initialSetup}
      from={from}
      initialStep={editId ? 2 : 1}
    />
  );
}
