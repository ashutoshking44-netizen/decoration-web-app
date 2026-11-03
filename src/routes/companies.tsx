import { createFileRoute } from "@tanstack/react-router";
import { CompanyPicker } from "@/features/company";

export const Route = createFileRoute("/companies")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Choose your company - Decoration Portal" }],
  }),
  component: CompanyPicker,
});
