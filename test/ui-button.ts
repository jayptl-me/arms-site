import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../src/ui/button/button.tsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shipped = readFileSync(join(root, "dist/index.html"), "utf8");
const action = /<a class="ss-button[^"]*ss-button--primary[^"]*" href="(https:\/\/github\.com\/jayptl-me\/arms-site\/issues[^"]*)"[^>]*>\s*<span class="ss-button__label">([^<]*)<\/span>/.exec(shipped);
if (!action) {
  console.error("shipped page has no UIFoundry action");
  process.exit(1);
}

const html = renderToStaticMarkup(
  createElement(Button, { as: "a", href: action[1], variant: "primary", size: "large" }, action[2]),
);
const name = /<span class="ss-button__label">([^<]*)<\/span>/.exec(html);
if (!name || name[1] !== action[2] || !html.includes("ss-button--primary")) {
  console.error("library button did not render the page action");
  console.error(html);
  process.exit(1);
}

console.log("import: src/ui/button/button.tsx");
console.log("accessible name: " + name[1]);
console.log("href: " + action[1]);
console.log(html);
