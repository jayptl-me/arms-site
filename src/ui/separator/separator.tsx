/* Copied from UIFoundry packages/react/separator/separator.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
export type SeparatorOrientation = "horizontal" | "vertical";

export type SeparatorProps = {
  orientation?: SeparatorOrientation;
  ornamental?: boolean;
  inset?: boolean;
};

/**
 * Divides content into groups. A decorative separator is a hairline hidden from assistive
 * technology; a semantic one exposes the separator role and its orientation. Horizontal renders a
 * native hr, exactly as the HTML artifact does: the native rule already maps to the separator role
 * and reads as horizontal, so the exposed form states nothing extra. Vertical renders a div with an
 * explicit role and orientation, because hr cannot be vertical. No children, no events, no focus.
 */
export function Separator({
  orientation = "horizontal",
  ornamental = true,
  inset = false,
}: SeparatorProps) {
  const className = [
    "ss-separator",
    orientation === "vertical" ? "ss-separator--vertical" : null,
    inset ? "ss-separator--inset" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" ");

  if (orientation === "vertical") {
    return ornamental ? (
      <div className={className} aria-hidden="true" />
    ) : (
      <div className={className} role="separator" aria-orientation="vertical" />
    );
  }

  return ornamental ? (
    <hr className={className} aria-hidden="true" />
  ) : (
    <hr className={className} />
  );
}

export default Separator;
