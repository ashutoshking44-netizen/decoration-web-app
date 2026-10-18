import { getCurrentCompanyId, getCurrentCompanyName, isMyCompanyId } from "./current-company";

const normName = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * An enquiry belongs to the company it was sent to ("[Selected Company: …]" in the note).
 * Enquiries with no company tag belong to the first company.
 */
export function enquiryBelongsToCurrentCompany(e: Record<string, any>): boolean {
  const note = typeof e["private_note"] === "string" ? e["private_note"] : "";
  const match = note.match(/\[Selected Company:\s*([^\]]+)\]/i);
  if (match?.[1]) {
    const sent = normName(match[1]);
    if (sent === normName(getCurrentCompanyName())) return true;
    // Requests sent without choosing a company went to the default company name.
    return getCurrentCompanyId() === "company-1" && sent === normName("Everest Events & Decor");
  }
  const tagged = e["company_id"] || e["companyId"] || e["owner_company_id"] || e["ownerCompanyId"];
  if (tagged) return isMyCompanyId(tagged);

  // Check if any event has requested decorations belonging to current company
  const events = e["events"];
  if (Array.isArray(events)) {
    for (const ev of events) {
      const decs = ev?.["requested_decorations"] || ev?.["decorations"];
      if (Array.isArray(decs)) {
        for (const d of decs) {
          const comp = d?.["companyId"] || d?.["ownerCompanyId"] || d?.["company_id"];
          if (comp && isMyCompanyId(comp)) return true;
        }
      }
    }
  }

  return isMyCompanyId("company-1");
}

/**
 * A booked client belongs to the company that made the booking. It is read from the client's
 * own company tag, else from the enquiry it came from, else it belongs to the first company.
 */
export function bookedClientBelongsToCurrentCompany(
  c: Record<string, any>,
  findEnquiry?: (id: string) => Record<string, any> | undefined,
): boolean {
  if (c["company_id"]) return isMyCompanyId(c["company_id"]);
  const enquiryId = c["enquiry_id"] || c["id"];
  if (enquiryId && findEnquiry) {
    const enquiry = findEnquiry(String(enquiryId));
    if (enquiry) return enquiryBelongsToCurrentCompany(enquiry);
  }
  return isMyCompanyId("company-1");
}
