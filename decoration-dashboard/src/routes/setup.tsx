import { createFileRoute } from "@tanstack/react-router";
import { ProfileSetup } from "@/components/company/profile-setup";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Company Profile Setup — Decoration Portal" },
      {
        name: "description",
        content:
          "Tell us about your decoration business: services, function types, team size and experience.",
      },
      { property: "og:title", content: "Company Profile Setup — Decoration Portal" },
      {
        property: "og:description",
        content: "Set up your decoration company profile before opening the dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileSetup,
});
