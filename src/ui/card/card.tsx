/* Copied from UIFoundry packages/react/card/card.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import type { ReactElement, ReactNode } from "react";

/**
 * Card groups related content on one bounded surface. It has no behaviour of its own: every action
 * inside it is a real link or button, and the card is not focusable unless the whole card is one link
 * (spec: Card - Interaction). The heading is first in DOM order after any media, and it carries the
 * document outline; the surface itself has no role.
 */
export type CardPadding = "none" | "small" | "medium" | "large";
export type CardSize = "small" | "medium" | "large";

type CardBase = {
  /** Heading text inside an h3. Required: a card is a labelled group. */
  title: string;
  /** Supporting text under the title. */
  description?: ReactNode;
  /** Media strip at the top; rendered inside the 16:9 clipped box. */
  media?: ReactNode;
  /** The card's content. */
  children?: ReactNode;
  /** Metadata or secondary actions, above a hairline. */
  footer?: ReactNode;
  padding?: CardPadding;
  size?: CardSize;
};

// Selected is an app-level state, so asking for it without a reason would leave the state carried by
// colour alone; the type refuses that, the same way the HTML artifact requires the sentence.
type CardSelection =
  | { selected: true; selectedReason: string }
  | { selected?: false; selectedReason?: never };

// A whole-card link is one accessible target, so it cannot also carry controls or an empty-state
// action inside it (spec: Do and don't). The type separates the two forms instead of documenting it.
type CardLink =
  | { href: string; as?: never; empty?: never; emptyMessage?: never; emptyAction?: never }
  | { href?: never; as?: "article" | "section" | "div" };

type CardEmptiness =
  | { empty: true; emptyMessage: string; emptyAction?: ReactNode }
  | { empty?: false; emptyMessage?: never; emptyAction?: never };

export type CardProps = CardBase & CardSelection & CardLink & CardEmptiness;

function cardClass({ padding, size, selected, empty, href }: CardProps): string {
  const classes = ["ss-card"];
  if (href) classes.push("ss-card--link");
  if (selected) classes.push("ss-card--selected");
  if (empty) classes.push("ss-card--empty");
  if (padding && padding !== "medium") classes.push(`ss-card--padding-${padding}`);
  if (size && size !== "medium") classes.push(`ss-card--${size}`);
  return classes.join(" ");
}

export function Card(props: CardProps): ReactElement {
  const { title, description, media, children, footer, href, selected, empty } = props;
  const content = (
    <>
      {media ? (
        <div className="ss-card__media" aria-hidden="true">
          {media}
        </div>
      ) : null}
      <header className="ss-card__header">
        <h3 className="ss-card__title">{title}</h3>
        {selected ? <p className="ss-card__selected">{props.selectedReason}</p> : null}
        {description ? <p className="ss-card__description">{description}</p> : null}
      </header>
      <div className="ss-card__body">
        {empty ? (
          <>
            <p className="ss-card__empty-message">{props.emptyMessage}</p>
            {props.emptyAction ? (
              <ul className="ss-card__actions">
                <li>{props.emptyAction}</li>
              </ul>
            ) : null}
          </>
        ) : (
          children
        )}
      </div>
      {footer ? <footer className="ss-card__footer">{footer}</footer> : null}
    </>
  );
  const className = cardClass(props);
  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }
  const Tag = props.as ?? "article";
  return (
    <Tag className={className}>
      {content}
    </Tag>
  );
}
