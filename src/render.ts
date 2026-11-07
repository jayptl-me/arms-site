import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Page } from "./Page.tsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const foundry = join(root, "..", "UIFoundry", "packages", "react");

const css = [
  readFileSync(join(root, "src/stamp.css"), "utf8").trim(),
  '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;560&family=Rethink+Sans:wght@560&display=swap");',
  readFileSync(join(root, "src/tokens.css"), "utf8").trim(),
  readFileSync(join(root, "src/base.css"), "utf8").trim(),
  readFileSync(join(foundry, "button/button.css"), "utf8").trim(),
  readFileSync(join(foundry, "separator/separator.css"), "utf8").trim(),
  readFileSync(join(root, "src/page.css"), "utf8").trim(),
].join("\n\n");

const body = renderToStaticMarkup(createElement(Page));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Open-source tools for agents, on your machine.">
<title>ARMS, a local-first AI agent gateway</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(join(root, "public/style.css"), css + "\n");
writeFileSync(join(root, "public/index.html"), html);
console.log("wrote public/index.html and public/style.css");
