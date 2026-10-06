import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { DecorationProposalView } from "@/components/company/decoration-proposal-view";
import { loadStoredBookedClients, convertEnquiryToBookedClient, type BookedClient } from "@/lib/clients";
import { loadStoredEnquiries } from "@/lib/enquiries";

export const Route = createFileRoute("/proposal/$proposalId")({
  head: () => ({
    meta: [
      { title: "Decoration Proposal — Live Client View" },
      {
        name: "description",
        content:
          "Interactive multi-day wedding decoration proposal with itinerary, itemised costs, and instant approval.",
      },
    ],
  }),
  component: ProposalRouteComponent,
});

function ProposalRouteComponent() {
  const { proposalId } = Route.useParams();

  // Check against ALL records, including deleted ones, so we can show the
  // right message instead of treating a deleted proposal as "not found".
  const allClients = useMemo(() => loadStoredBookedClients(true), []);
  const allEnquiries = useMemo(() => loadStoredEnquiries(true), []);

  const matchingClient = useMemo(() => {
    if (!proposalId) return null;
    const needle = proposalId.trim().toLowerCase();
    return (
      allClients.find((c) => {
        const pId = (c.proposal_id || "").toLowerCase();
        const cId = (c.id || "").toLowerCase();
        const cleanCId = cId.replace(/^bk-/, "");
        const cleanNeedle = needle.replace(/^prop-/, "").replace(/^q-/, "");

        return (
          pId === needle ||
          cId === needle ||
          (pId && (pId.startsWith(needle) || needle.startsWith(pId))) ||
          (cId && (cId.startsWith(needle) || needle.startsWith(cId))) ||
          (cleanCId && (cleanCId === cleanNeedle || needle.includes(cleanCId) || cleanCId.includes(needle)))
        );
      }) || null
    );
  }, [allClients, proposalId]);

  const matchingEnquiry = useMemo(() => {
    if (!proposalId) return null;
    const needle = proposalId.trim().toLowerCase();
    return (
      allEnquiries.find((e) => {
        const eId = (e.id || "").toLowerCase();
        const propId = `prop-${eId.replace("enq-", "")}`;
        const qNum = (e.quotation_number || "").toLowerCase();
        return (
          eId === needle ||
          propId === needle ||
          (qNum && (qNum === needle || needle.includes(qNum) || qNum.includes(needle))) ||
          eId.replace("enq-", "") === needle.replace("prop-", "").replace("q-", "")
        );
      }) || null
    );
  }, [allEnquiries, proposalId]);

  // Determine final live client
  const liveClient: BookedClient | null = useMemo(() => {
    if (matchingClient && !matchingClient.deleted_at) {
      return matchingClient;
    }
    if (matchingEnquiry && !matchingEnquiry.deleted_at) {
      return convertEnquiryToBookedClient(matchingEnquiry);
    }
    return null;
  }, [matchingClient, matchingEnquiry]);

  // If the record exists but is soft-deleted or record cannot be found → show friendly page
  const isDeleted = Boolean(
    (matchingClient && matchingClient.deleted_at) ||
    (matchingEnquiry && matchingEnquiry.deleted_at)
  );

  if (!liveClient || isDeleted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Jost', system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#ffffff",
            border: "1px solid #f9d3db",
            borderRadius: 24,
            padding: "48px 32px",
            textAlign: "center",
            color: "#2b1216",
            boxShadow: "0 10px 30px rgba(232,69,91,.08)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(145deg, #fde8ec, #f9d3db)",
              border: "1px solid #c9973f",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              marginBottom: 24,
            }}
          >
            🌸
          </div>

          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "#9a6a1c",
              marginBottom: 12,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Proposal Unavailable
          </p>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 30,
              fontWeight: 500,
              margin: "0 0 16px",
              lineHeight: 1.2,
              color: "#5a1a26",
            }}
          >
            {isDeleted ? (
              <>This proposal is<br />no longer available</>
            ) : (
              <>This proposal<br />isn't available</>
            )}
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#6b3a42",
              lineHeight: 1.65,
              maxWidth: "32ch",
              margin: "0 auto 32px",
            }}
          >
            {isDeleted
              ? "The decoration proposal you're looking for has been withdrawn by the studio. Please contact us directly if you have any questions."
              : "The decoration proposal you're looking for could not be found. Please verify the link or contact our studio."}
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="tel:+977"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(90deg, #e8455b, #d0384f)",
                color: "#ffffff",
                borderRadius: 999,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(232,69,91,.25)",
              }}
            >
              Contact Studio
            </a>
            <Link
              to="/enquiries"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#fde8ec",
                border: "1px solid #f9d3db",
                color: "#2b1216",
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white" style={{ backgroundColor: "#ffffff" }}>
      <DecorationProposalView client={liveClient} isModal={false} />
    </div>
  );
}
