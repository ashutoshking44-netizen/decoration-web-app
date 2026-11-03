import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage, loadProfile } from "@/features/company";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: () => {
    if (!loadProfile()) throw redirect({ to: "/setup" });
  },
  head: () => ({
    meta: [
      { title: "Settings - Decoration Portal" },
      { name: "description", content: "Studio settings: payment QR codes and more." },
    ],
  }),
  component: SettingsPage,
});
