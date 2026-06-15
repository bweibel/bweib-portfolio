// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL — used for sitemaps, canonical tags, and absolute URLs.
  site: 'https://bweib.com',
  // Fully static build. Output lands in `dist/` for manual upload to Hostinger.
  output: 'static',
});
