import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  Copy,
  MessageCircle,
  ExternalLink,
  Smartphone,
  Monitor,
  ArrowLeft,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BookedClient } from "@/lib/clients";
import { cn } from "@/lib/utils";
import { DecorationProposalView } from "./decoration-proposal-view";

export interface ProposalPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: BookedClient | null;
}

export function ProposalPreviewModal({
  open,
  onOpenChange,
  client,
}: ProposalPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"iphone" | "desktop">("iphone");
  const [fit, setFit] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Retain last active client so Radix Dialog exit animations do not glitch with null props
  const lastClientRef = useRef<BookedClient | null>(client);
  if (client) {
    lastClientRef.current = client;
  }
  const activeClient = client || lastClientRef.current;

  const clientName = activeClient?.client_name || "Client";
  const proposalId = useMemo(() => {
    if (!activeClient) return "prop-preview";
    return activeClient.proposal_id || `prop-${activeClient.id.replace(/^bk-/, "")}`;
  }, [activeClient]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const proposalUrl = `${origin}/proposal/${proposalId}`;

  // Compute --fit = Math.min(1, (availableHeight - 24) / 852)
  const computeFit = useCallback(() => {
    if (typeof window === "undefined") return;
    const vh = window.innerHeight || 800;
    const vw = window.innerWidth || 1200;

    // Controls bar height is ~48px
    const topBarHeight = controlsRef.current?.offsetHeight || 48;
    // Total vertical space available for the phone below the controls bar
    const availableHeight = Math.max(160, vh - topBarHeight - 36);
    // Total horizontal space available for narrow screens
    const availableWidth = Math.max(160, vw - 36);

    const fitH = (availableHeight - 24) / 852;
    const fitW = (availableWidth - 24) / 393;
    const computed = Math.min(1, fitH, fitW);

    setFit(Math.max(0.25, Number(computed.toFixed(4))));
  }, []);

  useEffect(() => {
    if (!open) return;
    computeFit();

    window.addEventListener("resize", computeFit);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        computeFit();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", computeFit);
      if (ro) ro.disconnect();
    };
  }, [open, computeFit]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(proposalUrl);
    toast.success("Live proposal link copied to clipboard!");
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🌸 Namaste ${clientName}! Please review your live interactive decoration proposal here: ${proposalUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-auto h-auto p-0 border-0 bg-transparent shadow-none [&>button]:hidden flex flex-col items-center justify-center focus:outline-none outline-none select-none"
      >
        <DialogTitle className="sr-only">
          {clientName} Decoration Proposal — iPhone 16 Preview
        </DialogTitle>

        {/* ── Floating Controls Bar Above Preview ── */}
        <div
          ref={controlsRef}
          className="flex items-center justify-between gap-3 w-full max-w-[420px] px-2 mb-2 select-none"
        >
          {/* Client Info + iPhone 16 Indicator */}
          <div className="flex items-center gap-2 text-white min-w-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight text-white truncate max-w-[140px] sm:max-w-[190px]">
                {clientName}
              </div>
              <div className="text-[10px] text-white/70 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>iPhone 16 Preview</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/15 mr-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode("iphone");
                  computeFit();
                }}
                className={cn(
                  "px-2 py-1 rounded-full text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer",
                  viewMode === "iphone"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-white/70 hover:text-white"
                )}
                title="iPhone 16 Mobile Preview"
              >
                <Smartphone className="size-3" />
                <span className="hidden sm:inline">Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={cn(
                  "px-2 py-1 rounded-full text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer",
                  viewMode === "desktop"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-white/70 hover:text-white"
                )}
                title="Desktop Modal View"
              >
                <Monitor className="size-3" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition backdrop-blur-md cursor-pointer"
              title="Copy proposal link"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="size-8 rounded-full bg-[#128C7E] hover:bg-[#0e7060] text-white flex items-center justify-center transition cursor-pointer shadow-xs"
              title="Share via WhatsApp"
            >
              <MessageCircle className="size-3.5" />
            </button>
            <a
              href={proposalUrl}
              target="_blank"
              rel="noreferrer"
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition backdrop-blur-md cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer ml-0.5"
              title="Close preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Main Preview Area ── */}
        {viewMode === "iphone" ? (
          /* Scaled bounding wrapper: keeps exact scaled size so modal doesn't overflow */
          <div
            ref={containerRef}
            style={{
              width: `${Math.round(393 * fit)}px`,
              height: `${Math.round(852 * fit)}px`,
              position: "relative",
              margin: "0 auto",
              flexShrink: 0,
            }}
          >
            {/* Fixed Design Size: 393px × 852px with fixed border-radius ~55px */}
            <div
              style={{
                width: "393px",
                height: "852px",
                borderRadius: "55px",
                transform: `scale(var(--fit, ${fit}))`,
                transformOrigin: "top center",
                position: "absolute",
                top: 0,
                left: "50%",
                marginLeft: "-196.5px", // Center exactly: 393 / 2
                ['--fit' as any]: fit,
                boxShadow:
                  "0 0 0 9px #1c1c1e, 0 0 0 11px #3a3a40, 0 0 0 12px rgba(255,255,255,0.12), 0 30px 70px -15px rgba(0,0,0,0.85)",
              }}
              className="bg-[#1c1c1e] select-none flex flex-col"
            >
              {/* Hardware Buttons - Left: Action Button + Volume Up + Volume Down */}
              <div
                className="absolute -left-[12px] top-[115px] w-[3px] h-[26px] bg-[#3a3a40] rounded-l-sm border-l border-white/20 shadow-xs pointer-events-none"
                title="Action Button"
              />
              <div
                className="absolute -left-[12px] top-[160px] w-[3px] h-[50px] bg-[#3a3a40] rounded-l-sm border-l border-white/20 shadow-xs pointer-events-none"
                title="Volume Up"
              />
              <div
                className="absolute -left-[12px] top-[222px] w-[3px] h-[50px] bg-[#3a3a40] rounded-l-sm border-l border-white/20 shadow-xs pointer-events-none"
                title="Volume Down"
              />

              {/* Hardware Buttons - Right: Power Button + iPhone 16 Camera Control Button */}
              <div
                className="absolute -right-[12px] top-[170px] w-[3px] h-[75px] bg-[#3a3a40] rounded-r-sm border-r border-white/20 shadow-xs pointer-events-none"
                title="Side Button"
              />
              <div
                className="absolute -right-[11.5px] top-[560px] w-[2.5px] h-[50px] bg-[#2e2e34] rounded-r-sm border-r border-white/25 shadow-xs pointer-events-none"
                title="iPhone 16 Camera Control"
              />

              {/* Top Speaker Ear-piece Slit */}
              <div className="absolute top-[4.5px] left-1/2 -translate-x-1/2 w-12 h-[3.5px] bg-[#2a2a2e] rounded-full z-40 pointer-events-none" />

              {/* iPhone 16 Screen (Exact 393px × 852px) */}
              <div className="w-[393px] h-[852px] rounded-[55px] overflow-hidden bg-[#fffaf5] relative flex flex-col shadow-inner select-auto">
                {/* Dynamic Island */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-50 w-[118px] h-[32px] bg-black rounded-full flex items-center justify-between px-3 pointer-events-none shadow-sm">
                  <div className="size-2 rounded-full bg-[#0a0f1d] ring-1 ring-[#1e293b]/70" />
                  <div className="size-2.5 rounded-full bg-[#0d1322] ring-1 ring-[#1b253b]/50" />
                </div>

                {/* iOS Status Bar */}
                <div className="absolute top-0 left-0 right-0 z-40 px-7 pt-3.5 pb-1 flex items-center justify-between pointer-events-none select-none text-[12px] font-semibold text-[#2b1216]">
                  <span className="tracking-tight font-medium">9:41</span>
                  <div className="flex items-center gap-1.5 text-[#2b1216]">
                    {/* Cellular signal */}
                    <svg className="w-3.5 h-2.5 fill-current" viewBox="0 0 17 12">
                      <rect x="0" y="9" width="2.5" height="3" rx="0.5" />
                      <rect x="4" y="6" width="2.5" height="6" rx="0.5" />
                      <rect x="8" y="3" width="2.5" height="9" rx="0.5" />
                      <rect x="12" y="0" width="2.5" height="12" rx="0.5" />
                    </svg>
                    {/* Wi-Fi */}
                    <svg className="w-3.5 h-2.5 fill-current" viewBox="0 0 16 12">
                      <path d="M8 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-4.2-2.8a6 6 0 0 1 8.4 0 .7.7 0 1 0 1-.9 7.4 7.4 0 0 0-10.4 0 .7.7 0 0 0 1 .9zm-2.8-2.8a10 10 0 0 1 14 0 .7.7 0 1 0 1-.9 11.4 11.4 0 0 0-16 0 .7.7 0 1 0 1 .9z" />
                    </svg>
                    {/* Battery */}
                    <div className="flex items-center">
                      <div className="w-5 h-2.5 rounded-[3px] border border-current p-[1px] flex items-center">
                        <div className="w-full h-full bg-current rounded-[1.5px]" />
                      </div>
                      <div className="w-[1.5px] h-1 bg-current rounded-r-xs -ml-[0.5px]" />
                    </div>
                  </div>
                </div>

                {/* 393px Wide Scrollable Proposal Container showing full content */}
                <div
                  className="w-[393px] h-full overflow-y-auto overflow-x-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-12 pb-8 select-auto"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorY: "contain",
                  }}
                >
                  <DecorationProposalView client={activeClient} isModal={false} />
                </div>

                {/* iOS Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[4.5px] bg-black/40 rounded-full z-40 pointer-events-none" />
              </div>
            </div>
          </div>
        ) : (
          /* ── Desktop View Fallback (Unchanged) ── */
          <div
            className="max-w-2xl w-[92vw] h-[84vh] p-0 overflow-y-auto rounded-3xl bg-white border border-[#fde8ec] shadow-2xl no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-auto"
            style={{ backgroundColor: "#ffffff" }}
          >
            <DecorationProposalView
              client={activeClient}
              onClose={() => onOpenChange(false)}
              isModal={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
