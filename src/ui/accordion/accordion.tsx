/* Copied from UIFoundry packages/react/accordion/accordion.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type AccordionItem = {
  value: string;
  heading: string;
  /** The section's content. Kept out of the a11y tree while the section is collapsed. */
  content?: ReactNode;
  disabled?: boolean;
};

export type AccordionValue = string | string[];

export type AccordionProps = {
  items: AccordionItem[];
  /** Controlled state: one value in single mode, a list in multiple mode. */
  value?: AccordionValue;
  /** The section or sections open on first paint while the component is uncontrolled. */
  defaultValue?: AccordionValue;
  onValueChange?: (value: AccordionValue) => void;
  onOpen?: (value: string) => void;
  onClose?: (value: string) => void;
  /** False keeps one section open; true lets several stay open at once. */
  multiple?: boolean;
  /** False means the open section cannot be closed, so at least one stays readable. */
  collapsible?: boolean;
  size?: "small" | "medium" | "large";
  /** The heading element's level. The spec leaves it to the caller, so it is never hard-coded. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

const toList = (value: AccordionValue | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/**
 * Accordion stacks heading rows that open to reveal their content. Each heading contains a real button
 * carrying aria-expanded and controlling its panel; the panel is labelled by that button and hidden from
 * assistive technology while collapsed. The panel opens instantly in height with one short opacity change
 * on its content, the chevron snaps, and nothing animates height.
 */
export function Accordion(props: AccordionProps): ReactNode {
  const {
    items,
    value,
    defaultValue,
    onValueChange,
    onOpen,
    onClose,
    multiple = false,
    collapsible = true,
    size = "medium",
    headingLevel = 3,
  } = props;

  const uid = useId();
  const [inner, setInner] = useState<string[]>(() => {
    const initial = toList(defaultValue);
    // A non-collapsible set that arrives with everything closed opens its first section, so "one item
    // stays open" holds from the first paint rather than only after a click.
    if (!collapsible && initial.length === 0) {
      const first = items.find((item) => !item.disabled);
      return first ? [first.value] : [];
    }
    return initial;
  });
  const open = new Set(value === undefined ? inner : toList(value));
  const enabled = items.filter((item) => !item.disabled);

  const triggerId = (itemValue: string) => `${uid}-${itemValue}-trigger`;
  const panelId = (itemValue: string) => `${uid}-${itemValue}-panel`;

  const emit = (next: string[]) => {
    const shaped: AccordionValue = multiple ? next : (next[0] ?? "");
    if (value === undefined) setInner(next);
    onValueChange?.(shaped);
  };

  const toggle = (item: AccordionItem) => {
    if (item.disabled) return;
    const current = toList(value === undefined ? inner : value);
    const isOpen = current.includes(item.value);
    if (isOpen) {
      // A non-collapsible set keeps at least one section open. With multiple on that means the last open
      // section cannot close - not that every open section is locked.
      if (!collapsible && current.length <= 1) return;
      emit(current.filter((v) => v !== item.value));
      onClose?.(item.value);
      return;
    }
    const base = multiple ? current : [];
    emit([...base.filter((v) => v !== item.value), item.value]);
    onOpen?.(item.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest(".ss-accordion__trigger");
    if (!current || !enabled.length) return;
    const at = enabled.findIndex((item) => triggerId(item.value) === (current as HTMLElement).id);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = enabled[(at + 1) % enabled.length];
      if (next) document.getElementById(triggerId(next.value))?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = enabled[(at - 1 + enabled.length) % enabled.length];
      if (next) document.getElementById(triggerId(next.value))?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = enabled[0];
      if (first) document.getElementById(triggerId(first.value))?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last) document.getElementById(triggerId(last.value))?.focus();
    }
  };

  const Heading = `h${headingLevel}` as "h3";

  return (
    <div
      className={classes(
        "ss-accordion",
        size === "small" && "ss-accordion--small",
        size === "large" && "ss-accordion--large",
      )}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => {
        const expanded = open.has(item.value);
        return (
          <div key={item.value} className="ss-accordion__item">
            <Heading className="ss-accordion__heading">
              <button
                className="ss-accordion__trigger"
                type="button"
                id={triggerId(item.value)}
                aria-expanded={expanded ? "true" : "false"}
                aria-controls={item.content === undefined ? undefined : panelId(item.value)}
                disabled={item.disabled}
                onClick={() => toggle(item)}
              >
                <span className="ss-accordion__label">{item.heading}</span>
                <span className="ss-accordion__chevron" aria-hidden="true" />
              </button>
            </Heading>
            {item.content === undefined ? null : (
              <div
                className="ss-accordion__panel"
                id={panelId(item.value)}
                role="region"
                aria-labelledby={triggerId(item.value)}
                tabIndex={0}
                hidden={!expanded}
              >
                <div className="ss-accordion__content">{item.content}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
