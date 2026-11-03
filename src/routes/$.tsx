import { createFileRoute } from "@tanstack/react-router";
import { ErrorPage } from "@/features/errors";

export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "404 - Page Not Found | Everest Events & Decor" },
      {
        name: "description",
        content:
          "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
      },
    ],
  }),
  component: SplatNotFoundComponent,
});

function SplatNotFoundComponent() {
  return <ErrorPage code={404} />;
}
