import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  resolveErrorConfig,
  type HttpErrorCode,
  type ErrorConfig,
} from "./error-definitions";
import { ErrorIllustration } from "./ErrorIllustration";
import { SupportModal } from "./SupportModal";

export interface ErrorPageProps {
  code?: HttpErrorCode | number | string;
  error?: Error | unknown;
  reset?: () => void;
  onRetry?: () => void;
  customTitle?: string;
  customDescription?: string;
}

export function ErrorPage({
  code,
  error,
  reset,
  onRetry,
  customTitle,
  customDescription,
}: ErrorPageProps) {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Resolve error configuration
  const config: ErrorConfig = resolveErrorConfig(
    code || (error as Error | null | undefined),
  );

  const displayTitle = customTitle || config.title;
  const displayDescription = customDescription || config.description;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (reset) {
      reset();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fffafb",
        color: "#1d1a1c",
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Interactive Micro-Interactions Styling */}
      <style>{`
        .error-pill-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .error-pill-btn:hover {
          background: #fff0f3 !important;
          border-color: #ef5b78 !important;
          color: #d84865 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(239, 91, 120, 0.18) !important;
        }
        .error-pill-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(239, 91, 120, 0.12) !important;
        }
        .error-contact-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .error-contact-btn:hover {
          background: #d84865 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(239, 91, 120, 0.32) !important;
        }
        .error-contact-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(239, 91, 120, 0.2) !important;
        }
      `}</style>

      {/* 1. Centered Header Logo (App Rose Theme) */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px, 4vh, 44px) 16px 8px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            color: "#1d1a1c",
          }}
        >
          {/* Stylized Rose Letter 'D' Petal Logo Mark */}
          <svg
            width="38"
            height="38"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="appLogoGrad"
                x1="2"
                y1="2"
                x2="32"
                y2="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ef5b78" />
                <stop offset="100%" stopColor="#d84865" />
              </linearGradient>
            </defs>
            <path
              d="M 6 4 C 6 2.8 7 2 8.2 2 H 18 C 25.5 2 31.5 8 31.5 15.5 C 31.5 23 25.5 29 18 29 H 12 C 8.7 29 6 26.3 6 23 Z"
              fill="url(#appLogoGrad)"
            />
            <path
              d="M 13.5 8.5 H 18 C 21.8 8.5 25 11.6 25 15.5 C 25 19.4 21.8 22.5 18 22.5 H 13.5 Z"
              fill="#ffffff"
            />
            <path
              d="M 6 23 C 6 20 8.5 18.5 10.5 19.5 C 12.5 20.5 13 23.5 11 26 C 9 28.5 6 27.5 6 23 Z"
              fill="#b8304c"
              opacity="0.85"
            />
          </svg>
          <span
            style={{
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#1d1a1c",
            }}
          >
            Decoration
          </span>
        </Link>
      </header>

      {/* 2. Main Error Section (Fluid, Large, Balanced Stage) */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(16px, 2.5vh, 36px) clamp(24px, 5vw, 64px)",
          maxWidth: 1380,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "clamp(36px, 6vw, 76px)",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Left Column: Big Status Number, Title, Description, and Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              position: "relative",
            }}
          >
            {/* Soft Organic Blush Backdrop Wave Behind Status Code */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                width: "fit-content",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  left: -54,
                  top: -28,
                  width: "148%",
                  height: "148%",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
                viewBox="0 0 340 190"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 15 95 C 45 42, 115 28, 180 65 C 245 102, 295 62, 325 88 C 305 145, 225 168, 150 148 C 75 128, 25 138, 15 95 Z"
                  fill="#fde7ed"
                />
              </svg>

              {/* Massive Status Code Number */}
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontFamily:
                    "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: "clamp(112px, 14vw, 172px)",
                  fontWeight: 800,
                  lineHeight: 0.9,
                  color: "#1d1a1c",
                  letterSpacing: "-0.04em",
                  display: "block",
                }}
              >
                {config.code}
              </span>

              {/* Three Radiating Rose Accent Slashes */}
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  right: -28,
                  display: "flex",
                  gap: 4.5,
                  zIndex: 2,
                }}
                aria-hidden="true"
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: 18,
                    background: "#ef5b78",
                    borderRadius: 2,
                    transform: "rotate(-25deg)",
                  }}
                />
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: 23,
                    background: "#ef5b78",
                    borderRadius: 2,
                    transform: "rotate(10deg)",
                    marginTop: -5,
                  }}
                />
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: 16,
                    background: "#ef5b78",
                    borderRadius: 2,
                    transform: "rotate(35deg)",
                  }}
                />
              </div>
            </div>

            {/* Error Title */}
            <h1
              style={{
                fontFamily:
                  "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: "clamp(34px, 4.5vw, 50px)",
                fontWeight: 700,
                color: "#1d1a1c",
                margin: "6px 0 0",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              {displayTitle}
            </h1>

            {/* User Friendly Description */}
            <p
              style={{
                fontFamily:
                  "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: "clamp(15px, 1.7vw, 17px)",
                lineHeight: 1.65,
                color: "#6b6b6b",
                margin: "4px 0 20px",
                maxWidth: 520,
              }}
            >
              {displayDescription}
            </p>

            {/* Action Buttons: Each button performs exactly according to its word and icon */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              {/* Try Again Button: Reloads the page */}
              <button
                type="button"
                onClick={handleRetry}
                className="error-pill-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "12px 28px",
                  borderRadius: 9999,
                  border: "1.5px solid #f3a4b5",
                  background: "#ffffff",
                  color: "#ef5b78",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 8px rgba(239, 91, 120, 0.08)",
                }}
              >
                {/* Refresh Circular Arrow Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef5b78"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Try Again</span>
              </button>

              {/* Go Home Button: Navigates directly to Home Page */}
              <Link
                to="/"
                className="error-pill-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "12px 28px",
                  borderRadius: 9999,
                  border: "1.5px solid #f3a4b5",
                  background: "#ffffff",
                  color: "#ef5b78",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 8px rgba(239, 91, 120, 0.08)",
                }}
              >
                {/* Clean Home Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef5b78"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Go Home</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Large Code-Based Vector SVG Illustration */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <ErrorIllustration variant={config.variant} />
          </div>
        </div>
      </main>

      {/* 3. Bottom Customer Support Banner (App Rose & Blush Palette) */}
      <footer
        style={{
          padding: "0 clamp(20px, 4vw, 64px) clamp(28px, 4.5vh, 44px)",
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #f0e9ea",
            borderRadius: 24,
            padding: "18px clamp(20px, 3.5vw, 36px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 18,
            boxShadow: "0 8px 24px rgba(60, 30, 40, 0.05)",
          }}
        >
          {/* Support Headset Icon & Text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flex: "1 1 320px",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#fde7ed",
                color: "#ef5b78",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {/* Headphone with Microphone vector */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef5b78"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </div>
            <div>
              <strong
                style={{
                  display: "block",
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: "#1d1a1c",
                  marginBottom: 2,
                }}
              >
                Need Help?
              </strong>
              <span style={{ fontSize: 13.5, color: "#6b6b6b" }}>
                Contact our support team for assistance.
              </span>
            </div>
          </div>

          {/* Middle Vertical Divider */}
          <div
            style={{
              width: 1,
              height: 38,
              background: "#f0e9ea",
              margin: "0 10px",
            }}
          />

          {/* Contact Support Action Button (Solid Brand Rose Pill) */}
          <button
            type="button"
            onClick={() => setSupportModalOpen(true)}
            className="error-contact-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontSize: 13.5,
              fontWeight: 600,
              padding: "12px 28px",
              borderRadius: 9999,
              background: "#ef5b78",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 14px rgba(239, 91, 120, 0.32)",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Contact Support</span>
          </button>
        </div>
      </footer>

      {/* 4. Decorative Background Layered Flowing Waves */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
          lineHeight: 0,
        }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "100%",
            height: "clamp(110px, 16vh, 190px)",
            display: "block",
          }}
        >
          {/* Top Subtle Wave */}
          <path
            d="M 0 100 C 360 40, 720 160, 1080 80 C 1260 40, 1380 60, 1440 70 L 1440 180 L 0 180 Z"
            fill="#fff5f7"
          />
          {/* Middle Wave */}
          <path
            d="M 0 120 C 320 80, 640 170, 960 110 C 1200 65, 1360 110, 1440 125 L 1440 180 L 0 180 Z"
            fill="#fde7ed"
          />
          {/* Bottom Wave */}
          <path
            d="M 0 145 C 400 125, 750 180, 1100 135 C 1280 110, 1390 145, 1440 150 L 1440 180 L 0 180 Z"
            fill="#fad5df"
          />
        </svg>
      </div>

      {/* Support Modal */}
      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        errorCode={config.code}
      />
    </div>
  );
}
