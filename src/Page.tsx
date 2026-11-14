import { createElement, type ReactNode } from "react";
import { Badge } from "../../UIFoundry/packages/react/badge/badge.tsx";
import { Button } from "../../UIFoundry/packages/react/button/button.tsx";
import { Separator } from "../../UIFoundry/packages/react/separator/separator.tsx";
import { claims } from "./claims.ts";

function Point({ title, body }: { title: string; body: string }) {
  return createElement(
    "div",
    { className: "point" },
    createElement("h3", null, title),
    createElement("p", null, body),
  );
}

function Band({ title, children }: { title: string; children: ReactNode }) {
  return createElement(
    "section",
    { className: "band" },
    createElement("h2", null, title),
    children,
  );
}

function Row({ items }: { items: ReadonlyArray<{ title: string; body: string }> }) {
  return createElement(
    "div",
    { className: "row" },
    ...items.map((item) => createElement(Point, { key: item.title, ...item })),
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
      createElement(
        "div",
        { className: "agents" },
        createElement("p", null, claims.harnessLead),
        createElement(
          "div",
          { className: "chips" },
          ...claims.harnesses.map((name) =>
            createElement(Badge, {
              key: name,
              label: name,
              variant: "outline",
              size: "medium",
            }),
          ),
        ),
        createElement("p", { className: "opening" }, claims.opening),
      ),
    ),
    createElement(Band, { title: "What it does", children: createElement(Row, { items: claims.does }) }),
    createElement(Band, { title: "Control plane", children: createElement(Row, { items: claims.plane }) }),
    createElement(Band, { title: "Before a call goes out", children: createElement(Row, { items: claims.decisions }) }),
    createElement(
      Band,
      {
        title: "Native connectors",
        children: createElement(
          "div",
          { className: "catalog" },
          ...claims.connectors.map((item) => createElement(Point, { key: item.name, title: item.name, body: item.body })),
        ),
      },
    ),
    createElement(Band, { title: "Still on your machine", children: createElement(Row, { items: claims.local }) }),
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
