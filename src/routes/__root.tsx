import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { startServerSync } from "../lib/server-sync";
import { ErrorPage } from "@/features/errors";

function NotFoundComponent() {
  return <ErrorPage code={404} />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <ErrorPage
      error={error}
      reset={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Decoration Portal" },
      { name: "description", content: "Decoration business operations and function planning." },
      { name: "author", content: "Xito Events" },
      { property: "og:title", content: "Decoration Portal" },
      {
        property: "og:description",
        content: "Decoration business operations and function planning.",
      },
      { property: "og:type", content: "website" },
      // Larger copy for link previews; the 256px app-logo.png is for in-app use
      { property: "og:image", content: "/assets/app-logo-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/assets/app-logo-512.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico?v=3", sizes: "any" },
      { rel: "icon", href: "/favicon-32x32.png?v=3", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16x16.png?v=3", type: "image/png", sizes: "16x16" },
      { rel: "icon", href: "/assets/app-logo.png?v=3", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&family=DM+Sans:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Publish decorations to / pull enquiries from the shared API.
  useEffect(() => startServerSync(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
