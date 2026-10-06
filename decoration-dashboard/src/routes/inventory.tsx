import { createFileRoute, redirect } from "@tanstack/react-router";
import { InventorySetupPage } from "@/components/company/inventory-setup-page";
import { loadProfile } from "@/lib/company-profile";

export const Route = createFileRoute("/inventory")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const cat = typeof search["category"] === "string" ? (search["category"] as string) : undefined;
    return cat !== undefined ? { category: cat } : {};
  },
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Decorations Catalog & Designs — Decoration Portal" },
      {
        name: "description",
        content:
          "Browse, manage, and upload decoration setups, floral themes, dimensions, and template specifications.",
      },
      { property: "og:title", content: "Decorations Catalog & Designs — Decoration Portal" },
      {
        property: "og:description",
        content:
          "Browse and configure decoration setups, floral themes, and custom event designs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventorySetupPage,
});
