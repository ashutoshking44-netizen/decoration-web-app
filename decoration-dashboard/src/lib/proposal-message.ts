import { type BookedClient, type ClientCeremonyItem, getClientTotal, getCeremonySubtotal } from "./clients";

/** The ceremonies shown in a proposal (a single default one when none are stored). */
export function proposalCeremonies(client: BookedClient | null): ClientCeremonyItem[] {
  if (!client?.ceremonies || client.ceremonies.length === 0) {
    return [
      {
        id: "c-default",
        name: client?.event_type || "Wedding Ceremony",
        date: client?.event_date || "Event Date",
        venue: client?.venue || "Venue On Record",
        setupName: client?.decorations?.[0]?.name || "Custom Royal Stage Setup",
        setupPrice: client?.total_amount || 65000,
        subtotal: client?.total_amount || 65000,
        category: client?.decorations?.[0]?.type || "Stage",
        setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
      },
    ];
  }
  return client.ceremonies;
}

/** Grand total in NPR across the ceremonies (falls back to the booking total). */
export function proposalTotal(client: BookedClient | null, ceremonies: ClientCeremonyItem[]): number {
  if (!client) return 0;
  const directTotal = getClientTotal(client);
  if (directTotal > 0) return directTotal;
  const sum = ceremonies.reduce((s, c) => s + (Number(c.subtotal) || getCeremonySubtotal(c) || Number(c.setupPrice) || 0), 0);
  return sum > 0 ? sum : client.total_amount;
}

/** Public proposal link for a booked client. */
export function proposalUrlFor(client: BookedClient): string {
  const id = client.proposal_id || client.id;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://decorportal.com";
  return `${origin}/proposal/${id}`;
}

/** The WhatsApp message sent with a proposal. */
export function buildProposalMessage(
  client: BookedClient,
  proposalUrl: string,
  companyName = "Decoration Portal Studio",
  companyPhone = "+977 9801234567",
): string {
  const ceremonies = proposalCeremonies(client);
  const total = proposalTotal(client, ceremonies);

  const ceremonyLines = ceremonies
    .map((c) => {
      const setup = c.setupName ? `*${c.setupName}* (${c.category || "Decor"})` : "*Custom Designed Setup*";
      const price = c.subtotal || c.setupPrice ? ` — Rs. ${Number(c.subtotal || c.setupPrice).toLocaleString()}` : "";
      return `• *${c.name}* (${c.date})\n  📍 ${c.venue}\n  ✨ Setup: ${setup}${price}`;
    })
    .join("\n\n");

  return `🌸 *NAMASTE ${client.client_name.toUpperCase()}!* 🌸
Warmest greetings from *${companyName}*.

We have curated your customized, multi-ceremony wedding decoration proposal based on your preferences:

━━━━━━━━━━━━━━━━━━━━━━
💍 *WEDDING CEREMONY ITINERARY & SETUPS:*
━━━━━━━━━━━━━━━━━━━━━━
${ceremonyLines}

━━━━━━━━━━━━━━━━━━━━━━
💎 *COMBINED GRAND TOTAL:* Rs. ${total.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━

🔗 *VIEW YOUR LIVE INTERACTIVE PROPOSAL:*
${proposalUrl}
_(Includes high-res moodboards, setup dimensions, floral recipes & booking breakdown)_

To confirm your dates or request bespoke styling modifications, simply reply to this message. We would be honored to craft your milestone journey!

Warm regards,
*${client.handler ? client.handler : "Events Team"}*
${companyName} | 📞 ${companyPhone}`;
}
