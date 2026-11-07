import { createElement, type ReactNode } from "react";
import { Button } from "../../UIFoundry/packages/react/button/button.tsx";
import { Separator } from "../../UIFoundry/packages/react/separator/separator.tsx";
import { claims } from "./claims.ts";

function Point({ title, body }: { title: string; body: string }) {
  return createElement(
    "div",
    { className: "point" },
    createElement("h2", null, title),
    createElement("p", null, body),
  );
}

export function Page(): ReactNode {
  return createElement(
    "main",
    { id: "content" },
    createElement(
      "section",
      { className: "hero" },
      createElement(
        "header",
        { className: "bar" },
        createElement("a", { className: "wordmark", href: "/" }, "ARMS"),
      ),
      createElement(
        "div",
        { className: "intro" },
        createElement("h1", null, claims.headline),
        createElement("p", { className: "lead" }, claims.lead),
        createElement(
          Button,
          { as: "a", href: claims.action.href, variant: "primary", size: "large" },
          claims.action.label,
        ),
      ),
      createElement("p", { className: "opening" }, claims.opening),
    ),
    createElement(
      "section",
      { className: "points" },
      createElement(
        "div",
        { className: "row" },
        ...claims.points.map((point) => createElement(Point, { key: point.title, ...point })),
      ),
    ),
    createElement(Separator, { ornamental: false }),
    createElement(
      "footer",
      { className: "mast" },
      createElement("p", { className: "wordmark" }, "ARMS"),
      createElement("p", null, claims.operator),
      createElement(
        "nav",
        null,
        createElement("a", { href: "/privacy" }, "Privacy Policy"),
        createElement("a", { href: "/terms" }, "Terms of Service"),
        createElement("a", { href: claims.action.href }, claims.action.label),
      ),
    ),
  );
}
