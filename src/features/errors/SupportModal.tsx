import React, { useState } from "react";
import { submitEnquiry } from "@/client/api";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: string | number;
}

export function SupportModal({ isOpen, onClose, errorCode }: SupportModalProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState(
    errorCode ? `I ran into error ${errorCode} on the website.` : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setErrorText("Please provide your name and contact info.");
      return;
    }

    setSubmitting(true);
    setErrorText("");

    try {
      await submitEnquiry({
        name: name.trim(),
        phone: contact.trim(),
        message: `[Support Request - ${errorCode || "General"}] ${message.trim()}`,
        venue: "Online Support",
        grandTotal: 0,
        companies: ["Everest Events & Decor Support"],
        events: [
          {
            name: "Customer Support Request",
            date: new Date().toISOString().split("T")[0] ?? "",
            venue: "Website Support Portal",
            subtotal: 0,
            decorations: [],
          },
        ],
      });
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      // Fallback: If network is offline, gracefully inform
      setErrorText("Could not send online form. Please call or WhatsApp us directly below.");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(29, 26, 28, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 22,
          maxWidth: 520,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "28px 32px",
          boxShadow: "0 24px 60px rgba(60, 30, 40, 0.16)",
          position: "relative",
          border: "1.5px solid #f0e9ea",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid #f0e9ea",
            background: "#fffafb",
            color: "#1d1a1c",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
          aria-label="Close modal"
        >
          ✕
        </button>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>💌</div>
            <h3
              style={{
                fontSize: 24,
                margin: "0 0 8px",
                color: "#1d1a1c",
                fontWeight: 700,
              }}
            >
              Support Message Received
            </h3>
            <p
              style={{
                color: "#6b6b6b",
                fontSize: 13.5,
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Thank you, <b>{name}</b>. Our customer support team will contact you shortly on{" "}
              <b>{contact}</b>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              style={{
                background: "#ef5b78",
                color: "#ffffff",
                border: "none",
                borderRadius: 9999,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 18 }}>
              <span
                style={{
                  display: "inline-block",
                  background: "#fde7ed",
                  color: "#ef5b78",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: 999,
                  marginBottom: 8,
                }}
              >
                Customer Assistance
              </span>
              <h2
                style={{
                  fontSize: 24,
                  margin: "0 0 6px",
                  color: "#1d1a1c",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Need Help? We Are Here
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#6b6b6b", lineHeight: 1.5 }}>
                Reach out directly via phone or WhatsApp, or leave us a message below.
              </p>
            </div>

            {/* Direct Contact Pills */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <a
                href="tel:9828223787"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1.5px solid #f0e9ea",
                  background: "#fffafb",
                  textDecoration: "none",
                  color: "#1d1a1c",
                  fontSize: 12.5,
                  fontWeight: 500,
                  transition: "border-color 0.2s",
                }}
              >
                <span style={{ fontSize: 16 }}>📞</span>
                <div>
                  <strong style={{ display: "block", fontSize: 12 }}>Call Us</strong>
                  <span style={{ color: "#6b6b6b", fontSize: 11 }}>9828223787</span>
                </div>
              </a>

              <a
                href="https://wa.me/9779828223787"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1.5px solid #f0e9ea",
                  background: "#fffafb",
                  textDecoration: "none",
                  color: "#1d1a1c",
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 16 }}>💬</span>
                <div>
                  <strong style={{ display: "block", fontSize: 12 }}>WhatsApp</strong>
                  <span style={{ color: "#6b6b6b", fontSize: 11 }}>Direct Chat</span>
                </div>
              </a>
            </div>

            {errorText && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: 12,
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                {errorText}
              </div>
            )}

            {/* Support Message Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suvash Sharma"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #f0e9ea",
                    background: "#fffafb",
                    fontSize: 13,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Phone / WhatsApp or Email *
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 98XXXXXXXX or email@domain.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #f0e9ea",
                    background: "#fffafb",
                    fontSize: 13,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  How can we help?
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what you were trying to do or what you need assistance with..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #f0e9ea",
                    background: "#fffafb",
                    fontSize: 13,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 9999,
                    border: "1px solid #f0e9ea",
                    background: "transparent",
                    color: "#6b6b6b",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "9px 22px",
                    borderRadius: 9999,
                    border: "none",
                    background: "#ef5b78",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {submitting ? "Sending..." : "Submit Message"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
