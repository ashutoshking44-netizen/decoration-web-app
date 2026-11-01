import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$")({
  ssr: false,
  beforeLoad: ({ params }) => {
    const subpath = (params as Record<string, string>)["_splat"] || "";
    const target = subpath ? `/${subpath}` : "/company";
    throw redirect({ to: target as any });
  },
  component: () => null,
});

