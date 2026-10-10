import type { ReactNode } from "react";
import { AlertTriangle, Bell, CalendarDays, MessageCircle, Pencil, Phone, Users } from "lucide-react";
import type { BookedClient } from "@/lib/clients";
import { daysUntil, formatBs, resolveClientDate } from "@/lib/booked-dates";
import { cn } from "@/lib/utils";

/** Days until the event; falls back to the stored value when the date can't be read. */
export function clientDaysLeft(c: BookedClient): number | null {
  const r = resolveClientDate(c);
  if (r) return daysUntil(r.iso);
  if (typeof c.days_to_event === "number") return c.days_to_event;
  if (c.days_to_event === "today") return 0;
  return null;
}

export function clientWhatsappLink(c: BookedClient): string | null {
  const digits = (c.whatsapp || c.phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits.length === 10 ? `977${digits}` : digits}` : null;
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const past = days < 0;
  const label = past ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `${days}d`;
  const tone = past || days <= 7 ? "bg-[#E8546F] text-white" : days <= 30 ? "bg-[#F59E0B] text-white" : "bg-[#FBBF24] text-[#5A3A00]";
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums", tone)}>{label}</span>
  );
}

export function BookedClientCard({
  client,
  onOpen,
  onEdit,
  extra,
}: {
  client: BookedClient;
  onOpen: () => void;
  onEdit: () => void;
  /** Optional footer (quotation status, proposal link…). */
  extra?: ReactNode;
}) {
  const r = resolveClientDate(client);
  const wa = clientWhatsappLink(client);
  const where = client.city || client.venue;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-[#EFE3DD] bg-white p-4 shadow-2xs transition hover:border-[#E8546F]/50 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-[#2B2320] group-hover:text-[#C33A56]">
            {client.client_name}
          </h3>
          {where && <p className="truncate text-xs text-[#8A7B76]">{where}</p>}
        </div>
        <DaysBadge days={clientDaysLeft(client)} />
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-[#2B2320]">
        <CalendarDays className="size-4 shrink-0 text-[#E8546F]" />
        <span>{r ? formatBs(r) : client.event_date || "Date not set"}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-[#E7DCD6] bg-[#FBF6F3] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#4A3F3C]">
          {client.event_type}
        </span>
        {(client.events_count ?? client.ceremonies?.length ?? 1) > 1 && (
          <span className="rounded-full border border-[#F9CFD7] bg-[#FDEDEF] px-2.5 py-0.5 text-[11px] font-semibold text-[#C33A56]">
            {client.events_count ?? client.ceremonies?.length} events
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-emerald-700">Rs. {client.total_amount.toLocaleString("en-IN")}</p>

      <div className="mt-auto flex items-center gap-2" onClick={stop}>
        {client.phone ? (
          <a
            href={`tel:${client.phone}`}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <Phone className="size-4" /> Call
          </a>
        ) : (
          <span className="flex h-10 flex-1 items-center justify-center rounded-xl border border-dashed border-[#E7DCD6] text-xs text-[#B7A9A3]">
            No phone
          </span>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${client.client_name}`}
          title="Edit client"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      {extra && <div onClick={stop}>{extra}</div>}
    </article>
  );
}

export function BookedStatTiles({ clients }: { clients: BookedClient[] }) {
  let urgent = 0;
  let upcoming = 0;
  let missing = 0;
  for (const c of clients) {
    const days = resolveClientDate(c) ? clientDaysLeft(c) : null;
    if (days === null) missing += 1;
    else if (days >= 0 && days <= 7) urgent += 1;
    else if (days >= 8 && days <= 30) upcoming += 1;
  }
  const tiles = [
    { label: "Total", value: clients.length, icon: Users, cls: "border-sky-200 bg-sky-50", num: "text-sky-700", ic: "text-sky-600" },
    { label: "Urgent (≤7d)", value: urgent, icon: Bell, cls: "border-rose-200 bg-rose-50", num: "text-rose-700", ic: "text-rose-600" },
    { label: "Upcoming (8-30d)", value: upcoming, icon: CalendarDays, cls: "border-amber-200 bg-amber-50", num: "text-amber-700", ic: "text-amber-600" },
    { label: "Missing dates", value: missing, icon: AlertTriangle, cls: "border-yellow-200 bg-yellow-50", num: "text-yellow-700", ic: "text-yellow-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={cn("flex items-center gap-3 rounded-2xl border p-4", t.cls)}>
          <t.icon className={cn("size-5 shrink-0", t.ic)} />
          <div>
            <p className="text-xs text-[#6E5D57]">{t.label}</p>
            <p className={cn("font-display text-2xl font-bold leading-tight", t.num)}>{t.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
