/* Copied from UIFoundry packages/react/menu/menu.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import {
  Fragment,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

export type MenuSeparator = {
  separator: true;
};

export type MenuLeaf = {
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  danger?: boolean;
};

export type MenuItem = MenuLeaf & {
  id?: string;
  submenu?: (MenuLeaf | MenuSeparator)[];
};

export type MenuEntry = MenuItem | MenuSeparator;

export type MenuPlacement = "top" | "bottom" | "start" | "end";

export type MenuCloseReason = "escape" | "select" | "outside" | "trigger" | "tab";

export type MenuProps = {
  open: boolean;
  trigger: string;
  items: MenuEntry[];
  id?: string;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: (reason: MenuCloseReason | null) => void;
  onSelect?: (detail: { label: string; checked: boolean | null }) => void;
  placement?: MenuPlacement;
  offset?: number;
  modal?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  closeOnSelect?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsidePress?: boolean;
  triggerContent?: ReactNode;
  content?: ReactNode;
  item?: (item: MenuLeaf) => ReactNode;
  separator?: ReactNode;
};

type ItemContext = "top" | "sub";
type Phase = "closed" | "open" | "closing";

type ItemInfo = {
  key: string;
  item: MenuItem | MenuLeaf;
  context: ItemContext;
};

type RenderChild = { kind: "separator"; key: string } | { kind: "item"; key: string; item: MenuLeaf };

type RenderEntry =
  | { kind: "separator"; key: string }
  | { kind: "item"; key: string; item: MenuItem; children: RenderChild[] };

const TYPEAHEAD_RESET_MS = 500;

const caretDown = (
  <svg
    className="ss-menu__caret"
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const caretRight = (
  <svg
    className="ss-menu__caret"
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

const checkMark = (
  <svg
    className="ss-menu__check"
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 8.5l3 3 6-7.5" />
  </svg>
);

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

function isSeparator(entry: MenuEntry | MenuLeaf): entry is MenuSeparator {
  return "separator" in entry;
}

function iconSvg(markup: string): ReactNode {
  return (
    <svg
      className="ss-menu__icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function renderEntries(items: MenuEntry[]): RenderEntry[] {
  return items.map<RenderEntry>((entry, index) => {
    const key = String(index);
    if (isSeparator(entry)) {
      return { key, kind: "separator" };
    }
    return {
      key,
      kind: "item",
      item: entry,
      children: (entry.submenu ?? []).map<RenderChild>((child, childIndex) => {
        const childKey = `${key}.${childIndex}`;
        if (isSeparator(child)) {
          return { key: childKey, kind: "separator" };
        }
        return { key: childKey, kind: "item", item: child };
      }),
    };
  });
}

function surfaceItems(surface: HTMLElement): HTMLElement[] {
  const all = surface.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]');
  return Array.from(all).filter((entry) => entry.closest("[data-ss-menu-surface]") === surface);
}

function enabledItems(surface: HTMLElement): HTMLElement[] {
  return surfaceItems(surface).filter((entry) => entry.getAttribute("aria-disabled") !== "true");
}

function itemLabel(item: HTMLElement): string {
  const label = item.querySelector(".ss-menu__label");
  const text = label ? label.textContent : item.textContent;
  return text ? text.trim() : "";
}

function tokenPx(el: HTMLElement, name: string): number {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (raw.slice(-3) === "rem") {
    return value * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
  return value || 0;
}

function findTypeaheadMatch(items: HTMLElement[], query: string, from: number): HTMLElement | null {
  for (let i = 0; i < items.length; i += 1) {
    const candidate = items[(from + 1 + i) % items.length];
    if (candidate && itemLabel(candidate).toLowerCase().lastIndexOf(query, 0) === 0) return candidate;
  }
  return null;
}

export function Menu(props: MenuProps): ReactNode {
  const {
    open,
    trigger,
    items,
    id,
    onOpenChange,
    onOpen,
    onClose,
    onSelect,
    placement = "bottom",
    offset,
    modal = false,
    initialFocus,
    closeOnSelect = true,
    closeOnEscape = true,
    closeOnOutsidePress = true,
    triggerContent,
    content,
    item,
    separator,
  } = props;

  const rawId = useId();
  const uid = `ss-menu-${rawId}`;
  const triggerId = id ? `${id}-trigger` : `${uid}-trigger`;
  const surfaceId = id ? `${id}-surface` : `${uid}-surface`;

  const rootElRef = useRef<HTMLDivElement | null>(null);
  const triggerElRef = useRef<HTMLButtonElement | null>(null);
  const surfaceElRef = useRef<HTMLDivElement | null>(null);
  const itemElsRef = useRef(new Map<string, HTMLElement>());
  const itemInfosRef = useRef(new Map<HTMLElement, ItemInfo>());
  const subElsRef = useRef(new Map<string, HTMLDivElement>());

  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  const [openTick, setOpenTick] = useState(0);
  const [topActiveKey, setTopActiveKey] = useState<string | null>(null);
  const [subActiveKey, setSubActiveKey] = useState<string | null>(null);
  const [openSubKey, setOpenSubKeyState] = useState<string | null>(null);
  const [checkedMap, setCheckedMap] = useState(() => new Map<MenuLeaf, boolean>());

  const latest = useRef({
    open,
    onOpenChange,
    onOpen,
    onClose,
    onSelect,
    placement,
    offset,
    modal,
    initialFocus,
    closeOnSelect,
    closeOnEscape,
    closeOnOutsidePress,
  });
  const resolvedPlacementRef = useRef<MenuPlacement>(placement);
  const subPlacementsRef = useRef<Record<string, MenuPlacement>>({});
  const topActiveElRef = useRef<HTMLElement | null>(null);
  const subActiveElRef = useRef<HTMLElement | null>(null);
  const openSubElRef = useRef<HTMLDivElement | null>(null);
  const openSubParentElRef = useRef<HTMLElement | null>(null);
  const openSubKeyRef = useRef<string | null>(null);
  const pendingCloseReasonRef = useRef<MenuCloseReason | null>(null);
  const closingReasonRef = useRef<MenuCloseReason | null>(null);
  const bufferRef = useRef("");
  const bufferTimerRef = useRef(0);

  function setOpenSubKey(key: string | null): void {
    openSubKeyRef.current = key;
    setOpenSubKeyState(key);
  }

  function registerItem(raw: HTMLElement | null, entry: RenderEntry): void {
    const previous = itemElsRef.current.get(entry.key);
    if (previous && previous !== raw) itemInfosRef.current.delete(previous);
    if (raw instanceof HTMLElement && entry.kind === "item") {
      itemElsRef.current.set(entry.key, raw);
      itemInfosRef.current.set(raw, { key: entry.key, item: entry.item, context: "top" });
      return;
    }
    itemElsRef.current.delete(entry.key);
    if (previous) itemInfosRef.current.delete(previous);
  }

  function registerChild(raw: HTMLElement | null, child: RenderChild): void {
    const previous = itemElsRef.current.get(child.key);
    if (previous && previous !== raw) itemInfosRef.current.delete(previous);
    if (raw instanceof HTMLElement && child.kind === "item") {
      itemElsRef.current.set(child.key, raw);
      itemInfosRef.current.set(raw, { key: child.key, item: child.item, context: "sub" });
      return;
    }
    itemElsRef.current.delete(child.key);
    if (previous) itemInfosRef.current.delete(previous);
  }

  function registerSub(raw: HTMLDivElement | null, key: string): void {
    if (raw instanceof HTMLElement) subElsRef.current.set(key, raw);
    else subElsRef.current.delete(key);
  }

  function branchItemId(entry: MenuItem, key: string): string {
    return entry.id ?? `${uid}-i-${key}`;
  }

  function branchSurfaceId(entry: MenuItem, key: string): string {
    return `${branchItemId(entry, key)}-sub`;
  }

  function contextKind(): ItemContext {
    return openSubElRef.current ? "sub" : "top";
  }

  function contextSurface(): HTMLElement | null {
    return openSubElRef.current ?? surfaceElRef.current;
  }

  function activeEl(): HTMLElement | null {
    return openSubElRef.current ? subActiveElRef.current : topActiveElRef.current;
  }

  function setActive(item: HTMLElement | null, kind: ItemContext, surface: HTMLElement | null): void {
    const info = item ? itemInfosRef.current.get(item) : undefined;
    if (kind === "top") {
      topActiveElRef.current = item;
      setTopActiveKey(info ? info.key : null);
    } else {
      subActiveElRef.current = item;
      setSubActiveKey(info ? info.key : null);
    }
    if (!surface) return;
    for (const it of surfaceItems(surface)) {
      if (itemInfosRef.current.has(it)) continue;
      it.tabIndex = it === item ? 0 : -1;
      if (it !== item) it.removeAttribute("data-highlighted");
    }
    if (item && !itemInfosRef.current.has(item)) item.setAttribute("data-highlighted", "true");
  }

  function focusItem(item: HTMLElement | null, kind: ItemContext): void {
    if (!item) return;
    setActive(item, kind, kind === "sub" ? openSubElRef.current : surfaceElRef.current);
    item.focus();
  }

  function moveHighlight(step: number): void {
    const surface = contextSurface();
    if (!surface) return;
    const kind = contextKind();
    const list = enabledItems(surface);
    if (!list.length) return;
    const current = activeEl();
    const index = current ? list.indexOf(current) : -1;
    focusItem(list[(index + step + list.length) % list.length] ?? null, kind);
  }

  function jumpToEdge(last: boolean): void {
    const surface = contextSurface();
    if (!surface) return;
    const list = enabledItems(surface);
    if (!list.length) return;
    focusItem((last ? list[list.length - 1] : list[0]) ?? null, contextKind());
  }

  function typeahead(event: KeyboardEvent<HTMLDivElement>): void {
    const key = event.key;
    if (key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    window.clearTimeout(bufferTimerRef.current);
    const surface = contextSurface();
    const list = surface ? enabledItems(surface) : [];
    const current = activeEl();
    const at = current ? list.indexOf(current) : -1;
    const from = Math.max(at, 0);
    let query = (bufferRef.current + key).toLowerCase();
    let match = findTypeaheadMatch(list, query, from);
    if (!match && query.length > 1) {
      query = key.toLowerCase();
      match = findTypeaheadMatch(list, query, from);
    }
    bufferRef.current = query;
    if (match) focusItem(match, contextKind());
    bufferTimerRef.current = window.setTimeout(() => {
      bufferRef.current = "";
    }, TYPEAHEAD_RESET_MS);
  }

  function positionSurface(): void {
    const root = rootElRef.current;
    const trigger = triggerElRef.current;
    const surface = surfaceElRef.current;
    if (!root || !trigger || !surface) return;
    const marginPx = tokenPx(surface, "--ss-menu-margin");
    const requestedOffset = latest.current.offset;
    const gapPx = requestedOffset !== undefined ? requestedOffset : tokenPx(surface, "--ss-menu-gap");
    const rootRect = root.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const width = surface.offsetWidth;
    const height = surface.offsetHeight;
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;

    /* The flip and the clamp both serve a trigger the user can see. A trigger below the fold keeps
       the placement it asked for and its surface beside it; resolving against a viewport it is not
       in would drag the surface up the page and detain it from the control it belongs to. */
    const triggerInView =
      triggerRect.bottom > 0 &&
      triggerRect.top < viewH &&
      triggerRect.right > 0 &&
      triggerRect.left < viewW;

    function coordsFor(candidate: MenuPlacement) {
      if (candidate === "bottom") {
        return { x: triggerRect.left - rootRect.left, y: triggerRect.bottom - rootRect.top + gapPx };
      }
      if (candidate === "top") {
        return { x: triggerRect.left - rootRect.left, y: triggerRect.top - rootRect.top - gapPx - height };
      }
      if (candidate === "start") {
        return { x: triggerRect.left - rootRect.left - gapPx - width, y: triggerRect.top - rootRect.top };
      }
      return { x: triggerRect.right - rootRect.left + gapPx, y: triggerRect.top - rootRect.top };
    }

    function fits(point: { x: number; y: number }, candidate: MenuPlacement) {
      const left = rootRect.left + point.x;
      const top = rootRect.top + point.y;
      if (candidate === "bottom") return top + height <= viewH - marginPx;
      if (candidate === "top") return top >= marginPx;
      if (candidate === "start") return left >= marginPx;
      return left + width <= viewW - marginPx;
    }

    const requested = latest.current.placement;
    const order: MenuPlacement[] =
      requested === "bottom"
        ? ["bottom", "top"]
        : requested === "top"
          ? ["top", "bottom"]
          : requested === "start"
            ? ["start", "end"]
            : ["end", "start"];
    let winner = order[0];
    let point = coordsFor(winner);
    if (triggerInView && !fits(point, winner)) {
      winner = order[1];
      point = coordsFor(winner);
    }

    let left = rootRect.left + point.x;
    let top = rootRect.top + point.y;
    if (triggerInView) {
      left = Math.min(Math.max(left, marginPx), Math.max(marginPx, viewW - marginPx - width));
      top = Math.min(Math.max(top, marginPx), Math.max(marginPx, viewH - marginPx - height));
    }

    resolvedPlacementRef.current = winner;
    surface.setAttribute("data-placement", winner);
    surface.style.left = `${left - rootRect.left}px`;
    surface.style.top = `${top - rootRect.top}px`;
    surface.style.right = "auto";
    surface.style.bottom = "auto";
  }

  function positionSubmenu(key: string): void {
    const sub = subElsRef.current.get(key);
    const surface = surfaceElRef.current;
    if (!sub || !surface) return;
    const marginPx = tokenPx(surface, "--ss-menu-margin");
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;
    sub.style.top = "";
    const flipped: MenuPlacement = sub.getBoundingClientRect().right > viewW - marginPx ? "start" : "end";
    subPlacementsRef.current[key] = flipped;
    if (sub.getAttribute("data-placement") !== flipped) sub.setAttribute("data-placement", flipped);
    const rect = sub.getBoundingClientRect();
    const roomDown = viewH - marginPx - rect.bottom;
    const roomUp = rect.top - marginPx;
    if (roomDown < 0) sub.style.top = `${sub.offsetTop + roomDown}px`;
    else if (roomUp < 0) sub.style.top = `${sub.offsetTop - roomUp}px`;
  }

  function openSubmenuFor(item: HTMLElement, toggle: boolean): void {
    const info = itemInfosRef.current.get(item);
    const sub = info ? subElsRef.current.get(info.key) : undefined;
    if (!info || !sub) return;
    if (openSubElRef.current === sub) {
      if (toggle) closeSubmenuOnly();
      return;
    }
    if (openSubElRef.current) closeSubmenuOnly();
    openSubElRef.current = sub;
    openSubParentElRef.current = item;
    setOpenSubKey(info.key);
  }

  function closeSubmenuOnly(): void {
    const sub = openSubElRef.current;
    if (!sub) return;
    const parent = openSubParentElRef.current;
    openSubElRef.current = null;
    openSubParentElRef.current = null;
    setOpenSubKey(null);
    sub.style.top = "";
    if (parent) focusItem(parent, "top");
  }

  function requestOpen(): void {
    if (phase !== "closed") return;
    latest.current.onOpenChange?.(true);
  }

  function requestClose(reason: MenuCloseReason): void {
    if (phase !== "open") return;
    pendingCloseReasonRef.current = reason;
    latest.current.onOpenChange?.(false);
  }

  function initialFocusTarget(): HTMLElement | null {
    const surface = surfaceElRef.current;
    const chosen = latest.current.initialFocus?.current ?? null;
    if (chosen && surface && surface.contains(chosen) && chosen.getAttribute("aria-disabled") !== "true") {
      return chosen;
    }
    const first = surface ? enabledItems(surface)[0] : undefined;
    return first ?? null;
  }

  function openStart(): void {
    setOpenTick((tick) => tick + 1);
    setPhase("open");
  }

  function closeStart(reason: MenuCloseReason | null): void {
    if (phase !== "open") return;
    latest.current.onClose?.(reason);
    closeSubmenuOnly();
    closingReasonRef.current = reason;
    setPhase("closing");
  }

  function finish(reason: MenuCloseReason | null): void {
    setPhase("closed");
    bufferRef.current = "";
    window.clearTimeout(bufferTimerRef.current);
    const trigger = triggerElRef.current;
    if (trigger) {
      if (reason === "escape" || reason === "select") {
        trigger.focus();
      } else if (reason === "outside") {
        const active = document.activeElement;
        if (active === document.body || (rootElRef.current !== null && rootElRef.current.contains(active))) {
          trigger.focus();
        }
      }
    }
    if (latest.current.open) openStart();
  }

  function isChecked(entry: MenuItem | MenuLeaf): boolean {
    return checkedMap.get(entry) ?? entry.checked === true;
  }

  function dispatchSelect(item: HTMLElement, checked: boolean | null): void {
    latest.current.onSelect?.({ label: itemLabel(item), checked });
  }

  function activate(item: HTMLElement | null): void {
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    if (item.getAttribute("aria-haspopup") === "menu") {
      openSubmenuFor(item, true);
      return;
    }
    const info = itemInfosRef.current.get(item);
    if (item.getAttribute("role") === "menuitemcheckbox") {
      if (info) {
        const checked = isChecked(info.item);
        setCheckedMap((prev) => {
          const next = new Map(prev);
          next.set(info.item, !checked);
          return next;
        });
        dispatchSelect(item, !checked);
      } else {
        const checked = item.getAttribute("aria-checked") === "true";
        item.setAttribute("aria-checked", checked ? "false" : "true");
        dispatchSelect(item, !checked);
      }
    } else {
      dispatchSelect(item, null);
    }
    if (latest.current.closeOnSelect) requestClose("select");
  }

  function onKeydown(event: KeyboardEvent<HTMLDivElement>): void {
    if (phase === "closing") return;
    if (phase !== "open") {
      const trigger = triggerElRef.current;
      if (trigger && trigger.contains(event.target as Node | null) && event.key === "ArrowDown") {
        event.preventDefault();
        requestOpen();
      }
      return;
    }
    const inSubmenu = openSubElRef.current !== null;
    if (event.key === "Escape") {
      if (!latest.current.closeOnEscape) return;
      event.preventDefault();
      if (inSubmenu) closeSubmenuOnly();
      else requestClose("escape");
      return;
    }
    if (event.key === "Tab") {
      requestClose("tab");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      jumpToEdge(false);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      jumpToEdge(true);
      return;
    }
    if (event.key === "ArrowRight") {
      if (!inSubmenu) {
        const active = topActiveElRef.current;
        if (active && active.getAttribute("aria-haspopup") === "menu") {
          event.preventDefault();
          openSubmenuFor(active, false);
        }
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      if (inSubmenu) {
        event.preventDefault();
        closeSubmenuOnly();
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(activeEl());
      return;
    }
    typeahead(event);
  }

  function onTriggerClick(): void {
    if (phase === "closing") return;
    if (phase === "open") requestClose("trigger");
    else requestOpen();
  }

  function onRootClick(event: MouseEvent<HTMLDivElement>): void {
    if (phase === "closing" || phase !== "open") return;
    const target = event.target;
    if (!(target instanceof Element) || typeof target.closest !== "function") return;
    const item = target.closest('[role="menuitem"], [role="menuitemcheckbox"]');
    const surface = surfaceElRef.current;
    if (item instanceof HTMLElement && surface && surface.contains(item)) activate(item);
  }

  function innards(leaf: MenuLeaf, branch: boolean): ReactNode {
    if (item) {
      return item(leaf);
    }
    if (branch) {
      return (
        <>
          {leaf.icon ? iconSvg(leaf.icon) : null}
          <span className="ss-menu__label">{leaf.label}</span>
          {leaf.shortcut ? <span className="ss-menu__shortcut">{leaf.shortcut}</span> : null}
          {caretRight}
        </>
      );
    }
    return (
      <>
        {leaf.checked !== undefined ? checkMark : leaf.icon ? iconSvg(leaf.icon) : null}
        <span className="ss-menu__label">{leaf.label}</span>
        {leaf.shortcut ? <span className="ss-menu__shortcut">{leaf.shortcut}</span> : null}
      </>
    );
  }

  useLayoutEffect(() => {
    latest.current = {
      open,
      onOpenChange,
      onOpen,
      onClose,
      onSelect,
      placement,
      offset,
      modal,
      initialFocus,
      closeOnSelect,
      closeOnEscape,
      closeOnOutsidePress,
    };
  });

  const prevOpenRef = useRef(open);
  useLayoutEffect(() => {
    if (prevOpenRef.current === open) return;
    prevOpenRef.current = open;
    if (open) {
      pendingCloseReasonRef.current = null;
      if (phase !== "closed") return;
      openStart();
    } else {
      const reason = pendingCloseReasonRef.current;
      pendingCloseReasonRef.current = null;
      closeStart(reason);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (phase !== "open") return;
    const surface = surfaceElRef.current;
    if (!surface) return;
    positionSurface();
  }, [phase, openTick]);

  useLayoutEffect(() => {
    if (phase !== "open") return;
    const onOutsidePress = (event: PointerEvent) => {
      const root = rootElRef.current;
      if (!root) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      if (!latest.current.closeOnOutsidePress) return;
      requestClose("outside");
    };
    const onReflow = () => {
      positionSurface();
      const key = openSubKeyRef.current;
      if (key !== null) positionSubmenu(key);
    };
    document.addEventListener("pointerdown", onOutsidePress);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePress);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "open" || !modal) return;
    document.documentElement.classList.add("ss-menu-lock");
    return () => {
      document.documentElement.classList.remove("ss-menu-lock");
    };
  }, [phase, modal]);

  useLayoutEffect(() => {
    if (phase !== "open") return;
    if (openTick === 0) return;
    focusItem(initialFocusTarget(), "top");
    latest.current.onOpen?.();
  }, [phase, openTick]);

  useLayoutEffect(() => {
    if (phase !== "closing") return;
    const surface = surfaceElRef.current;
    if (!surface) return;
    const reason = closingReasonRef.current;
    if (getComputedStyle(surface).animationName === "none") {
      finish(reason);
      return;
    }
    const onEnd = (event: AnimationEvent) => {
      if (event.target !== surface) return;
      finish(reason);
    };
    surface.addEventListener("animationend", onEnd);
    return () => {
      surface.removeEventListener("animationend", onEnd);
    };
  }, [phase]);

  useLayoutEffect(() => {
    if (openSubKey === null) return;
    positionSubmenu(openSubKey);
    const sub = subElsRef.current.get(openSubKey);
    if (!sub || openSubElRef.current !== sub) return;
    const first = enabledItems(sub)[0] ?? null;
    focusItem(first, "sub");
  }, [openSubKey]);

  useLayoutEffect(() => {
    return () => {
      window.clearTimeout(bufferTimerRef.current);
    };
  }, []);

  const rendered = renderEntries(items);

  return (
    <div
      ref={rootElRef}
      className="ss-menu"
      data-ss-menu=""
      data-state={phase}
      data-placement={placement}
      data-modal={modal ? "true" : undefined}
      data-close-on-select={closeOnSelect ? undefined : "false"}
      data-close-on-escape={closeOnEscape ? undefined : "false"}
      data-close-on-outside-press={closeOnOutsidePress ? undefined : "false"}
      onKeyDown={onKeydown}
      onClick={onRootClick}
    >
      <button
        ref={triggerElRef}
        className="ss-menu__trigger"
        type="button"
        id={triggerId}
        aria-haspopup="menu"
        aria-expanded={phase === "open" ? "true" : "false"}
        aria-controls={surfaceId}
        aria-label={triggerContent ? trigger : undefined}
        onClick={onTriggerClick}
      >
        {triggerContent ?? (
          <>
            {trigger}
            {caretDown}
          </>
        )}
      </button>
      <div
        ref={surfaceElRef}
        className="ss-menu__surface"
        role="menu"
        id={surfaceId}
        aria-labelledby={triggerId}
        data-placement={resolvedPlacementRef.current}
        hidden={phase === "closed"}
        data-ss-menu-surface=""
      >
        <div className="ss-menu__scroll">
          {content ??
            rendered.map((entry) => {
              if (entry.kind === "separator") {
                return <Fragment key={entry.key}>{separator ?? <hr className="ss-menu__separator" />}</Fragment>;
              }
              if (entry.item.submenu) {
                return (
                  <div className="ss-menu__branch" key={entry.key}>
                    <button
                      ref={(el) => {
                        registerItem(el, entry);
                      }}
                      className={classes("ss-menu__item", entry.item.danger ? "ss-menu__item--danger" : undefined)}
                      type="button"
                      role="menuitem"
                      id={branchItemId(entry.item, entry.key)}
                      tabIndex={entry.key === topActiveKey ? 0 : -1}
                      data-highlighted={entry.key === topActiveKey ? "true" : undefined}
                      aria-haspopup="menu"
                      aria-expanded={openSubKey === entry.key ? "true" : "false"}
                      aria-controls={branchSurfaceId(entry.item, entry.key)}
                    >
                      {innards(entry.item, true)}
                    </button>
                    <div
                      ref={(el) => {
                        registerSub(el, entry.key);
                      }}
                      className="ss-menu__surface"
                      role="menu"
                      id={branchSurfaceId(entry.item, entry.key)}
                      aria-labelledby={branchItemId(entry.item, entry.key)}
                      data-placement={subPlacementsRef.current[entry.key] ?? "end"}
                      hidden={openSubKey !== entry.key}
                      data-ss-menu-surface=""
                    >
                      <div className="ss-menu__scroll">
                        {entry.children.map((child) => {
                          if (child.kind === "separator") {
                            return (
                              <Fragment key={child.key}>{separator ?? <hr className="ss-menu__separator" />}</Fragment>
                            );
                          }
                          return (
                            <button
                              key={child.key}
                              ref={(el) => {
                                registerChild(el, child);
                              }}
                              className={classes(
                                "ss-menu__item",
                                child.item.danger ? "ss-menu__item--danger" : undefined,
                              )}
                              type="button"
                              role={child.item.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
                              tabIndex={child.key === subActiveKey ? 0 : -1}
                              data-highlighted={child.key === subActiveKey ? "true" : undefined}
                              aria-disabled={child.item.disabled ? "true" : undefined}
                              aria-checked={
                                child.item.checked !== undefined ? (isChecked(child.item) ? "true" : "false") : undefined
                              }
                            >
                              {innards(child.item, false)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <button
                  key={entry.key}
                  ref={(el) => {
                    registerItem(el, entry);
                  }}
                  className={classes("ss-menu__item", entry.item.danger ? "ss-menu__item--danger" : undefined)}
                  type="button"
                  role={entry.item.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
                  id={entry.item.id}
                  tabIndex={entry.key === topActiveKey ? 0 : -1}
                  data-highlighted={entry.key === topActiveKey ? "true" : undefined}
                  aria-disabled={entry.item.disabled ? "true" : undefined}
                  aria-checked={
                    entry.item.checked !== undefined ? (isChecked(entry.item) ? "true" : "false") : undefined
                  }
                >
                  {innards(entry.item, false)}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
