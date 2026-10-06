import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadProfile } from "@/lib/company-profile";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: loadProfile() ? "/company" : "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Decoration Portal" },
      { name: "description", content: "Decoration business operations and function planning." },
      { property: "og:title", content: "Decoration Portal" },
      { property: "og:description", content: "Decoration business operations and function planning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
