import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output. React parts render to HTML at build time and send no script unless a page opts in.
export default defineConfig({
  output: "static",
  build: { format: "directory" },
  integrations: [react()],
  devToolbar: { enabled: false },
});
