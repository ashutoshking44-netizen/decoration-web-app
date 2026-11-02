import { createFileRoute } from "@tanstack/react-router";
import { ClientHomePage } from "@/features/storefront";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Everest Events & Decor - Wedding & Event Decorations" },
      {
        name: "description",
        content:
          "Explore luxury wedding and event decorations, calculate quotation estimates, and book your event.",
      },
      { property: "og:title", content: "Everest Events & Decor - Wedding & Event Decorations" },
      {
        property: "og:description",
        content:
          "Explore luxury wedding and event decorations, calculate quotation estimates, and book your event.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientHomePage,
});
