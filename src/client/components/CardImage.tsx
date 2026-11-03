import React, { useState, useRef, useEffect } from "react";

export interface CardImageProps {
  src?: string;
  alt: string;
  vendorName: string;
  category: string;
  showCategoryTag?: boolean;
}

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  vendorName,
  category,
  showCategoryTag = true,
}) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const [trackedSrc, setTrackedSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset immediately (during render) when the image URL changes, so a stale
  // "loaded"/"error" state from the previous image is never shown.
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setStatus(src ? "loading" : "error");
  }

  // Detect images that finished loading before React attached onLoad
  // (browser cache / SSR hydration), so the skeleton never gets stuck.
  useEffect(() => {
    const img = imgRef.current;
    if (!src || !img || !img.complete) return;
    setStatus(img.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  return (
    <div className={`ph${status === "loaded" ? " is-loaded" : ""}`}>
      {/* 1. Clean loading skeleton while image is loading */}
      {status === "loading" && <div className="ph-skeleton skeleton-pulse" aria-hidden="true" />}

      {/* 2. Clean fallback state when image fails to load */}
      {status === "error" && (
        <div className="ph-fallback" role="img" aria-label={alt || "Image unavailable"}>
          <svg
            className="ph-fallback-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )}

      {/* 3. Actual Image: displayed only after loaded successfully */}
      {src && status !== "error" && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={status === "loaded" ? "is-loaded" : "is-loading"}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}

      {/* 4. Badges: shown only after image has loaded successfully */}
      {status === "loaded" && (
        <>
          <span className="cn">{vendorName}</span>
          {showCategoryTag && <span className="tag">{category}</span>}
        </>
      )}
    </div>
  );
};

export default CardImage;
