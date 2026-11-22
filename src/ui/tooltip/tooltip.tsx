/* Copied from UIFoundry packages/react/tooltip/tooltip.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import "./tooltip.css";

export type TooltipPlacement = "top" | "bottom" | "start" | "end";

export type TooltipCloseReason = "escape" | "leave" | "blur" | "switch";

export type TooltipProps = {
  /** The short hint. A tooltip is a short sentence by contract. */
  content: ReactNode;
  /** The element that owns the hint. It keeps its own accessible name; the hint only adds context. */
  triggerContent: ReactNode;
  placement?: TooltipPlacement;
  /** Hover delay in milliseconds. The keyboard path is never delayed. */
  delay?: number;
  disabled?: boolean;
  /** Controlled form: the caller owns the open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: (reason: TooltipCloseReason | null) => void;
  /** Ref to the trigger element, for a caller that needs to focus it. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Accessible name for an icon-only trigger. The spec requires one; a hint never replaces it. */
  triggerAriaLabel?: string;
  /** Extra class on the trigger button, for the icon-only variant (.ss-tooltip__trigger--icon). */
  triggerClassName?: string;
  id?: string;
  className?: string;
};

type Phase = "hidden" | "visible" | "closing";

const DELAY_FALLBACK = 360;

function tokenPx(el: HTMLElement, name: string): number {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  let value = Number.parseFloat(raw);
  if (raw.slice(-3) === "rem") {
    value *= Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
  return value || 0;
}

function placementOrder(requested: TooltipPlacement): TooltipPlacement[] {
  if (requested === "top") return ["top", "bottom"];
  if (requested === "start") return ["start", "end"];
  if (requested === "end") return ["end", "start"];
  return ["bottom", "top"];
}

/**
 * Tooltip - a short hint for a control, shown on hover or focus.
 *
 * The contract is `specs/stillstate/tooltip.md`: hover shows after a short delay, focus shows
 * immediately, Escape hides and keeps focus on the trigger, the surface is not hoverable and
 * holds no interactive content, and the hint never covers its trigger or leaves the viewport.
 */
export function Tooltip({
  content,
  triggerContent,
  placement = "bottom",
  delay = DELAY_FALLBACK,
  disabled = false,
  open,
  onOpenChange: _onOpenChange,
  onOpen,
  onClose,
  triggerRef,
  triggerAriaLabel,
  triggerClassName,
  id,
  className,
}: TooltipProps) {
  const uid = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const innerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLSpanElement | null>(null);

  const triggerElement = triggerRef ?? innerTriggerRef;
  const controlled = open !== undefined;

  const [phase, setPhase] = useState<Phase>(controlled ? (open ? "visible" : "hidden") : "hidden");
  const [resolvedPlacement, setResolvedPlacement] = useState<TooltipPlacement>(placement);
  const [tick, setTick] = useState(0);

  const timerRef = useRef(0);
  const closingReasonRef = useRef<TooltipCloseReason | null>(null);
  const visibleRef = useRef(false);

  const triggerId = id ? `${id}-trigger` : `${uid}-trigger`;
  const surfaceId = id ? `${id}-surface` : `${uid}-surface`;

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  const finishHide = useCallback((root: HTMLElement | null) => {
    if (!root) return;
    setPhase("hidden");
    root.setAttribute("data-state", "hidden");
    root.setAttribute("data-shown", "false");
    if (surfaceRef.current) surfaceRef.current.hidden = true;
    visibleRef.current = false;
  }, []);

  const hide = useCallback(
    (reason: TooltipCloseReason) => {
      const root = rootRef.current;
      if (!root || root.getAttribute("data-state") !== "visible") return;
      closingReasonRef.current = reason;
      root.setAttribute("data-state", "closing");
      root.setAttribute("data-shown", "false");
      setPhase("closing");
      onClose?.(reason);
    },
    [onClose],
  );

  const position = useCallback(
    (root: HTMLElement, trigger: HTMLElement, surface: HTMLElement) => {
      const margin = tokenPx(surface, "--ss-tooltip-margin");
      const gap = tokenPx(surface, "--ss-tooltip-gap");
      const rootRect = root.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const width = surface.offsetWidth;
      const height = surface.offsetHeight;
      const viewW = document.documentElement.clientWidth;
      const viewH = document.documentElement.clientHeight;

      const coordsFor = (candidate: TooltipPlacement) => {
        if (candidate === "bottom") {
          return { x: triggerRect.left - rootRect.left, y: triggerRect.bottom - rootRect.top + gap };
        }
        if (candidate === "top") {
          return { x: triggerRect.left - rootRect.left, y: triggerRect.top - rootRect.top - gap - height };
        }
        if (candidate === "start") {
          return { x: triggerRect.left - rootRect.left - gap - width, y: triggerRect.top - rootRect.top };
        }
        return { x: triggerRect.right - rootRect.left + gap, y: triggerRect.top - rootRect.top };
      };

      const fits = (point: { x: number; y: number }, candidate: TooltipPlacement) => {
        const left = rootRect.left + point.x;
        const top = rootRect.top + point.y;
        if (candidate === "bottom") return top + height <= viewH - margin;
        if (candidate === "top") return top >= margin;
        if (candidate === "start") return left >= margin;
        return left + width <= viewW - margin;
      };

      const order = placementOrder(placement);

      /* The flip and the clamp both serve a trigger the user can see. A trigger below the fold keeps
         the placement it asked for and its hint beside it; resolving against a viewport it is not in
         would detach the bubble from the control it describes. */
      const triggerInView =
        triggerRect.bottom > 0 &&
        triggerRect.top < viewH &&
        triggerRect.right > 0 &&
        triggerRect.left < viewW;

      let winner = placement;
      let point = coordsFor(winner);
      if (triggerInView && !fits(point, winner)) {
        winner = order[1];
        point = coordsFor(winner);
      }

      let left = rootRect.left + point.x;
      let top = rootRect.top + point.y;
      if (triggerInView) {
        left = Math.min(Math.max(left, margin), Math.max(margin, viewW - margin - width));
        top = Math.min(Math.max(top, margin), Math.max(margin, viewH - margin - height));
      }

      setResolvedPlacement(winner);
      root.setAttribute("data-placement", winner);
      surface.style.left = `${left - rootRect.left}px`;
      surface.style.top = `${top - rootRect.top}px`;
      surface.style.right = "auto";
      surface.style.bottom = "auto";
    },
    [placement],
  );

  const show = useCallback(() => {
    const root = rootRef.current;
    const trigger = triggerElement.current;
    const surface = surfaceRef.current;
    if (!root || !trigger || !surface || disabled) return;
    surface.hidden = false;
    position(root, trigger, surface);
    setPhase("visible");
    root.setAttribute("data-state", "visible");
    root.setAttribute("data-shown", "true");
    visibleRef.current = true;
    setTick((value) => value + 1);
    onOpen?.();
  }, [disabled, onOpen, position, triggerElement]);

  /* The caller owns `open` in the controlled form; the component mirrors it. */
  useEffect(() => {
    if (!controlled) return;
    const root = rootRef.current;
    const trigger = triggerElement.current;
    const surface = surfaceRef.current;
    if (!root || !trigger || !surface) return;
    const next = open ? "visible" : "hidden";
    if (next === "visible" && phase !== "visible") {
      surface.hidden = false;
      position(root, trigger, surface);
      setPhase("visible");
      root.setAttribute("data-state", "visible");
      root.setAttribute("data-shown", "true");
      visibleRef.current = true;
      setTick((value) => value + 1);
    } else if (next === "hidden" && phase === "visible") {
      closingReasonRef.current = null;
      setPhase("hidden");
      root.setAttribute("data-state", "hidden");
      root.setAttribute("data-shown", "false");
      surface.hidden = true;
      visibleRef.current = false;
    }
  }, [controlled, open, phase, position, triggerElement]);

  /* Position once the surface is measurable. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const trigger = triggerElement.current;
    const surface = surfaceRef.current;
    if (phase !== "visible" || !root || !trigger || !surface) return;
    position(root, trigger, surface);
  }, [phase, tick, position, triggerElement]);

  /* Outside press is not a tooltip behaviour - the hint closes on leave, blur and Escape. */
  useEffect(() => {
    if (phase !== "visible") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !visibleRef.current) return;
      event.preventDefault();
      hide("escape");
      triggerElement.current?.focus();
    };
    const onScroll = () => {
      const root = rootRef.current;
      const trigger = triggerElement.current;
      const surface = surfaceRef.current;
      if (visibleRef.current && root && trigger && surface) position(root, trigger, surface);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [phase, hide, position, triggerElement]);

  /* Only the exit animation ends a close; the entry animation must not hide an open hint. */
  useEffect(() => {
    const surface = surfaceRef.current;
    const root = rootRef.current;
    if (phase !== "closing" || !surface || !root) return;
    const onEnd = (event: AnimationEvent) => {
      if (event.target !== surface) return;
      if (root.getAttribute("data-state") !== "closing") return;
      surface.removeEventListener("animationend", onEnd);
      finishHide(root);
    };
    surface.addEventListener("animationend", onEnd);
    return () => surface.removeEventListener("animationend", onEnd);
  }, [phase, finishHide]);

  useEffect(() => () => cancelPending(), [cancelPending]);

  const handlePointerEnter = () => {
    if (controlled || disabled) return;
    cancelPending();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0;
      show();
    }, delay);
  };

  const handlePointerLeave = () => {
    if (controlled || disabled) return;
    cancelPending();
    hide("leave");
  };

  const handleFocus = () => {
    if (controlled || disabled) return;
    cancelPending();
    show();
  };

  const handleBlur = () => {
    if (controlled || disabled) return;
    cancelPending();
    hide("blur");
  };

  return (
    <span
      ref={rootRef}
      className={["ss-tooltip", className].filter(Boolean).join(" ")}
      data-ss-tooltip=""
      data-state={phase}
      data-placement={placement}
      data-disabled={disabled ? "true" : undefined}
      data-controlled={controlled ? "true" : undefined}
      data-shown={phase === "visible" ? "true" : undefined}
    >
      <button
        ref={innerTriggerRef}
        className={["ss-tooltip__trigger", triggerClassName].filter(Boolean).join(" ")}
        type="button"
        id={triggerId}
        aria-describedby={surfaceId}
        aria-label={triggerAriaLabel}
        disabled={disabled}
        data-shown={phase === "visible" ? "true" : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {triggerContent}
      </button>
      <span
        ref={surfaceRef}
        className="ss-tooltip__surface"
        role="tooltip"
        id={surfaceId}
        data-placement={resolvedPlacement}
        hidden={phase === "hidden"}
      >
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
