import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// Static output. React parts render to HTML at build time and send no script unless a page opts in.
export default defineConfig({
  site: "https://arms.whyknot.live",
  output: "static",
  build: { format: "directory" },
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/look/") && !page.endsWith("/parts") && !page.endsWith("/parts/") })],
  devToolbar: { enabled: false },
});
