import { useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadProfile } from "@/lib/company-profile";

function waDigits(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.startsWith("977")) return d;
  return d.length === 10 ? `977${d}` : d;
}

/** Builds the public enquiry-form link for this studio. */
export function buildEnquiryFormLink(): string {
  if (typeof window === "undefined") return "";
  const profile = loadProfile();
  const url = new URL("/enquire", window.location.origin);
  if (profile?.name) url.searchParams.set("s", profile.name);
  if (profile?.phone) url.searchParams.set("w", waDigits(profile.phone));
  return url.toString();
}

/**
 * Header button on the Enquiries page: copy / WhatsApp-share / preview the
 * public enquiry form link to send to a prospective client.
 */
export function ShareEnquiryFormButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = buildEnquiryFormLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Enquiry form link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — open the form and copy the address instead.");
    }
  };

  const whatsapp = () => {
    const profile = loadProfile();
    const text = `Hello! Please fill in this short form with your event details and we'll prepare your decoration quotation${
      profile?.name ? ` — ${profile.name}` : ""
    }:\n${buildEnquiryFormLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full border-[#E7DCD6] bg-white px-2.5 text-xs font-semibold text-[#5B4C47] shadow-2xs hover:border-[#FDC2CD] hover:bg-[#FFF0F3] hover:text-[#D6415C] sm:px-3"
          title="Share enquiry form"
        >
          <Share2 className="size-3.5 text-[#8A7B76]" />
          <span className="hidden md:inline">Enquiry Form</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3">
        <p className="text-xs font-semibold text-[#2B2320]">Send this form to a client</p>
        <p className="text-[11px] leading-snug text-[#8A7B76]">
          They fill in contact + event details; it arrives as a new enquiry.
        </p>
        <Button onClick={copy} variant="outline" size="sm" className="w-full justify-start gap-2">
          {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button onClick={whatsapp} variant="outline" size="sm" className="w-full justify-start gap-2">
          <MessageCircle className="size-3.5" />
          Share on WhatsApp
        </Button>
        <a
          href={buildEnquiryFormLink()}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-[11px] font-semibold text-[#D6415C] hover:underline"
        >
          Preview form
        </a>
      </PopoverContent>
    </Popover>
  );
}
