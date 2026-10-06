import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Calendar,
  MapPin,
  Flower2,
  Share2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BookedClient, ClientCeremonyItem } from "@/lib/clients";
import { useCompanyProfile } from "@/lib/company-profile";

export interface ProposalDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: BookedClient | null;
  onQuotationStatusChange?: (status: "Sent via WhatsApp" | "Approved" | "Draft") => void;
}

export function ProposalDispatchModal({
  open,
  onOpenChange,
  client,
  onQuotationStatusChange,
}: ProposalDispatchModalProps) {
  const { profile } = useCompanyProfile();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Generate unique proposal tracking URL
  const proposalId = useMemo(() => {
    if (!client) return "prop-preview";
    return client.proposal_id || `prop-${client.id.replace(/^bk-/, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, [client]);

  const proposalUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/proposal/${proposalId}`;
    }
    return `https://decorportal.com/proposal/${proposalId}`;
  }, [proposalId]);

  // Ceremonies list
  const ceremonies: ClientCeremonyItem[] = useMemo(() => {
    if (!client?.ceremonies || client.ceremonies.length === 0) {
      return [
        {
          id: "c-default",
          name: client?.event_type || "Wedding Ceremony",
          date: client?.event_date || "Event Date",
          venue: client?.venue || "Venue On Record",
          setupName: client?.decorations?.[0]?.name || "Custom Royal Stage Setup",
          setupPrice: client?.total_amount || 65000,
          category: client?.decorations?.[0]?.type || "Stage",
          setupImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
        },
      ];
    }
    return client.ceremonies;
  }, [client]);

  // Grand total in NPR
  const grandTotalNpr = useMemo(() => {
    if (!client) return 0;
    const sumCeremonies = ceremonies.reduce(
      (sum, c) => sum + (Number(c.setupPrice) || 0),
      0
    );
    return sumCeremonies > 0 ? sumCeremonies : client.total_amount;
  }, [client, ceremonies]);

  // Automated WhatsApp Message Content
  const automatedMessage = useMemo(() => {
    if (!client) return "";
    const companyName = profile?.name || "Decoration Portal Studio";
    const companyPhone = profile?.phone || "+977 9801234567";

    const ceremonyLines = ceremonies
      .map((c, i) => {
        const setup = c.setupName ? `*${c.setupName}* (${c.category || "Decor"})` : "*Custom Designed Setup*";
        const price = c.setupPrice ? ` — Rs. ${Number(c.setupPrice).toLocaleString()}` : "";
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
💎 *COMBINED GRAND TOTAL:* Rs. ${grandTotalNpr.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━

🔗 *VIEW YOUR LIVE INTERACTIVE PROPOSAL:*
${proposalUrl}
_(Includes high-res moodboards, setup dimensions, floral recipes & booking breakdown)_

To confirm your dates or request bespoke styling modifications, simply reply to this message. We would be honored to craft your milestone journey!

Warm regards,
*${client.handler ? client.handler : "Events Team"}*
${companyName} | 📞 ${companyPhone}`;
  }, [client, ceremonies, grandTotalNpr, proposalUrl, profile]);

  if (!client) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(proposalUrl);
    setCopiedLink(true);
    toast.success("Unique proposal tracking link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(automatedMessage);
    setCopiedMessage(true);
    toast.success("Automated WhatsApp message copied to clipboard!");
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const rawPhone = client.phone || "";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(automatedMessage);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    if (onQuotationStatusChange) {
      onQuotationStatusChange("Sent via WhatsApp");
    }

    window.open(waUrl, "_blank");
    toast.success("WhatsApp opened with automated client proposal!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-[24px] p-0 bg-white border border-[#E7DCD6] shadow-xl">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#FFF5F6] via-[#FAF8F7] to-[#FBF6F3] p-6 border-b border-[#E7DCD6] relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FDEDEF] text-[#C33A56] border border-[#F9CFD7]">
              <Sparkles className="size-3 text-[#E8546F]" />
              WhatsApp Link Dispatch
            </span>
            {client.quotation_status && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-[#E7DCD6]">
                Status: {client.quotation_status}
              </span>
            )}
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl font-bold text-[#2B2320]">
            Proposal Dispatch for {client.client_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8A7B76] mt-1">
            Share this personalized multi-ceremony quotation and unique client tracking link via WhatsApp.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Unique Live Tracking URL Box */}
          <div className="rounded-2xl border border-[#E7DCD6] bg-[#FAF8F7] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4A3F3C]">
              <span className="flex items-center gap-1.5">
                <Share2 className="size-3.5 text-[#E8546F]" />
                Client Proposal Tracking URL
              </span>
              <span className="text-[11px] font-mono text-[#8A7B76]">ID: {proposalId}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-[#E7DCD6] rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {proposalUrl}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-9 px-3 rounded-xl border-[#E7DCD6] text-xs font-semibold shrink-0 gap-1.5 hover:bg-white"
              >
                {copiedLink ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-[#8A7B76]" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => window.open(proposalUrl, "_blank")}
                className="size-9 rounded-xl text-[#8A7B76] hover:text-[#2B2320] shrink-0"
                title="Preview link in new tab"
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>

          {/* Multi-Ceremony Setup Card Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A3F3C] flex items-center gap-1.5">
                <Flower2 className="size-3.5 text-[#E8546F]" />
                Assigned Ceremony Cards ({ceremonies.length})
              </span>
              <span className="text-xs font-semibold text-[#8A7B76]">
                Subtotal per Event
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {ceremonies.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="flex items-center justify-between rounded-xl border border-[#E7DCD6] bg-white p-3 hover:border-[#E8546F]/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-lg bg-stone-100 overflow-hidden border border-[#E7DCD6] shrink-0">
                      <img
                        src={
                          c.setupImage ||
                          "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80"
                        }
                        alt={c.setupName || c.name}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C33A56] bg-[#FDEDEF] px-2 py-0.2 rounded">
                          {c.name}
                        </span>
                        {c.category && (
                          <span className="text-[10px] text-[#8A7B76] font-medium">
                            · {c.category}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#2B2320] truncate mt-0.5">
                        {c.setupName || "Selected Decoration Setup"}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#8A7B76] truncate mt-0.5">
                        <span>{c.date}</span>
                        <span>·</span>
                        <span className="truncate">{c.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-[#8A7B76] block">Setup Cost</span>
                    <span className="text-xs sm:text-sm font-black text-[#2B2320] tabular-nums">
                      Rs. {(Number(c.setupPrice) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Combined Grand Total Pill */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#FAF8F7] to-[#FFF5F6] border border-[#F9CFD7] p-3.5">
              <div>
                <span className="text-xs font-bold text-[#2B2320] block">
                  Combined Grand Total (NPR)
                </span>
                <span className="text-[11px] text-[#8A7B76]">
                  All {ceremonies.length} ceremony setups included
                </span>
              </div>
              <span className="font-display text-xl sm:text-2xl font-black text-[#C33A56] tabular-nums">
                Rs. {grandTotalNpr.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Automated WhatsApp Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A3F3C] flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-emerald-600" />
                Automated WhatsApp Message Preview
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyMessage}
                className="h-7 text-xs font-semibold text-[#8A7B76] hover:text-[#2B2320] gap-1 px-2"
              >
                {copiedMessage ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </Button>
            </div>

            {/* Simulated Chat Bubble */}
            <div className="rounded-2xl border border-emerald-200/80 bg-[#E8F8EE]/40 p-4 font-sans text-xs text-slate-800 space-y-2 relative shadow-2xs">
              <div className="bg-white/95 rounded-xl p-3.5 border border-emerald-100 shadow-2xs whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed max-h-48 overflow-y-auto">
                {automatedMessage}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Client recipient: <strong>{client.phone || "No phone registered"}</strong></span>
                <span>Includes 1-click live tracking link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between gap-3 p-4 bg-[#FAF8F7] border-t border-[#E7DCD6]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 px-4 text-xs font-semibold border-[#E7DCD6] text-[#8A7B76] hover:bg-white"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyMessage}
              className="rounded-xl h-10 px-3.5 text-xs font-semibold border-[#E7DCD6] text-slate-700 hover:bg-white gap-1.5"
            >
              <Copy className="size-3.5" />
              <span>Copy Message</span>
            </Button>

            <Button
              type="button"
              onClick={handleSendWhatsApp}
              className="rounded-xl h-10 px-5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-sm gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <MessageCircle className="size-4" />
              <span>Send via WhatsApp</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProposalDispatchModal;
