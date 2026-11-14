/* Copied from UIFoundry packages/react/dialog/dialog.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

export type DialogProps = {
  /** Controlled open state. The component never opens itself. */
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after the exit finishes, not at the start. */
  onClose?: () => void;
  /** Required visible title, and the dialog's accessible name. */
  title: string;
  /** Required visible description, and the dialog's accessible description. */
  description: string;
  size?: "small" | "medium" | "large";
  /** The element that should receive focus first; the first meaningful control by default. */
  initialFocus?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  /** At narrow widths the surface becomes a bottom sheet. */
  mobileSheet?: boolean;
  /** The body. */
  children?: ReactNode;
  /** The actions; the confirming action goes last. */
  footer?: ReactNode;
};

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

/**
 * Dialog overlays a focused task and makes the page beneath inert. The surface is the platform's modal
 * dialog element: showModal() supplies the dialog role, aria-modal, the inert background and the focus
 * containment, so none of that is re-implemented here. What is written is the fade pair, the scroll lock
 * that measures the scrollbar, the backdrop press that must start on the backdrop, the refusal paths a
 * blocking confirmation needs, and focus return to whatever was focused when it opened.
 */
export function Dialog(props: DialogProps): ReactNode {
  const {
    open,
    onOpenChange,
    onClose,
    title,
    description,
    size = "medium",
    initialFocus,
    closeOnEscape = true,
    closeOnBackdrop = true,
    mobileSheet = true,
    children,
    footer,
  } = props;

  const uid = useId();
  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-desc`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const pressedInside = useRef(false);
  const closing = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      lockPage();
      const target = initialFocus?.current ?? dialog.querySelector<HTMLElement>("[autofocus], button, input, select, textarea");
      target?.focus();
    }
    if (!open && dialog.open && !closing.current) {
      dialog.close();
      unlockPage();
    }
  }, [open, initialFocus]);

  useEffect(() => () => unlockPage(), []);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.classList.add("ss-dialog--closing");
      const ms = Number.parseFloat(getComputedStyle(dialog).animationDuration) * 1000 || 160;
      window.setTimeout(() => {
        dialog.classList.remove("ss-dialog--closing");
        closing.current = false;
        // The caller has already been asked to set open to false, and the effect skips its close path while the
        // fade runs, so this is the moment the platform dialog actually closes. Its close event does the unlock
        // and the focus return.
        if (dialog.open) dialog.close();
        onClose?.();
      }, ms + 60);
    }
    onOpenChange?.(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className={classes(
        "ss-dialog",
        size === "small" && "ss-dialog--small",
        size === "large" && "ss-dialog--large",
        !mobileSheet && "ss-dialog--no-sheet",
      )}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (closeOnEscape) requestClose();
      }}
      onPointerDown={(event) => {
        pressedInside.current = Boolean((event.target as HTMLElement).closest(".ss-dialog__surface"));
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-dialog-close]")) {
          requestClose();
          return;
        }
        if (target === dialogRef.current && closeOnBackdrop && !pressedInside.current) requestClose();
      }}
      onClose={() => {
        unlockPage();
        const back = returnTo.current;
        if (back && document.contains(back)) back.focus();
      }}
    >
      <div className="ss-dialog__surface">
        <header className="ss-dialog__header">
          <h2 className="ss-dialog__title" id={titleId}>
            {title}
          </h2>
          <button className="ss-dialog__close" type="button" aria-label="Close" data-dialog-close>
            ×
          </button>
        </header>
        <p className="ss-dialog__description" id={descriptionId}>
          {description}
        </p>
        <div className="ss-dialog__body">{children}</div>
        <footer className="ss-dialog__footer">{footer}</footer>
      </div>
    </dialog>
  );
}

let locked = 0;

function lockPage(): void {
  if (locked === 0) {
    const bar = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add("ss-dialog-open");
    // Without this the page jumps by the scrollbar width when the lock is added and removed.
    if (bar > 0) document.documentElement.style.paddingInlineEnd = `${bar}px`;
  }
  locked += 1;
}

function unlockPage(): void {
  locked = Math.max(0, locked - 1);
  if (locked === 0) {
    document.documentElement.classList.remove("ss-dialog-open");
    document.documentElement.style.paddingInlineEnd = "";
  }
}
