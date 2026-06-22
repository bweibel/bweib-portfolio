# bweib-portfolio

Personal portfolio site for **[bweib.com](https://bweib.com)** — Ben Weibel, full-stack web developer.

A fast, static, token-driven site built with [Astro](https://astro.build) and TypeScript. The resume is rendered from a structured JSON Resume file, and the whole site is themed from a single design-token layer with light/dark support.

## Stack

- **[Astro](https://astro.build) 5** — static site generation (`output: 'static'`)
- **TypeScript** — typed data layer and component props
- **Plain CSS** — design tokens + scoped component styles (no CSS framework)
- **Prettier** (with `prettier-plugin-astro`) — formatting
- `@astrojs/check` — type/diagnostic checking in the build

## Features

- **Token-driven design system** — colors, type, spacing, shadows, and motion live in `src/styles/tokens.css`, adopted from the "bweib Design System" (cassette-core: warm paper, retro-industrial type, hard offset shadows). Components reference semantic tokens, so the whole site re-themes from one file.
- **Light / dark mode** — a manual toggle persisted to `localStorage`, initialized from the OS preference, with a no-flash inline init in `<head>`. Both modes share the same accent palette.
- **Resume from data** — experience, skills, and education render from a [JSON Resume](https://jsonresume.org)-schema file (`src/data/resume.json`) on a dedicated `/resume` route.
- **SEO-ready** — canonical URLs, Open Graph, and Twitter metadata in the base layout.
- **Accessible by default** — semantic landmarks, visible focus rings, reduced-motion support.

## Project structure

```
src/
  components/        UI components (Header, Hero, Resume, Contact, Footer, …)
  data/
    resume.json      JSON Resume — experience, skills, education, projects
    resume.ts        Typed loader for resume.json
    site.ts          Site config (name, bio, socials, SEO) — not driven by resume
  layouts/
    BaseLayout.astro HTML shell: <head> metadata + no-flash theme init
  lib/
    dates.ts         Date-range formatting helpers
  pages/
    index.astro      Home (About + Contact)
    resume.astro     Dedicated resume view
  styles/
    tokens.css       Design tokens (light + dark) — the single source of visual truth
    global.css       Reset + base element styles
public/              Static assets (wordmark, favicon)
```

Editable content lives in two places: **`src/data/resume.json`** (the resume) and **`src/data/site.ts`** (name, bio, social links, SEO metadata).

## Development

Requires Node.js 18+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:4321
```

## Scripts

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start the local dev server                       |
| `npm run build`        | Type-check (`astro check`) then build to `dist/` |
| `npm run preview`      | Preview the production build locally             |
| `npm run check`        | Run Astro diagnostics only                       |
| `npm run format`       | Format the project with Prettier                 |
| `npm run format:check` | Check formatting without writing                 |

## Build & deploy

```bash
npm run build
```

Produces a fully static site in `dist/`. The site is deployed by uploading the
contents of `dist/` to static hosting (Hostinger). The canonical site URL is
configured in `astro.config.mjs`.
