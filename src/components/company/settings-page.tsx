import { Link } from "@tanstack/react-router";
import { ArrowLeft, Settings } from "lucide-react";
import { PaymentQrSettings } from "./payment-qr-settings";

/** Main studio settings page (opened from the dashboard sidebar → Settings). */
export function SettingsPage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <header className="sticky top-0 z-20 border-b border-sidebar-border/80 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              to="/company"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground">Settings</span>
          </div>
          <Link
            to="/company"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-20 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-rose">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Studio-wide settings. Changes save automatically.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 text-xs text-[#2B2320] shadow-soft sm:p-6">
          <PaymentQrSettings bare />
        </section>
      </main>
    </div>
  );
}
