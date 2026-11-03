import React from "react";
import { Drawer } from "vaul";

export interface BottomSheetProps {
  /** Whether the sheet is visible. */
  isOpen: boolean;
  /** Called when the sheet is dismissed (pull down, overlay tap, Escape). */
  onClose: () => void;
  /** Visible heading; also used as the accessible dialog title. */
  title: React.ReactNode;
  /** Scrollable content. */
  children: React.ReactNode;
  /** Sticky action row pinned to the bottom of the sheet. */
  footer?: React.ReactNode;
  /** Extra class on the sheet panel (per-sheet styling). */
  className?: string;
  /** Keep focused text inputs visible above the on-screen keyboard (forms). */
  repositionInputs?: boolean;
}

/**
 * Shared mobile bottom sheet.
 *
 * - Pull-to-close: drag the sheet (or its handle) down past ~30% of its height,
 *   or flick it down quickly, to dismiss. Shorter drags snap back.
 * - When the body is scrolled, dragging scrolls the content first; pulling down
 *   only starts closing the sheet once the content is back at the top.
 * - Tap on the dimmed overlay or press Escape to close.
 * - Page scroll is locked while open and restored on close (handled by vaul).
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  repositionInputs = false,
}) => (
  <Drawer.Root
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
    dismissible
    shouldScaleBackground={false}
    closeThreshold={0.3}
    repositionInputs={repositionInputs}
  >
    <Drawer.Portal>
      <Drawer.Overlay className="filter-sheet-overlay" />

      <Drawer.Content
        className={`filter-sheet${className ? ` ${className}` : ""}`}
        aria-describedby={undefined}
      >
        {/* Grab handle (visual affordance; the whole sheet is draggable) */}
        <div className="sheet-handle-bar">
          <Drawer.Handle className="sheet-handle" preventCycle />
        </div>

        <div className="sheet-header">
          <Drawer.Title asChild>
            <h3 className="serif">{title}</h3>
          </Drawer.Title>
        </div>

        <div className="sheet-body">{children}</div>

        {footer && <div className="sheet-footer">{footer}</div>}
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);

/** A labelled group of selectable pills inside a bottom sheet. */
export const SheetSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="sheet-sec" role="group" aria-label={title}>
    <span className="sheet-sec-title">{title}</span>
    <div className="sheet-pills">{children}</div>
  </div>
);

/** A single selectable pill option. */
export const SheetPill: React.FC<{
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ active, onSelect, children }) => (
  <button
    type="button"
    className={`sheet-pill${active ? " on" : ""}`}
    aria-pressed={active}
    onClick={onSelect}
  >
    {children}
  </button>
);

export default BottomSheet;
