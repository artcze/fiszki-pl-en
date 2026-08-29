// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      LIBRETRANSLATE_BASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      LIBRETRANSLATE_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
