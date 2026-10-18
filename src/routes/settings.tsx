import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/components/company/settings-page";
import { loadProfile } from "@/lib/company-profile";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Settings — Decoration Portal" },
      { name: "description", content: "Studio settings: payment QR codes and more." },
    ],
  }),
  component: SettingsPage,
});
