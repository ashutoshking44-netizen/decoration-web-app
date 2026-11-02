import { createFileRoute, redirect } from "@tanstack/react-router";
import { getActiveCompanyId } from "@/lib/company-profile";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: getActiveCompanyId() ? "/company" : "/companies" });
  },
  component: () => null,
});
