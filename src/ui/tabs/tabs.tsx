/* Copied from UIFoundry packages/react/tabs/tabs.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type Tab = {
  value: string;
  label: string;
  disabled?: boolean;
  /** The panel content for this tab. Omit it on a tab that should name no panel, as a disabled one does. */
  panel?: ReactNode;
};

export type TabsProps = {
  tabs: Tab[];
  /** Controlled selection. Leave it unset and the component keeps its own value. */
  value?: string;
  /** The tab open on first paint, when the component is uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Manual means the arrows move focus and Space or Enter opens the panel. */
  activation?: "automatic" | "manual";
  orientation?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large";
  /** The tablist's accessible name; the markup form of this is aria-label on the list. */
  caption?: string;
};

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

/**
 * Tabs switches between peer panels with the platform's tab pattern: a tablist of real buttons, a
 * roving tabindex so one tab is in the tab order, arrows that move inside the list, and panels each
 * labelled by their tab and reached with Tab rather than by selection. The indicator is the selected
 * tab's own end border, so it sits under one label and never spans the list. Nothing slides or grows.
 */
export function Tabs(props: TabsProps): ReactNode {
  const {
    tabs,
    value,
    defaultValue,
    onValueChange,
    activation = "automatic",
    orientation = "horizontal",
    size = "medium",
    caption,
  } = props;

  const uid = useId();
  const enabled = tabs.filter((tab) => !tab.disabled);
  const [internal, setInternal] = useState<string>(defaultValue ?? enabled[0]?.value ?? "");
  const [roving, setRoving] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = value ?? internal;
  const inOrder = roving ?? active;
  const panelId = (tab: Tab) => `${uid}-${tab.value}-panel`;

  const select = (next: string) => {
    // The canonical artifact re-derives the tab order from the selection, so a click after an arrow move
    // must not leave the roving tabindex on the tab the reader moved to but did not open.
    if (tabs.find((tab) => tab.value === next)?.disabled) return;
    setRoving(null);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const focusTab = (target: string | undefined, activate: boolean) => {
    if (!target) return;
    setRoving(target);
    refs.current[target]?.focus();
    if (activate) select(target);
  };

  const step = (offset: number) => {
    const at = enabled.findIndex((tab) => tab.value === inOrder);
    if (at === -1) return focusTab(enabled[0]?.value, activation === "automatic");
    const next = enabled[(at + offset + enabled.length) % enabled.length];
    focusTab(next?.value, activation === "automatic");
  };

  const jump = (last: boolean) => {
    const next = last ? enabled[enabled.length - 1] : enabled[0];
    focusTab(next?.value, activation === "automatic");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    if (event.key === forward) {
      event.preventDefault();
      step(1);
    } else if (event.key === back) {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      jump(false);
    } else if (event.key === "End") {
      event.preventDefault();
      jump(true);
    } else if (activation === "manual" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      select(inOrder);
    }
  };

  return (
    <div
      className={classes(
        "ss-tabs",
        orientation === "vertical" && "ss-tabs--vertical",
        size === "small" && "ss-tabs--small",
        size === "large" && "ss-tabs--large",
      )}
    >
      <div className="ss-tabs__scroll">
        <div
          className="ss-tabs__list"
          role="tablist"
          aria-label={caption}
          aria-orientation={orientation}
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[tab.value] = el;
              }}
              className="ss-tabs__tab"
              type="button"
              role="tab"
              id={`${uid}-${tab.value}-tab`}
              aria-selected={tab.value === active}
              aria-controls={tab.panel === undefined ? undefined : panelId(tab)}
              tabIndex={tab.value === inOrder ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {tabs
        .filter((tab) => tab.panel !== undefined)
        .map((tab) => (
          <div
            key={tab.value}
            className="ss-tabs__panel"
            role="tabpanel"
            id={panelId(tab)}
            aria-labelledby={`${uid}-${tab.value}-tab`}
            tabIndex={0}
            hidden={tab.value !== active}
          >
            {tab.panel}
          </div>
        ))}
    </div>
  );
}
