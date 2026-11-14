/* Copied from UIFoundry packages/react/badge/badge.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "small" | "medium";

type BadgeSharedProps = {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
};

/** Numeric badge. `label` is the readable text announced after the number, for
 * example "unread messages", so the badge reads "3 unread messages", never a
 * bare numeral. The dot is not valid on a count; a count never stands alone. */
export type BadgeCountProps = BadgeSharedProps & {
  count: number;
  max?: number;
  label: string;
  ring?: boolean;
  dot?: never;
  children?: never;
};

/** Status badge. It always carries a text label, through `label` or through
 * children, never both; the types reject a dot standing alone. */
export type BadgeStatusProps = BadgeSharedProps & {
  dot?: boolean;
  count?: never;
  max?: never;
  ring?: never;
} & (
  | { label: string; children?: undefined }
  | { label?: undefined; children: ReactNode }
);

export type BadgeProps = BadgeCountProps | BadgeStatusProps;

/** Default values match the HTML artifact: neutral, soft and small are the
 * base classes, so no modifier class is emitted for them. */
function baseClassNames(tone: BadgeTone, variant: BadgeVariant, size: BadgeSize) {
  const names = ["ss-badge"];
  if (tone !== "neutral") names.push(`ss-badge--${tone}`);
  if (variant !== "soft") names.push(`ss-badge--${variant}`);
  if (size !== "small") names.push(`ss-badge--${size}`);
  return names;
}

export function Badge(props: BadgeProps) {
  const { tone = "neutral", variant = "soft", size = "small" } = props;
  const classNames = baseClassNames(tone, variant, size);

  if (props.count !== undefined) {
    const { count, max, label, ring = false } = props;
    classNames.push("ss-badge--count");
    if (ring) classNames.push("ss-badge--ring");
    const display = max !== undefined && count > max ? `${max}+` : `${count}`;
    const spoken =
      max !== undefined && count > max ? `more than ${max} ${label}` : label;
    return (
      <span className={classNames.join(" ")}>
        <span className="ss-badge__number">{display}</span>
        <span className="ss-visually-hidden">{spoken}</span>
      </span>
    );
  }

  if (props.dot) classNames.push("ss-badge--dot");
  const content = props.label ?? props.children;
  return <span className={classNames.join(" ")}>{content}</span>;
}

export default Badge;
