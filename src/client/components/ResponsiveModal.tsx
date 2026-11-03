import React, { useEffect, useRef } from "react";
import { BottomSheet } from "./BottomSheet";
import { useIsPhone } from "../lib/useMediaQuery";

export interface ResponsiveModalProps {
  /** Whether the popup is visible. */
  isOpen: boolean;
  /** Called on every dismiss: backdrop tap, Escape, pull-down (phones). */
  onClose: () => void;
  /** Heading shown in the phone bottom sheet (desktop renders its own heading). */
  sheetTitle: React.ReactNode;
  /** Extra class on the phone sheet panel. */
  sheetClassName?: string;
  /** Action row pinned to the bottom of the phone sheet. */
  sheetFooter?: React.ReactNode;
  /** Keep focused inputs above the on-screen keyboard (forms). */
  repositionInputs?: boolean;
  /** `id` of the desktop <dialog> (existing CSS hooks onto it). */
  dialogId: string;
  /** `aria-labelledby` of the desktop <dialog>. */
  labelledBy?: string;
  /** Content; receives `isPhone` so callers can drop desktop-only chrome. */
  children: React.ReactNode | ((isPhone: boolean) => React.ReactNode);
}

/**
 * One popup, two presentations:
 * - Phones (iOS / Android): the shared draggable BottomSheet (same as Filters / Sort / Plan).
 * - Desktop / tablet: the native centred <dialog>, closed by Escape or a backdrop click.
 */
export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  sheetTitle,
  sheetClassName,
  sheetFooter,
  repositionInputs = false,
  dialogId,
  labelledBy,
  children,
}) => {
  const isPhone = useIsPhone();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pressedOnBackdropRef = useRef(false);

  // Desktop: keep the native <dialog> in sync with `isOpen`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || isPhone) return;
    if (isOpen && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        /* already open */
      }
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen, isPhone]);

  const content = typeof children === "function" ? children(isPhone) : children;

  if (isPhone) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={sheetTitle}
        {...(sheetClassName ? { className: sheetClassName } : {})}
        {...(sheetFooter ? { footer: sheetFooter } : {})}
        repositionInputs={repositionInputs}
      >
        {content}
      </BottomSheet>
    );
  }

  /** True when the pointer is on the dimmed backdrop (outside the dialog box). */
  const isBackdropEvent = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      id={dialogId}
      ref={dialogRef}
      // Close only when press AND release both land on the backdrop
      // (selecting text inside and releasing outside must not close it)
      onMouseDown={(e) => {
        pressedOnBackdropRef.current = isBackdropEvent(e);
      }}
      onClick={(e) => {
        if (pressedOnBackdropRef.current && isBackdropEvent(e)) onClose();
        pressedOnBackdropRef.current = false;
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={labelledBy}
    >
      {isOpen ? content : null}
    </dialog>
  );
};

export default ResponsiveModal;
