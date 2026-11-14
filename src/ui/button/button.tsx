/* Copied from UIFoundry packages/react/button/button.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import type { MouseEvent, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonType = "button" | "submit" | "reset";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: ButtonType;
  fullWidth?: boolean;
  children?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: (event: MouseEvent<HTMLElement>) => void;
};

type ButtonNameProps =
  | { iconOnly?: false; accessibleName?: string }
  | { iconOnly?: boolean; accessibleName: string };

export type ButtonProps =
  | (ButtonBaseProps & ButtonNameProps & { as?: "button"; href?: never })
  | (ButtonBaseProps & ButtonNameProps & { as: "a"; href: string });

export function Button(props: ButtonProps) {
  const {
    as = "button",
    variant = "secondary",
    size = "medium",
    loading = false,
    disabled = false,
    type = "button",
    iconOnly = false,
    fullWidth = false,
    accessibleName,
    children,
    leading,
    trailing,
    onPress,
    href,
  } = props;

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onPress?.(event);
  }

  const className = [
    "ss-button",
    `ss-button--${variant}`,
    `ss-button--${size}`,
  ].join(" ");

  const content = (
    <>
      {leading ? (
        <span className="ss-button__icon" aria-hidden="true">
          {leading}
        </span>
      ) : null}
      {iconOnly ? null : <span className="ss-button__label">{children}</span>}
      {trailing ? (
        <span className="ss-button__icon" aria-hidden="true">
          {trailing}
        </span>
      ) : null}
    </>
  );

  if (as === "a") {
    return (
      <a
        className={className}
        href={href}
        aria-label={iconOnly ? accessibleName : undefined}
        aria-disabled={disabled || loading ? true : undefined}
        aria-busy={loading ? true : undefined}
        data-disabled={disabled ? "true" : undefined}
        data-icon-only={iconOnly ? "true" : undefined}
        data-full-width={fullWidth ? "true" : undefined}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={className}
      type={type}
      aria-label={iconOnly ? accessibleName : undefined}
      aria-disabled={disabled || loading ? true : undefined}
      aria-busy={loading ? true : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-icon-only={iconOnly ? "true" : undefined}
      data-full-width={fullWidth ? "true" : undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
