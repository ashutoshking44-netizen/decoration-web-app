import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { DecorationItem } from "../types";
import { getDecorationSlug } from "../lib/slug";
import { SKELETON_KEYS } from "../lib/loadingSkeleton";

interface FeaturedCarouselProps {
  catalog: DecorationItem[];
  loading?: boolean;
  getVendorName?: (item: DecorationItem) => string;
}

type LoopItem = DecorationItem & { _loopKey: string };

const AUTO_SPEED = 36; // px per second: calm, continuous motion
const DRAG_THRESHOLD = 5; // px before a press becomes a drag (keeps taps as clicks)
const FLICK_MIN_VELOCITY = 0.12; // px/ms needed to start a momentum glide
const VELOCITY_STALE_MS = 80; // finger held still longer than this => no fling
const RESUME_AFTER_DRAG_MS = 1600;
const RESUME_AFTER_NAV_MS = 2200;

/** Wrap an offset into [0, setWidth) so the duplicated track loops seamlessly. */
const wrapOffset = (x: number, setWidth: number) =>
  setWidth > 0 ? ((x % setWidth) + setWidth) % setWidth : x;

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  catalog,
  loading = false,
  getVendorName,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const singleSetWidthRef = useRef(0);
  const cardStepRef = useRef(0);

  // Drag & gesture tracking
  const pointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);

  // Animation & timing
  const isPausedRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isVisibleRef = useRef(true);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The single in-flight one-off animation (momentum / arrow / dot). */
  const tweenRafRef = useRef<number | null>(null);

  // Active dot index (state only changes when the dot actually changes)
  const [activeDot, setActiveDot] = useState(0);
  const lastActiveDotRef = useRef(0);

  // Latest vendor-name resolver without re-rendering the track when the parent re-renders
  const getVendorNameRef = useRef(getVendorName);
  getVendorNameRef.current = getVendorName;

  // Duplicate items enough times so an infinite loop has seamless coverage
  const loopCatalog = useMemo<LoopItem[]>(() => {
    if (catalog.length <= 1) {
      return catalog.map((item, idx) => ({ ...item, _loopKey: `single-${item.id}-${idx}` }));
    }
    const repeats = Math.max(4, Math.ceil(12 / catalog.length));
    const list: LoopItem[] = [];
    for (let r = 0; r < repeats; r++) {
      catalog.forEach((item, i) => {
        list.push({ ...item, _loopKey: `${r}-${item.id}-${i}` });
      });
    }
    return list;
  }, [catalog]);

  const dotCount = Math.min(catalog.length, 6);

  // ---------------------------------------------------------------------------
  // Low-level helpers (no React state => no re-renders while animating)
  // ---------------------------------------------------------------------------

  // Measure card geometry once per layout change (never inside the frame loop)
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || catalog.length <= 1) return;
    const cards = el.querySelectorAll<HTMLElement>(".strip-card");
    const card0 = cards[0];
    if (!card0) return;
    const card1 = cards[1];
    const cardNext = cards[catalog.length];
    cardStepRef.current = card1
      ? card1.offsetLeft - card0.offsetLeft
      : card0.offsetWidth + (window.innerWidth <= 768 ? 12 : 18);
    singleSetWidthRef.current = cardNext
      ? cardNext.offsetLeft - card0.offsetLeft
      : cardStepRef.current * catalog.length;
    offsetRef.current = wrapOffset(offsetRef.current, singleSetWidthRef.current);
  }, [catalog.length]);

  // Apply GPU-accelerated transform directly on the DOM node
  const applyTransform = useCallback((x: number) => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-x}px, 0, 0)`;
    }
  }, []);

  const updateActiveDot = useCallback(
    (offset: number) => {
      if (dotCount <= 1 || cardStepRef.current <= 0) return;
      const rawIdx = Math.round(offset / cardStepRef.current);
      const newDot = (((rawIdx % catalog.length) + catalog.length) % catalog.length) % dotCount;
      if (newDot !== lastActiveDotRef.current) {
        lastActiveDotRef.current = newDot;
        setActiveDot(newDot);
      }
    },
    [dotCount, catalog.length],
  );

  const setOffset = useCallback(
    (x: number) => {
      const wrapped = wrapOffset(x, singleSetWidthRef.current);
      offsetRef.current = wrapped;
      applyTransform(wrapped);
      updateActiveDot(wrapped);
    },
    [applyTransform, updateActiveDot],
  );

  const cancelTween = () => {
    if (tweenRafRef.current !== null) {
      cancelAnimationFrame(tweenRafRef.current);
      tweenRafRef.current = null;
    }
  };

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const scheduleResume = (delay: number) => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      // Stay paused while a mouse is hovering the carousel
      if (!isHoveredRef.current) isPausedRef.current = false;
    }, delay);
  };

  /** Pause auto-scroll and stop any running one-off animation. */
  const takeControl = () => {
    cancelTween();
    clearResumeTimer();
    isPausedRef.current = true;
  };

  /** Ease the offset from its current value to `target` (arrow / dot navigation). */
  const tweenTo = (target: number, duration: number) => {
    takeControl();
    const start = offsetRef.current;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setOffset(start + (target - start) * ease);
      if (progress < 1) {
        tweenRafRef.current = requestAnimationFrame(step);
      } else {
        tweenRafRef.current = null;
        scheduleResume(RESUME_AFTER_NAV_MS);
      }
    };
    tweenRafRef.current = requestAnimationFrame(step);
  };

  /** Natural deceleration after a flick. */
  const startMomentumGlide = (initialVelocity: number) => {
    takeControl();
    let v = Math.max(-2.2, Math.min(2.2, initialVelocity));
    const friction = 0.94; // per 16ms frame
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      setOffset(offsetRef.current - v * dt);
      v *= Math.pow(friction, dt / 16);
      if (Math.abs(v) > 0.05) {
        tweenRafRef.current = requestAnimationFrame(step);
      } else {
        tweenRafRef.current = null;
        scheduleResume(RESUME_AFTER_DRAG_MS);
      }
    };
    tweenRafRef.current = requestAnimationFrame(step);
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Re-measure whenever the viewport/track size changes (resize, rotation, fonts)
  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure, { passive: true });
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [measure, loopCatalog, loading]);

  // Continuous auto-scroll. The frame loop only runs while the carousel is
  // actually on screen, so it never competes with page scrolling further down.
  useEffect(() => {
    if (loading || catalog.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const viewport = viewportRef.current;

    let rafId: number | null = null;
    let lastTime = 0;

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;
      if (!isPausedRef.current && !isDraggingRef.current && tweenRafRef.current === null) {
        setOffset(offsetRef.current + (AUTO_SPEED * dt) / 1000);
      }
      rafId = requestAnimationFrame(loop);
    };
    const start = () => {
      if (rafId !== null) return;
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    };

    let io: IntersectionObserver | null = null;
    if (viewport && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          isVisibleRef.current = Boolean(entry?.isIntersecting);
          if (isVisibleRef.current) start();
          else stop();
        },
        { threshold: 0 },
      );
      io.observe(viewport);
    } else {
      start();
    }

    return () => {
      stop();
      io?.disconnect();
    };
  }, [loading, catalog.length, setOffset]);

  // Clean up any in-flight animation / timer on unmount
  useEffect(
    () => () => {
      if (tweenRafRef.current !== null) cancelAnimationFrame(tweenRafRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Pointer drag (1:1 tracking; capture only once it's a real drag so taps
  // still click the card and vertical page scrolling stays native)
  // ---------------------------------------------------------------------------

  const setGrabbingClass = (on: boolean) => {
    viewportRef.current?.classList.toggle("is-grabbing", on);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    takeControl();
    pointerIdRef.current = e.pointerId;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - dragStartXRef.current;

    if (!isDraggingRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // Became a horizontal drag: now take over the pointer
      isDraggingRef.current = true;
      hasDraggedRef.current = true;
      setGrabbingClass(true);
      try {
        viewportRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    const now = performance.now();
    const dt = now - lastPointerTimeRef.current;
    if (dt > 8) {
      velocityRef.current = (e.clientX - lastPointerXRef.current) / dt;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    }

    setOffset(dragStartOffsetRef.current - dx);
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    setGrabbingClass(false);
    try {
      if (viewportRef.current?.hasPointerCapture(e.pointerId)) {
        viewportRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }

    // Ignore stale velocity if the finger was held still before release
    const sinceLastMove = performance.now() - lastPointerTimeRef.current;
    const v = sinceLastMove > VELOCITY_STALE_MS ? 0 : velocityRef.current;

    if (wasDragging && Math.abs(v) > FLICK_MIN_VELOCITY) {
      startMomentumGlide(v);
    } else {
      scheduleResume(RESUME_AFTER_DRAG_MS);
    }
  };

  // ---------------------------------------------------------------------------
  // Arrow / dot navigation
  // ---------------------------------------------------------------------------

  const handleArrowScroll = (direction: number) => {
    const step = cardStepRef.current > 0 ? cardStepRef.current : 280;
    tweenTo(offsetRef.current + direction * step, 320);
  };

  const handleDotClick = (i: number) => {
    const step = cardStepRef.current > 0 ? cardStepRef.current : 280;
    const setWidth = singleSetWidthRef.current || step * catalog.length;
    const currentSet = Math.floor(offsetRef.current / setWidth);
    tweenTo(currentSet * setWidth + i * step, 350);
  };

  // ---------------------------------------------------------------------------
  // Cards are memoised: dot changes / parent re-renders don't re-render them
  // ---------------------------------------------------------------------------

  const cards = useMemo(
    () =>
      loopCatalog.map((item) => {
        const resolve = getVendorNameRef.current;
        const vendor = resolve
          ? resolve(item)
          : item.ownerCompanyName || item.vendor || "Everest Events & Decor";
        return (
          <button
            type="button"
            key={item._loopKey}
            className="strip-card"
            onClick={(e) => {
              if (hasDraggedRef.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              window.location.href = `/decor/${getDecorationSlug(item)}`;
            }}
            aria-label={`View ${item.t} by ${vendor}`}
          >
            <div className="strip-img" style={{ background: "#f5f2f4" }}>
              {/* Clones reuse the same URL (served from cache), so eager loading
                  costs no extra requests and prevents blank cards sliding in. */}
              <img
                src={item.img}
                alt={item.t}
                loading="eager"
                decoding="async"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <div className="strip-cap">
                <b>{vendor}</b>
                <span>{item.t}</span>
              </div>
            </div>
          </button>
        );
      }),
    [loopCatalog],
  );

  if (loading) {
    return (
      <section className="strip-sec" aria-label="Loading featured decorations">
        <div className="co-row strip-wrap">
          <div className="strip-viewport">
            <div className="strip-track skeleton-strip-track">
              {SKELETON_KEYS.map((idx) => (
                <div key={idx} className="strip-card skeleton-strip-card">
                  <div className="strip-img skeleton-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (catalog.length === 0) return null;

  return (
    <section className="strip-sec" aria-label="Featured decorations carousel">
      <div className="co-row strip-wrap">
        {catalog.length > 1 && (
          <button
            type="button"
            className="strip-arrow left"
            aria-label="Scroll left"
            onClick={() => handleArrowScroll(-1)}
          >
            ‹
          </button>
        )}

        <div
          ref={viewportRef}
          className="strip-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          // Hover-pause for real mice only (touch taps emit fake mouseenter
          // events that would otherwise leave the carousel paused forever)
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse") return;
            isHoveredRef.current = true;
            if (!isDraggingRef.current) isPausedRef.current = true;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return;
            isHoveredRef.current = false;
            if (!isDraggingRef.current && tweenRafRef.current === null && !resumeTimerRef.current) {
              isPausedRef.current = false;
            }
          }}
        >
          <div className="strip-track gpu-accelerated" ref={trackRef}>
            {cards}
          </div>
        </div>

        {catalog.length > 1 && (
          <button
            type="button"
            className="strip-arrow right"
            aria-label="Scroll right"
            onClick={() => handleArrowScroll(1)}
          >
            ›
          </button>
        )}
      </div>

      {/* Pagination dots on mobile */}
      {catalog.length > 1 && (
        <div className="carousel-dots" aria-hidden="true">
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`carousel-dot${activeDot === i ? " active" : ""}`}
              onClick={() => handleDotClick(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
